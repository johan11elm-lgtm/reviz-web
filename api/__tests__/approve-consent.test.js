import { describe, it, expect, vi, beforeEach } from 'vitest'

const docGet = vi.fn()
const docUpdate = vi.fn()

function makeDb() {
  const docRef = { get: docGet, update: docUpdate }
  const sub = { doc: () => docRef }
  const userDoc = { collection: () => sub }
  return { collection: () => ({ doc: () => userDoc }) }
}

vi.mock('../_firebaseAdmin.js', () => ({ getDb: () => makeDb() }))

const { default: handler } = await import('../approve-consent.js')

function mockRes() {
  return {
    statusCode: 0, body: null,
    status(c) { this.statusCode = c; return this },
    send(b) { this.body = b; return this },
  }
}

const DAY = 24 * 60 * 60 * 1000

beforeEach(() => { docGet.mockReset(); docUpdate.mockReset(); docUpdate.mockResolvedValue() })

describe('approve-consent — GET ne mute rien', () => {
  it('GET affiche une page de confirmation avec un formulaire POST', async () => {
    const res = mockRes()
    await handler({ method: 'GET', query: { token: 't', uid: 'u' } }, res)
    expect(res.statusCode).toBe(200)
    expect(res.body).toContain('method="POST"')
    expect(res.body).toContain('name="token"')
    expect(docUpdate).not.toHaveBeenCalled() // <- aucun pré-fetch ne peut approuver
  })

  it('GET sans token → 400', async () => {
    const res = mockRes()
    await handler({ method: 'GET', query: { uid: 'u' } }, res)
    expect(res.statusCode).toBe(400)
    expect(docUpdate).not.toHaveBeenCalled()
  })
})

describe('approve-consent — POST approuve', () => {
  it('POST avec token valide et non expiré → approuve + invalide le token', async () => {
    docGet.mockResolvedValue({ exists: true, data: () => ({ status: 'pending', token: 'good', createdAt: Date.now() }) })
    const res = mockRes()
    await handler({ method: 'POST', body: { token: 'good', uid: 'u' } }, res)
    expect(res.statusCode).toBe(200)
    expect(res.body).toContain('activé')
    expect(docUpdate).toHaveBeenCalledWith(expect.objectContaining({ status: 'approved', token: null }))
  })

  it('POST avec mauvais token → 403, pas de mutation', async () => {
    docGet.mockResolvedValue({ exists: true, data: () => ({ status: 'pending', token: 'good', createdAt: Date.now() }) })
    const res = mockRes()
    await handler({ method: 'POST', body: { token: 'WRONG', uid: 'u' } }, res)
    expect(res.statusCode).toBe(403)
    expect(docUpdate).not.toHaveBeenCalled()
  })

  it('POST avec token expiré → 410', async () => {
    docGet.mockResolvedValue({ exists: true, data: () => ({ status: 'pending', token: 'good', createdAt: Date.now() - 8 * DAY }) })
    const res = mockRes()
    await handler({ method: 'POST', body: { token: 'good', uid: 'u' } }, res)
    expect(res.statusCode).toBe(410)
    expect(docUpdate).not.toHaveBeenCalled()
  })

  it('POST sur un consentement déjà approuvé → idempotent, pas de mutation', async () => {
    docGet.mockResolvedValue({ exists: true, data: () => ({ status: 'approved' }) })
    const res = mockRes()
    await handler({ method: 'POST', body: { token: 'whatever', uid: 'u' } }, res)
    expect(res.statusCode).toBe(200)
    expect(docUpdate).not.toHaveBeenCalled()
  })
})
