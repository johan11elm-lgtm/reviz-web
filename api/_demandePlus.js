// -------------------------------------------------------
// Réviz — « Demander Réviz+ à un parent » (08/11)
//
// C'est le parent qui paie, mais il ne voyait jamais l'offre. L'élève, depuis
// l'offre ou la limite du jour (site seulement : l'app iOS ne vend rien, règle
// 3.1.1), tape l'adresse d'un parent : le parent reçoit un e-mail de sa part,
// avec ce qu'il a fait sur Réviz cette semaine et un lien pour offrir Réviz+,
// sans compte ni mot de passe. C'est l'élève qui demande : pas de prospection.
//
//   ?op=demande-plus (POST, jeton Firebase) → e-mail au parent
//   ?op=offrir (GET, lien signé)            → page « Offrir Réviz+ à X » (ne crée rien :
//                                              les messageries ouvrent les liens)
//   ?op=offrir (POST, formulaire de la page) → session Stripe, redirection 303
//   ?op=offrir&etape=merci|annule (GET)      → pages de retour de Stripe
//
// Règles : au plus une demande tous les 2 jours (users/{uid}.demandePlusLe), rien
// pour un abonné, lien signé (HMAC, CRON_SECRET) valable 30 jours. L'adresse du
// parent n'est pas gardée.
// -------------------------------------------------------
import { signatureDesabo, signatureValide, escapeHtml, prenomPropre, C, POLICE } from './_rappels.js'
import { REPONDRE_A } from './_bilanParent.js'
import { prixDe, FORMULES } from './_prix.js'
import { JOUR_MS, TEXTE_ACCORD_PAIEMENT } from '../src/utils/consent.js'
import { LIMITE_EXERCICES_GRATUIT } from './_essaiPlus.js'

