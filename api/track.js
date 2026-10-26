// -------------------------------------------------------
// Réviz — Compteur d'usage anonyme
// Reçoit des événements (« essai démarré », « chapitre ouvert »…) et
// incrémente des TOTAUX par jour dans Firestore (stats/{AAAA-MM-JJ}).
// Aucune donnée personnelle : pas d'identifiant, pas d'adresse IP, pas
// d'horodatage individuel — seulement des compteurs agrégés, avec des
// valeurs prises dans des listes fermées. Rien n'est lu ni écrit sur
// l'appareil de l'élève, donc pas de consentement à recueillir.
//
// Deux greffes (limite de 12 fonctions du plan Vercel Hobby) :
// - une révision faite en mode essai porte aussi `essai: { id, revision }` :
//   elle est enregistrée dans essais/{id}/revisions, pour compter les élèves
//   qui reviennent sans compte. L'identifiant d'essai est tiré au hasard sur
//   l'appareil, sans prénom ni rien qui identifie l'élève ; ces données ne
//   servent qu'aux statistiques (mesure d'audience exemptée de consentement,
//   CNIL) et sont purgées après 13 mois sans révision (api/battle-nettoyage.js).
// - ?op=desabonner&uid=…&t=… (GET depuis l'e-mail, POST en un clic depuis la
//   messagerie) : plus de rappel par e-mail pour ce compte (api/_rappels.js).
// -------------------------------------------------------
import { FieldValue } from 'firebase-admin/firestore'
import { getDb } from './_firebaseAdmin.js'
import { CODES_VIDEO } from '../src/utils/codesVideo.js'
import { RAISONS_ILLISIBLE, RAISONS_NON_SCOLAIRE } from '../src/utils/aiPrompts.js'
import { signatureValide } from './_rappels.js'
import { ESSAI_ID_RE, CHAPITRE_ID_RE } from '../src/utils/retour.js'

export const EVENTS = [
  'essai_demarre', 'compte_cree', 'programme_ouvert', 'chapitre_ouvert', 'revision', 'quiz_termine',
  // Battle : salon ouvert, partie rejointe et terminée, revanche, clic « Créer mon
  // compte » en fin de partie, clic « Lancer une battle » dans la popup de lancement.
  'battle_creee', 'battle_rejointe', 'battle_terminee', 'battle_revanche', 'battle_compte_propose', 'battle_annonce_cta',
  // Installation de la web app : tutoriel ouvert, installation confirmée par le navigateur.
  'installer_ouvert', 'app_installee',
  // Autorisation parentale : email du parent envoyé, ou « Plus tard » (15 jours pour le donner).
  'consent_envoye', 'consent_plus_tard',
  // Format mené jusqu'au bout (dernière question du quiz, dernière carte).
  'revision_terminee',
  // Lancement : clic « Scanner une leçon » dans la popup « Réviz+ offert ».
  'revizplus_offert_cta',
  // Scan d'une leçon : analyse réussie, ou écran d'erreur affiché (avec son code).
  'scan_reussi', 'scan_erreur',
  // Ouverture de l'app (une fois par jour et par appareil), avec l'ancienneté.
  'ouverture',
]

