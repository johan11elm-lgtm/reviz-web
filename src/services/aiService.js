// -------------------------------------------------------
// Réviz — Service IA (Anthropic Claude)
// En dev local (VITE_ANTHROPIC_API_KEY présente) : appel direct.
// En production (Vercel) : appel via le proxy /api/analyse.
// -------------------------------------------------------

import { auth } from './firebaseConfig.js'

const API_URL   = 'https://api.anthropic.com/v1/messages'
const MODEL     = 'claude-haiku-4-5-20251001'
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

export function startAnalysis(text) {
  _pendingProgressCb = null
  _pending = analyseLesson(text, (chars) => _pendingProgressCb?.(chars))
}

export function startAnalysisFromImage(imageDataUrl) {
  _pendingProgressCb = null
  _pending = analyseImage(imageDataUrl, (chars) => _pendingProgressCb?.(chars))
}

export function popPendingAnalysis(onProgress) {
  const p = _pending
  _pending = null
  _pendingProgressCb = onProgress   // enregistrement tardif du setter React
  return p                          // null si pas de pré-lancement
}

// Palette de couleurs injectée côté client dans les branches mindmap.
// Claude ne génère jamais de valeurs hexadécimales.
const BRANCH_COLORS = [
  { color: '#6366F1', bgLight: '#EEF2FF', colorLight: '#4338CA', bgDark: '#1E1B4B', colorDark: '#A5B4FC' },
  { color: '#FF6B00', bgLight: '#FFF4E6', colorLight: '#C05621', bgDark: '#2D1F0A', colorDark: '#FBD38D' },
  { color: '#22C55E', bgLight: '#F0FDF4', colorLight: '#15803D', bgDark: '#0D2818', colorDark: '#4ADE80' },
  { color: '#A855F7', bgLight: '#FAF5FF', colorLight: '#7E22CE', bgDark: '#2E1065', colorDark: '#D8B4FE' },
]

const SYSTEM_PROMPT = `Tu es Réviz, un assistant pédagogique pour les collégiens français (11-15 ans).
Ton rôle est d'analyser une leçon scolaire et de générer du contenu de révision structuré.

RÈGLES ABSOLUES :
- Réponds UNIQUEMENT avec du JSON valide, sans texte avant ni après.
- N'utilise JAMAIS de bloc markdown (\`\`\`json). Commence directement par {.
- Utilise un français clair, simple et adapté au collège.
- Sois précis, pédagogique et encourage l'élève.

FORMAT DE SORTIE OBLIGATOIRE (respecte exactement les noms de champs) :
{
  "metadata": {
    "title": "titre court de la leçon",
    "subject": "matière (Maths / Français / Histoire / SVT / Physique / Chimie / Géo / etc.)",
    "excerpt": "résumé en 1-2 phrases de l'essentiel de la leçon"
  },
  "flashcards": [
    { "front": "question ou notion à mémoriser", "back": "réponse complète et claire" }
  ],
  "quiz": [
    {
      "question": "question à choix multiples",
      "choices": ["choix A", "choix B", "choix C", "choix D"],
      "correct": 0,
      "explanation": "explication courte de la bonne réponse"
    }
  ],
  "resume": {
    "intro": "paragraphe d'introduction",
    "keyPoints": ["point clé 1", "point clé 2", "point clé 3"],
    "sections": [
      {
        "title": "1. Titre de section",
        "content": "contenu de la section",
        "formula": null,
        "formulaCaption": null
      }
    ],
    "keyTerms": [
      { "term": "mot clé", "def": "définition courte et claire" }
    ]
  },
  "mindmap": {
    "branches": [
      {
        "id": "identifiant_sans_espace",
        "label": "Label Court",
        "emoji": "📖",
        "detail": "explication de la branche en 1-2 phrases",
        "children": ["notion 1", "notion 2", "notion 3"],
        "position": "top"
      }
    ]
  }
}

QUANTITÉS OBLIGATOIRES :
- flashcards : 6 à 8 éléments
- quiz : 5 à 8 questions, exactement 4 choices par question, correct est l'index (0, 1, 2 ou 3)
- resume.keyPoints : 2 à 4 points
- resume.sections : 3 à 4 sections numérotées
- resume.keyTerms : 3 à 5 termes
- mindmap.branches : EXACTEMENT 4 branches, avec les positions "top", "right", "bottom", "left" dans cet ordre (une position unique par branche)`

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

function _parseResult(raw) {
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
  if (!parsed.metadata || !parsed.flashcards || !parsed.quiz || !parsed.resume || !parsed.mindmap) {
    throw new Error('INVALID_JSON')
  }
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

  let response
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, idToken }),
    })
  } catch {
    throw new Error('NETWORK_ERROR')
  }

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    if (response.status === 401) throw new Error('UNAUTHORIZED')
    if (response.status === 429 || body === 'RATE_LIMIT') throw new Error('RATE_LIMIT')
    if (body === 'INVALID_API_KEY') throw new Error('INVALID_API_KEY')
    throw new Error(body || `API_ERROR_${response.status}`)
  }

  return _readStream(response, onProgress)
}

// -------------------------------------------------------

export async function analyseLesson(text, onProgress) {
  if (USE_PROXY) {
    return _callProxy('/api/analyse', { text }, onProgress)
  }

  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY

  // Appel API direct (dev local uniquement)
  let response
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
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: `Voici la leçon à analyser :\n\n${text}` }],
      }),
    })
  } catch {
    throw new Error('NETWORK_ERROR')
  }

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
export async function analyseImage(imageDataUrl, onProgress) {
  // Extraire le base64 pur et le media type depuis le data URL
  const match = imageDataUrl.match(/^data:(image\/\w+);base64,(.+)$/)
  if (!match) throw new Error('INVALID_IMAGE')
  const [, mediaType, imageData] = match

  if (USE_PROXY) {
    return _callProxy('/api/analyse-image', { imageData, mediaType }, onProgress)
  }

  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY

  let response
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
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'image', source: { type: 'base64', media_type: mediaType, data: imageData } },
              { type: 'text',  text: 'Voici la photo de la leçon à analyser. Lis le texte visible sur la photo et génère le contenu de révision.' },
            ],
          },
        ],
      }),
    })
  } catch {
    throw new Error('NETWORK_ERROR')
  }

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) throw new Error('INVALID_API_KEY')
    if (response.status === 429) throw new Error('RATE_LIMIT')
    throw new Error(`API_ERROR_${response.status}`)
  }

  return _readStream(response, onProgress)
}