const APP = 'https://app.revizapp.fr'
const EXPEDITEUR = 'Réviz <noreply@revizapp.fr>'
const MASCOTTE = `${APP}/mascot/pose-6-writing@256.png`
export const PORTEE_OFFRIR = 'offrir-revizplus'
export const DUREE_LIEN_MS = 30 * JOUR_MS
export const INTERVALLE_MS = 2 * JOUR_MS
const UID_OK = /^[A-Za-z0-9]{10,128}$/
const EMAIL_OK = /^[^\s@<>"']{1,64}@[^\s@<>"']{1,190}\.[a-z]{2,24}$/i

const portee = exp => `${PORTEE_OFFRIR}:${exp}`

/** Lien de la page « Offrir Réviz+ », valable 30 jours (null sans secret). */
export function lienOffrir(uid, { maintenant = Date.now(), secret = process.env.CRON_SECRET } = {}) {
  const exp = Math.floor((maintenant + DUREE_LIEN_MS) / 1000)
  const t = signatureDesabo(uid, secret, portee(exp))
  return t ? `${APP}/api/abonnement?op=offrir&u=${encodeURIComponent(uid)}&e=${exp}&t=${t}` : null
}

/** Le lien est-il signé et encore valable ? */
export function lienOffrirValide(uid, exp, t, { maintenant = Date.now(), secret = process.env.CRON_SECRET } = {}) {
  if (typeof uid !== 'string' || !UID_OK.test(uid)) return false
  const e = Number(exp)
  if (!Number.isInteger(e) || e * 1000 < maintenant) return false
  return signatureValide(uid, t, secret, portee(e))
}

const estAbonne = u => u?.plan === 'premium' && ['active', 'trialing', 'past_due'].includes(u?.subscriptionStatus ?? 'active')

/** Ce que l'élève a fait ces 7 derniers jours : séances, jours actifs. */
export function activiteSemaine(revisions, maintenant = Date.now()) {
  const depuis = maintenant - 7 * JOUR_MS
  const recentes = (revisions ?? []).filter(r => Number.isFinite(r?.revisedAt) && r.revisedAt >= depuis && r.revisedAt <= maintenant)
  const jours = new Set(recentes.map(r => new Date(r.revisedAt).toLocaleDateString('fr-CA', { timeZone: 'Europe/Paris' })))
  return { revisions: recentes.length, exercices: recentes.filter(r => r.type === 'exercices').length, jours: jours.size }
}

/**
 * L'e-mail au parent (styles en ligne, comme le bilan J+3).
 * @param {{ prenom?: string|null, activite: { revisions: number, exercices: number, jours: number }, lien: string }} p
 */
export function mailDemandePlus({ prenom = null, activite, lien }) {
  const propre = prenomPropre(prenom)
  const nom = propre ? escapeHtml(propre) : 'Votre enfant'
  const il = propre ? nom : 'votre enfant'
  const annuel = prixDe('annuel', false)
  const mensuel = prixDe('mensuel', false)
  const subject = `${propre ?? 'Votre enfant'} aimerait Réviz+`

  const p = (txt, extra = '') => `<p style="margin:0 0 14px; font-family:${POLICE}; font-size:16px; line-height:1.55; color:${C.texte};${extra}">${txt}</p>`
  const surtitre = (txt, extra = '') => `<div style="font-family:${POLICE}; font-size:12px; font-weight:700; letter-spacing:0.6px; text-transform:uppercase; color:${C.muet};${extra}">${txt}</div>`
  const ligne = (gauche, gratuit, plus) => `<tr>
              <td style="padding:10px 0; border-top:1px solid ${C.filet}; font-family:${POLICE}; font-size:14px; color:${C.texte};">${gauche}</td>
              <td style="padding:10px 6px; border-top:1px solid ${C.filet}; font-family:${POLICE}; font-size:14px; color:${C.second}; text-align:center;">${gratuit}</td>
              <td style="padding:10px 0; border-top:1px solid ${C.filet}; font-family:${POLICE}; font-size:14px; font-weight:700; color:${C.encre}; text-align:center;">${plus}</td>
            </tr>`
  const fait = activite.revisions > 0
    ? `Ces 7 derniers jours, ${il} a révisé <b>${activite.jours} jour${activite.jours > 1 ? 's' : ''}</b>${activite.exercices > 0 ? `, dont <b>${activite.exercices} séance${activite.exercices > 1 ? 's' : ''} d'exercices</b>` : ''}.`
    : `${nom} vient de commencer à réviser sur Réviz.`

  return {
    subject,
    html: `
<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escapeHtml(subject)}</title></head>
<body style="margin:0; padding:0; background:${C.fond};">
  <div style="display:none; max-height:0; overflow:hidden; color:${C.fond};">${nom} vous demande Réviz+ : exercices illimités pour réviser le brevet. ${annuel.montant} par an.</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.fond}; padding:28px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px; background:${C.carte}; border-radius:20px; overflow:hidden;">
        <tr><td style="padding:28px 28px 8px;">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%"><tr>
            <td style="vertical-align:middle;">
              ${surtitre('Réviz · une demande')}
              <h1 style="margin:10px 0 0; font-family:${POLICE}; font-size:24px; line-height:1.25; font-weight:800; color:${C.texte};">${escapeHtml(subject)}.</h1>
            </td>
            <td width="96" style="vertical-align:top; padding-left:12px;">
              <img src="${MASCOTTE}" width="88" height="88" alt="Réviz, le cerveau, qui prend des notes" style="display:block; width:88px; height:auto; border:0;">
            </td>
          </tr></table>
        </td></tr>
        <tr><td style="padding:12px 28px 0;">
          ${p('Bonjour,')}
          ${p(`${nom} révise sur Réviz, l'appli de révision du collège, et vous demande de lui offrir Réviz+. C'est ${il} qui a tapé votre adresse.`)}
          ${p(fait)}
          ${surtitre('Ce que Réviz+ change', ' margin:8px 0 6px;')}
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 8px;">
            <tr>
              <td style="padding:6px 0;"></td>
              <td style="padding:6px; font-family:${POLICE}; font-size:12px; font-weight:700; color:${C.muet}; text-align:center;">Gratuit</td>
              <td style="padding:6px 0; font-family:${POLICE}; font-size:12px; font-weight:700; color:${C.encre}; text-align:center;">Réviz+</td>
            </tr>
            ${ligne('Séances d\'exercices', `${LIMITE_EXERCICES_GRATUIT} par jour`, 'Illimitées')}
            ${ligne('Scans de leçons', '5 par semaine', 'Illimités')}
            ${ligne('Questions à Réviz IA', '10 par semaine', '50 par jour')}
          </table>
          ${p(`Le programme, les cours et les fiches restent gratuits. Réviz+ coûte <b>${annuel.montant} par an</b> (soit ${annuel.parMois} par mois) ou <b>${mensuel.montant} par mois</b>, sans engagement et sans publicité.`, ' font-size:15px;')}
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:4px 0 20px; background:${C.surligneur}; border-radius:14px;"><tr><td style="padding:16px;">
            ${p(`Le paiement se fait ici, sans créer de compte : Réviz+ s'active tout de suite sur le compte de ${il}.`, ' margin:0 0 14px; font-size:15px;')}
            <table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="background:${C.encre}; border-radius:12px;">
              <a href="${escapeHtml(lien)}" style="display:inline-block; padding:14px 24px; font-family:${POLICE}; font-size:15px; font-weight:700; color:#FFFFFF; text-decoration:none;">Offrir Réviz+ à ${nom} →</a>
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
        Vous recevez ce message parce que ${il} a demandé à vous l'envoyer depuis Réviz. Votre adresse n'est pas gardée.<br/>
        <a href="${APP}/legal/cgv" style="color:${C.muet};">Conditions de vente</a> · <a href="${APP}/legal/confidentialite" style="color:${C.muet};">Politique de confidentialité</a>
      </td></tr></table>
    </td></tr>
  </table>
</body></html>`,
  }
}

/**
 * ?op=demande-plus (POST { idToken, email }) : envoie la demande au parent.
 * 200 { ok } · 400 EMAIL_INVALIDE · 401 · 409 ABONNE · 429 DEJA_DEMANDE · 502 ENVOI
 */
export async function routeDemandePlus(req, res, { db, auth, envoyer, maintenant = Date.now(), secret = process.env.CRON_SECRET }) {
  const { idToken, email } = req.body ?? {}
  if (!idToken) return res.status(401).json({ error: 'UNAUTHORIZED' })
  const adresse = typeof email === 'string' ? email.trim().toLowerCase() : ''
  if (!EMAIL_OK.test(adresse)) return res.status(400).json({ error: 'EMAIL_INVALIDE' })
  let decoded
  try { decoded = await auth.verifyIdToken(idToken) } catch { return res.status(401).json({ error: 'UNAUTHORIZED' }) }
  if (decoded.email && decoded.email.toLowerCase() === adresse) return res.status(400).json({ error: 'EMAIL_ELEVE' })
  const ref = db.collection('users').doc(decoded.uid)
  const snap = await ref.get()
  const u = snap.exists ? snap.data() : {}
  if (estAbonne(u)) return res.status(409).json({ error: 'ABONNE' })
  if (Number.isFinite(u.demandePlusLe) && maintenant - u.demandePlusLe < INTERVALLE_MS) return res.status(429).json({ error: 'DEJA_DEMANDE' })
  const lien = lienOffrir(decoded.uid, { maintenant, secret })
  if (!lien) return res.status(500).json({ error: 'CONFIG' })
  const revs = await ref.collection('revisions').where('revisedAt', '>=', maintenant - 7 * JOUR_MS).get().catch(() => null)
  const activite = activiteSemaine(revs ? revs.docs.map(d => d.data()) : [], maintenant)
  const mail = mailDemandePlus({ prenom: u.prenom, activite, lien })
  const r = await envoyer({ from: EXPEDITEUR, to: adresse, replyTo: REPONDRE_A, ...mail }).catch(err => ({ error: err }))
  if (r?.error) return res.status(502).json({ error: 'ENVOI' })
  await ref.set({ demandePlusLe: maintenant }, { merge: true })
  return res.status(200).json({ ok: true })
}

// --- Page « Offrir Réviz+ » (sans compte) ---

const pageParent = (titre, corps) => `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${escapeHtml(titre)} · Réviz</title></head>
<body style="margin:0; background:${C.fond}; font-family:${POLICE}; color:${C.texte};">
<main style="max-width:480px; margin:0 auto; padding:28px 16px;">
<div style="background:${C.carte}; border-radius:20px; padding:26px 22px;">
<img src="${MASCOTTE}" width="72" height="72" alt="" style="display:block; float:right; margin:-6px -4px 0 8px;">
<div style="font-size:12px; font-weight:700; letter-spacing:.6px; text-transform:uppercase; color:${C.muet};">Réviz+</div>
<h1 style="margin:8px 0 14px; font-size:25px; line-height:1.2; font-weight:800;">${escapeHtml(titre)}</h1>
${corps}
</div>
<p style="margin:16px 4px 0; font-size:12px; line-height:1.6; color:${C.muet};">Une question : johan@revizapp.fr · <a href="${APP}/legal/cgv" style="color:${C.muet};">Conditions de vente</a></p>
</main></body></html>`

const texte = t => `<p style="margin:0 0 14px; font-size:16px; line-height:1.55;">${t}</p>`

function formulaire(action, f, prix, detail, principal) {
  const fond = principal ? C.encre : '#FFFFFF'
  const couleur = principal ? '#FFFFFF' : C.encre
  return `<form method="post" action="${action}&amp;f=${f}" style="margin:0 0 10px;">
<button type="submit" style="width:100%; display:flex; justify-content:space-between; align-items:center; gap:12px; padding:16px 18px; border-radius:14px; border:2px solid ${C.encre}; background:${fond}; color:${couleur}; font:inherit; font-size:16px; font-weight:700; cursor:pointer; text-align:left;">
<span>${prix}</span><span style="font-size:13px; font-weight:600; opacity:.85;">${detail}</span></button></form>`
}

/**
 * ?op=offrir : GET = page (ou retour de Stripe avec etape=merci|annule), POST = paiement.
 * creerSession : ({ uid, formule, successUrl, cancelUrl, parent }) => Promise<string> (api/_checkout.js).
 */
export async function routeOffrir(req, res, { db, creerSession, maintenant = Date.now(), secret = process.env.CRON_SECRET }) {
  const { u: uid, e: exp, t, etape, f } = req.query ?? {}
  res.setHeader?.('Content-Type', 'text/html; charset=utf-8')
  if (!lienOffrirValide(uid, exp, t, { maintenant, secret })) {
    return res.status(400).send(pageParent('Lien expiré', texte('Ce lien n\'est plus valable. Votre enfant peut vous renvoyer une demande depuis Réviz.')))
  }
  const ref = db.collection('users').doc(uid)
  const snap = await ref.get()
  if (!snap.exists) return res.status(404).send(pageParent('Compte introuvable', texte('Ce compte Réviz n\'existe plus.')))
  const u = snap.data()
  const nom = escapeHtml(prenomPropre(u.prenom) ?? 'votre enfant')
  const base = `${APP}/api/abonnement?op=offrir&u=${encodeURIComponent(uid)}&e=${encodeURIComponent(exp)}&t=${encodeURIComponent(t)}`

  if (req.method === 'GET' && etape === 'merci') {
    return res.status(200).send(pageParent('Merci !', texte(`Réviz+ s'active sur le compte de ${nom} dans quelques instants : rien d'autre à faire. Vous recevrez le reçu par e-mail.`)
      + texte('L\'abonnement se résilie à tout moment, depuis le lien de gestion du reçu ou en répondant à l\'e-mail.')))
  }
  if (estAbonne(u)) {
    return res.status(200).send(pageParent(`${nom} a déjà Réviz+`, texte('Rien à faire : Réviz+ est déjà actif sur son compte.')))
  }
  if (req.method === 'POST') {
    const formule = FORMULES.includes(f) ? f : 'annuel'
    try {
      const url = await creerSession({ uid, formule, parent: true, successUrl: `${base}&etape=merci`, cancelUrl: `${base}&etape=annule` })
      res.setHeader?.('Location', url)
      return res.status(303).send('')
    } catch (err) {
      console.error('[offrir]', err?.message || err)
      return res.status(500).send(pageParent('Petit souci', texte('Le paiement n\'a pas pu s\'ouvrir. Réessayez dans un moment.')))
    }
  }
  const annuel = prixDe('annuel', false)
  const mensuel = prixDe('mensuel', false)
  const annule = etape === 'annule' ? texte('<b>Pas de souci</b>, rien n\'a été prélevé.') : ''
  return res.status(200).send(pageParent(`Offrir Réviz+ à ${nom}`, annule
    + texte(`Exercices illimités, scans de leçons illimités et 50 questions par jour à Réviz IA, sur le compte de ${nom}. Le programme reste gratuit.`)
    + formulaire(base, 'annuel', `${annuel.montant} par an`, `soit ${annuel.parMois} par mois`, true)
    + formulaire(base, 'mensuel', `${mensuel.montant} par mois`, 'sans engagement', false)
    + `<p style="margin:12px 0 0; font-size:13px; line-height:1.5; color:${C.second};">${TEXTE_ACCORD_PAIEMENT} Paiement sécurisé par Stripe. Renouvellement automatique, résiliable à tout moment.</p>`))
}
