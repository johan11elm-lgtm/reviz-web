// -------------------------------------------------------
// Réviz — Compteur d'usage anonyme
// Reçoit des événements (« essai démarré », « chapitre ouvert »…) et
// incrémente des TOTAUX par jour dans Firestore (stats/{AAAA-MM-JJ}).
// Aucune donnée personnelle : pas d'identifiant, pas d'adresse IP, pas
// d'horodatage individuel — seulement des compteurs agrégés, avec des
// valeurs prises dans des listes fermées. Rien n'est lu ni écrit sur
// l'appareil de l'élève, donc pas de consentement à recueillir.
// -------------------------------------------------------
import { FieldValue } from 'firebase-admin/firestore'
import { getDb } from './_firebaseAdmin.js'

export const EVENTS = [
  'essai_demarre', 'compte_cree', 'programme_ouvert', 'chapitre_ouvert', 'revision', 'quiz_termine',
  // Battle : salon ouvert, partie rejointe et terminée, revanche, clic « Créer mon
  // compte » en fin de partie, clic « Lancer une battle » dans la popup de lancement.
  'battle_creee', 'battle_rejointe', 'battle_terminee', 'battle_revanche', 'battle_compte_propose', 'battle_annonce_cta',
  // Installation de la web app : tutoriel ouvert, installation confirmée par le navigateur.
  'installer_ouvert', 'app_installee',
  // Lancement : clic « Scanner une leçon » dans la popup « Réviz+ offert ».
  'revizplus_offert_cta',
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
  source: ['programme', 'scan'],
  joueur: ['compte', 'invite'],
  issue: ['victoire', 'egalite', 'forfait'],
  plateforme: ['ios', 'android', 'ordinateur'],
  // Provenance (`?via=` dans le lien de bio, d'une épingle ou d'une affiche) :
  // d'où vient l'élève, sans rien identifier.
  via: ['tiktok', 'instagram', 'pinterest', 'youtube', 'affiche', 'landing'],
}

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
      else continue
    }
    entry[key] = { [v]: increment(1) }
  }
  return { [event]: entry }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method not allowed')
  let body = req.body
  if (typeof body === 'string') {
    if (body.length > 2000) return res.status(413).send('Too large')
    try { body = JSON.parse(body) } catch { return res.status(400).send('Bad JSON') }
  }
  const update = buildUpdate(body?.event, body?.props, n => FieldValue.increment(n))
  if (!update) return res.status(400).send('Unknown event')
  try {
    await getDb().collection('stats').doc(parisDay()).set(update, { merge: true })
  } catch {
    return res.status(500).send('Error')
  }
  return res.status(204).send('')
}
