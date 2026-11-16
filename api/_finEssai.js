// -------------------------------------------------------
// Réviz — Fin de l'essai Réviz+ de 7 jours : un mot au parent (16/11)
//
// L'essai (api/_essaiPlus.js) s'ouvre tout seul à la première limite
// d'exercices et se terminait sans prévenir personne : l'élève retombait sur
// ses 3 séances par jour, et le parent, qui est celui qui paie, n'avait
// jamais su que l'essai existait. La veille de la fin, le cron quotidien de
// api/send-parental-consent.js écrit au parent : ce que l'élève a fait
// pendant l'essai, ce qui reste gratuit, et le lien pour offrir Réviz+ sans
// compte (api/_demandePlus.js). Ni compte à rebours ni pression.
// Règles :
// - parent qui a donné son accord (comptes de moins de 15 ans, seuls à avoir
//   une adresse de parent) ;
// - essai qui se termine dans les prochaines 24 h (le cron passe une fois par
//   jour : c'est son dernier passage avant la fin), et que le parrainage ne
//   prolonge pas ;
// - élève toujours sans Réviz+, une seule fois par compte
//   (users/{uid}.finEssaiParentLe) ;
// - jamais après « Ne plus recevoir » (users/{uid}.bilansParent = false).
// Le même jour, le bilan J+3 et le mot « limite atteinte » se taisent
// (ils passent après dans le cron et regardent finEssaiParentLe).
// -------------------------------------------------------
import { JOUR_MS } from '../src/utils/consent.js'
import { C, POLICE, escapeHtml, prenomPropre } from './_rappels.js'
import { lienDesaboParent, REPONDRE_A } from './_bilanParent.js'
import { prixDe } from './_prix.js'
import { finEssaiPlus, LIMITE_EXERCICES_GRATUIT } from './_essaiPlus.js'

const APP = 'https://app.revizapp.fr'
const EXPEDITEUR = 'Réviz <noreply@revizapp.fr>'
const MASCOTTE = `${APP}/mascot/pose-6-writing@256.png`
/** Le cron passe toutes les 24 h : un essai qui finit d'ici là n'aura pas d'autre passage. */
export const AVANT_FIN_MS = JOUR_MS

const jourDe = ms => new Date(ms).toLocaleDateString('fr-CA', { timeZone: 'Europe/Paris' })

/**
 * L'essai se termine-t-il avant le prochain passage du cron ?
 * Faux si le parrainage offre Réviz+ plus longtemps : rien ne s'arrête alors demain.
 */
export function essaiFinitBientot(profil, maintenant = Date.now()) {
  const fin = finEssaiPlus(profil)
  if (fin == null || fin <= maintenant || fin - maintenant > AVANT_FIN_MS) return false
  const parrainage = profil?.essaiPlus?.parrainage?.fin
  return !(Number.isFinite(parrainage) && parrainage > fin)
}

/** Ce que l'élève a fait pendant l'essai : jours de révision, séances d'exercices, séances au-delà de la limite gratuite. */
export function activiteEssai(revisions, debut, maintenant = Date.now()) {
  const pendant = (revisions ?? []).filter(r => Number.isFinite(r?.revisedAt) && r.revisedAt >= debut && r.revisedAt <= maintenant)
  const jours = new Set(pendant.map(r => jourDe(r.revisedAt)))
  const parJour = {}
  for (const r of pendant) if (r.type === 'exercices') parJour[jourDe(r.revisedAt)] = (parJour[jourDe(r.revisedAt)] ?? 0) + 1
  const seances = Object.values(parJour)
  return {
    jours: jours.size,
    exercices: seances.reduce((a, n) => a + n, 0),
    enPlus: seances.reduce((a, n) => a + Math.max(0, n - LIMITE_EXERCICES_GRATUIT), 0),
  }
}

/**
 * Le mail : sujet et HTML (styles en ligne, comme le bilan J+3).
 * @param {{ prenom?: string|null, fin: number, activite: { jours: number, exercices: number, enPlus: number }, lien?: string|null, desabo?: string|null }} p
 *   lien : page « Offrir Réviz+ » (sans compte) ; sans lien, on explique le chemin par les Réglages.
 */
