import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('../_firebaseAdmin.js', () => ({ getDb: () => fauxDb, getRtdb: async () => fausseRtdb }))

const MAINTENANT = Date.parse('2026-10-08T03:00:00Z')
const HEURE = 3600_000

// Realtime Database : orderByChild('creeLe').endAt(x) rend les salons créés avant x.
let salons
const update = vi.fn(async maj => { for (const k of Object.keys(maj)) delete salons[k] })
const fausseRtdb = {
  ref: () => ({
    orderByChild: () => ({
      endAt: limite => ({
        get: async () => ({
          forEach: fn => Object.entries(salons)
            .filter(([, s]) => (s.creeLe ?? 0) <= limite)
            .forEach(([key]) => fn({ key })),
        }),
      }),
    }),
    update,
  }),
}

// Firestore : where('compteLe', '<', date) puis suppression par lots.
let marques
const supprimees = []
const fauxDb = {
  collection: () => ({
    where: (_champ, _op, date) => ({
      get: async () => ({
        docs: Object.entries(marques).filter(([, m]) => m.compteLe < date).map(([id]) => ({ ref: id })),
      }),
    }),
  }),
  batch: () => {
    const lot = []
    return { delete: ref => lot.push(ref), commit: async () => { supprimees.push(...lot) } }
  },
}

const { default: handler, nettoyer } = await import('../battle-nettoyage.js')

function appel(headers = {}) {
  const res = { statusCode: 0, body: null, status(c) { this.statusCode = c; return this }, json(b) { this.body = b; return this } }
  return handler({ method: 'GET', headers }, res).then(() => res)
}

beforeEach(() => {
  salons = {
    VIEU: { creeLe: MAINTENANT - 5 * HEURE },
    LIMT: { creeLe: MAINTENANT - HEURE - 1 },
    JEUX: { creeLe: MAINTENANT - 10 * 60_000 },
  }
  marques = {
    'VIEU-1': { compteLe: new Date(MAINTENANT - 72 * HEURE) },
    'JEUX-2': { compteLe: new Date(MAINTENANT - 2 * HEURE) },
  }
  supprimees.length = 0
  update.mockClear()
  vi.stubEnv('CRON_SECRET', 'secret-test')
})
afterEach(() => vi.unstubAllEnvs())

describe('nettoyage des Battles', () => {
  it('supprime les salons de plus d’une heure et les marques de plus de 48 heures', async () => {
    const r = await nettoyer({ rtdb: fausseRtdb, db: fauxDb, maintenant: MAINTENANT })
    expect(r).toEqual({ salons: 2, marques: 1 })
    expect(Object.keys(salons)).toEqual(['JEUX'])
    expect(supprimees).toEqual(['VIEU-1'])
  })

  it('ne touche à rien quand tout est récent', async () => {
    salons = { JEUX: { creeLe: MAINTENANT - 60_000 } }
    marques = {}
    expect(await nettoyer({ rtdb: fausseRtdb, db: fauxDb, maintenant: MAINTENANT })).toEqual({ salons: 0, marques: 0 })
    expect(update).not.toHaveBeenCalled()
  })

  it('refuse tout appel sans le secret du cron Vercel', async () => {
    expect((await appel()).statusCode).toBe(401)
    expect((await appel({ authorization: 'Bearer autre' })).statusCode).toBe(401)
    vi.stubEnv('CRON_SECRET', '')
    expect((await appel({ authorization: 'Bearer ' })).statusCode).toBe(401)
  })

  it('avec le secret, nettoie et dit ce qu’il a supprimé', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(MAINTENANT)
    const res = await appel({ authorization: 'Bearer secret-test' })
    vi.useRealTimers()
    expect(res.statusCode).toBe(200)
    expect(res.body).toEqual({ salons: 2, marques: 1 })
  })
})
