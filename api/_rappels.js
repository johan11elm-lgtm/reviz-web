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

// Ancienne palette (crème, encre, Geist) : encore celle du bilan au parent (api/_bilanParent.js).
export const C = { fond: '#F2E7DA', carte: '#FFFFFF', encre: '#2D2B57', texte: '#1B1A23', second: '#6B6557', muet: '#8A826F', filet: '#EADFD0', surligneur: '#FFE6D2' }
export const POLICE ="'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif"

// Nouvelle DA de l'app (28/10, src/styles/global.css) : fond sable, carte blanche, marine,
// orange vif, lavande, Poppins (Gmail ne charge pas la police : repli système).
export const DA = {
  fond: '#F5EFEB', carte: '#FFFFFF', encre: '#042A65', tranche: '#001330', doux: '#4A5B78', ligne: '#E6DFD8',
  vif: '#FF4B0A', orange: '#D8400A', orangeTexte: '#B83706', lavande: '#E4E0FA', peche: '#FFE6D2',
}
const POPPINS = "'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif"
// Réviz qui accueille à bras ouverts (pose « retour »), et la tête du logo : servies par l'app.
const MASCOTTE = `${APP}/mascot/pose-s4-retour@512.png`
const EMOTE = `${APP}/mascot/pose-9-hello@256.png`
const PASTILLE = `${APP}/logo/pastille.png`

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

  const subject = !titre ? 'Ton premier chapitre t\'attend'
    : scan ? `Ta leçon « ${titre} » t'attend`
    : `${titre} : tu t'en souviens ?`
  // Titre à deux couleurs, comme l'accueil de l'app : marine, puis orange.
  const [haut, bas, sous] = !safeTitre ? ['Hier, tu as créé ton compte.', 'Aujourd\'hui, premier chapitre.', null]
    : scan ? ['Hier, tu as scanné', `${safeTitre}.`, 'Ta leçon est prête, elle n\'attend plus que toi.']
    : ['Hier, tu as commencé', `${safeTitre}.`, 'Aujourd\'hui, on vérifie que c\'est resté.']
  const detail = !safeTitre
    ? 'Choisis un chapitre de ton programme : trois minutes, quelques questions, et ton cerveau fait le reste.'
    : scan
      ? `Résumé, flashcards et quiz de ta leçon${safeMatiere ? ` de ${safeMatiere}` : ''} sont prêts. Trois minutes suffisent pour que ça tienne.`
      : `Le quiz prend trois minutes : quelques questions${safeMatiere ? ` de ${safeMatiere}` : ''}, et ton cerveau fait le reste.`
  const bouton = !safeTitre ? 'Choisir un chapitre' : scan ? 'Reprendre ma leçon' : 'Faire le quiz'
  const demandeAdresse = accord === 'adresse' && !!lienAccord
  const surtitre = `Le lendemain${safeMatiere ? ` · ${safeMatiere}` : ''}`

  const p = (txt, extra = '') => `<p style="margin:0 0 16px; font-family:${POPPINS}; font-size:16px; line-height:1.6; color:${DA.doux};${extra}">${txt}</p>`
  // Bouton plein marine en relief (tranche foncée dessous), comme les boutons de l'app.
  const gros = (href, texte) => `
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:4px 0 20px;"><tr><td align="center" style="background:${DA.encre}; border-radius:14px; border-bottom:4px solid ${DA.tranche};">
            <a href="${href}" style="display:block; padding:16px 20px; font-family:${POPPINS}; font-size:17px; font-weight:700; line-height:1.2; color:#FFFFFF; text-decoration:none;">${texte} →</a>
          </td></tr></table>`
  const encadre = (txt, fond = DA.lavande) => `
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 18px;"><tr><td style="background:${fond}; border-radius:18px; padding:14px 16px; font-family:${POPPINS}; font-size:14px; line-height:1.55; color:${DA.encre};">
            ${txt}
          </td></tr></table>`
  // Le lien de vérification d'adresse porte toujours sur le bouton principal.
  // Une ligne discrète sous le bouton, pas un deuxième encadré.
  const verification = verifieAdresse ? p('Ce lien confirme aussi ton adresse e&#8209;mail : pas besoin de chercher l\'autre mail.', ' margin:-8px 0 18px; text-align:center; font-size:13px; line-height:1.5;') : ''
  const corps = demandeAdresse
    ? `
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 18px;"><tr>
            <td width="64" style="background:${DA.lavande}; border-radius:18px 0 0 18px; padding:14px 0 14px 14px; vertical-align:top;">
              <img src="${EMOTE}" width="50" height="50" alt="" style="display:block; width:50px; height:auto; border:0;">
            </td>
            <td style="background:${DA.lavande}; border-radius:0 18px 18px 0; padding:14px 16px 14px 10px; font-family:${POPPINS}; font-size:15px; line-height:1.55; color:${DA.encre};">
              <strong>Une chose d'abord :</strong> comme tu as moins de 15 ans, un parent doit dire oui pour que tu gardes ton compte. Tu tapes son adresse, il reçoit un mail avec un bouton. Trente secondes, et tout ce que tu as révisé reste à toi.
            </td>
          </tr></table>
          ${gros(lienAccord, 'Prévenir un parent')}
          ${verification}
          ${p(`<a href="${lien}" style="color:${DA.orangeTexte}; font-weight:700; text-decoration:underline;">${!safeTitre ? 'Ou choisis un chapitre' : scan ? 'Ou reprends ta leçon' : 'Ou fais le quiz'} tout de suite</a>`, ' text-align:center; font-size:15px;')}`
    : `
          ${p(detail)}
          ${gros(lien, bouton)}
          ${verification}
          ${accord === 'attente' ? encadre('<strong>Ton parent n\'a pas encore dit oui.</strong> Il a reçu un mail de Réviz avec le bouton «&nbsp;Donner mon autorisation&nbsp;» : montre-le-lui (et regardez dans ses spams s\'il ne le trouve pas). Sans son accord, ton compte sera mis en pause.', DA.peche) : ''}`
  return {
    subject,
    html: `
<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width">
<meta name="color-scheme" content="light only"><meta name="supported-color-schemes" content="light only">
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700;800&display=swap" rel="stylesheet">
<title>${escapeHtml(subject)}</title></head>
<body style="margin:0; padding:0; background:${DA.fond};">
  <div style="display:none; max-height:0; overflow:hidden; color:${DA.fond};">${escapeHtml(subject)}. Trois minutes, et c'est dans la boîte.</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${DA.fond}; padding:22px 12px 28px;">
    <tr><td align="center">
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 14px;"><tr>
        <td style="font-family:${POPPINS}; font-size:28px; font-weight:800; letter-spacing:-0.5px; color:${DA.encre}; vertical-align:middle;">réviz</td>
        <td style="padding-left:3px; vertical-align:middle;"><img src="${PASTILLE}" width="34" height="34" alt="" style="display:block; width:34px; height:34px; border:0;"></td>
      </tr></table>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px; background:${DA.carte}; border-radius:28px; box-shadow:0 4px 14px rgba(4,42,101,0.07), 0 1px 3px rgba(0,0,0,0.04);">
        <tr><td style="padding:16px 16px 0;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="background:${DA.vif}; border-radius:22px; padding:20px 0 0; line-height:0;">
            <img src="${MASCOTTE}" width="170" height="170" alt="Réviz, le cerveau, qui t'accueille à bras ouverts" style="display:block; margin:0 auto; width:170px; height:auto; border:0;">
          </td></tr></table>
        </td></tr>
        <tr><td style="padding:22px 26px 0;">
          <div style="font-family:${POPPINS}; font-size:12px; font-weight:700; letter-spacing:0.8px; text-transform:uppercase; color:${DA.orangeTexte};">${surtitre}</div>
          <h1 style="margin:8px 0 0; font-family:${POPPINS}; font-size:27px; line-height:1.18; font-weight:800; letter-spacing:-0.4px; color:${DA.encre};">${haut}<br><span style="color:${DA.orange};">${bas}</span></h1>
          ${sous ? `<p style="margin:10px 0 0; font-family:${POPPINS}; font-size:17px; line-height:1.45; color:${DA.doux};">${sous}</p>` : ''}
        </td></tr>
        <tr><td style="padding:20px 26px 0;">
          ${p(safeName ? `Salut <strong style="color:${DA.encre};">${safeName}</strong>,` : 'Salut,')}
          ${corps}
        </td></tr>
        <tr><td style="padding:2px 26px 26px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid ${DA.ligne};"><tr><td style="padding-top:18px;">
            <div style="font-family:${POPPINS}; font-size:15px; font-weight:800; color:${DA.encre};">Pourquoi maintenant ?</div>
            ${p('Ce qu\'on revoit le lendemain reste. Ce qu\'on laisse filer s\'efface. C\'est toute la méthode de Réviz : un peu, souvent, et jamais la veille à 23&nbsp;h.', ' margin:6px 0 0; font-size:14px;')}
            ${p('— Réviz, le cerveau (pas l\'appli, le cerveau)', ` margin:12px 0 0; font-size:14px; font-weight:700; color:${DA.encre};`)}
          </td></tr></table>
        </td></tr>
      </table>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;"><tr><td align="center" style="padding:18px 20px 0; font-family:${POPPINS}; font-size:12px; line-height:1.7; color:${DA.doux};">
        Tu reçois ce message une seule fois, le lendemain de ton arrivée sur Réviz.<br/>
        ${desabo ? `<a href="${desabo}" style="color:${DA.doux};">Ne plus recevoir de rappels</a> · ` : ''}<a href="${APP}/legal/confidentialite" style="color:${DA.doux};">Politique de confidentialité</a> · <a href="${APP}" style="color:${DA.doux};">app.revizapp.fr</a>
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
