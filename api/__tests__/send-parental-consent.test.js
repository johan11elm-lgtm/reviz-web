import { describe, it, expect, vi, beforeEach } from 'vitest'

const verifyIdToken = vi.fn()
const docGet = vi.fn()
const docSet = vi.fn()
const emailsSend = vi.fn()

function makeDb() {
  const docRef = { get: docGet, set: docSet }
  const sub = { doc: () => docRef }
  const userDoc = { collection: () => sub }
  return { collection: () => ({ doc: () => userDoc }) }
}

vi.mock('../_firebaseAdmin.js', () => ({
  getAuthAdmin: () => ({ verifyIdToken }),
  getDb: () => makeDb(),
}))
vi.mock('resend', () => ({
  Resend: class { constructor() { this.emails = { send: emailsSend } } },
}))

const { default: handler } = await import('../send-parental-consent.js')

function mockRes() {
  return {
    statusCode: 0, payload: null, body: null,
    status(c) { this.statusCode = c; return this },
    json(b) { this.payload = b; return this },
    send(b) { this.body = b; return this },
  }
}

beforeEach(() => {
  verifyIdToken.mockReset(); docGet.mockReset(); docSet.mockReset(); emailsSend.mockReset()
  docSet.mockResolvedValue(); emailsSend.mockResolvedValue()
})

describe('send-parental-consent — sécurité', () => {
  it('refuse (401) sans idToken', async () => {
    const res = mockRes()
    await handler({ method: 'POST', body: { parentEmail: 'p@test.fr', childName: 'Léa' } }, res)
    expect(res.statusCode).toBe(401)
    expect(emailsSend).not.toHaveBeenCalled()
  })

  it('refuse (401) si le token est invalide', async () => {
    verifyIdToken.mockRejectedValue(new Error('bad'))
    const res = mockRes()
    await handler({ method: 'POST', body: { idToken: 'x', parentEmail: 'p@test.fr', childName: 'Léa' } }, res)
    expect(res.statusCode).toBe(401)
    expect(emailsSend).not.toHaveBeenCalled()
  })

  it('refuse (400) si l\'email parent est celui de l\'enfant', async () => {
    verifyIdToken.mockResolvedValue({ uid: 'u1', email: 'kid@test.fr' })
    const res = mockRes()
    await handler({ method: 'POST', body: { idToken: 'ok', parentEmail: 'KID@test.fr', childName: 'Léa' } }, res)
    expect(res.statusCode).toBe(400)
    expect(res.payload.error).toBe('PARENT_EMAIL_IS_CHILD')
    expect(emailsSend).not.toHaveBeenCalled()
  })

  it('refuse (400) un email parent mal formé', async () => {
    verifyIdToken.mockResolvedValue({ uid: 'u1', email: 'kid@test.fr' })
    const res = mockRes()
    await handler({ method: 'POST', body: { idToken: 'ok', parentEmail: 'pasunemail', childName: 'Léa' } }, res)
    expect(res.statusCode).toBe(400)
    expect(res.payload.error).toBe('INVALID_PARENT_EMAIL')
  })

  it('happy path : envoie l\'email et stocke un consentement pending', async () => {
    verifyIdToken.mockResolvedValue({ uid: 'real-uid', email: 'kid@test.fr' })
    docGet.mockResolvedValue({ exists: false })
    const res = mockRes()
    await handler({ method: 'POST', body: { idToken: 'ok', parentEmail: 'parent@test.fr', childName: 'Léa' } }, res)
    expect(res.statusCode).toBe(200)
    expect(res.payload.ok).toBe(true)
    expect(docSet).toHaveBeenCalledWith(expect.objectContaining({ status: 'pending', parentEmail: 'parent@test.fr' }))
    expect(emailsSend).toHaveBeenCalledWith(expect.objectContaining({ to: 'parent@test.fr' }))
  })

  it('échappe childName dans le HTML de l\'email (anti-injection)', async () => {
    verifyIdToken.mockResolvedValue({ uid: 'u1', email: 'kid@test.fr' })
    docGet.mockResolvedValue({ exists: false })
    const res = mockRes()
    await handler({ method: 'POST', body: { idToken: 'ok', parentEmail: 'parent@test.fr', childName: '<img src=x onerror=alert(1)>' } }, res)
    const html = emailsSend.mock.calls[0][0].html
    expect(html).not.toContain('<img src=x')
    expect(html).toContain('&lt;img')
  })

  it('ne réinitialise pas un consentement déjà approuvé (anti-lockout)', async () => {
    verifyIdToken.mockResolvedValue({ uid: 'u1', email: 'kid@test.fr' })
    docGet.mockResolvedValue({ exists: true, data: () => ({ status: 'approved' }) })
    const res = mockRes()
    await handler({ method: 'POST', body: { idToken: 'ok', parentEmail: 'parent@test.fr', childName: 'Léa' } }, res)
    expect(res.statusCode).toBe(200)
    expect(res.payload.alreadyApproved).toBe(true)
    expect(docSet).not.toHaveBeenCalled()
    expect(emailsSend).not.toHaveBeenCalled()
  })

  it('throttle (429) un renvoi trop rapproché', async () => {
    verifyIdToken.mockResolvedValue({ uid: 'u1', email: 'kid@test.fr' })
    docGet.mockResolvedValue({ exists: true, data: () => ({ status: 'pending', createdAt: Date.now() }) })
    const res = mockRes()
    await handler({ method: 'POST', body: { idToken: 'ok', parentEmail: 'parent@test.fr', childName: 'Léa' } }, res)
    expect(res.statusCode).toBe(429)
    expect(emailsSend).not.toHaveBeenCalled()
  })
})
