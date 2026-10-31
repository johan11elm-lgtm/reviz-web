// -------------------------------------------------------
// Réviz — Limite atteinte : un mot au parent (31/10)
//
// L'app iOS ne peut ni vendre Réviz+ ni renvoyer vers le site (règle 3.1.1
// de l'App Store) ; c'est de toute façon le parent qui paie. Quand un élève
// gratuit bute sur sa limite (scans de la semaine, questions à Réviz IA),
// le serveur le note (marquerLimite) et le cron quotidien de
// api/send-parental-consent.js prévient le parent : ce qui est arrivé,
// ce que Réviz+ change, comment l'activer. Ni compte à rebours ni pression,
// et le rappel que le programme reste gratuit.
// Règles :
// - parent qui a donné son accord (moins de 15 ans : seuls comptes qui ont
//   une adresse de parent) ;
// - limite atteinte depuis moins de 2 jours, élève toujours sans Réviz+ ;
// - au plus un e-mail par semaine (users/{uid}.limiteParentLe) ;
// - jamais le jour d'un autre e-mail de Réviz au parent (bilan, relance) ;
// - jamais après « Ne plus recevoir » (users/{uid}.bilansParent = false,
//   même lien que le bilan J+3).
// -------------------------------------------------------
import { JOUR_MS } from '../src/utils/consent.js'
import { C, POLICE, escapeHtml, prenomPropre } from './_rappels.js'
import { lienDesaboParent, REPONDRE_A } from './_bilanParent.js'
import { prixDe } from './_prix.js'
import { FREE_LIMIT } from './_quota.js'
import { CHAT_FREE_LIMIT } from './_chatQuota.js'

const APP = 'https://app.revizapp.fr'
const EXPEDITEUR = 'Réviz <noreply@revizapp.fr>'
const MASCOTTE = `${APP}/mascot/pose-6-writing@256.png`
export const FRAICHEUR_MS = 2 * JOUR_MS
export const INTERVALLE_MS = 7 * JOUR_MS

/**
 * Note la limite atteinte sur le profil, pour le cron. Jamais bloquant : une
 * écriture ratée ne change rien à la réponse faite à l'élève.
 * @param {{ db, uid: string, type: 'scan'|'ia', maintenant?: number }} p
 */
export async function marquerLimite({ db, uid, type, maintenant = Date.now() }) {
  try {
    await db.collection('users').doc(uid).set({ limiteAtteinte: { type, le: maintenant } }, { merge: true })
  } catch (err) {
    console.error('[limite]', uid, err?.message || err)
  }
}

const LIMITES = {
  scan: {
    sujet: nom => `${nom} a utilisé ses ${FREE_LIMIT} scans de la semaine`,
    fait: nom => `${nom} a scanné ses ${FREE_LIMIT} leçons de la semaine sur Réviz : c'est tout ce que permet la version gratuite. Ses scans reviennent lundi.`,
  },
  ia: {
    sujet: nom => `${nom} a posé ses ${CHAT_FREE_LIMIT} questions de la semaine à Réviz IA`,
    fait: nom => `${nom} a posé ses ${CHAT_FREE_LIMIT} questions de la semaine à Réviz IA, l'assistant qui explique ses cours : c'est tout ce que permet la version gratuite. Ses questions reviennent lundi.`,
  },
}

/**
 * Le mail : sujet et HTML (styles en ligne, comme le bilan J+3).
 * @param {{ prenom?: string|null, type: 'scan'|'ia', desabo?: string|null }} p
 */
