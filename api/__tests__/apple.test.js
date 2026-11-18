import { describe, it, expect, vi } from 'vitest'
import { etatApple, appliquerApple, uidsDeLEvenement, routeSynchroApple, PRODUITS_APPLE } from '../_apple.js'
import handler from '../revenuecat-webhook.js'

const MAINTENANT = Date.parse('2026-11-18T12:00:00Z')
const iso = t => new Date(t).toISOString()
const JOUR = 86_400_000

/** Firestore minimal : users + abonnementsApple, transactions comprises. */
function fauxDb(profils = {}) {
  const donnees = { users: { ...profils }, abonnementsApple: {} }
  const ref = (col, id) => ({ col, id })
  const db = {
    donnees,
    collection: col => ({ doc: id => ref(col, id) }),
    async runTransaction(fn) {
      return fn({
        get: async r => ({ exists: r.id in donnees[r.col], data: () => donnees[r.col][r.id] }),
        set: (r, v) => { donnees[r.col][r.id] = { ...(donnees[r.col][r.id] ?? {}), ...v } },
      })
    },
  }
  return db
}

const abonne = (produit, s) => ({ subscriptions: { [produit]: { store: 'app_store', is_sandbox: false, ...s } } })

describe('etatApple', () => {
  it('abonnement en cours → actif, formule et fin', () => {
    const e = etatApple(abonne(PRODUITS_APPLE.annuel, { expires_date: iso(MAINTENANT + 30 * JOUR) }), MAINTENANT)
    expect(e).toMatchObject({ actif: true, formule: 'annuel', expire: MAINTENANT + 30 * JOUR, annule: false })
  })
  it('expiré → inactif ; période de grâce → encore actif', () => {
    expect(etatApple(abonne(PRODUITS_APPLE.mensuel, { expires_date: iso(MAINTENANT - JOUR) }), MAINTENANT).actif).toBe(false)
    expect(etatApple(abonne(PRODUITS_APPLE.mensuel, {
      expires_date: iso(MAINTENANT - JOUR), grace_period_expires_date: iso(MAINTENANT + 5 * JOUR),
    }), MAINTENANT).actif).toBe(true)
  })
  it('remboursé → coupé tout de suite', () => {
    const e = etatApple(abonne(PRODUITS_APPLE.annuel, { expires_date: iso(MAINTENANT + 300 * JOUR), refunded_at: iso(MAINTENANT - JOUR) }), MAINTENANT)
    expect(e.actif).toBe(false)
  })
  it('résiliation programmée → annule, toujours actif jusqu\'à la fin', () => {
    const e = etatApple(abonne(PRODUITS_APPLE.mensuel, { expires_date: iso(MAINTENANT + 3 * JOUR), unsubscribe_detected_at: iso(MAINTENANT) }), MAINTENANT)
    expect(e).toMatchObject({ actif: true, annule: true })
  })
  it('ignore les produits inconnus ; jamais acheté → null', () => {
    expect(etatApple({ subscriptions: { autre: { expires_date: iso(MAINTENANT + JOUR) } } }, MAINTENANT)).toBeNull()
    expect(etatApple(null)).toBeNull()
  })
  it('passage du mensuel à l\'annuel : garde celui qui finit le plus tard', () => {
    const e = etatApple({ subscriptions: {
      [PRODUITS_APPLE.mensuel]: { expires_date: iso(MAINTENANT - JOUR) },
      [PRODUITS_APPLE.annuel]: { expires_date: iso(MAINTENANT + 360 * JOUR) },
    } }, MAINTENANT)
    expect(e.formule).toBe('annuel')
  })
})

describe('appliquerApple', () => {
  const actif = { actif: true, formule: 'mensuel', produit: PRODUITS_APPLE.mensuel, expire: MAINTENANT + 30 * JOUR, annule: false, sandbox: false }

  it('donne Réviz+ et les champs affichés', async () => {
    const db = fauxDb({ u1: { plan: 'free' } })
    const r = await appliquerApple(db, 'u1', actif, MAINTENANT)
    expect(r).toEqual({ plan: 'premium', change: true })
    expect(db.donnees.users.u1).toMatchObject({ plan: 'premium', sourceAbonnement: 'apple', formule: 'mensuel', periodeFin: actif.expire, annuleLe: null, upgradedAt: MAINTENANT })
    expect(db.donnees.abonnementsApple.u1).toMatchObject({ actif: true, majLe: MAINTENANT })
  })

  it('fin de l\'abonnement Apple → retour en gratuit', async () => {
    const db = fauxDb({ u1: { plan: 'premium', sourceAbonnement: 'apple' } })
    const r = await appliquerApple(db, 'u1', { ...actif, actif: false }, MAINTENANT)
    expect(r).toEqual({ plan: 'free', change: true })
    expect(db.donnees.users.u1.plan).toBe('free')
  })

  it('ne retire jamais un Réviz+ venu de Stripe ou d\'un cadeau', async () => {
    const db = fauxDb({
      s: { plan: 'premium', sourceAbonnement: 'stripe', stripeSubscriptionId: 'sub', subscriptionStatus: 'active' },
      c: { plan: 'premium', stripeSubscriptionId: 'sub_cadeau' },
      // marqué Apple mais Stripe court encore (abonné des deux côtés)
      d: { plan: 'premium', sourceAbonnement: 'apple', stripeSubscriptionId: 'sub', subscriptionStatus: 'past_due' },
    })
    for (const uid of ['s', 'c', 'd']) {
      const r = await appliquerApple(db, uid, null, MAINTENANT)
      expect(r.plan).toBe('premium')
      expect(db.donnees.users[uid].plan).toBe('premium')
    }
  })

  it('profil inconnu : n\'écrit rien', async () => {
    const db = fauxDb({})
    expect(await appliquerApple(db, 'x', actif, MAINTENANT)).toEqual({ plan: null, change: false })
    expect(db.donnees.users.x).toBeUndefined()
  })
})

