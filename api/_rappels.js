// -------------------------------------------------------
// Réviz — Rappel du lendemain (J+1)
//
// Appelé par le cron quotidien de api/send-parental-consent.js (16 h UTC) :
// un e-mail, une seule fois, le lendemain :
// - de la première session de révision (premiereSession.jour = hier) : il
//   rouvre le quiz du chapitre commencé ;
// - ou de la création du compte, pour l'élève inscrit la veille qui n'a pas
//   encore révisé : son dernier chapitre ouvert, sinon son programme.
// Si l'adresse n'est pas encore confirmée, le lien passe par la page de
// vérification de Firebase puis continue vers le quiz : un clic fait les deux.
// Un moins de 15 ans sans l'autorisation d'un parent le reçoit aussi, tourné
// vers l'accord : sans adresse de parent, le bouton mène à l'écran qui la
// demande (le quiz passe en lien secondaire) ; parent prévenu mais pas encore
// d'accord, le mail le rappelle à l'élève. Jamais sans date de naissance,
// ni après un refus du parent, ni après une désinscription (lien signé,
// traité par api/track.js), ni si l'élève est déjà revenu aujourd'hui.
// -------------------------------------------------------
import { createHmac, timingSafeEqual } from 'node:crypto'
import { isUnder15 } from '../src/utils/levels.js'
import { jourParis, lienChapitre } from '../src/utils/retour.js'

const HEURE_MS = 60 * 60 * 1000
const JOUR_MS = 24 * HEURE_MS
// Fenêtre d'âge du compte au moment du cron : « créé la veille ».
export const AGE_MIN_MS = 18 * HEURE_MS
export const AGE_MAX_MS = 48 * HEURE_MS
const APP = 'https://app.revizapp.fr'
const EXPEDITEUR = 'Réviz <noreply@revizapp.fr>'
// Écran « Préviens un parent » (pages/ConsentPending.jsx) ; sans session, il
// passe par la connexion puis revient (via=rappel, voir utils/retour.js).
export const LIEN_ACCORD = `${APP}/consent-pending?via=rappel`

export function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ))
}

/**
 * Signature du lien de désinscription d'un compte (clé : CRON_SECRET).
 * portee : 'rappels' (rappels à l'élève) ou 'bilans-parent' (api/_bilanParent.js) ;
 * un lien de l'un ne désinscrit jamais de l'autre.
 */
export function signatureDesabo(uid, secret = process.env.CRON_SECRET, portee = 'rappels') {
  if (!secret) return null
  return createHmac('sha256', secret).update(`${portee}:${uid}`).digest('hex').slice(0, 32)
}

export function signatureValide(uid, t, secret = process.env.CRON_SECRET, portee = 'rappels') {
  const attendu = signatureDesabo(uid, secret, portee)
  if (!attendu || typeof t !== 'string' || t.length !== attendu.length) return false
  return timingSafeEqual(Buffer.from(attendu), Buffer.from(t))
}

export function lienDesabo(uid, secret = process.env.CRON_SECRET) {
  const t = signatureDesabo(uid, secret)
  return t ? `${APP}/api/track?op=desabonner&uid=${encodeURIComponent(uid)}&t=${t}` : null
}