export function mailLimiteParent({ prenom = null, type, desabo = null }) {
  const l = LIMITES[type] ?? LIMITES.scan
  const propre = prenomPropre(prenom)
  const nom = propre ? escapeHtml(propre) : 'votre enfant'
  const Nom = propre ? nom : 'Votre enfant'
  const mensuel = prixDe('mensuel', false).montant
  const annuel = prixDe('annuel', false).montant
  const subject = l.sujet(propre ?? 'Votre enfant')

  const p = (txt, extra = '') => `<p style="margin:0 0 14px; font-family:${POLICE}; font-size:16px; line-height:1.55; color:${C.texte};${extra}">${txt}</p>`
  const surtitre = (txt, extra = '') => `<div style="font-family:${POLICE}; font-size:12px; font-weight:700; letter-spacing:0.6px; text-transform:uppercase; color:${C.muet};${extra}">${txt}</div>`
  const ligne = (gauche, gratuit, plus) => `<tr>
              <td style="padding:10px 0; border-top:1px solid ${C.filet}; font-family:${POLICE}; font-size:14px; color:${C.texte};">${gauche}</td>
              <td style="padding:10px 6px; border-top:1px solid ${C.filet}; font-family:${POLICE}; font-size:14px; color:${C.second}; text-align:center;">${gratuit}</td>
              <td style="padding:10px 0; border-top:1px solid ${C.filet}; font-family:${POLICE}; font-size:14px; font-weight:700; color:${C.encre}; text-align:center;">${plus}</td>
            </tr>`

  return {
    subject,
    html: `
<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escapeHtml(subject)}</title></head>
<body style="margin:0; padding:0; background:${C.fond};">
  <div style="display:none; max-height:0; overflow:hidden; color:${C.fond};">Le programme reste gratuit. Réviz+ lève la limite : ${mensuel} par mois, sans engagement.</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.fond}; padding:28px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px; background:${C.carte}; border-radius:20px; overflow:hidden;">
        <tr><td style="padding:28px 28px 8px;">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%"><tr>
            <td style="vertical-align:middle;">
              ${surtitre('Réviz · cette semaine')}
              <h1 style="margin:10px 0 0; font-family:${POLICE}; font-size:24px; line-height:1.25; font-weight:800; color:${C.texte};">${escapeHtml(subject)}.</h1>
            </td>
            <td width="96" style="vertical-align:top; padding-left:12px;">
              <img src="${MASCOTTE}" width="88" height="88" alt="Réviz, le cerveau, qui prend des notes" style="display:block; width:88px; height:auto; border:0;">
            </td>
          </tr></table>
        </td></tr>
        <tr><td style="padding:12px 28px 0;">
          ${p('Bonjour,')}
          ${p(l.fait(Nom))}
          ${p(`En attendant, rien ne s'arrête : les quiz, les flashcards et les résumés de tout le programme restent gratuits et sans limite.`)}
          ${surtitre('Si vous voulez aller plus loin', ' margin:8px 0 6px;')}
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 8px;">
            <tr>
              <td style="padding:6px 0; font-family:${POLICE}; font-size:12px; color:${C.muet};"></td>
              <td style="padding:6px; font-family:${POLICE}; font-size:12px; font-weight:700; color:${C.muet}; text-align:center;">Gratuit</td>
              <td style="padding:6px 0; font-family:${POLICE}; font-size:12px; font-weight:700; color:${C.encre}; text-align:center;">Réviz+</td>
            </tr>
            ${ligne('Scans de leçons', `${FREE_LIMIT} par semaine`, 'Illimités')}
            ${ligne('Questions à Réviz IA', `${CHAT_FREE_LIMIT} par semaine`, '50 par jour')}
          </table>
          ${p(`Réviz+ coûte <b>${mensuel} par mois</b> ou <b>${annuel} par an</b>, sans engagement et sans publicité.`, ' font-size:15px;')}
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:4px 0 20px; background:${C.surligneur}; border-radius:14px;"><tr><td style="padding:16px;">
            ${surtitre('Pour l\'activer', ` color:${C.encre};`)}
            ${p(`Ouvrez app.revizapp.fr dans un navigateur, sur ordinateur ou sur téléphone, avec le compte ${propre ? `de ${nom}` : 'de votre enfant'}, puis Réglages, rubrique Réviz+. L'abonnement vaut aussi dans l'app.`, ' margin:8px 0 14px; font-size:15px;')}
            <table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="background:${C.encre}; border-radius:12px;">
              <a href="${APP}/reglages#abonnement" style="display:inline-block; padding:14px 24px; font-family:${POLICE}; font-size:15px; font-weight:700; color:#FFFFFF; text-decoration:none;">Voir Réviz+ →</a>
            </td></tr></table>
          </td></tr></table>
        </td></tr>
        <tr><td style="padding:0 28px 26px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid ${C.filet};"><tr><td style="padding-top:16px;">
            ${p('Une question ? Répondez simplement à ce message : c\'est moi qui lis les réponses.', ` margin:0; font-size:14px; color:${C.second};`)}
            ${p('Johan, de Réviz', ` margin:12px 0 0; font-size:14px; font-weight:700; color:${C.encre};`)}
          </td></tr></table>
        </td></tr>
      </table>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;"><tr><td style="padding:16px 20px 0; font-family:${POLICE}; font-size:12px; line-height:1.6; color:${C.muet};">
        Vous recevez ce message parce que vous avez donné votre accord pour ${propre ? nom : 'votre enfant'} sur Réviz. Au plus un par semaine.<br/>
        ${desabo ? `<a href="${escapeHtml(desabo)}" style="color:${C.muet};">Ne plus recevoir d'e-mails de Réviz</a> · ` : ''}<a href="${APP}/legal/confidentialite" style="color:${C.muet};">Politique de confidentialité</a> · <a href="${APP}" style="color:${C.muet};">app.revizapp.fr</a>
      </td></tr></table>
    </td></tr>
  </table>
</body></html>`,
  }
}

/**
 * Parcourt les accords parentaux et prévient les parents dont l'enfant a atteint une limite.
 * @param {{ db, envoyer, auth?: { getUser }|null, maintenant?: number, secret?: string, journal?: (m:string)=>void }} p
 *   envoyer : ({ from, to, replyTo, subject, html, headers }) => Promise ; une réponse { error }
 *   de Resend compte comme un échec (pas de marque, nouvel essai demain).
 * @returns {Promise<{ limitesParent: number }>}
 */
export async function envoyerLimitesParent({ db, envoyer, auth = null, maintenant = Date.now(), secret = process.env.CRON_SECRET, journal = m => console.error(m) }) {
  const demandes = await db.collectionGroup('parentalConsent').get()
  let limitesParent = 0
  for (const doc of demandes.docs) {
    const d = doc.data()
    if (!d.parentEmail || d.status !== 'approved') continue
    if (d.relanceLe && maintenant - d.relanceLe < JOUR_MS) continue
    const uid = doc.ref.parent.parent.id
    try {
      const ref = db.collection('users').doc(uid)
      const profil = await ref.get()
      if (!profil.exists) continue
      const u = profil.data() ?? {}
      const l = u.limiteAtteinte
      if (!l?.le || !LIMITES[l.type] || maintenant - l.le > FRAICHEUR_MS) continue
      if (u.plan === 'premium' || u.bilansParent === false) continue
      if (u.limiteParentLe && maintenant - u.limiteParentLe < INTERVALLE_MS) continue
      if (u.bilanParentLe && maintenant - u.bilanParentLe < JOUR_MS) continue
      if (auth?.getUser) {
        const compte = await auth.getUser(uid).catch(() => null)
        if (!compte || compte.disabled) continue
      }
      const desabo = lienDesaboParent(uid, secret)
      const mail = mailLimiteParent({ prenom: u.prenom, type: l.type, desabo })
      const r = await envoyer({
        from: EXPEDITEUR, to: d.parentEmail, replyTo: REPONDRE_A, ...mail,
        ...(desabo ? { headers: { 'List-Unsubscribe': `<${desabo}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' } } : {}),
      })
      if (r?.error) throw new Error(r.error.message || 'envoi refusé')
      await ref.update({ limiteParentLe: maintenant })
      limitesParent++
    } catch (err) {
      journal(`[limite-parent] ${uid} : ${err?.message || err}`)
    }
  }
  return { limitesParent }
}
