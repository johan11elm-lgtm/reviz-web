// -------------------------------------------------------
// Réviz — Service IA (Anthropic Claude)
// En dev local (VITE_ANTHROPIC_API_KEY présente) : appel direct.
// En production (Vercel) : appel via le proxy /api/analyse.
// -------------------------------------------------------

import { auth } from './firebaseConfig.js'
import { MODEL, BRANCH_COLORS, buildSystemPrompt, buildLessonUserMessage, LESSON_IMAGE_INSTRUCTION } from '../utils/aiPrompts.js'
import { downscaleDataUrl } from '../utils/downscaleImage.js'

const API_URL   = 'https://api.anthropic.com/v1/messages'
const USE_PROXY = !import.meta.env.VITE_ANTHROPIC_API_KEY ||
                  import.meta.env.VITE_ANTHROPIC_API_KEY.includes('REMPLACER')

async function getIdToken() {
  try { return (await auth.currentUser?.getIdToken()) ?? null } catch { return null }
}

// --- Pré-lancement : démarre l'appel depuis Scan.jsx pour économiser le délai de navigation ---
// Le streaming est activé dès le pré-lancement ; les events sont forwardés
// vers _pendingProgressCb que Analyse.jsx enregistre après la navigation.
let _pending = null
let _pendingProgressCb = null

export function startAnalysis(text, level) {
  _pendingProgressCb = null
  _pending = analyseLesson(text, (chars) => _pendingProgressCb?.(chars), level)
}

export function startAnalysisFromImage(imageDataUrl, level) {
  _pendingProgressCb = null
  _pending = analyseImage(imageDataUrl, (chars) => _pendingProgressCb?.(chars), level)
}

export function popPendingAnalysis(onProgress) {
  const p = _pending
  _pending = null
  _pendingProgressCb = onProgress   // enregistrement tardif du setter React
  return p                          // null si pas de pré-lancement
}

// -------------------------------------------------------
// Helpers partagés (streaming + parsing)
// -------------------------------------------------------
async function _readStream(response, onProgress) {
  let raw
  if (typeof onProgress === 'function') {
    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let accumulated = ''
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      const chunk = decoder.decode(value, { stream: true })
      for (const line of chunk.split('\n')) {
        if (!line.startsWith('data: ')) continue
        const payload = line.slice(6).trim()
        if (!payload || payload === '[DONE]') continue
        try {
          const event = JSON.parse(payload)
          if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
            accumulated += event.delta.text
            onProgress(accumulated.length)
          }
        } catch { /* ignore SSE malformés */ }
      }
    }
    raw = accumulated
  } else {
    const result = await response.json()
    raw = result.content?.[0]?.text
  }
  if (!raw) throw new Error('EMPTY_RESPONSE')
  return _parseResult(raw)
}

export function _parseResult(raw) {
  let parsed
  try {
    // 1. Essaie le JSON brut
    let cleaned = raw.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim()
    try {
      parsed = JSON.parse(cleaned)
    } catch {
      // 2. Extrait le premier objet JSON trouvé dans la réponse
      const start = cleaned.indexOf('{')
      const end   = cleaned.lastIndexOf('}')
      if (start === -1 || end === -1) throw new Error('no json')
      parsed = JSON.parse(cleaned.slice(start, end + 1))
    }
  } catch {
    throw new Error('INVALID_JSON')
  }

  if (!parsed || typeof parsed !== 'object') throw new Error('INVALID_JSON')

  // Refus de sûreté renvoyé par le modèle (contenu non scolaire / inapproprié).
  if (typeof parsed.error === 'string') {
    if (parsed.error === 'NON_SCOLAIRE') throw new Error('NON_SCOLAIRE')
    throw new Error('INVALID_JSON')
  }

  // Présence des blocs principaux
  if (!parsed.metadata || !parsed.flashcards || !parsed.quiz || !parsed.resume || !parsed.mindmap) {
    throw new Error('INVALID_JSON')
  }

  // Flashcards : tableau non vide d'items { front, back } texte
  if (!Array.isArray(parsed.flashcards) || parsed.flashcards.length === 0 ||
      !parsed.flashcards.every(c => c && typeof c.front === 'string' && typeof c.back === 'string')) {
    throw new Error('INVALID_JSON')
  }

  // Quiz : tableau non vide ; chaque item a question + 2 choix minimum +
  // un index `correct` valide (coercition string→number, corrige "1" vs 1).
  if (!Array.isArray(parsed.quiz) || parsed.quiz.length === 0) throw new Error('INVALID_JSON')
  parsed.quiz = parsed.quiz.map(q => {
    if (!q || typeof q.question !== 'string' || !Array.isArray(q.choices) || q.choices.length < 2) {
      throw new Error('INVALID_JSON')
    }
    const correct = Number(q.correct)
    if (!Number.isInteger(correct) || correct < 0 || correct >= q.choices.length) {
      throw new Error('INVALID_JSON')
    }
    return { ...q, correct }
  })

  // Résumé : sections / keyPoints / keyTerms doivent être des tableaux (sinon crash UI)
  const r = parsed.resume
  if (!r || !Array.isArray(r.keyPoints) || !Array.isArray(r.sections) || !Array.isArray(r.keyTerms)) {
    throw new Error('INVALID_JSON')
  }

  // Carte mentale
  if (!Array.isArray(parsed.mindmap.branches) || parsed.mindmap.branches.length === 0) {
    throw new Error('INVALID_JSON')
  }
  parsed.mindmap.branches = parsed.mindmap.branches.map((b, i) => ({
    ...b,
    ...BRANCH_COLORS[i % BRANCH_COLORS.length],
  }))
  return parsed
}