/** Prénom nettoyé : lettres, espaces, tirets, apostrophes, 20 caractères. */
export function prenomPropre(brut) {
  const propre = String(brut ?? '').normalize('NFC')
    .replace(/[^\p{L}\p{M} '’-]/gu, '')
    .replace(/\s+/g, ' ').trim().slice(0, 20).trim()
  return propre || null
}

/** Titre de chapitre ou de leçon : une ligne, 80 caractères. */
export function titrePropre(brut) {
  const t = String(brut ?? '').replace(/\s+/g, ' ').trim().slice(0, 80).trim()
  return t || null
}

/**
 * Ce que le mail rappelle, et où il mène, d'après la première session (ou,
 * sans session, la dernière leçon ouverte).
 * @returns {{ titre: string|null, matiere: string|null, source: 'programme'|'scan'|null, lien: string }}
 */
export function sujetRappel(session, lecon = null) {
  const s = session ?? lecon
  if (!s) return { titre: null, matiere: null, source: null, lien: `${APP}/programme?via=rappel` }
  const titre = titrePropre(s.titre ?? s.metadata?.title)
  const matiere = titrePropre(s.matiere ?? s.metadata?.subject)
  const chapitre = lienChapitre(s)
  if (chapitre) return { titre, matiere, source: 'programme', lien: chapitre }
  if (s.source === 'scan') return { titre, matiere, source: 'scan', lien: `${APP}/cours?via=rappel` }
  return { titre, matiere, source: s.source ?? null, lien: `${APP}/?via=rappel` }
}

// Couleurs de l'app (src/styles/global.css) : crème, carte blanche, encre, orange.
export const C = { fond: '#F2E7DA', carte: '#FFFFFF', encre: '#2D2B57', texte: '#1B1A23', second: '#6B6557', muet: '#8A826F', filet: '#EADFD0', surligneur: '#FFE6D2' }
export const POLICE ="'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif"
// Réviz qui accueille à bras ouverts (pose « retour », servie par l'app).
const MASCOTTE = `${APP}/mascot/pose-s4-retour@256.png`

/**
 * Le mail : sujet et HTML (styles en ligne, tableau : les clients mail n'aiment rien d'autre).
 * accord : null (cas général), 'adresse' (moins de 15 ans sans adresse de parent :
 * bouton vers lienAccord, le chapitre en lien secondaire) ou 'attente' (parent
 * prévenu, pas encore d'accord : un encadré le rappelle).
 * @param {{ prenom?: string, titre?: string|null, matiere?: string|null, source?: string|null, lien: string, desabo?: string|null, verifieAdresse?: boolean, accord?: 'adresse'|'attente'|null, lienAccord?: string|null }} p
 */
export function mailRappelJ1({ prenom, titre = null, matiere = null, source = null, lien, desabo = null, verifieAdresse = false, accord = null, lienAccord = null }) {
  const safeName = escapeHtml(prenomPropre(prenom) || '')
  const safeTitre = titre ? escapeHtml(titre) : null
  const safeMatiere = matiere ? escapeHtml(matiere) : null
  const scan = source === 'scan'
  const surligne = safeTitre ? `<span style="background:${C.surligneur}; padding:0 5px; border-radius:4px; box-decoration-break:clone; -webkit-box-decoration-break:clone;">${safeTitre}</span>` : null

  const subject = !titre ? 'Ton premier chapitre t\'attend'
    : scan ? `Ta leçon « ${titre} » t'attend`
    : `${titre} : tu t'en souviens ?`
  const accroche = !safeTitre ? 'Hier, tu as créé ton compte. Aujourd\'hui, premier chapitre.'
    : scan ? `Hier, tu as scanné ${surligne}. Ta leçon est prête, elle n'attend plus que toi.`
    : `Hier, tu as commencé ${surligne}. Aujourd'hui, on vérifie que c'est resté.`
  const detail = !safeTitre
    ? 'Choisis un chapitre de ton programme : trois minutes, quelques questions, et ton cerveau fait le reste.'
    : scan
      ? `Résumé, flashcards et quiz de ta leçon${safeMatiere ? ` de ${safeMatiere}` : ''} sont prêts. Trois minutes suffisent pour que ça tienne.`
      : `Le quiz prend trois minutes : quelques questions${safeMatiere ? ` de ${safeMatiere}` : ''}, et ton cerveau fait le reste.`
  const bouton = !safeTitre ? 'Choisir un chapitre' : scan ? 'Reprendre ma leçon' : 'Faire le quiz'
  const demandeAdresse = accord === 'adresse' && !!lienAccord

  const p = (txt, extra = '') => `<p style="margin:0 0 14px; font-family:${POLICE}; font-size:16px; line-height:1.55; color:${C.texte};${extra}">${txt}</p>`
  const gros = (href, texte) => `
          <table role="presentation" cellpadding="0" cellspacing="0" style="margin:6px 0 22px;"><tr><td style="background:${C.encre}; border-radius:12px;">
            <a href="${href}" style="display:inline-block; padding:15px 26px; font-family:${POLICE}; font-size:16px; font-weight:700; color:#FFFFFF; text-decoration:none;">${texte} →</a>
          </td></tr></table>`
  const encadre = txt => `
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 18px;"><tr><td style="background:${C.surligneur}; border-radius:12px; padding:12px 14px; font-family:${POLICE}; font-size:14px; line-height:1.5; color:${C.texte};">
            ${txt}
          </td></tr></table>`
  // Le lien de vérification d'adresse porte toujours sur le bouton principal.
  const verification = verifieAdresse ? encadre('Ce lien confirme aussi ton adresse e-mail : pas besoin de chercher l\'autre mail.') : ''
  const corps = demandeAdresse
    ? `
          ${p('Une chose d\'abord : comme tu as moins de 15 ans, un parent doit dire oui pour que tu gardes ton compte. Tu tapes son adresse, il reçoit un mail avec un bouton. Trente secondes, et tout ce que tu as révisé reste à toi.')}
          ${gros(lienAccord, 'Prévenir un parent')}
          ${verification}
          ${p(`<a href="${lien}" style="color:${C.encre}; font-weight:700;">${!safeTitre ? 'Ou choisis un chapitre' : scan ? 'Ou reprends ta leçon' : 'Ou fais le quiz'} tout de suite</a>`, ` font-size:15px;`)}`
    : `
          ${p(detail)}
          ${gros(lien, bouton)}
          ${verification}
          ${accord === 'attente' ? encadre('Ton parent n\'a pas encore dit oui. Il a reçu un mail de Réviz avec le bouton « Donner mon autorisation » : montre-le-lui (et regardez dans ses spams s\'il ne le trouve pas). Sans son accord, ton compte sera mis en pause.') : ''}`
  return {
    subject,
    html: `
<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escapeHtml(subject)}</title></head>
<body style="margin:0; padding:0; background:${C.fond};">
  <div style="display:none; max-height:0; overflow:hidden; color:${C.fond};">${escapeHtml(subject)}. Trois minutes, et c'est dans la boîte.</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.fond}; padding:28px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px; background:${C.carte}; border-radius:20px; overflow:hidden;">
        <tr><td style="padding:28px 28px 8px;">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%"><tr>
            <td style="vertical-align:middle;">
              <div style="font-family:${POLICE}; font-size:12px; font-weight:700; letter-spacing:0.6px; text-transform:uppercase; color:${C.muet};">Réviz · le lendemain</div>
              <h1 style="margin:10px 0 0; font-family:${POLICE}; font-size:24px; line-height:1.25; font-weight:800; color:${C.texte};">${accroche}</h1>
            </td>
            <td width="96" style="vertical-align:top; padding-left:12px;">
              <img src="${MASCOTTE}" width="88" height="88" alt="Réviz, le cerveau, qui t'accueille à bras ouverts" style="display:block; width:88px; height:auto; border:0;">
            </td>
          </tr></table>
        </td></tr>
        <tr><td style="padding:12px 28px 0;">
          ${p(safeName ? `Salut <strong>${safeName}</strong>,` : 'Salut,')}
          ${corps}
        </td></tr>
        <tr><td style="padding:0 28px 26px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid ${C.filet};"><tr><td style="padding-top:16px;">
            <div style="font-family:${POLICE}; font-size:12px; font-weight:700; letter-spacing:0.6px; text-transform:uppercase; color:${C.muet};">Pourquoi maintenant</div>
            ${p('Ce qu\'on revoit le lendemain reste. Ce qu\'on laisse filer s\'efface. C\'est toute la méthode de Réviz : un peu, souvent, et jamais la veille à 23 h.', ` margin:8px 0 0; font-size:14px; color:${C.second};`)}
            ${p('— Réviz, le cerveau (pas l\'appli, le cerveau)', ` margin:14px 0 0; font-size:14px; font-weight:700; color:${C.encre};`)}
          </td></tr></table>
        </td></tr>
      </table>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;"><tr><td style="padding:16px 20px 0; font-family:${POLICE}; font-size:12px; line-height:1.6; color:${C.muet};">
        Tu reçois ce message une seule fois, le lendemain de ton arrivée sur Réviz.<br/>
        ${desabo ? `<a href="${desabo}" style="color:${C.muet};">Ne plus recevoir de rappels</a> · ` : ''}<a href="${APP}/legal/confidentialite" style="color:${C.muet};">Politique de confidentialité</a> · <a href="${APP}" style="color:${C.muet};">app.revizapp.fr</a>
      </td></tr></table>
    </td></tr>
  </table>
</body></html>`,
  }
}

/**
 * Quel rappel pour cet élève : 'libre' (15 ans et plus, ou accord donné),
 * 'adresse' (moins de 15 ans sans adresse de parent : le mail la demande),
 * 'attente' (parent prévenu, pas encore d'accord : le mail le rappelle), ou
 * null : sans date de naissance on ne sait pas, après un refus on se tait,
 * et une lecture ratée de l'accord ne vaut pas un « pas encore ».
 * @returns {Promise<'libre'|'adresse'|'attente'|null>}
 */
async function formuleRappel(db, uid, profil) {
  if (!profil.birthDate) return null
  if (!isUnder15(profil.birthDate)) return 'libre'
  const consent = await db.collection('users').doc(uid).collection('parentalConsent').doc('consent').get().catch(() => undefined)
  if (consent === undefined) return null
  const c = consent?.exists ? consent.data() ?? {} : {}
  if (c.status === 'approved') return 'libre'
  if (c.status && c.status !== 'pending') return null
  return c.parentEmail ? 'attente' : 'adresse'
}

/** Dernière leçon ouverte (pour l'élève sans première session). */
async function derniereLecon(db, uid) {
  const snap = await db.collection('users').doc(uid).collection('lessons').orderBy('scannedAt', 'desc').limit(1).get().catch(() => null)
  return snap?.docs?.[0]?.data() ?? null
}

/**
 * @param {{
 *   db, envoyer, emailDe:(uid:string)=>Promise<string|null>,
 *   auth?: { listUsers, generateEmailVerificationLink, getUser }|null,
 *   maintenant?: number, secret?: string, journal?: (m:string)=>void,
 * }} p
 *   auth (firebase-admin) sert à trouver les comptes créés la veille et à
 *   fabriquer le lien de vérification d'adresse ; sans lui, seuls les élèves
 *   à première session sont rappelés, par le lien direct.
 * @returns {Promise<{ rappelsJ1: number }>}
 */
export async function relancerLendemain({ db, envoyer, emailDe, auth = null, maintenant = Date.now(), secret = process.env.CRON_SECRET, journal = m => console.error(m) }) {
  const hier = jourParis(new Date(maintenant - JOUR_MS))
  const aujourdhui = jourParis(new Date(maintenant))

  // 1. Première session hier. Égalité sur un champ imbriqué : index automatique.
  const candidats = new Map() // uid → { ref, d, compte }
  const snap = await db.collection('users').where('premiereSession.jour', '==', hier).get()
  for (const doc of snap.docs) candidats.set(doc.id, { ref: doc.ref, d: doc.data(), compte: null })

  // 2. Compte créé la veille, sans première session.
  if (auth?.listUsers) {
    let pageToken
    do {
      const page = await auth.listUsers(1000, pageToken)
      pageToken = page.pageToken
      for (const u of page.users) {
        const cree = Date.parse(u.metadata?.creationTime ?? '')
        const age = maintenant - cree
        if (!Number.isFinite(cree) || age < AGE_MIN_MS || age >= AGE_MAX_MS) continue
        if (!u.email || u.disabled || !(u.providerData?.length) || candidats.has(u.uid)) continue
        const ref = db.collection('users').doc(u.uid)
        const profil = await ref.get().catch(() => null)
        if (!profil?.exists) continue
        const d = profil.data() ?? {}
        if (d.premiereSession) continue
        candidats.set(u.uid, { ref, d, compte: u })
      }
    } while (pageToken)
  }

  let rappelsJ1 = 0
  for (const [uid, { ref, d, compte }] of candidats) {
    if (d.rappelJ1Le || d.rappels === false) continue
    if (d.derniereRevisionAt && jourParis(new Date(d.derniereRevisionAt)) === aujourdhui) continue
    if (Array.isArray(d.joursActifs) && d.joursActifs.includes(aujourdhui)) continue
    try {
      const formule = await formuleRappel(db, uid, d)
      if (!formule) continue
      const c = compte ?? (auth?.getUser ? await auth.getUser(uid).catch(() => null) : null)
      const to = c?.email ?? await emailDe(uid)
      if (!to) continue
      const sujet = sujetRappel(d.premiereSession ?? null, d.premiereSession ? null : await derniereLecon(db, uid))
      // Le bouton principal : l'écran de l'accord parental, sinon le chapitre.
      const adresse = formule === 'adresse'
      let principal = adresse ? LIEN_ACCORD : sujet.lien
      let verifieAdresse = false
      if (c && c.emailVerified === false && auth?.generateEmailVerificationLink) {
        try {
          principal = await auth.generateEmailVerificationLink(to, { url: principal })
          verifieAdresse = true
        } catch (err) {
          journal(`[rappel-j1] lien de vérification impossible pour ${uid} : ${err?.message || err}`)
        }
      }
      const desabo = lienDesabo(uid, secret)
      const mail = mailRappelJ1({
        prenom: d.prenom ?? c?.displayName, ...sujet, desabo, verifieAdresse,
        lien: adresse ? sujet.lien : principal,
        accord: formule === 'libre' ? null : formule,
        lienAccord: adresse ? principal : null,
      })
      await envoyer({
        from: EXPEDITEUR, to, ...mail,
        ...(desabo ? { headers: { 'List-Unsubscribe': `<${desabo}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' } } : {}),
      })
      await ref.update({ rappelJ1Le: maintenant })
      rappelsJ1++
    } catch (err) {
      journal(`[rappel-j1] ${uid} : ${err?.message || err}`)
    }
  }
  return { rappelsJ1 }
}
