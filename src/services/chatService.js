// -------------------------------------------------------
// Réviz — Service du coach de révision (chat contextuel)
// En dev local (VITE_ANTHROPIC_API_KEY présente) : appel direct Anthropic.
// En production (Vercel) : proxy /api/chat (auth + quota + contexte serveur).
// -------------------------------------------------------

import { auth } from './firebaseConfig.js'
import { apiFetch } from './apiClient.js'
import { loadLessons } from './historyService.js'
import { buildChatRequest, buildChatLessonContext, CHAT_MESSAGE_REFUS, CHAT_MAX_MESSAGE_LENGTH, CHAT_MAX_HISTORY } from '../utils/chatPrompts.js'
import { jourParis } from '../utils/retour.js'
import { traceCarte } from '../utils/agent.js'
import { memoriserQuotaCoach } from '../utils/revizPlus.js'

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
 * @param {string|null} opts.lessonId  id de la leçon (contexte résolu côté serveur) ;
 *   null : Réviz IA sans leçon, en agent (agenda, erreurs, programme ; api/_agent.js)
 * @param {Array<{role:'user'|'assistant', content:string, cartes?:object[]}>} opts.history
 *   conversation complète, dernier message = la question de l'élève
 * @param {object} opts.level     niveau { cycle, classe }
 * @param {(text:string) => void} [opts.onDelta]  texte accumulé, à chaque delta
 * @param {(libelle:string) => void} [opts.onOutil]  agent : ce qu'il regarde (« Je regarde ton agenda… »)
 * @param {(cartes:object[]) => void} [opts.onCarte]  agent : les cartes reçues jusque-là
 * @param {object[]} [opts.erreurs]  agent : questions ratées récentes (erreursRecentes)
 * @returns {Promise<{text:string, remaining:number|null, cartes:object[]}>}
 * @throws {Error} CHAT_LIMIT | RATE_LIMIT | UNAUTHORIZED | EMAIL_NOT_VERIFIED |
 *   LESSON_NOT_FOUND | NETWORK_ERROR | TIMEOUT | EMPTY_RESPONSE | AGENT_SERVEUR | API_ERROR_xxx
 */
export async function sendCoachMessage({ lessonId = null, history, level, onDelta, onOutil, onCarte, erreurs }) {
  // Les cartes déjà montrées restent dans l'historique sous forme de trace (le modèle sait ce
  // qu'il a proposé), sans partir avec leurs données.
  const messages = history.slice(-CHAT_MAX_HISTORY).map(m => ({
    role: m.role,
    content: m.cartes?.length ? `${m.content}\n\n${m.cartes.map(traceCarte).join('\n')}` : m.content,
  }))

  if (USE_PROXY) return _viaProxy({ lessonId, messages, level, onDelta, onOutil, onCarte, erreurs: lessonId ? undefined : erreurs })
  // L'agent lit Firestore et le programme côté serveur : pas d'appel direct possible.
  if (!lessonId) throw new Error('AGENT_SERVEUR')
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

async function _viaProxy({ lessonId, messages, level, onDelta, onOutil, onCarte, erreurs }) {
  const idToken = await getIdToken()

  const response = await _fetchWithHeaderTimeout('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken, ...(lessonId ? { lessonId } : { erreurs }), messages, level }),
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
  const cartes = []
  await _forEachSseEvent(response.body, (payload) => {
    if (payload === '[DONE]') return
    try {
      const event = JSON.parse(payload)
      if (typeof event.text === 'string') {
        text += event.text
        onDelta?.(text)
      } else if (event.carte) {
        cartes.push(event.carte)
        onCarte?.([...cartes])
      } else if (typeof event.outil === 'string') {
        onOutil?.(event.outil)
      } else if (event.meta) {
        remaining = event.meta.remaining ?? null
        memoriserQuotaCoach(event.meta.remaining, event.meta.limit)
      } else if (event.error) {
        streamError = event.error
      }
    } catch { /* ignore SSE malformés */ }
  })

  if (streamError && !text && !cartes.length) throw new Error(streamError)
  if (!text && !cartes.length) throw new Error('EMPTY_RESPONSE')
  return { text, remaining, cartes }
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
      ...buildChatRequest({ level, lessonContext: buildChatLessonContext(entry), messages, aujourdhui: jourParis() }),
      stream: true,
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
      } else if (event.type === 'message_delta' && event.delta?.stop_reason === 'refusal') {
        text += `\n\n${CHAT_MESSAGE_REFUS}`
        onDelta?.(text)
      }
    } catch { /* ignore SSE malformés */ }
  })

  if (!text) throw new Error('EMPTY_RESPONSE')
  return { text, remaining: null }
}
