import { buildSystemPrompt, LESSON_IMAGE_INSTRUCTION, MODEL, MODEL_RELECTURE } from './_systemPrompt.js'
import { getDb, getAuthAdmin } from './_firebaseAdmin.js'
import { compteVerifie } from './_compteVerifie.js'
import { consumeQuota, refundQuota, FREE_LIMIT } from './_quota.js'
import { LANCEMENT_SCAN_LIMIT } from './_lancement.js'
import { revizPlusOffertServeur } from './_offert.js'

// Runtime Node (pas edge) : nécessaire pour firebase-admin (quota + auth).
export const config = { maxDuration: 120 }
const ANTHROPIC_TIMEOUT_MS = 100000

const REFUS = /"error"\s*:\s*"(NON_SCOLAIRE|ILLISIBLE)"/

// Texte de la réponse : le premier bloc texte (avec la réflexion activée, le premier bloc
// est un bloc « thinking »).
const texteDe = data => data?.content?.find(b => b.type === 'text' || b.type == null)?.text ?? ''

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

  // Email pas encore confirmé (cf. _compteVerifie.js) : un scan d'essai,
  // ensuite EMAIL_NOT_VERIFIED (_quota.js, SCANS_SANS_EMAIL).
  const sansEmail = !compteVerifie(decoded)

  // 2. Quota serveur (source de vérité)
  const db = getDb()
  let isPremium = false
  try {
    const snap = await db.collection('users').doc(uid).get()
    isPremium = snap.exists && snap.data().plan === 'premium'
  } catch { /* quota free par prudence */ }

  let consumed = false
  if (!isPremium || sansEmail) {
    const offert = await revizPlusOffertServeur()
    const q = await consumeQuota({ db, uid, limit: offert ? LANCEMENT_SCAN_LIMIT : FREE_LIMIT, sansEmail })
    if (!q.allowed) return q.sansEmail ? res.status(403).send('EMAIL_NOT_VERIFIED') : res.status(429).send('RATE_LIMIT')
    consumed = true
  }

  // 3. Appel Anthropic vision (non-streaming). Un délai commun aux deux lectures : abandon
  // avant la fin de la fonction (maxDuration) et avant le client (ANALYSE_TIMEOUT_MS),
  // le scan est alors remboursé et l'élève voit TIMEOUT.
  const echeance = Date.now() + ANTHROPIC_TIMEOUT_MS
  const lire = (model, extra = {}) => fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    signal: AbortSignal.timeout(Math.max(1000, echeance - Date.now())),
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
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
      ...extra,
    }),
  })

  let anthropicResp
  try {
    anthropicResp = await lire(MODEL)
  } catch (err) {
    if (consumed) await refundQuota({ db, uid, sansEmail }).catch(() => {})
    if (err?.name === 'TimeoutError') return res.status(504).send('TIMEOUT')
    return res.status(502).send('NETWORK_ERROR')
  }

  if (!anthropicResp.ok) {
    if (consumed) await refundQuota({ db, uid, sansEmail }).catch(() => {})
    if (anthropicResp.status === 401 || anthropicResp.status === 403) return res.status(502).send('INVALID_API_KEY')
    if (anthropicResp.status === 429) return res.status(429).send('RATE_LIMIT')
    return res.status(502).send(`API_ERROR_${anthropicResp.status}`)
  }

  let text_content = texteDe(await anthropicResp.json())

  // Refus de la première lecture : la moitié des refus étaient de vraies leçons mal lues
  // (écriture manuscrite surtout). Seconde lecture par MODEL_RELECTURE ; si elle échoue
  // ou refuse aussi, l'élève reçoit le premier refus, comme avant.
  if (REFUS.test(text_content)) {
    const premier = text_content.match(REFUS)[1]
    let issue = 'echec'
    try {
      // Effort bas : la consigne est fixe, il s'agit surtout de lire la photo.
      const r = await lire(MODEL_RELECTURE, { output_config: { effort: 'low' } })
      if (r.ok) {
        const data = await r.json()
        const relu = data.stop_reason === 'refusal' ? '' : texteDe(data)
        if (relu && !REFUS.test(relu)) { text_content = relu; issue = 'lecon' } else if (relu) issue = 'refus'
      }
    } catch { /* délai dépassé ou réseau : on garde le premier refus */ }
    // Journal Vercel : codes seulement, jamais rien de la photo.
    console.info('scan relecture', JSON.stringify({ premier, issue }))
  }

  // Refus (contenu non scolaire, ou photo d'une leçon trop difficile à lire) : on ne facture pas un scan à l'élève.
  if (consumed && REFUS.test(text_content)) {
    await refundQuota({ db, uid, sansEmail }).catch(() => {})
  }

  res.setHeader('Content-Type', 'text/plain; charset=utf-8')
  return res.status(200).send(text_content)
}
