import { describe, it, expect, vi, beforeEach } from 'vitest'

const verifyIdToken = vi.fn()
const consumeQuota = vi.fn()
const refundQuota = vi.fn()

vi.mock('../_firebaseAdmin.js', () => ({
  getAuthAdmin: () => ({ verifyIdToken }),
  getDb: () => ({
    collection: () => ({
      doc: () => ({
        get: async () => ({ exists: true, data: () => ({ plan: 'premium' }) }),
      }),
    }),
  }),
}))
vi.mock('../_quota.js', () => ({
  FREE_LIMIT: 5,
  consumeQuota: (...a) => consumeQuota(...a),
  refundQuota: (...a) => refundQuota(...a),
}))
vi.mock('../_systemPrompt.js', () => ({
  MODEL: 'test-model',
  buildSystemPrompt: () => 'sys',
  buildLessonUserMessage: (t) => t,
  LESSON_IMAGE_INSTRUCTION: 'img',
}))

const { default: analyseHandler } = await import('../analyse.js')
const { default: analyseImageHandler } = await import('../analyse-image.js')

function mockRes() {
  return {
    statusCode: 0,
    payload: null,
    status(c) { this.statusCode = c; return this },
    send(b) { this.payload = b; return this },
    setHeader() { return this },
  }
}

const anthropicFetch = vi.fn()

const CASES = [
  {
    name: 'analyse',
    handler: analyseHandler,
    body: { text: 'ma leçon', level: { cycle: 'college' } },
  },
  {
    name: 'analyse-image',
    handler: analyseImageHandler,
    body: { imageData: 'abc123', mediaType: 'image/png', level: { cycle: 'college' } },
  },
]

describe.each(CASES)('$name — email vérifié obligatoire', ({ handler, body }) => {
  beforeEach(() => {
    verifyIdToken.mockReset()
    consumeQuota.mockReset()
    refundQuota.mockReset()
    anthropicFetch.mockReset()
    vi.stubGlobal('fetch', anthropicFetch)
  })

  it('refuse (401) sans idToken', async () => {
    const res = mockRes()
    await handler({ method: 'POST', body: { ...body } }, res)
    expect(res.statusCode).toBe(401)
    expect(anthropicFetch).not.toHaveBeenCalled()
  })

  it('refuse (401) si le token est invalide', async () => {
    verifyIdToken.mockRejectedValue(new Error('invalid'))
    const res = mockRes()
    await handler({ method: 'POST', body: { ...body, idToken: 'x' } }, res)
    expect(res.statusCode).toBe(401)
    expect(anthropicFetch).not.toHaveBeenCalled()
  })

  it('refuse (403 EMAIL_NOT_VERIFIED) si l’email n’est pas vérifié', async () => {
    verifyIdToken.mockResolvedValue({ uid: 'u1', email_verified: false })
    const res = mockRes()
    await handler({ method: 'POST', body: { ...body, idToken: 'good' } }, res)
    expect(res.statusCode).toBe(403)
    expect(res.payload).toBe('EMAIL_NOT_VERIFIED')
    expect(consumeQuota).not.toHaveBeenCalled()
    expect(anthropicFetch).not.toHaveBeenCalled()
  })

  it('laisse passer (200) quand l’email est vérifié', async () => {
    verifyIdToken.mockResolvedValue({ uid: 'u1', email_verified: true })
    anthropicFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ content: [{ text: 'RESULT' }] }),
    })
    const res = mockRes()
    await handler({ method: 'POST', body: { ...body, idToken: 'good' } }, res)
    expect(res.statusCode).toBe(200)
    expect(res.payload).toBe('RESULT')
  })
})
