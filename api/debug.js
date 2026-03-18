import { SYSTEM_PROMPT, MODEL } from './_systemPrompt.js'

export const config = { runtime: 'edge' }

export default async function handler(req) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return new Response('no api key', { status: 500 })

  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 512,
      stream: false,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: 'Leçon test : La photosynthèse est le processus par lequel les plantes fabriquent leur nourriture.' }],
    }),
  })

  const raw = await resp.text()
  return new Response(JSON.stringify({ status: resp.status, model: MODEL, body: raw }), {
    headers: { 'Content-Type': 'application/json' },
  })
}