const ALLOWED = {
  mode: ['essai', 'compte'],
  device: ['mobile', 'ordinateur', 'app'],
  classe: ['6ème', '5ème', '4ème', '3ème', '2nde', '1ère', 'Terminale'],
  matiere: [
    'Maths', 'Français', 'Histoire', 'Géographie', 'SVT', 'Physique-Chimie', 'Technologie',
    'Anglais', 'Allemand', 'Espagnol', 'Sciences et technologie', 'Latin', 'Arts', 'EMC',
    'SES', 'NSI', 'Philosophie', 'Autre',
  ],
  format: ['flashcards', 'quiz', 'resume', 'mindmap'],
  source: ['programme', 'scan', 'photo', 'texte'],
  joueur: ['compte', 'invite'],
  issue: ['victoire', 'egalite', 'forfait'],
  plateforme: ['ios', 'android', 'ordinateur'],
  // Jours écoulés depuis le début de l'essai ou la création du compte, par
  // tranches : « essai_j1 » = un essai rouvert le lendemain de son début.
  anciennete: ['essai', 'compte'].flatMap(m => ['j0', 'j1', 'j2_7', 'j8_30', 'j31_plus'].map(t => `${m}_${t}`)),
  // Provenance (`?via=` dans le lien de bio, d'une épingle, d'une affiche ou
  // d'une fiche publique du site, d'une vidéo) : d'où vient l'élève, sans rien
  // identifier. « reseaux » : vidéo publiée à la fois sur TikTok et Instagram ;
  // « rappel » : e-mail du lendemain de la première session.
  via: ['tiktok', 'instagram', 'reseaux', 'pinterest', 'youtube', 'affiche', 'landing', 'fiche', 'rappel'],
  // Vidéo d'origine (adresse courte revizapp.fr/<code>) : seulement les codes
  // du tableau src/utils/codesVideo.js.
  v: Object.keys(CODES_VIDEO),
  // Code de l'erreur de scan (jamais le texte de la leçon). Les codes
  // API_ERROR_<statut HTTP> sont acceptés à part ; tout le reste devient « AUTRE ».
  code: [
    'NON_SCOLAIRE', 'ILLISIBLE', 'RATE_LIMIT', 'NETWORK_ERROR', 'TIMEOUT', 'UNAUTHORIZED', 'EMAIL_NOT_VERIFIED',
    'TEXT_TOO_LONG', 'IMAGE_TOO_LARGE', 'INVALID_IMAGE', 'INVALID_MEDIA_TYPE', 'INVALID_JSON',
    'EMPTY_RESPONSE', 'MISSING_API_KEY', 'INVALID_API_KEY', 'MISSING_LEVEL',
  ],
  // Raison d'un refus du scan (photo illisible ou contenu non scolaire), donnée par le modèle dans
  // une liste fermée : jamais rien de la photo ni de la leçon.
  raison: [...RAISONS_ILLISIBLE, ...RAISONS_NON_SCOLAIRE],
}

const API_ERROR = /^API_ERROR_[1-5]\d\d$/

/** Date du jour à Paris, au format AAAA-MM-JJ (un document par jour). */
export function parisDay(now = new Date()) {
  return new Intl.DateTimeFormat('fr-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
}

/**
 * Valide un événement et construit la mise à jour Firestore (incréments
 * imbriqués). Renvoie null si l'événement est inconnu. Les propriétés hors
 * liste fermée sont ignorées (une matière inconnue devient « Autre »).
 */
export function buildUpdate(event, props = {}, increment = n => n) {
  if (!EVENTS.includes(event)) return null
  const entry = { total: increment(1) }
  for (const [key, values] of Object.entries(ALLOWED)) {
    let v = props?.[key]
    if (v == null || v === '') continue
    v = String(v)
    if (!values.includes(v)) {
      if (key === 'matiere') v = 'Autre'
      else if (key === 'code') v = API_ERROR.test(v) ? v : 'AUTRE'
      else continue
    }
    entry[key] = { [v]: increment(1) }
  }
  return { [event]: entry }
}

/**
 * Révision d'essai à enregistrer : identifiant d'essai et entrée validés,
 * valeurs prises dans les listes fermées. null si rien de valable.
 * @returns {{ id: string, revisionId: string, data: object }|null}
 */
export function essaiRevision(event, essai, now = Date.now()) {
  if (event !== 'revision' && event !== 'revision_terminee') return null
  const id = essai?.id
  const r = essai?.revision
  if (typeof id !== 'string' || !ESSAI_ID_RE.test(id)) return null
  if (typeof r?.id !== 'string' || !/^\d{10,16}$/.test(r.id)) return null
  if (event === 'revision_terminee') return { id, revisionId: r.id, data: { termineAt: now } }
  if (!ALLOWED.format.includes(r.type)) return null
  const data = { type: r.type, revisedAt: now }
  if (ALLOWED.source.includes(r.source)) data.source = r.source
  if (typeof r.chapterId === 'string' && CHAPITRE_ID_RE.test(r.chapterId)) data.chapterId = r.chapterId
  if (ALLOWED.classe.includes(r.classe)) data.classe = r.classe
  if (ALLOWED.matiere.includes(r.matiere)) data.matiere = r.matiere
  return { id, revisionId: r.id, data }
}

async function enregistrerEssai(db, event, rev) {
  const ref = db.collection('essais').doc(rev.id)
  await ref.collection('revisions').doc(rev.revisionId).set(rev.data, { merge: true })
  if (event === 'revision') {
    await ref.set({ derniereRevisionAt: rev.data.revisedAt, revisions: FieldValue.increment(1) }, { merge: true })
  }
}

const page = corps => `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Réviz</title></head>
<body style="font-family:-apple-system,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#1A1A1A">
<h1 style="font-size:24px">Réviz</h1>${corps}</body></html>`

const escAttr = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))

