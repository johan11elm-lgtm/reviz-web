import { describe, it, expect, vi } from 'vitest'

const checkout = vi.fn()
const portail = vi.fn()
vi.mock('../_checkout.js', () => ({ default: checkout }))
vi.mock('../_billingPortal.js', () => ({ default: portail }))

const { default: handler } = await import('../abonnement.js')

const mockRes = () => ({
  statusCode: 0,
  status(c) { this.statusCode = c; return this },
  json() { return this },
})

describe('abonnement — aiguillage', () => {
  it('op=checkout → création de paiement', async () => {
    const req = { method: 'POST', query: { op: 'checkout' } }
    await handler(req, mockRes())
    expect(checkout).toHaveBeenCalledWith(req, expect.anything())
  })

  it('op=portail → portail client', async () => {
    const req = { method: 'POST', query: { op: 'portail' } }
    await handler(req, mockRes())
    expect(portail).toHaveBeenCalledWith(req, expect.anything())
  })

  it('op inconnue → 404', async () => {
    const res = mockRes()
    await handler({ method: 'POST', query: {} }, res)
    expect(res.statusCode).toBe(404)
  })
})
