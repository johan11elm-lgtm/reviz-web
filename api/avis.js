// -------------------------------------------------------
// Réviz — Avis (page publique /avis)
// Reçoit un avis (profil, « le conseilleriez-vous ? », ce qui plaît, ce
// qui manque, e-mail facultatif) et l'enregistre dans Firestore
// (avis/{id}). Écrit par le serveur seul : la règle par défaut refuse tout
// accès client à cette collection, rien à déployer. Pas d'adresse IP ni
// d'identifiant : seulement ce que la personne a écrit, la date, la
// provenance (affiche, profil…) et le type d'appareil.
// -------------------------------------------------------
import { getDb } from './_firebaseAdmin.js'

export const PROFILS = ['enseignant', 'eleve', 'parent', 'autre']
export const CONSEILS = ['oui', 'peut-etre', 'non']
export const DISCIPLINES = [
  'Mathématiques', 'Français', 'Histoire-géographie', 'SVT', 'Physique-chimie', 'Technologie',
  'Langues vivantes', 'Langues anciennes', 'Arts plastiques', 'Éducation musicale', 'EPS',
  'Documentation', 'Vie scolaire', 'Autre',
]
export const SOURCES = ['affiche-profs', 'affiche-cdi', 'profil', 'accueil', 'direct']
const DEVICES = ['mobile', 'ordinateur', 'app']

export const MAX_TEXTE = 2000
const MAX_CORPS = 12000

function texte(v, max = MAX_TEXTE) {
  if (typeof v !== 'string') return ''
  return v.trim().slice(0, max)
}

/**
 * Valide le corps reçu et construit le document à enregistrer.
 * Renvoie { avis } si tout va bien, { spam: true } si le champ piège est
 * rempli (on répond « OK » sans rien garder), sinon { error }.
 */
export function buildAvis(body, now = new Date()) {
  if (!body || typeof body !== 'object') return { error: 'BAD_BODY' }
  if (texte(body.site)) return { spam: true }

  const profil = body.profil
  if (!PROFILS.includes(profil)) return { error: 'PROFIL' }

  const avis = { profil, createdAt: now }
  if (profil === 'enseignant' && DISCIPLINES.includes(body.discipline)) avis.discipline = body.discipline
  if (CONSEILS.includes(body.conseil)) avis.conseil = body.conseil

  const plait = texte(body.plait)
  const manque = texte(body.manque)
  if (plait) avis.plait = plait
  if (manque) avis.manque = manque
  if (!avis.conseil && !plait && !manque) return { error: 'VIDE' }

  const email = texte(body.email, 200)
  if (email) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: 'EMAIL' }
    avis.email = email
  }

  avis.source = SOURCES.includes(body.source) ? body.source : 'direct'
  if (DEVICES.includes(body.device)) avis.device = body.device
  return { avis }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' })
  let body = req.body
  if (typeof body === 'string') {
    if (body.length > MAX_CORPS) return res.status(413).json({ error: 'TOO_LARGE' })
    try { body = JSON.parse(body) } catch { return res.status(400).json({ error: 'BAD_JSON' }) }
  } else if (JSON.stringify(body ?? {}).length > MAX_CORPS) {
    return res.status(413).json({ error: 'TOO_LARGE' })
  }

  const { avis, spam, error } = buildAvis(body)
  if (spam) return res.status(204).send('')
  if (error) return res.status(400).json({ error })
  try {
    await getDb().collection('avis').add(avis)
  } catch {
    return res.status(500).json({ error: 'SERVER' })
  }
  return res.status(204).send('')
}
