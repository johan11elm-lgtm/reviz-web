import { SYSTEM_PROMPT, MODEL } from './_systemPrompt.js'

export const config = { runtime: 'edge' }

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  let text, idToken
  try {
    const body = await req.json()
    text    = body.text
    idToken = body.idToken
  } catch {
    return new Response('Bad request', { status: 400 })
  }

  if (!text) return new Response('Missing text', { status: 400 })

  // Vérification du token Firebase (bloque les abus sans compte)
  if (idToken) {
    const firebaseKey = process.env.FIREBASE_API_KEY
    if (firebaseKey) {
      try {
        const verifyResp = await fetch(
          `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${firebaseKey}`,
          { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idToken }) }
        )
        if (!verifyResp.ok) return new Response('Unauthorized', { status: 401 })
        const { users } = await verifyResp.json()
        if (!users?.[0]) return new Response('Unauthorized', { status: 401 })
      } catch {
        return new Response('Unauthorized', { status: 401 })
      }
    }
  }

  if (typeof text !== 'string' || text.trim().length === 0)
    return new Response('Missing text', { status: 400 })
  if (text.length > 15000)
    return new Response('TEXT_TOO_LONG', { status: 400 })

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 25000)

  // Appel Anthropic en streaming
  let anthropicResp
  try {
    anthropicResp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 8192,
        stream: true,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: `Voici la leçon à analyser :\n\n${text}` }],
      }),
    })
  } catch {
    clearTimeout(timeout)
    return new Response('NETWORK_ERROR', { status: 502 })
  }
  clearTimeout(timeout)

  if (!anthropicResp.ok) {
    if (anthropicResp.status === 401 || anthropicResp.status === 403)
      return new Response('INVALID_API_KEY', { status: 502 })
    if (anthropicResp.status === 429)
      return new Response('RATE_LIMIT', { status: 429 })
    return new Response(`API_ERROR_${anthropicResp.status}`, { status: 502 })
  }

  // Pipe le stream Anthropic directement vers le client
  return new Response(anthropicResp.body, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'X-Accel-Buffering': 'no',
    },
  })
}
