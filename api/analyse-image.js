import { SYSTEM_PROMPT, MODEL } from './_systemPrompt.js'

export const config = { runtime: 'edge' }

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  let imageData, mediaType, idToken
  try {
    const body = await req.json()
    imageData = body.imageData
    mediaType = body.mediaType
    idToken   = body.idToken
  } catch {
    return new Response('Bad request', { status: 400 })
  }

  if (!imageData || !mediaType) return new Response('Missing image data', { status: 400 })

  const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
  if (!ALLOWED_TYPES.includes(mediaType)) return new Response('INVALID_MEDIA_TYPE', { status: 400 })

  // Vérification du token Firebase (obligatoire)
  if (!idToken) return new Response('Unauthorized', { status: 401 })
  const firebaseKey = process.env.FIREBASE_API_KEY
  if (!firebaseKey) return new Response('Server configuration error', { status: 500 })
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

  // Appel Anthropic vision (non-streaming)
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
    return new Response('NETWORK_ERROR', { status: 502 })
  }

  if (!anthropicResp.ok) {
    if (anthropicResp.status === 401 || anthropicResp.status === 403)
      return new Response('INVALID_API_KEY', { status: 502 })
    if (anthropicResp.status === 429)
      return new Response('RATE_LIMIT', { status: 429 })
    return new Response(`API_ERROR_${anthropicResp.status}`, { status: 502 })
  }

  const result = await anthropicResp.json()
  const text_content = result.content?.[0]?.text ?? ''

  return new Response(text_content, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}