// -------------------------------------------------------
// Appel via proxy Vercel (production)
// -------------------------------------------------------
async function _callProxy(endpoint, payload, onProgress) {
  let idToken = null
  try { idToken = await getIdToken() } catch { /* non bloquant */ }

  // Simule la progression pendant l'attente (mode non-streaming)
  let ticker = null
  if (onProgress) {
    const milestones = [200, 600, 1200, 1800, 2400]
    let i = 0
    ticker = setInterval(() => {
      if (i < milestones.length) onProgress(milestones[i++])
    }, 800)
  }

  let response
  const controller = new AbortController()
  const fetchTimeout = setTimeout(() => controller.abort(), 30000)
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, idToken }),
      signal: controller.signal,
    })
  } catch (err) {
    clearTimeout(fetchTimeout)
    if (ticker) clearInterval(ticker)
    throw new Error(err.name === 'AbortError' ? 'TIMEOUT' : 'NETWORK_ERROR')
  }
  clearTimeout(fetchTimeout)

  if (!response.ok) {
    if (ticker) clearInterval(ticker)
    const body = await response.text().catch(() => '')
    if (response.status === 401) throw new Error('UNAUTHORIZED')
    if (response.status === 429 || body === 'RATE_LIMIT') throw new Error('RATE_LIMIT')
    if (body === 'INVALID_API_KEY') throw new Error('INVALID_API_KEY')
    throw new Error(body || `API_ERROR_${response.status}`)
  }

  // Le proxy retourne le texte brut (non-streaming)
  const raw = await response.text()
  if (ticker) clearInterval(ticker)
  if (onProgress) onProgress(raw.length)
  return _parseResult(raw)
}

// -------------------------------------------------------

export async function analyseLesson(text, onProgress, level) {
  if (!level?.cycle) throw new Error('MISSING_LEVEL')

  if (USE_PROXY) {
    return _callProxy('/api/analyse', { text, level }, onProgress)
  }

  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY

  // Appel API direct (dev local uniquement)
  let response
  const controller = new AbortController()
  const fetchTimeout = setTimeout(() => controller.abort(), 30000)
  try {
    response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 8192,
        stream: typeof onProgress === 'function',
        system: buildSystemPrompt(level),
        messages: [{ role: 'user', content: buildLessonUserMessage(text) }],
      }),
      signal: controller.signal,
    })
  } catch (err) {
    clearTimeout(fetchTimeout)
    throw new Error(err.name === 'AbortError' ? 'TIMEOUT' : 'NETWORK_ERROR')
  }
  clearTimeout(fetchTimeout)

  // Erreurs HTTP
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) throw new Error('INVALID_API_KEY')
    if (response.status === 429) throw new Error('RATE_LIMIT')
    throw new Error(`API_ERROR_${response.status}`)
  }

  return _readStream(response, onProgress)
}

// -------------------------------------------------------
// Analyse depuis une image (vision)
// -------------------------------------------------------
export async function analyseImage(imageDataUrl, onProgress, level) {
  if (!level?.cycle) throw new Error('MISSING_LEVEL')

  // Réduire l'image avant envoi (poids du payload serverless + coût vision)
  const downscaled = await downscaleDataUrl(imageDataUrl)
  // Extraire le base64 pur et le media type depuis le data URL
  const match = downscaled.match(/^data:(image\/\w+);base64,(.+)$/)
  if (!match) throw new Error('INVALID_IMAGE')
  const [, mediaType, imageData] = match

  if (USE_PROXY) {
    return _callProxy('/api/analyse-image', { imageData, mediaType, level }, onProgress)
  }

  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY

  let response
  const controller = new AbortController()
  const fetchTimeout = setTimeout(() => controller.abort(), 30000)
  try {
    response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 8192,
        stream: typeof onProgress === 'function',
        system: buildSystemPrompt(level),
        messages: [
          {
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', media_type: mediaType, data: imageData } },
              { type: 'text',  text: LESSON_IMAGE_INSTRUCTION },
            ],
          },
        ],
      }),
      signal: controller.signal,
    })
  } catch (err) {
    clearTimeout(fetchTimeout)
    throw new Error(err.name === 'AbortError' ? 'TIMEOUT' : 'NETWORK_ERROR')
  }
  clearTimeout(fetchTimeout)

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) throw new Error('INVALID_API_KEY')
    if (response.status === 429) throw new Error('RATE_LIMIT')
    throw new Error(`API_ERROR_${response.status}`)
  }

  return _readStream(response, onProgress)
}
