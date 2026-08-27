import { describe, it, expect, vi, beforeEach } from 'vitest'

const verifyIdToken = vi.fn()
const consumeChatQuota = vi.fn()
const refundChatQuota = vi.fn()
const getUserDoc = vi.fn()
const getLessonDoc = vi.fn()

vi.mock('../_firebaseAdmin.js', () => ({
  getAuthAdmin: () => ({ verifyIdToken }),
  getDb: () => ({
    collection: () => ({
      doc: () => ({
        get: (...a) => getUserDoc(...a),
        collection: () => ({
          doc: () => ({ get: (...a) => getLessonDoc(...a) }),
        }),
      }),
    }),
  }),
}))
vi.mock('../_chatQuota.js', () => ({
  CHAT_FREE_LIMIT: 10,
  CHAT_PREMIUM_LIMIT: 200,
  consumeChatQuota: (...a) => consumeChatQuota(...a),
  refundChatQuota: (...a) => refundChatQuota(...a),
}))
vi.mock('../_chatPrompt.js', () => ({
  MODEL: 'test-model',
  buildChatSystemPrompt: () => 'sys',
  buildChatLessonContext: () => 'ctx',
  CHAT_MAX_MESSAGE_LENGTH: 1000,
  CHAT_MAX_HISTORY: 20,
  CHAT_MAX_OUTPUT_TOKENS: 1024,
}))

const { default: handler, sanitizeMessages } = await import('../chat.js')

function mockRes() {
  return {
    statusCode: 0,
    payload: null,
    chunks: [],
    ended: false,
    status(c) { this.statusCode = c; return this },
    send(b) { this.payload = b; return this },
    setHeader() { return this },
    write(c) { this.chunks.push(c); return true },
    end() { this.ended = true },
  }
}

// Corps SSE Anthropic minimal, sous forme d'itérable async de chunks binaires.
function sseBody(events) {
  const enc = new TextEncoder()
  const raw = events.map(e => `data: ${JSON.stringify(e)}\n`).join('\n')
  return (async function* () { yield enc.encode(raw) })()
}

const VALID_BODY = {
  idToken: 'good',
  lessonId: 'l1',
  level: { cycle: 'college', classe: '3ème' },
  messages: [{ role: 'user', content: 'Explique-moi' }],
}

const anthropicFetch = vi.fn()

describe('sanitizeMessages', () => {
  it('accepte une conversation valide et la normalise', () => {
    const out = sanitizeMessages([
      { role: 'user', content: 'a', extra: 'dropped' },
      { role: 'assistant', content: 'b' },
      { role: 'user', content: 'c' },
    ])
    expect(out).toEqual([
      { role: 'user', content: 'a' },
      { role: 'assistant', content: 'b' },
      { role: 'user', content: 'c' },
    ])
  })

  it('rejette vide, rôle inconnu, contenu non-string ou vide', () => {
    expect(sanitizeMessages([])).toBeNull()
    expect(sanitizeMessages(null)).toBeNull()
    expect(sanitizeMessages([{ role: 'system', content: 'x' }])).toBeNull()
    expect(sanitizeMessages([{ role: 'user', content: 42 }])).toBeNull()
    expect(sanitizeMessages([{ role: 'user', content: '   ' }])).toBeNull()
  })

  it('rejette un message élève trop long', () => {
    expect(sanitizeMessages([{ role: 'user', content: 'x'.repeat(1001) }])).toBeNull()
  })

  it('rejette si le dernier message n\'est pas celui de l\'élève', () => {
    expect(sanitizeMessages([
      { role: 'user', content: 'a' },
      { role: 'assistant', content: 'b' },
    ])).toBeNull()
  })

  it('ne garde que les 20 messages les plus récents', () => {
    const many = Array.from({ length: 30 }, (_, i) => ({ role: i % 2 ? 'user' : 'assistant', content: `m${i}` }))
    const out = sanitizeMessages(many)
    expect(out).toHaveLength(20)
    expect(out[out.length - 1].content).toBe('m29')
  })
})

