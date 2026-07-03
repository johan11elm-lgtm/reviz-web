import { describe, it, expect, vi, beforeEach } from 'vitest'

const verifyIdToken = vi.fn()
const sessionsCreate = vi.fn()

vi.mock('../_firebaseAdmin.js', () => ({
  getAuthAdmin: () => ({ verifyIdToken }),
  getDb: () => ({}),
}))
vi.mock('stripe', () => ({
  default: class { constructor() { this.checkout = { sessions: { create: sessionsCreate } } } },
}))

const { default: handler } = await import('../create-checkout.js')

function mockRes() {
  return {
    statusCode: 0,
    payload: null,
    status(c) { this.statusCode = c; return this },
    json(b) { this.payload = b; return this },
    end() { return this },
  }
}

describe('create-checkout — authentification', () => {
  beforeEach(() => { verifyIdToken.mockReset(); sessionsCreate.mockReset() })

  it('refuse (401) sans idToken', async () => {
    const res = mockRes()
    await handler({ method: 'POST', body: {} }, res)
    expect(res.statusCode).toBe(401)
    expect(sessionsCreate).not.toHaveBeenCalled()
  })

  it('refuse (401) si le token est invalide', async () => {
    verifyIdToken.mockRejectedValue(new Error('invalid'))
    const res = mockRes()
    await handler({ method: 'POST', body: { idToken: 'x' } }, res)
    expect(res.statusCode).toBe(401)
    expect(sessionsCreate).not.toHaveBeenCalled()
  })

  it('refuse (403 EMAIL_NOT_VERIFIED) si l’email n’est pas vérifié', async () => {
    verifyIdToken.mockResolvedValue({ uid: 'u1', email: 'eleve@test.fr', email_verified: false })
    const res = mockRes()
    await handler({ method: 'POST', body: { idToken: 'good' } }, res)
    expect(res.statusCode).toBe(403)
    expect(res.payload.error).toBe('EMAIL_NOT_VERIFIED')
    expect(sessionsCreate).not.toHaveBeenCalled()
  })

  it('utilise l’uid du token vérifié, pas celui du body', async () => {
    verifyIdToken.mockResolvedValue({ uid: 'real-uid', email: 'eleve@test.fr', email_verified: true })
    sessionsCreate.mockResolvedValue({ url: 'https://stripe.test/session' })
    const res = mockRes()
    await handler(
      { method: 'POST', body: { idToken: 'good', uid: 'ATTACKER', email: 'attacker@evil.fr' } },
      res,
    )
    expect(res.statusCode).toBe(200)
    expect(res.payload.url).toBe('https://stripe.test/session')
    expect(sessionsCreate).toHaveBeenCalledWith(
      expect.objectContaining({ metadata: { firebaseUid: 'real-uid' } }),
    )
  })
})
