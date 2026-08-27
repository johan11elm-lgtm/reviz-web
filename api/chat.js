import { MODEL, buildChatSystemPrompt, buildChatLessonContext, CHAT_MAX_MESSAGE_LENGTH, CHAT_MAX_HISTORY, CHAT_MAX_OUTPUT_TOKENS } from './_chatPrompt.js'
import { getDb, getAuthAdmin } from './_firebaseAdmin.js'
import { consumeChatQuota, refundChatQuota, CHAT_FREE_LIMIT, CHAT_PREMIUM_LIMIT } from './_chatQuota.js'

// Runtime Node (firebase-admin) + streaming SSE : contrairement à /api/analyse
// (JSON complet à parser → non-streaming), une réponse de chat est du texte
// libre affiché au fil de l'eau — le streaming est le bon choix ici.
export const config = { maxDuration: 60, supportsResponseStreaming: true }

// Une réponse du coach (~1024 tokens max) tient largement sous ce plafond ;
// au-delà c'est un historique forgé, pas une vraie conversation.
const MAX_ASSISTANT_LENGTH = 6000

// Valide et normalise l'historique envoyé par le client.
// Retourne le tableau nettoyé, ou null si invalide.
export function sanitizeMessages(messages) {
  if (!Array.isArray(messages) || messages.length === 0) return null
  const recent = messages.slice(-CHAT_MAX_HISTORY)
  const clean = []
  for (const m of recent) {
    if (!m || (m.role !== 'user' && m.role !== 'assistant')) return null
    if (typeof m.content !== 'string' || m.content.trim().length === 0) return null
    const max = m.role === 'user' ? CHAT_MAX_MESSAGE_LENGTH : MAX_ASSISTANT_LENGTH
    if (m.content.length > max) return null
    clean.push({ role: m.role, content: m.content })
  }
  // La conversation doit se terminer par la question de l'élève.
  if (clean[clean.length - 1].role !== 'user') return null
  return clean
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method not allowed')

  const { idToken, lessonId, messages, level } = req.body ?? {}

  if (typeof lessonId !== 'string' || !lessonId.trim()) return res.status(400).send('MISSING_LESSON')
  const cleanMessages = sanitizeMessages(messages)
  if (!cleanMessages) return res.status(400).send('INVALID_MESSAGES')
  if (!idToken) return res.status(401).send('Unauthorized')

  // 1. Authentification (vérification réelle de la signature du token Firebase)
  let decoded
  try {
    decoded = await getAuthAdmin().verifyIdToken(idToken)
  } catch {
    return res.status(401).send('Unauthorized')
  }
  const uid = decoded.uid
  if (!decoded.email_verified) return res.status(403).send('EMAIL_NOT_VERIFIED')

  // 2. Contexte = la leçon Firestore de CET élève (le client n'envoie qu'un id,
  //    jamais le contenu du system prompt) + plan pour le quota.
  const db = getDb()
  let lessonSnap, isPremium = false
  try {
    const [userSnap, lSnap] = await Promise.all([
      db.collection('users').doc(uid).get(),
      db.collection('users').doc(uid).collection('lessons').doc(lessonId).get(),
    ])
    isPremium = userSnap.exists && userSnap.data().plan === 'premium'
    lessonSnap = lSnap
  } catch {
    return res.status(502).send('NETWORK_ERROR')
  }
  if (!lessonSnap.exists) return res.status(404).send('LESSON_NOT_FOUND')

  // 3. Quota jour = SOURCE DE VÉRITÉ. Les premium ont aussi un plafond
  //    (généreux) : garde-fou coût, un chat se spamme plus vite qu'un scan.
  const limit = isPremium ? CHAT_PREMIUM_LIMIT : CHAT_FREE_LIMIT
  const q = await consumeChatQuota({ db, uid, limit })
  if (!q.allowed) return res.status(429).send('CHAT_LIMIT')

  // 4. Appel Anthropic en streaming
  const lessonContext = buildChatLessonContext(lessonSnap.data())
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
        max_tokens: CHAT_MAX_OUTPUT_TOKENS,
        stream: true,
        system: buildChatSystemPrompt(level, lessonContext),
        messages: cleanMessages,
      }),
    })
  } catch {
    await refundChatQuota({ db, uid }).catch(() => {})
    return res.status(502).send('NETWORK_ERROR')
  }

  if (!anthropicResp.ok) {
    await refundChatQuota({ db, uid }).catch(() => {})
    if (anthropicResp.status === 401 || anthropicResp.status === 403) return res.status(502).send('INVALID_API_KEY')
    if (anthropicResp.status === 429) return res.status(429).send('RATE_LIMIT')
    return res.status(502).send(`API_ERROR_${anthropicResp.status}`)
  }

  // 5. Pont SSE : on ne relaie que les deltas de texte (jamais le flux brut
  //    Anthropic — pas de métadonnées de modèle côté client).
  res.status(200)
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8')
  res.setHeader('Cache-Control', 'no-cache, no-transform')
  // Premier event : quota restant (affichage client purement informatif).
  res.write(`data: ${JSON.stringify({ meta: { remaining: q.remaining, limit } })}\n\n`)

  const decoder = new TextDecoder()
  let buffer = ''
  try {
    for await (const chunk of anthropicResp.body) {
      buffer += decoder.decode(chunk, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() // dernière ligne possiblement incomplète
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const payload = line.slice(6).trim()
        if (!payload) continue
        try {
          const event = JSON.parse(payload)
          if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
            res.write(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`)
          }
        } catch { /* ignore SSE malformés */ }
      }
    }
    res.write('data: [DONE]\n\n')
  } catch {
    // Flux interrompu (réseau ou client parti) : on signale si on peut encore écrire.
    try { res.write(`data: ${JSON.stringify({ error: 'STREAM_ERROR' })}\n\n`) } catch { /* noop */ }
  }
  res.end()
}