describe('/api/chat', () => {
  beforeEach(() => {
    verifyIdToken.mockReset()
    consumeChatQuota.mockReset()
    refundChatQuota.mockReset()
    getUserDoc.mockReset()
    getLessonDoc.mockReset()
    anthropicFetch.mockReset()
    vi.stubGlobal('fetch', anthropicFetch)

    verifyIdToken.mockResolvedValue({ uid: 'u1', email_verified: true })
    getUserDoc.mockResolvedValue({ exists: true, data: () => ({ plan: 'free' }) })
    getLessonDoc.mockResolvedValue({ exists: true, data: () => ({ metadata: { title: 'T' }, aiData: {} }) })
    consumeChatQuota.mockResolvedValue({ allowed: true, remaining: 9 })
    refundChatQuota.mockResolvedValue()
  })

  it('refuse (405) hors POST', async () => {
    const res = mockRes()
    await handler({ method: 'GET' }, res)
    expect(res.statusCode).toBe(405)
  })

  it('refuse (400) sans lessonId ou avec messages invalides', async () => {
    const res1 = mockRes()
    await handler({ method: 'POST', body: { ...VALID_BODY, lessonId: undefined } }, res1)
    expect(res1.statusCode).toBe(400)
    expect(res1.payload).toBe('MISSING_LESSON')

    const res2 = mockRes()
    await handler({ method: 'POST', body: { ...VALID_BODY, messages: [] } }, res2)
    expect(res2.statusCode).toBe(400)
    expect(res2.payload).toBe('INVALID_MESSAGES')
    expect(anthropicFetch).not.toHaveBeenCalled()
  })

  it('refuse (401) sans token ou token invalide', async () => {
    const res1 = mockRes()
    await handler({ method: 'POST', body: { ...VALID_BODY, idToken: undefined } }, res1)
    expect(res1.statusCode).toBe(401)

    verifyIdToken.mockRejectedValue(new Error('bad'))
    const res2 = mockRes()
    await handler({ method: 'POST', body: VALID_BODY }, res2)
    expect(res2.statusCode).toBe(401)
    expect(anthropicFetch).not.toHaveBeenCalled()
  })

  it('refuse (403 EMAIL_NOT_VERIFIED) si l\'email n\'est pas vérifié', async () => {
    verifyIdToken.mockResolvedValue({ uid: 'u1', email_verified: false })
    const res = mockRes()
    await handler({ method: 'POST', body: VALID_BODY }, res)
    expect(res.statusCode).toBe(403)
    expect(res.payload).toBe('EMAIL_NOT_VERIFIED')
    expect(consumeChatQuota).not.toHaveBeenCalled()
  })

  it('refuse (404) si la leçon n\'existe pas chez cet élève', async () => {
    getLessonDoc.mockResolvedValue({ exists: false })
    const res = mockRes()
    await handler({ method: 'POST', body: VALID_BODY }, res)
    expect(res.statusCode).toBe(404)
    expect(res.payload).toBe('LESSON_NOT_FOUND')
    expect(consumeChatQuota).not.toHaveBeenCalled()
  })

  it('refuse (429 CHAT_LIMIT) quand le quota jour est épuisé', async () => {
    consumeChatQuota.mockResolvedValue({ allowed: false, remaining: 0 })
    const res = mockRes()
    await handler({ method: 'POST', body: VALID_BODY }, res)
    expect(res.statusCode).toBe(429)
    expect(res.payload).toBe('CHAT_LIMIT')
    expect(anthropicFetch).not.toHaveBeenCalled()
  })

  it('applique la limite premium pour un compte premium', async () => {
    getUserDoc.mockResolvedValue({ exists: true, data: () => ({ plan: 'premium' }) })
    anthropicFetch.mockResolvedValue({ ok: true, body: sseBody([]) })
    const res = mockRes()
    await handler({ method: 'POST', body: VALID_BODY }, res)
    expect(consumeChatQuota).toHaveBeenCalledWith(expect.objectContaining({ limit: 200 }))
  })

  it('streame les deltas de texte puis [DONE] (200)', async () => {
    anthropicFetch.mockResolvedValue({
      ok: true,
      body: sseBody([
        { type: 'content_block_delta', delta: { type: 'text_delta', text: 'Salut ' } },
        { type: 'content_block_delta', delta: { type: 'text_delta', text: 'toi !' } },
        { type: 'message_stop' },
      ]),
    })
    const res = mockRes()
    await handler({ method: 'POST', body: VALID_BODY }, res)

    expect(res.statusCode).toBe(200)
    expect(res.ended).toBe(true)
    const joined = res.chunks.join('')
    expect(joined).toContain('"remaining":9')
    expect(joined).toContain(JSON.stringify({ text: 'Salut ' }))
    expect(joined).toContain(JSON.stringify({ text: 'toi !' }))
    expect(joined).toContain('data: [DONE]')
    // Le flux brut Anthropic (métadonnées) n'est jamais relayé tel quel.
    expect(joined).not.toContain('content_block_delta')
  })

  it('rembourse le quota si Anthropic échoue avant le stream', async () => {
    anthropicFetch.mockResolvedValue({ ok: false, status: 500 })
    const res = mockRes()
    await handler({ method: 'POST', body: VALID_BODY }, res)
    expect(res.statusCode).toBe(502)
    expect(refundChatQuota).toHaveBeenCalled()
  })

  it('rembourse aussi sur erreur réseau', async () => {
    anthropicFetch.mockRejectedValue(new Error('boom'))
    const res = mockRes()
    await handler({ method: 'POST', body: VALID_BODY }, res)
    expect(res.statusCode).toBe(502)
    expect(res.payload).toBe('NETWORK_ERROR')
    expect(refundChatQuota).toHaveBeenCalled()
  })
})
