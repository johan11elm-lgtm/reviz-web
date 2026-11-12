// -------------------------------------------------------
// Réviz — Partager une conversation avec Réviz IA (11/11, repris de Knowunity : « Un chat que
// quelqu'un a partagé avec toi » → « Continuer cette conversation »). L'élève crée un lien ; qui
// l'ouvre lit la conversation sur /partage/:id, sans compte, puis peut essayer Réviz.
//
//   ?op=partage (POST, jeton Firebase) { titre?, messages } → { id }
//   ?op=partage&id=… (GET)                                 → { titre, messages, creeLe } ou 404
// partages/{id} = { uid, titre, messages, creeLe, expire } : écrit par le serveur seul. Ni prénom
// ni pièce jointe : seulement le texte des messages, 20 au plus, 4 000 caractères chacun. Le lien
// expire au bout de DUREE_JOURS jours ; au plus MAX_PAR_JOUR liens par élève et par jour.
// Les réponses de Réviz IA ne sont publiées que signées par api/chat.js pour cet élève
// (api/_signatureIA.js) : sinon on pourrait lui faire dire n'importe quoi sur une page publique.
// -------------------------------------------------------
import { randomBytes } from 'node:crypto'
import { reponseSignee } from './_signatureIA.js'

export const DUREE_JOURS = 30
export const MAX_MESSAGES = 20
export const MAX_CARACTERES = 4000
export const MAX_PAR_JOUR = 10
const ID_RE = /^[a-z0-9]{12}$/
const JOUR = 86_400_000

/** Le texte d'un message : une chaîne, ou les parties « text » d'un message avec image. */
function texteDe(contenu) {
  if (typeof contenu === 'string') return contenu
  if (Array.isArray(contenu)) return contenu.filter(p => p?.type === 'text' && typeof p.text === 'string').map(p => p.text).join('\n')
  return ''
}

/**
 * Les messages publiables. verifier(texte, sig) : la réponse de Réviz IA est-elle bien la sienne ?
 * Une réponse non signée (ou retouchée) est retirée, avec la question qui la précède.
 */
export function nettoyerMessages(messages, verifier = () => true) {
  if (!Array.isArray(messages)) return []
  const propres = []
  for (const m of messages) {
    if (!m || (m.role !== 'user' && m.role !== 'assistant')) continue
    const texte = texteDe(m.content).trim()
    if (!texte) continue
    if (m.role === 'assistant' && !verifier(texte, m.sig)) {
      if (propres.at(-1)?.role === 'user') propres.pop()
      continue
    }
    propres.push({ role: m.role, content: texte.slice(0, MAX_CARACTERES) })
  }
  return propres.slice(-MAX_MESSAGES)
}

const nouvelId = () => [...randomBytes(12)].map(b => 'abcdefghijklmnopqrstuvwxyz0123456789'[b % 36]).join('')

export async function routePartage(req, res, { db, auth, maintenant = Date.now(), secret = process.env.CRON_SECRET }) {
  if (req.method === 'GET') {
    const id = String(req.query?.id ?? '')
    if (!ID_RE.test(id)) return res.status(404).json({ error: 'INTROUVABLE' })
    const snap = await db.collection('partages').doc(id).get()
    const p = snap.exists ? snap.data() : null
    if (!p || p.expire < maintenant) return res.status(404).json({ error: 'INTROUVABLE' })
    res.setHeader?.('Cache-Control', 'public, max-age=300')
    return res.status(200).json({ titre: p.titre ?? null, messages: p.messages, creeLe: p.creeLe })
  }

  let uid
  try {
    const d = await auth.verifyIdToken(req.body?.idToken)
    if (d.firebase?.sign_in_provider === 'anonymous') return res.status(409).json({ error: 'COMPTE' })
    uid = d.uid
  } catch { return res.status(401).json({ error: 'UNAUTHORIZED' }) }
  const messages = nettoyerMessages(req.body?.messages, (texte, sig) => reponseSignee(uid, texte, sig, secret))
  if (!messages.some(m => m.role === 'assistant')) return res.status(400).json({ error: 'VIDE' })
  const titre = typeof req.body?.titre === 'string' ? req.body.titre.trim().slice(0, 120) : null

  // Un seul filtre (pas d'index composite à créer) : les liens de l'élève, comptés sur 24 h.
  const siens = await db.collection('partages').where('uid', '==', uid).get()
  if (siens.docs.filter(d => d.data().creeLe > maintenant - JOUR).length >= MAX_PAR_JOUR) return res.status(429).json({ error: 'TROP' })

  const id = nouvelId()
  await db.collection('partages').doc(id).set({ uid, titre, messages, creeLe: maintenant, expire: maintenant + DUREE_JOURS * JOUR })
  return res.status(200).json({ id })
}
