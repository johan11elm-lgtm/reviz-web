import { describe, it, expect, vi, beforeEach } from 'vitest'

const verifyIdToken = vi.fn()
const userGet = vi.fn()
const portalCreate = vi.fn()

vi.mock('../_firebaseAdmin.js', () => ({
  getAuthAdmin: () => ({ verifyIdToken }),
  getDb: () => ({ collection: () => ({ doc: () => ({ get: userGet }) }) }),
}))
vi.mock('stripe', () => ({
  default: class { constructor() { this.billingPortal = { sessions: { create: portalCreate } } } },
}))

const { default: handler } = await import('../create-billing-portal.js')

function mockRes() {
  return {
    statusCode: 0, payload: null,
    status(c) { this.statusCode = c; return this },
    json(b) { this.payload = b; return this },
    end() { return this },
  }
}

beforeEach(() => { verifyIdToken.mockReset(); userGet.mockReset(); portalCreate.mockReset() })

describe('create-billing-portal', () => {
  it('refuse (401) sans idToken', async () => {
    const res = mockRes()
    await handler({ method: 'POST', body: {} }, res)
    expect(res.statusCode).toBe(401)
    expect(portalCreate).not.toHaveBeenCalled()
  })

  it('404 si l\'utilisateur n\'a pas de stripeCustomerId', async () => {
    verifyIdToken.mockResolvedValue({ uid: 'u1' })
    userGet.mockResolvedValue({ exists: true, data: () => ({}) })
    const res = mockRes()
    await handler({ method: 'POST', body: { idToken: 'ok' } }, res)
    expect(res.statusCode).toBe(404)
    expect(res.payload.error).toBe('NO_SUBSCRIPTION')
  })

  it('renvoie l\'URL du portail pour un client existant', async () => {
    verifyIdToken.mockResolvedValue({ uid: 'u1' })
    userGet.mockResolvedValue({ exists: true, data: () => ({ stripeCustomerId: 'cus_1' }) })
    portalCreate.mockResolvedValue({ url: 'https://billing.stripe.test/p/123' })
    const res = mockRes()
    await handler({ method: 'POST', body: { idToken: 'ok' } }, res)
    expect(res.statusCode).toBe(200)
    expect(res.payload.url).toBe('https://billing.stripe.test/p/123')
    expect(portalCreate).toHaveBeenCalledWith(expect.objectContaining({ customer: 'cus_1' }))
  })
})
