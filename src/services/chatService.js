// -------------------------------------------------------
// Réviz — Service du coach de révision (chat contextuel)
// En dev local (VITE_ANTHROPIC_API_KEY présente) : appel direct Anthropic.
// En production (Vercel) : proxy /api/chat (auth + quota + contexte serveur).
// -------------------------------------------------------

import { auth } from './firebaseConfig.js'
import { apiFetch } from './apiClient.js'
import { loadLessons } from './historyService.js'
import { MODEL, buildChatSystemPrompt, buildChatLessonContext, CHAT_MAX_MESSAGE_LENGTH, CHAT_MAX_HISTORY, CHAT_MAX_OUTPUT_TOKENS } from '../utils/chatPrompts.js'

export { CHAT_MAX_MESSAGE_LENGTH }

const API_URL   = 'https://api.anthropic.com/v1/messages'
const USE_PROXY = !import.meta.env.VITE_ANTHROPIC_API_KEY ||
                  import.meta.env.VITE_ANTHROPIC_API_KEY.includes('REMPLACER')

async function getIdToken() {
  try { return (await auth.currentUser?.getIdToken()) ?? null } catch { return null }
}

// Lit un flux SSE ligne à ligne et appelle onEvent(payloadString) pour chaque event.
async function _forEachSseEvent(body, onEvent) {
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop()
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const payload = line.slice(6).trim()
      if (payload) onEvent(payload)
    }
  }
}

/**
 * Envoie la conversation au coach et streame la réponse.
 * @param {object} opts
 * @param {string} opts.lessonId  id de la leçon (contexte résolu côté serveur)
 * @param {Array<{role:'user'|'assistant', content:string}>} opts.history
 *   conversation complète, dernier message = la question de l'élève
 * @param {object} opts.level     niveau { cycle, classe }
 * @param {(text:string) => void} [opts.onDelta]  texte accumulé, à chaque delta
 * @returns {Promise<{text:string, remaining:number|null}>}
 * @throws {Error} CHAT_LIMIT | RATE_LIMIT | UNAUTHORIZED | EMAIL_NOT_VERIFIED |
 *   LESSON_NOT_FOUND | NETWORK_ERROR | TIMEOUT | EMPTY_RESPONSE | API_ERROR_xxx
 */
export async function sendCoachMessage({ lessonId, history, level, onDelta }) {
  const messages = history.slice(-CHAT_MAX_HISTORY)

  if (USE_PROXY) return _viaProxy({ lessonId, messages, level, onDelta })
  return _direct({ lessonId, messages, level, onDelta })
}

// Timeout uniquement jusqu'aux headers : une fois le stream ouvert, la lecture
// n'est plus bornée (les deltas arrivent au fil de l'eau).
async function _fetchWithHeaderTimeout(url, init) {
  const controller = new AbortController()
  const t = setTimeout(() => controller.abort(), 30000)
  try {
    return await apiFetch(url, { ...init, signal: controller.signal })
  } catch (err) {
    throw new Error(err.name === 'AbortError' ? 'TIMEOUT' : 'NETWORK_ERROR')
  } finally {
    clearTimeout(t)
  }
}

async function _viaProxy({ lessonId, messages, level, onDelta }) {
  const idToken = await getIdToken()

  const response = await _fetchWithHeaderTimeout('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken, lessonId, messages, level }),
  })

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    if (response.status === 401) throw new Error('UNAUTHORIZED')
    if (body === 'EMAIL_NOT_VERIFIED') throw new Error('EMAIL_NOT_VERIFIED')
    if (body === 'CHAT_LIMIT') throw new Error('CHAT_LIMIT')
    if (response.status === 429 || body === 'RATE_LIMIT') throw new Error('RATE_LIMIT')
    if (body === 'LESSON_NOT_FOUND') throw new Error('LESSON_NOT_FOUND')
    throw new Error(body || `API_ERROR_${response.status}`)
  }

  let text = ''
  let remaining = null
  let streamError = null
  await _forEachSseEvent(response.body, (payload) => {
    if (payload === '[DONE]') return
    try {
      const event = JSON.parse(payload)
      if (typeof event.text === 'string') {
        text += event.text
        onDelta?.(text)
      } else if (event.meta) {
        remaining = event.meta.remaining ?? null
      } else if (event.error) {
        streamError = event.error
      }
    } catch { /* ignore SSE malformés */ }
  })

  if (streamError && !text) throw new Error(streamError)
  if (!text) throw new Error('EMPTY_RESPONSE')
  return { text, remaining }
}

// Dev local uniquement : contexte construit depuis le cache local des leçons.
async function _direct({ lessonId, messages, level, onDelta }) {
  const entry = loadLessons().find(l => l.id === lessonId)
  if (!entry) throw new Error('LESSON_NOT_FOUND')

  const response = await _fetchWithHeaderTimeout(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': import.meta.env.VITE_ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: CHAT_MAX_OUTPUT_TOKENS,
      stream: true,
      system: buildChatSystemPrompt(level, buildChatLessonContext(entry)),
      messages,
    }),
  })

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) throw new Error('INVALID_API_KEY')
    if (response.status === 429) throw new Error('RATE_LIMIT')
    throw new Error(`API_ERROR_${response.status}`)
  }

  let text = ''
  await _forEachSseEvent(response.body, (payload) => {
    try {
      const event = JSON.parse(payload)
      if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
        text += event.delta.text
        onDelta?.(text)
      }
    } catch { /* ignore SSE malformés */ }
  })

  if (!text) throw new Error('EMPTY_RESPONSE')
  return { text, remaining: null }
}
