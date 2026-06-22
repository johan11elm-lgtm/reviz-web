import { buildSystemPrompt, buildLessonUserMessage, MODEL } from './_systemPrompt.js'
import { getDb, getAuthAdmin } from './_firebaseAdmin.js'
import { consumeQuota, refundQuota, FREE_LIMIT } from './_quota.js'

// Runtime Node (pas edge) : nécessaire pour firebase-admin (quota + auth).
// maxDuration élargi pour laisser le temps à la génération IA.
export const config = { maxDuration: 60 }

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method not allowed')

  const { text, idToken, level } = req.body ?? {}

  if (typeof text !== 'string' || text.trim().length === 0) return res.status(400).send('Missing text')
  if (text.length > 15000) return res.status(400).send('TEXT_TOO_LONG')
  if (!level?.cycle) return res.status(400).send('MISSING_LEVEL')
  if (!idToken) return res.status(401).send('Unauthorized')

  // 1. Authentification (vérification réelle de la signature du token Firebase)
  let uid
  try {
    uid = (await getAuthAdmin().verifyIdToken(idToken)).uid
  } catch {
    return res.status(401).send('Unauthorized')
  }

  // 2. Quota serveur = SOURCE DE VÉRITÉ (le localStorage client n'est qu'un affichage).
  const db = getDb()
  let isPremium = false
  try {
    const snap = await db.collection('users').doc(uid).get()
    isPremium = snap.exists && snap.data().plan === 'premium'
  } catch { /* en cas d'échec de lecture, on applique le quota free par prudence */ }

  let consumed = false
  if (!isPremium) {
    const q = await consumeQuota({ db, uid, limit: FREE_LIMIT })
    if (!q.allowed) return res.status(429).send('RATE_LIMIT')
    consumed = true
  }

  // 3. Appel Anthropic (non-streaming pour fiabilité)
  let anthropicResp
  try {
    anthropicResp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 8192,
        stream: false,
        system: buildSystemPrompt(level),
        messages: [{ role: 'user', content: buildLessonUserMessage(text) }],
      }),
    })
  } catch {
    if (consumed) await refundQuota({ db, uid }).catch(() => {})
    return res.status(502).send('NETWORK_ERROR')
  }

  if (!anthropicResp.ok) {
    if (consumed) await refundQuota({ db, uid }).catch(() => {})
    if (anthropicResp.status === 401 || anthropicResp.status === 403) return res.status(502).send('INVALID_API_KEY')
    if (anthropicResp.status === 429) return res.status(429).send('RATE_LIMIT')
    return res.status(502).send(`API_ERROR_${anthropicResp.status}`)
  }

  const result = await anthropicResp.json()
  const text_content = result.content?.[0]?.text ?? ''

  // Refus de sûreté (contenu non scolaire) : on ne facture pas un scan à l'élève.
  if (consumed && /"error"\s*:\s*"NON_SCOLAIRE"/.test(text_content)) {
    await refundQuota({ db, uid }).catch(() => {})
  }

  res.setHeader('Content-Type', 'text/plain; charset=utf-8')
  return res.status(200).send(text_content)
}
