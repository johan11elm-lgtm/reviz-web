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

const { default: handler } = await import('../analyse-image.js')

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
const base = { mediaType: 'image/jpeg', level: { cycle: 'college' }, idToken: 'good' }

describe('analyse-image — garde de taille d’image', () => {
  beforeEach(() => {
    verifyIdToken.mockReset()
    consumeQuota.mockReset()
    refundQuota.mockReset()
    anthropicFetch.mockReset()
    vi.stubGlobal('fetch', anthropicFetch)
  })

  it('rejette (413 IMAGE_TOO_LARGE) une image au-dessus du plafond base64', async () => {
    // 4 Mio + 1 caractère : au-dessus de MAX_IMAGE_BASE64
    const imageData = 'a'.repeat(4 * 1024 * 1024 + 1)
    const res = mockRes()
    await handler({ method: 'POST', body: { ...base, imageData } }, res)
    expect(res.statusCode).toBe(413)
    expect(res.payload).toBe('IMAGE_TOO_LARGE')
    // Garde en amont : ni auth, ni quota, ni appel Anthropic ne doivent partir.
    expect(verifyIdToken).not.toHaveBeenCalled()
    expect(consumeQuota).not.toHaveBeenCalled()
    expect(anthropicFetch).not.toHaveBeenCalled()
  })

  it('laisse passer (200) une image normale (bien sous le plafond)', async () => {
    verifyIdToken.mockResolvedValue({ uid: 'u1', email_verified: true })
    anthropicFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ content: [{ text: 'RESULT' }] }),
    })
    const res = mockRes()
    await handler({ method: 'POST', body: { ...base, imageData: 'a'.repeat(1000) } }, res)
    expect(res.statusCode).toBe(200)
    expect(res.payload).toBe('RESULT')
  })

  it('rejette (400) un imageData non-string', async () => {
    const res = mockRes()
    await handler({ method: 'POST', body: { ...base, imageData: { evil: true } } }, res)
    expect(res.statusCode).toBe(400)
    expect(anthropicFetch).not.toHaveBeenCalled()
  })

  it('rejette (400 INVALID_MEDIA_TYPE) un type non autorisé', async () => {
    const res = mockRes()
    await handler({ method: 'POST', body: { ...base, imageData: 'abc', mediaType: 'image/svg+xml' } }, res)
    expect(res.statusCode).toBe(400)
    expect(res.payload).toBe('INVALID_MEDIA_TYPE')
    expect(anthropicFetch).not.toHaveBeenCalled()
  })
})