export function mailFinEssai({ prenom = null, fin, activite, lien = null, desabo = null }) {
  const propre = prenomPropre(prenom)
  const nom = propre ? escapeHtml(propre) : 'votre enfant'
  const Nom = propre ? nom : 'Votre enfant'
  const annuel = prixDe('annuel', false)
  const mensuel = prixDe('mensuel', false)
  const quand = new Date(fin).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/Paris' })
  const subject = `L'essai Réviz+ de ${propre ?? 'votre enfant'} se termine ${quand}`

  const p = (txt, extra = '') => `<p style="margin:0 0 14px; font-family:${POLICE}; font-size:16px; line-height:1.55; color:${C.texte};${extra}">${txt}</p>`
  const surtitre = (txt, extra = '') => `<div style="font-family:${POLICE}; font-size:12px; font-weight:700; letter-spacing:0.6px; text-transform:uppercase; color:${C.muet};${extra}">${txt}</div>`
  const pluriel = (n, mot) => `${n} ${mot}${n > 1 ? 's' : ''}`

  const fait = activite.exercices > 0
    ? `Pendant l'essai, ${nom} a révisé <b>${pluriel(activite.jours, 'jour')}</b> et fait <b>${pluriel(activite.exercices, 'séance')} d'exercices</b>${activite.enPlus > 0 ? `, dont ${activite.enPlus} au-delà des ${LIMITE_EXERCICES_GRATUIT} par jour de la version gratuite` : ''}.`
    : activite.jours > 0
      ? `Pendant l'essai, ${nom} a révisé <b>${pluriel(activite.jours, 'jour')}</b>.`
      : null

  const action = lien
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:4px 0 20px; background:${C.surligneur}; border-radius:14px;"><tr><td style="padding:16px;">
            ${p(`Si vous voulez que ${nom} garde ses exercices illimités, le paiement se fait ici, sans créer de compte : Réviz+ continue tout de suite sur son compte.`, ' margin:0 0 14px; font-size:15px;')}
            <table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="background:${C.encre}; border-radius:12px;">
              <a href="${escapeHtml(lien)}" style="display:inline-block; padding:14px 24px; font-family:${POLICE}; font-size:15px; font-weight:700; color:#FFFFFF; text-decoration:none;">Offrir Réviz+ à ${propre ? nom : 'votre enfant'} →</a>
            </td></tr></table>
          </td></tr></table>`
    : `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:4px 0 20px; background:${C.surligneur}; border-radius:14px;"><tr><td style="padding:16px;">
            ${p(`Pour le garder : ouvrez app.revizapp.fr dans un navigateur avec le compte ${propre ? `de ${nom}` : 'de votre enfant'}, puis Réglages, rubrique Réviz+. L'abonnement vaut aussi dans l'app.`, ' margin:0 0 14px; font-size:15px;')}
            <table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="background:${C.encre}; border-radius:12px;">
              <a href="${APP}/reglages#abonnement" style="display:inline-block; padding:14px 24px; font-family:${POLICE}; font-size:15px; font-weight:700; color:#FFFFFF; text-decoration:none;">Voir Réviz+ →</a>
            </td></tr></table>
          </td></tr></table>`

  return {
    subject,
    html: `
<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escapeHtml(subject)}</title></head>
<body style="margin:0; padding:0; background:${C.fond};">
  <div style="display:none; max-height:0; overflow:hidden; color:${C.fond};">Après l'essai, Réviz reste gratuit, avec ${LIMITE_EXERCICES_GRATUIT} séances d'exercices par jour.</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.fond}; padding:28px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px; background:${C.carte}; border-radius:20px; overflow:hidden;">
        <tr><td style="padding:28px 28px 8px;">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%"><tr>
            <td style="vertical-align:middle;">
              ${surtitre('Réviz · essai Réviz+')}
              <h1 style="margin:10px 0 0; font-family:${POLICE}; font-size:24px; line-height:1.25; font-weight:800; color:${C.texte};">${escapeHtml(subject)}.</h1>
            </td>
            <td width="96" style="vertical-align:top; padding-left:12px;">
              <img src="${MASCOTTE}" width="88" height="88" alt="Réviz, le cerveau, qui prend des notes" style="display:block; width:88px; height:auto; border:0;">
            </td>
          </tr></table>
        </td></tr>
        <tr><td style="padding:12px 28px 0;">
          ${p('Bonjour,')}
          ${p(`Il y a une semaine, ${nom} a fait ses ${LIMITE_EXERCICES_GRATUIT} séances d'exercices de la journée sur Réviz. Pour l'encourager, nous lui avons offert Réviz+ pendant 7 jours, sans rien à payer.`)}
          ${fait ? p(fait) : ''}
          ${p(`${quand.charAt(0).toUpperCase() + quand.slice(1)}, l'essai s'arrête tout seul : rien n'est prélevé, rien n'est à résilier. ${Nom} garde ses ${LIMITE_EXERCICES_GRATUIT} séances d'exercices par jour, et le programme, les cours et les fiches restent gratuits.`)}
          ${p(`Réviz+ coûte <b>${annuel.montant} par an</b> (soit ${annuel.parMois} par mois) ou <b>${mensuel.montant} par mois</b>, sans engagement et sans publicité.`, ' font-size:15px;')}
          ${action}
        </td></tr>
        <tr><td style="padding:0 28px 26px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid ${C.filet};"><tr><td style="padding-top:16px;">
            ${p('Une question ? Répondez simplement à ce message : c\'est moi qui lis les réponses.', ` margin:0; font-size:14px; color:${C.second};`)}
            ${p('Johan, de Réviz', ` margin:12px 0 0; font-size:14px; font-weight:700; color:${C.encre};`)}
          </td></tr></table>
        </td></tr>
      </table>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;"><tr><td style="padding:16px 20px 0; font-family:${POLICE}; font-size:12px; line-height:1.6; color:${C.muet};">
        Vous recevez ce message parce que vous avez donné votre accord pour ${propre ? nom : 'votre enfant'} sur Réviz. Un seul, à la fin de l'essai.<br/>
        ${desabo ? `<a href="${escapeHtml(desabo)}" style="color:${C.muet};">Ne plus recevoir d'e-mails de Réviz</a> · ` : ''}<a href="${APP}/legal/cgv" style="color:${C.muet};">Conditions de vente</a> · <a href="${APP}/legal/confidentialite" style="color:${C.muet};">Politique de confidentialité</a>
      </td></tr></table>
    </td></tr>
  </table>
