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
  MODEL_RELECTURE: 'relecture-model',
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

describe('analyse-image — seconde lecture des refus', () => {
  const refus = JSON.stringify({ error: 'NON_SCOLAIRE', raison: 'hors_cours' })
  const reponse = (content, extra = {}) => ({ ok: true, json: async () => ({ content, ...extra }) })
  const modeleAppele = i => JSON.parse(anthropicFetch.mock.calls[i][1].body).model

  beforeEach(() => {
    verifyIdToken.mockReset().mockResolvedValue({ uid: 'u1', email_verified: true })
    refundQuota.mockReset()
    anthropicFetch.mockReset()
    vi.stubGlobal('fetch', anthropicFetch)
    vi.spyOn(console, 'info').mockImplementation(() => {})
  })

  async function scanner() {
    const res = mockRes()
    await handler({ method: 'POST', body: { ...base, imageData: 'a'.repeat(1000) } }, res)
    return res
  }

  it('une leçon lue du premier coup : un seul appel', async () => {
    anthropicFetch.mockResolvedValueOnce(reponse([{ type: 'text', text: 'LECON' }]))
    const res = await scanner()
    expect(res.payload).toBe('LECON')
    expect(anthropicFetch).toHaveBeenCalledTimes(1)
  })

  it('un refus est relu par le second modèle, qui rend la leçon (bloc de réflexion ignoré)', async () => {
    anthropicFetch
      .mockResolvedValueOnce(reponse([{ type: 'text', text: refus }]))
      .mockResolvedValueOnce(reponse([{ type: 'thinking', thinking: '' }, { type: 'text', text: 'LECON RELUE' }]))
    const res = await scanner()
    expect(res.statusCode).toBe(200)
    expect(res.payload).toBe('LECON RELUE')
    expect(modeleAppele(0)).toBe('test-model')
    expect(modeleAppele(1)).toBe('relecture-model')
    expect(JSON.parse(anthropicFetch.mock.calls[1][1].body).output_config).toEqual({ effort: 'low' })
  })

  it('si la seconde lecture refuse aussi, l’élève reçoit le premier refus', async () => {
    const illisible = JSON.stringify({ error: 'ILLISIBLE', raison: 'floue' })
    anthropicFetch
      .mockResolvedValueOnce(reponse([{ type: 'text', text: refus }]))
      .mockResolvedValueOnce(reponse([{ type: 'text', text: illisible }]))
    const res = await scanner()
    expect(res.payload).toBe(refus)
  })

  it('si la seconde lecture échoue (erreur, refus de sûreté, réseau), on garde le premier refus', async () => {
    for (const second of [
      () => anthropicFetch.mockResolvedValueOnce({ ok: false, status: 500 }),
      () => anthropicFetch.mockResolvedValueOnce(reponse([], { stop_reason: 'refusal' })),
      () => anthropicFetch.mockRejectedValueOnce(new Error('réseau')),
    ]) {
      anthropicFetch.mockReset()
      anthropicFetch.mockResolvedValueOnce(reponse([{ type: 'text', text: refus }]))
      second()
      const res = await scanner()
      expect(res.statusCode).toBe(200)
      expect(res.payload).toBe(refus)
    }
  })
})
