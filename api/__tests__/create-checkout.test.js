import { describe, it, expect, vi, beforeEach } from 'vitest'

const verifyIdToken = vi.fn()
const getUser = vi.fn()
const sessionsCreate = vi.fn()
const pricesList = vi.fn()

vi.mock('../_firebaseAdmin.js', () => ({
  getAuthAdmin: () => ({ verifyIdToken, getUser }),
  getDb: () => ({}),
}))
vi.mock('stripe', () => ({
  default: class { constructor() { this.checkout = { sessions: { create: sessionsCreate } }; this.prices = { list: pricesList } } },
}))

const reglage = vi.hoisted(() => ({ ventes: true, fondateur: true }))
vi.mock('../_lancement.js', async importOriginal => ({
  ...(await importOriginal()),
  get VENTES_OUVERTES() { return reglage.ventes },
  tarifFondateurOuvert: () => reglage.fondateur,
}))

const { default: handler } = await import('../_checkout.js')

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
  beforeEach(() => {
    verifyIdToken.mockReset(); sessionsCreate.mockReset(); getUser.mockReset(); pricesList.mockReset()
    getUser.mockResolvedValue({ metadata: { creationTime: '2026-10-01T10:00:00Z' } })
    pricesList.mockImplementation(async ({ lookup_keys }) => ({ data: [{ id: `price_${lookup_keys[0]}` }] }))
  })

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
      expect.objectContaining({ metadata: expect.objectContaining({ firebaseUid: 'real-uid' }) }),
    )
  })
})

describe('create-checkout — formules et tarif fondateur', () => {
  beforeEach(() => {
    verifyIdToken.mockReset(); sessionsCreate.mockReset(); getUser.mockReset(); pricesList.mockReset()
    reglage.ventes = true; reglage.fondateur = true
    verifyIdToken.mockResolvedValue({ uid: 'u1', email: 'eleve@test.fr', email_verified: true })
    sessionsCreate.mockResolvedValue({ url: 'https://stripe.test/session' })
    pricesList.mockImplementation(async ({ lookup_keys }) => ({ data: [{ id: `price_${lookup_keys[0]}` }] }))
  })

  const session = () => sessionsCreate.mock.calls[0][0]
  const prixEnvoye = () => session().line_items[0].price

  it('ventes fermées : 403, aucune session', async () => {
    reglage.ventes = false
    const res = mockRes()
    await handler({ method: 'POST', body: { idToken: 'good' } }, res)
    expect(res.statusCode).toBe(403)
    expect(res.payload.error).toBe('VENTES_FERMEES')
    expect(sessionsCreate).not.toHaveBeenCalled()
  })

  it('avant le 26 : annuel fondateur, rien de prélevé avant le 26 octobre', async () => {
    const res = mockRes()
    await handler({ method: 'POST', body: { idToken: 'good' } }, res)
    expect(res.statusCode).toBe(200)
    expect(prixEnvoye()).toBe('price_revizplus_fondateur_annuel')
    expect(session().subscription_data.billing_cycle_anchor).toBe(Date.parse('2026-10-26T00:00:00+01:00') / 1000)
    expect(session().subscription_data.proration_behavior).toBe('none')
    expect(session().success_url).toContain('formule=annuel&fondateur=1')
  })

  it('mensuel si demandé', async () => {
    const res = mockRes()
    await handler({ method: 'POST', body: { idToken: 'good', formule: 'mensuel' } }, res)
    expect(prixEnvoye()).toBe('price_revizplus_fondateur_mensuel')
  })

  it('formule inconnue → annuel', async () => {
    const res = mockRes()
    await handler({ method: 'POST', body: { idToken: 'good', formule: 'hebdo' } }, res)
    expect(prixEnvoye()).toBe('price_revizplus_fondateur_annuel')
  })

  it('après le 26 : prix public, prélevé tout de suite, « fondateur » du client ignoré', async () => {
    reglage.fondateur = false
    const res = mockRes()
    await handler({ method: 'POST', body: { idToken: 'good', fondateur: true } }, res)
    expect(prixEnvoye()).toBe('price_revizplus_annuel')
    expect(session().subscription_data.billing_cycle_anchor).toBeUndefined()
  })

  it('500 PRICE_NOT_FOUND si le prix n’existe pas dans Stripe', async () => {
    pricesList.mockResolvedValue({ data: [] })
    const res = mockRes()
    await handler({ method: 'POST', body: { idToken: 'good' } }, res)
    expect(res.statusCode).toBe(500)
    expect(res.payload.error).toBe('PRICE_NOT_FOUND')
    expect(sessionsCreate).not.toHaveBeenCalled()
  })
})
