import { describe, it, expect, vi, beforeEach } from 'vitest'

const constructEvent = vi.fn()
const eventGet = vi.fn()
const eventSet = vi.fn()
const userSet = vi.fn()
const userUpdate = vi.fn()
let userFound = true

function makeDb() {
  return {
    collection(name) {
      if (name === 'stripeEvents') {
        return { doc: () => ({ get: eventGet, set: eventSet }) }
      }
      // users
      return {
        doc: () => ({ set: userSet }),
        where: () => ({
          get: async () => ({
            empty: !userFound,
            docs: userFound ? [{ ref: { update: userUpdate } }] : [],
          }),
        }),
      }
    },
  }
}

vi.mock('stripe', () => ({
  default: class { constructor() { this.webhooks = { constructEvent } } },
}))
vi.mock('../_firebaseAdmin.js', () => ({ getDb: () => makeDb() }))

const { default: handler, planForStatus } = await import('../stripe-webhook.js')

function makeReq() {
  return {
    method: 'POST',
    headers: { 'stripe-signature': 'sig' },
    async *[Symbol.asyncIterator]() { yield Buffer.from('{}') },
  }
}
function makeRes() {
  return {
    statusCode: 0, payload: null,
    status(c) { this.statusCode = c; return this },
    json(b) { this.payload = b; return this },
    send(b) { this.payload = b; return this },
    end() { return this },
  }
}

async function run(event) {
  constructEvent.mockReturnValue(event)
  const res = makeRes()
  await handler(makeReq(), res)
  return res
}

beforeEach(() => {
  constructEvent.mockReset()
  eventGet.mockReset(); eventGet.mockResolvedValue({ exists: false })
  eventSet.mockReset(); eventSet.mockResolvedValue()
  userSet.mockReset(); userSet.mockResolvedValue()
  userUpdate.mockReset(); userUpdate.mockResolvedValue()
  userFound = true
})

describe('planForStatus — période de grâce', () => {
  it('active / trialing / past_due → premium', () => {
    expect(planForStatus('active')).toBe('premium')
    expect(planForStatus('trialing')).toBe('premium')
    expect(planForStatus('past_due')).toBe('premium') // grâce
  })
  it('unpaid / canceled / autres → free', () => {
    expect(planForStatus('unpaid')).toBe('free')
    expect(planForStatus('canceled')).toBe('free')
    expect(planForStatus('incomplete_expired')).toBe('free')
  })
})

describe('stripe-webhook — subscription.updated', () => {
  it('past_due garde l\'élève premium (période de grâce)', async () => {
    const res = await run({ id: 'e1', type: 'customer.subscription.updated', data: { object: { customer: 'cus_1', status: 'past_due' } } })
    expect(res.statusCode).toBe(200)
    expect(userUpdate).toHaveBeenCalledWith(expect.objectContaining({ plan: 'premium', subscriptionStatus: 'past_due' }))
  })

  it('unpaid déclasse en gratuit', async () => {
    await run({ id: 'e2', type: 'customer.subscription.updated', data: { object: { customer: 'cus_1', status: 'unpaid' } } })
    expect(userUpdate).toHaveBeenCalledWith(expect.objectContaining({ plan: 'free' }))
  })
})

describe('stripe-webhook — autres events', () => {
  it('subscription.deleted déclasse en gratuit', async () => {
    await run({ id: 'e3', type: 'customer.subscription.deleted', data: { object: { customer: 'cus_1' } } })
    expect(userUpdate).toHaveBeenCalledWith(expect.objectContaining({ plan: 'free', subscriptionStatus: 'canceled' }))
  })

  it('invoice.payment_failed NE déclasse PAS (grâce)', async () => {
    await run({ id: 'e4', type: 'invoice.payment_failed', data: { object: { customer: 'cus_1' } } })
    expect(userUpdate).not.toHaveBeenCalled()
  })

  it('checkout.session.completed passe premium avec l\'uid du metadata', async () => {
    await run({ id: 'e5', type: 'checkout.session.completed', data: { object: { metadata: { firebaseUid: 'u1' }, customer: 'cus_1', subscription: 'sub_1' } } })
    expect(userSet).toHaveBeenCalledWith(
      expect.objectContaining({ plan: 'premium', stripeSubscriptionId: 'sub_1' }),
      { merge: true },
    )
  })
})

describe('stripe-webhook — idempotence', () => {
  it('un event déjà traité est ignoré', async () => {
    eventGet.mockResolvedValue({ exists: true })
    const res = await run({ id: 'dup', type: 'customer.subscription.updated', data: { object: { customer: 'cus_1', status: 'unpaid' } } })
    expect(res.payload).toEqual({ received: true, duplicate: true })
    expect(userUpdate).not.toHaveBeenCalled()
    expect(eventSet).not.toHaveBeenCalled()
  })

  it('rejette (400) une signature invalide', async () => {
    constructEvent.mockImplementation(() => { throw new Error('bad sig') })
    const res = makeRes()
    await handler(makeReq(), res)
    expect(res.statusCode).toBe(400)
    expect(eventSet).not.toHaveBeenCalled()
  })
})
