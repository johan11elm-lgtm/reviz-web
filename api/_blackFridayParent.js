// -------------------------------------------------------
// Réviz — Black Friday : un e-mail aux parents (26/11, validé par Johan)
//
// Le parent est celui qui paie, et il n'entend parler de Réviz+ que si son enfant le lui
// demande. Pendant le Black Friday (api/_offres.js), le cron quotidien de
// api/send-parental-consent.js écrit UNE fois à chaque parent qui a donné son accord :
// le prix réduit, ce que Réviz+ débloque, et le lien pour l'offrir sans créer de compte
// (api/_demandePlus.js, la page affiche déjà les prix du Black Friday).
// Règles :
// - accord parental donné (status approved), adresse connue ;
// - élève sans Réviz+ payé, compte actif ;
// - jamais après « Ne plus recevoir » (users/{uid}.bilansParent = false) ;
// - une seule fois par compte (users/{uid}.blackFridayParentLe) ; ce qui n'est pas parti un
//   jour (quota d'e-mails) part le lendemain, tant que la promo court.
// -------------------------------------------------------
import { C, POLICE, escapeHtml, prenomPropre } from './_rappels.js'
import { lienDesaboParent, REPONDRE_A } from './_bilanParent.js'
import { prixDe } from './_prix.js'
import { BLACK_FRIDAY, PASS_BREVET, blackFridayEnCours, passPropose } from './_offres.js'
import { LIMITE_EXERCICES_GRATUIT } from './_essaiPlus.js'

const APP = 'https://app.revizapp.fr'
const JOUR_MS = 24 * 60 * 60 * 1000
const EXPEDITEUR = 'Réviz <noreply@revizapp.fr>'
const MASCOTTE = `${APP}/mascot/pose-6-writing@256.png`

/**
 * Le mail : sujet et HTML (styles en ligne, comme les autres mails aux parents).
 * @param {{ prenom?: string|null, classe?: string|null, lien?: string|null, desabo?: string|null, maintenant?: number }} p
 */