</body></html>`,
  }
}

/**
 * Parcourt les accords parentaux et prévient les parents dont l'essai de l'enfant finit dans les 24 h.
 * @param {{ db, envoyer, auth?: { getUser }|null, lienOffrir?: ((uid:string)=>string|null)|null, maintenant?: number, secret?: string, journal?: (m:string)=>void }} p
 *   envoyer : ({ from, to, replyTo, subject, html, headers }) => Promise ; une réponse { error }
 *   de Resend compte comme un échec (pas de marque, nouvel essai au prochain passage s'il reste du temps).
 * @returns {Promise<{ finsEssaiParent: number }>}
 */
export async function envoyerFinsEssai({ db, envoyer, auth = null, lienOffrir = null, maintenant = Date.now(), secret = process.env.CRON_SECRET, journal = m => console.error(m) }) {
  const demandes = await db.collectionGroup('parentalConsent').get()
  let finsEssaiParent = 0
  for (const doc of demandes.docs) {
    if (envoyer.epuise?.()) break
    const d = doc.data()
    if (!d.parentEmail || d.status !== 'approved') continue
    const uid = doc.ref.parent.parent.id
    try {
      const ref = db.collection('users').doc(uid)
      const profil = await ref.get()
      if (!profil.exists) continue
      const u = profil.data() ?? {}
      if (!essaiFinitBientot(u, maintenant)) continue
      if (u.plan === 'premium' || u.bilansParent === false || u.finEssaiParentLe) continue
      if (auth?.getUser) {
        const compte = await auth.getUser(uid).catch(() => null)
        if (!compte || compte.disabled) continue
      }
      const revs = await ref.collection('revisions').where('revisedAt', '>=', u.essaiPlus.debut).get().catch(() => null)
      const activite = activiteEssai(revs?.docs?.map(x => x.data()) ?? [], u.essaiPlus.debut, maintenant)
      const desabo = lienDesaboParent(uid, secret)
      const mail = mailFinEssai({ prenom: u.prenom, fin: u.essaiPlus.fin, activite, lien: lienOffrir?.(uid) ?? null, desabo })
      const r = await envoyer({
        from: EXPEDITEUR, to: d.parentEmail, replyTo: REPONDRE_A, ...mail,
        ...(desabo ? { headers: { 'List-Unsubscribe': `<${desabo}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' } } : {}),
      })
      if (r?.error) throw new Error(r.error.message || 'envoi refusé')
      await ref.update({ finEssaiParentLe: maintenant })
      finsEssaiParent++
    } catch (err) {
      journal(`[fin-essai] ${uid} : ${err?.message || err}`)
    }
  }
  return { finsEssaiParent }
}
