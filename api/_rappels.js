// -------------------------------------------------------
// Réviz — Rappel du lendemain de la première session (J+1)
//
// Appelé par le cron quotidien de api/send-parental-consent.js (16 h UTC) :
// un e-mail, une seule fois, aux comptes dont la première session date
// d'hier (heure de Paris) et qui ne sont pas encore revenus aujourd'hui. Il
// rouvre le quiz du chapitre commencé. Jamais pour un moins de 15 ans sans
// l'autorisation d'un parent, ni sans date de naissance, ni après une
// désinscription (lien signé, traité par api/track.js).
// -------------------------------------------------------
import { createHmac, timingSafeEqual } from 'node:crypto'
import { isUnder15 } from '../src/utils/levels.js'
import { jourParis, lienChapitre } from '../src/utils/retour.js'

const JOUR_MS = 24 * 60 * 60 * 1000
const EXPEDITEUR = 'Réviz <noreply@revizapp.fr>'

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ))
}

/** Signature du lien de désinscription d'un compte (clé : CRON_SECRET). */
export function signatureDesabo(uid, secret = process.env.CRON_SECRET) {
  if (!secret) return null
  return createHmac('sha256', secret).update(`rappels:${uid}`).digest('hex').slice(0, 32)
}

export function signatureValide(uid, t, secret = process.env.CRON_SECRET) {
  const attendu = signatureDesabo(uid, secret)
  if (!attendu || typeof t !== 'string' || t.length !== attendu.length) return false
  return timingSafeEqual(Buffer.from(attendu), Buffer.from(t))
}

export function lienDesabo(uid, secret = process.env.CRON_SECRET) {
  const t = signatureDesabo(uid, secret)
  return t ? `https://app.revizapp.fr/api/track?op=desabonner&uid=${encodeURIComponent(uid)}&t=${t}` : null
}

/** E-mail du lendemain : le chapitre commencé hier, et un bouton pour le quiz. */
export function mailRappelJ1({ prenom, titre, lien, desabo }) {
  const safeName = escapeHtml(prenom || '')
  const safeTitre = titre ? escapeHtml(titre) : null
  return {
    subject: safeTitre ? `${titre} : tu t'en souviens ?` : 'Ta révision d\'hier : tu t\'en souviens ?',
    html: `
        <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
          <h1 style="font-size: 24px; color: #1A1A1A;">Réviz</h1>
          <p style="color: #444; font-size: 16px; line-height: 1.5;">
            ${safeName ? `Salut <strong>${safeName}</strong>,` : 'Salut,'}
          </p>
          <p style="color: #444; font-size: 16px; line-height: 1.5;">
            ${safeTitre
              ? `Hier, tu as commencé <strong>${safeTitre}</strong>.`
              : 'Hier, tu as fait ta première révision sur Réviz.'}
            Le meilleur moment pour retenir, c'est le lendemain : cinq minutes de quiz suffisent pour vérifier que c'est resté.
          </p>
          <a href="${lien}" style="display: inline-block; background: #1A1A1A; color: white; padding: 14px 28px; border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 15px;">${safeTitre ? 'Reprendre ce chapitre' : 'Reprendre mes révisions'}</a>
          <p style="color: #888; font-size: 13px; margin-top: 24px;">
            Tu reçois ce message une seule fois, le lendemain de ta première révision.
            ${desabo ? `<a href="${desabo}" style="color: #888;">Ne plus recevoir de rappels</a> · ` : ''}<a href="https://app.revizapp.fr/legal/confidentialite" style="color: #888;">Politique de confidentialité</a>
          </p>
        </div>
      `,
  }
}

/**
 * Un moins de 15 ans ne reçoit le rappel qu'avec l'autorisation d'un parent ;
 * sans date de naissance, on ne sait pas : pas d'envoi.
 */
async function peutRecevoir(db, uid, profil) {
  if (!profil.birthDate) return false
  if (!isUnder15(profil.birthDate)) return true
  const consent = await db.collection('users').doc(uid).collection('parentalConsent').doc('consent').get().catch(() => null)
  return consent?.exists === true && consent.data()?.status === 'approved'
}

/**
 * @param {{ db, envoyer, emailDe:(uid:string)=>Promise<string|null>, maintenant?:number, secret?:string }} p
 * @returns {Promise<{ rappelsJ1: number }>}
 */
export async function relancerLendemain({ db, envoyer, emailDe, maintenant = Date.now(), secret = process.env.CRON_SECRET }) {
  const hier = jourParis(new Date(maintenant - JOUR_MS))
  const aujourdhui = jourParis(new Date(maintenant))
  // Égalité sur un champ imbriqué : index automatique, rien à publier.
  const snap = await db.collection('users').where('premiereSession.jour', '==', hier).get()
  let rappelsJ1 = 0
  for (const doc of snap.docs) {
    const d = doc.data()
    if (d.rappelJ1Le || d.rappels === false) continue
    if (d.derniereRevisionAt && jourParis(new Date(d.derniereRevisionAt)) === aujourdhui) continue
    const uid = doc.id
    try {
      if (!(await peutRecevoir(db, uid, d))) continue
      const to = await emailDe(uid)
      if (!to) continue
      const s = d.premiereSession
      const desabo = lienDesabo(uid, secret)
      const mail = mailRappelJ1({
        prenom: d.prenom,
        titre: s.titre ?? null,
        lien: lienChapitre(s) ?? 'https://app.revizapp.fr/?via=rappel',
        desabo,
      })
      await envoyer({
        from: EXPEDITEUR, to, ...mail,
        ...(desabo ? { headers: { 'List-Unsubscribe': `<${desabo}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' } } : {}),
      })
      await doc.ref.update({ rappelJ1Le: maintenant })
      rappelsJ1++
    } catch (err) {
      console.error('[rappel-j1]', uid, err?.message || err)
    }
  }
  return { rappelsJ1 }
}