export function mailBlackFridayParent({ prenom = null, classe = null, lien = null, desabo = null, maintenant = Date.now() }) {
  const brut = prenomPropre(prenom)
  const propre = brut ? brut.charAt(0).toUpperCase() + brut.slice(1) : null
  const nom = propre ? escapeHtml(propre) : 'votre enfant'
  const pour = propre ? nom : 'votre enfant'
  const pass = passPropose(classe, maintenant)
  const offre = pass
    ? { prix: BLACK_FRIDAY.remises.pass.montant, base: PASS_BREVET.montant, quoi: 'le Pass brevet',
      detail: `Réviz+ jusqu'au ${PASS_BREVET.finTexte}, payé une seule fois : pas d'abonnement, rien à résilier.` }
    : { prix: BLACK_FRIDAY.remises.annuel.montant, base: prixDe('annuel').montant, quoi: 'Réviz+ pour un an',
      detail: `${BLACK_FRIDAY.remises.annuel.montant} la première année au lieu de ${prixDe('annuel').montant}, puis résiliable à tout moment.` }
  const subject = pass
    ? `Black Friday : le Pass brevet de ${propre ?? 'votre enfant'} à ${offre.prix}`
    : `Black Friday : Réviz+ pour ${propre ?? 'votre enfant'} à ${offre.prix} au lieu de ${offre.base}`

  const p = (txt, extra = '') => `<p style="margin:0 0 14px; font-family:${POLICE}; font-size:16px; line-height:1.55; color:${C.texte};${extra}">${txt}</p>`
  const ligne = (titre, detail) => `<tr><td style="padding:9px 0; border-top:1px solid ${C.filet}; font-family:${POLICE};">
    <div style="font-size:15px; font-weight:700; color:${C.texte};">${titre}</div><div style="font-size:13.5px; color:${C.second};">${detail}</div></td></tr>`
  const bouton = lien
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:6px 0 10px;"><tr><td style="background:#D8400A; border-radius:12px;">
        <a href="${escapeHtml(lien)}" style="display:inline-block; padding:15px 26px; font-family:${POLICE}; font-size:16px; font-weight:700; color:#FFFFFF; text-decoration:none;">Offrir Réviz+ à ${pour} →</a>
      </td></tr></table>
      ${p('Sans créer de compte : Réviz+ s\'active tout de suite sur son compte.', ` font-size:13.5px; color:${C.second};`)}`
    : p(`Pour en profiter : ouvrez app.revizapp.fr avec le compte ${propre ? `de ${nom}` : 'de votre enfant'}, puis Réglages, rubrique Réviz+.`)

  return {
    subject,
    html: `
<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escapeHtml(subject)}</title></head>
<body style="margin:0; padding:0; background:${C.fond};">
  <div style="display:none; max-height:0; overflow:hidden; color:${C.fond};">Jusqu'au ${BLACK_FRIDAY.dernierJour} seulement. ${offre.detail}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.fond}; padding:28px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px; background:${C.carte}; border-radius:20px; overflow:hidden;">
        <tr><td style="background:#042A65; padding:24px 28px;">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%"><tr>
            <td style="vertical-align:middle; font-family:${POLICE}; color:#FFFFFF;">
              <div style="display:inline-block; padding:4px 10px; border-radius:8px; background:#D8400A; font-size:12px; font-weight:800; letter-spacing:1px; text-transform:uppercase;">Black Friday</div>
              <div style="margin-top:10px; font-size:46px; line-height:1; font-weight:800;">${offre.prix}</div>
              <div style="margin-top:4px; font-size:15px; opacity:.8;">au lieu de <s>${offre.base}</s> · jusqu'au ${BLACK_FRIDAY.dernierJour}</div>
            </td>
            <td width="96" style="vertical-align:middle; padding-left:12px;">
              <img src="${MASCOTTE}" width="88" height="88" alt="Réviz, le cerveau, qui prend des notes" style="display:block; width:88px; height:auto; border:0;">
            </td>
          </tr></table>
        </td></tr>
        <tr><td style="padding:24px 28px 0;">
          ${p('Bonjour,')}
          ${p(`${propre ? nom : 'Votre enfant'} révise avec Réviz. Jusqu'au ${BLACK_FRIDAY.dernierJour} à minuit, ${offre.quoi} est à <b>${offre.prix} au lieu de ${offre.base}</b>. ${offre.detail}`)}
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 18px;">
            ${ligne('Exercices illimités', `au lieu de ${LIMITE_EXERCICES_GRATUIT} séances par jour`)}
            ${ligne('Scans de leçons illimités', 'ses cours photographiés deviennent fiches et quiz')}
            ${ligne('Réviz IA chaque jour', '50 questions par jour au lieu de 10 par semaine')}
          </table>
          ${bouton}
          ${p('Sans publicité, et ses données ne sont jamais revendues. Le programme, les cours et les fiches restent gratuits.', ` font-size:14px; color:${C.second};`)}
        </td></tr>
        <tr><td style="padding:0 28px 26px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid ${C.filet};"><tr><td style="padding-top:16px;">
            ${p('Une question ? Répondez simplement à ce message : c\'est moi qui lis les réponses.', ` margin:0; font-size:14px; color:${C.second};`)}
            ${p('Johan, de Réviz', ` margin:12px 0 0; font-size:14px; font-weight:700; color:${C.encre};`)}
          </td></tr></table>
        </td></tr>
      </table>
      <p style="max-width:520px; margin:16px auto 0; font-family:${POLICE}; font-size:12px; line-height:1.6; color:${C.muet}; text-align:center;">
        ${desabo ? `<a href="${escapeHtml(desabo)}" style="color:${C.muet};">Ne plus recevoir d'e-mails de Réviz</a> · ` : ''}<a href="${APP}/legal/cgv" style="color:${C.muet};">Conditions de vente</a> · <a href="${APP}/legal/confidentialite" style="color:${C.muet};">Politique de confidentialité</a>
      </p>
    </td></tr>
  </table>
</body></html>`,
  }
}

/**
 * Pendant le Black Friday, écrit une fois à chaque parent qui a donné son accord.
 * @returns {Promise<{ blackFridayParents: number }>}
 */
export async function envoyerBlackFridayParents({ db, envoyer, auth = null, lienOffrir = null, maintenant = Date.now(), secret = process.env.CRON_SECRET, journal = m => console.error(m) }) {
  if (!blackFridayEnCours(maintenant)) return { blackFridayParents: 0 }
  const demandes = await db.collectionGroup('parentalConsent').get()
  let blackFridayParents = 0
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
      if (u.plan === 'premium' || u.bilansParent === false || u.blackFridayParentLe) continue
      // Un autre mail est parti aujourd'hui (bilan, fin d'essai, limite) : celui-ci attend demain.
      if ([u.bilanParentLe, u.finEssaiParentLe, u.limiteParentLe].some(t => Number.isFinite(t) && maintenant - t < JOUR_MS)) continue
      if (auth?.getUser) {
        const compte = await auth.getUser(uid).catch(() => null)
        if (!compte || compte.disabled) continue
      }
      const desabo = lienDesaboParent(uid, secret)
      const mail = mailBlackFridayParent({ prenom: u.prenom, classe: u.level?.classe ?? u.classe ?? null, lien: lienOffrir?.(uid) ?? null, desabo, maintenant })
      const r = await envoyer({
        from: EXPEDITEUR, to: d.parentEmail, replyTo: REPONDRE_A, ...mail,
        ...(desabo ? { headers: { 'List-Unsubscribe': `<${desabo}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' } } : {}),
      })
      if (r?.error) throw new Error(r.error.message || 'envoi refusé')
      await ref.update({ blackFridayParentLe: maintenant })
      blackFridayParents++
    } catch (err) {
      journal(`[black-friday] ${uid} : ${err?.message || err}`)
    }
  }
  return { blackFridayParents }
}