describe('uidsDeLEvenement', () => {
  it('garde les uid, retire les anonymes et les doublons', () => {
    expect(uidsDeLEvenement({
      app_user_id: 'u1', original_app_user_id: '$RCAnonymousID:abc', aliases: ['u1', '$RCAnonymousID:abc'],
      transferred_from: ['u0'], transferred_to: ['u1'],
    })).toEqual(['u1', 'u0'])
  })
})

function fauxRes() {
  return { statusCode: 200, body: null, status(c) { this.statusCode = c; return this }, json(b) { this.body = b; return this }, end() { return this } }
}

describe('revenuecat-webhook', () => {
  const req = (auth, event) => ({ method: 'POST', headers: { authorization: auth }, body: { event } })

  it('refuse un secret faux ou absent', async () => {
    const res = fauxRes()
    await handler(req('Bearer faux', { type: 'RENEWAL', app_user_id: 'u1' }), res, { secret: 'Bearer bon', db: {} })
    expect(res.statusCode).toBe(401)
    const res2 = fauxRes()
    await handler(req(undefined, { type: 'RENEWAL', app_user_id: 'u1' }), res2, { secret: 'Bearer bon', db: {} })
    expect(res2.statusCode).toBe(401)
  })

  it('relit RevenueCat pour chaque élève cité', async () => {
    const synchroniser = vi.fn(async () => ({ plan: 'premium' }))
    const res = fauxRes()
    await handler(req('Bearer bon', { type: 'TRANSFER', transferred_from: ['u0'], transferred_to: ['u1'] }), res, { secret: 'Bearer bon', db: {}, synchroniser })
    expect(res.statusCode).toBe(200)
    expect(synchroniser.mock.calls.map(c => c[1])).toEqual(['u0', 'u1'])
  })

  it('erreur RevenueCat → 500 (RevenueCat renverra l\'événement)', async () => {
    const res = fauxRes()
    await handler(req('Bearer bon', { type: 'RENEWAL', app_user_id: 'u1' }), res, { secret: 'Bearer bon', db: {}, synchroniser: async () => { throw new Error('x') } })
    expect(res.statusCode).toBe(500)
  })

  it('événement TEST du tableau de bord → 200 sans rien toucher', async () => {
    const synchroniser = vi.fn()
    const res = fauxRes()
    await handler(req('Bearer bon', { type: 'TEST', app_user_id: 'u1' }), res, { secret: 'Bearer bon', db: {}, synchroniser })
    expect(res.statusCode).toBe(200)
    expect(synchroniser).not.toHaveBeenCalled()
  })
})

describe('routeSynchroApple (?op=apple)', () => {
  it('sans jeton → 401 ; avec jeton → relit et répond le plan', async () => {
    const res = fauxRes()
    await routeSynchroApple({ method: 'POST', body: {} }, res, { db: {}, auth: {} })
    expect(res.statusCode).toBe(401)

    const db = fauxDb({ u1: { plan: 'free' } })
    const fetchImpl = vi.fn(async () => ({ ok: true, json: async () => ({ subscriber: abonne(PRODUITS_APPLE.annuel, { expires_date: iso(MAINTENANT + 300 * JOUR) }) }) }))
    const res2 = fauxRes()
    await routeSynchroApple({ method: 'POST', body: { idToken: 't' } }, res2, {
      db, auth: { verifyIdToken: async () => ({ uid: 'u1' }) }, fetchImpl, cle: 'sk_test', maintenant: MAINTENANT,
    })
    expect(res2.statusCode).toBe(200)
    expect(res2.body).toMatchObject({ plan: 'premium', actif: true, formule: 'annuel' })
    expect(fetchImpl.mock.calls[0][0]).toBe('https://api.revenuecat.com/v1/subscribers/u1')
  })

  it('RevenueCat injoignable → 502', async () => {
    const res = fauxRes()
    await routeSynchroApple({ method: 'POST', body: { idToken: 't' } }, res, {
      db: fauxDb({ u1: {} }), auth: { verifyIdToken: async () => ({ uid: 'u1' }) }, fetchImpl: async () => ({ ok: false, status: 503 }), cle: 'sk',
    })
    expect(res.statusCode).toBe(502)
  })
})