// GET : page de confirmation qui NE MODIFIE RIEN (les messageries ouvrent
// les liens d'un e-mail pour les analyser) ; POST : désinscription, depuis
// le bouton de la page ou le désabonnement en un clic de la messagerie (RFC 8058).
async function desabonner(req, res) {
  const uid = req.query?.uid
  const t = req.query?.t
  if (typeof uid !== 'string' || !/^[A-Za-z0-9]{10,128}$/.test(uid) || !signatureValide(uid, t)) {
    return res.status(400).send('Lien invalide')
  }
  res.setHeader?.('Content-Type', 'text/html; charset=utf-8')
  if (req.method === 'GET') {
    const action = `/api/track?op=desabonner&uid=${encodeURIComponent(uid)}&t=${escAttr(t)}`
    return res.status(200).send(page(`<p style="font-size:16px;line-height:1.5;color:#444">Tu ne veux plus recevoir de rappel de révision par e-mail ?</p>
<form method="post" action="${action}"><button type="submit" style="background:#1A1A1A;color:#fff;border:0;padding:14px 28px;border-radius:10px;font-weight:600;font-size:15px">Ne plus recevoir de rappels</button></form>`))
  }
  try {
    await getDb().collection('users').doc(uid).set({ rappels: false }, { merge: true })
  } catch {
    return res.status(500).send('Error')
  }
  return res.status(200).send(page(`<p style="font-size:16px;line-height:1.5;color:#444">C'est noté : tu ne recevras plus de rappel de révision par e-mail.</p>
<p><a href="https://app.revizapp.fr/" style="color:#1A1A1A">Ouvrir Réviz</a></p>`))
}

export default async function handler(req, res) {
  if (req.query?.op === 'desabonner' && (req.method === 'GET' || req.method === 'POST')) return desabonner(req, res)
  if (req.method !== 'POST') return res.status(405).send('Method not allowed')
  let body = req.body
  if (typeof body === 'string') {
    if (body.length > 2000) return res.status(413).send('Too large')
    try { body = JSON.parse(body) } catch { return res.status(400).send('Bad JSON') }
  }
  const update = buildUpdate(body?.event, body?.props, n => FieldValue.increment(n))
  if (!update) return res.status(400).send('Unknown event')
  try {
    const db = getDb()
    const rev = essaiRevision(body.event, body.essai)
    await Promise.all([
      db.collection('stats').doc(parisDay()).set(update, { merge: true }),
      rev ? enregistrerEssai(db, body.event, rev) : null,
    ])
  } catch {
    return res.status(500).send('Error')
  }
  return res.status(204).send('')
}
