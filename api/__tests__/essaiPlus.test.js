import { describe, it, expect } from 'vitest'
import { routeEssaiPlus, essaiPlusActif, ESSAI_MS } from '../_essaiPlus.js'
import { revizPlusOffertServeur } from '../_offert.js'

function fauxDb(profil) {
  const etat = { profil }
  const ref = { id: 'u' }
  return {
    etat,
    collection: () => ({ doc: () => ref }),
    runTransaction: async fn => fn({
      get: async () => ({ exists: etat.profil != null, data: () => etat.profil }),
      set: (_r, v) => { etat.profil = { ...(etat.profil ?? {}), ...v } },
    }),
  }
}
const auth = { verifyIdToken: async t => { if (t !== 'ok') throw new Error('x'); return { uid: 'eleve123456' } } }
function fauxRes() {
  const r = { code: 0, body: null, status(c) { r.code = c; return r }, json(b) { r.body = b; return r } }
  return r
}
const T = 1_800_000_000_000

describe('essai Réviz+ de 7 jours', () => {
  it('s\'ouvre une seule fois', async () => {
    const db = fauxDb({ plan: 'free' })
    const r1 = fauxRes()
    await routeEssaiPlus({ body: { idToken: 'ok' } }, r1, { db, auth, maintenant: T })
    expect(r1.code).toBe(200)
    expect(r1.body).toEqual({ fin: T + ESSAI_MS, nouveau: true })
    const r2 = fauxRes()
    await routeEssaiPlus({ body: { idToken: 'ok' } }, r2, { db, auth, maintenant: T + 1000 })
    expect(r2.body).toEqual({ fin: T + ESSAI_MS, nouveau: false })
  })
  it('refuse un abonné et un jeton absent', async () => {
    const r = fauxRes()
    await routeEssaiPlus({ body: { idToken: 'ok' } }, r, { db: fauxDb({ plan: 'premium' }), auth, maintenant: T })
    expect(r.code).toBe(409)
    const r2 = fauxRes()
    await routeEssaiPlus({ body: {} }, r2, { db: fauxDb(null), auth, maintenant: T })
    expect(r2.code).toBe(401)
  })
  it('compte comme Réviz+ offert côté serveur pendant 7 jours', async () => {
    const profil = { essaiPlus: { debut: Date.now() - 1000, fin: Date.now() + ESSAI_MS } }
    expect(essaiPlusActif(profil)).toBe(true)
    expect(await revizPlusOffertServeur(profil)).toBe(true)
    expect(await revizPlusOffertServeur({ essaiPlus: { fin: Date.now() - 1 } })).toBe(false)
    expect(await revizPlusOffertServeur(null)).toBe(false)
  })
})
