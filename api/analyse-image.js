import { buildSystemPrompt, LESSON_IMAGE_INSTRUCTION, MODEL } from './_systemPrompt.js'
import { getDb, getAuthAdmin } from './_firebaseAdmin.js'
import { consumeQuota, refundQuota, FREE_LIMIT } from './_quota.js'

// Runtime Node (pas edge) : nécessaire pour firebase-admin (quota + auth).
export const config = { maxDuration: 60 }

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']

// Plafond de la chaîne base64 reçue (~3,1 Mo binaire). Le client réduit déjà
// toute image à 1568px / JPEG q0.85 (downscaleImage.js) → typiquement <1 Mo,
// donc ce garde ne rejette jamais une photo d'élève normale. Il n'intercepte
// que le cas rare où le downscale a échoué (image originale renvoyée telle
// quelle) ou un client modifié, et évite un 413 opaque de Vercel (cap ~4,5 Mo
// du body) en renvoyant une erreur propre. base64 pèse ~33 % de plus que le
// binaire ; 4 Mio de base64 laissent la marge JSON + idToken sous le cap Vercel.
const MAX_IMAGE_BASE64 = 4 * 1024 * 1024

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method not allowed')

  const { imageData, mediaType, idToken, level } = req.body ?? {}

  if (typeof imageData !== 'string' || !imageData || !mediaType) return res.status(400).send('Missing image data')
  if (!level?.cycle) return res.status(400).send('MISSING_LEVEL')
  if (!ALLOWED_TYPES.includes(mediaType)) return res.status(400).send('INVALID_MEDIA_TYPE')
  if (imageData.length > MAX_IMAGE_BASE64) return res.status(413).send('IMAGE_TOO_LARGE')
  if (!idToken) return res.status(401).send('Unauthorized')

  // 1. Authentification
  let decoded
  try {
    decoded = await getAuthAdmin().verifyIdToken(idToken)
  } catch {
    return res.status(401).send('Unauthorized')
  }
  const uid = decoded.uid

  // Email vérifié obligatoire pour consommer un scan : le claim `email_verified`
  // vient du token signé, jamais du client.
  if (!decoded.email_verified) return res.status(403).send('EMAIL_NOT_VERIFIED')

  // 2. Quota serveur (source de vérité)
  const db = getDb()
  let isPremium = false
  try {
    const snap = await db.collection('users').doc(uid).get()
    isPremium = snap.exists && snap.data().plan === 'premium'
  } catch { /* quota free par prudence */ }

  let consumed = false
  if (!isPremium) {
    const q = await consumeQuota({ db, uid, limit: FREE_LIMIT })
    if (!q.allowed) return res.status(429).send('RATE_LIMIT')
    consumed = true
  }

  // 3. Appel Anthropic vision (non-streaming)
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
        messages: [
          {
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', media_type: mediaType, data: imageData } },
              { type: 'text', text: LESSON_IMAGE_INSTRUCTION },
            ],
          },
        ],
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
