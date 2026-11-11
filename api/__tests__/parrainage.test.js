import { describe, it, expect } from 'vitest'
import {
  routeParrainage, normaliserCode, tirerCode, lienParrainage, CODE_RE,
  PARRAINAGE_MS, MAX_FILLEULS_RECOMPENSES,
} from '../_parrainage.js'
import { routeEssaiPlus, essaiPlusActif, essaiPlusDejaPris, finPlusOffert, ESSAI_MS } from '../_essaiPlus.js'

const T = 1_800_000_000_000
const JOUR = 24 * 60 * 60 * 1000

// Firestore en mémoire : collections → documents, transactions et set { merge: true } en profondeur.
function fusion(a, b) {
  const r = { ...(a ?? {}) }
  for (const [k, v] of Object.entries(b)) {
    r[k] = v && typeof v === 'object' && !Array.isArray(v) ? fusion(r[k], v) : v
  }
  return r
}
function fauxDb(initial = {}) {
  const docs = {} // 'users/u1' → données
  for (const [chemin, v] of Object.entries(initial)) docs[chemin] = v
  const ref = (col, id) => ({ chemin: `${col}/${id}` })
  return {
    docs,
    collection: col => ({ doc: id => ref(col, id) }),
    runTransaction: async fn => fn({
      get: async r => ({ exists: docs[r.chemin] != null, data: () => docs[r.chemin] }),
      set: (r, v, opts) => { docs[r.chemin] = opts?.merge ? fusion(docs[r.chemin], v) : v },
    }),
  }
}
// Jetons : 'jeton-<uid>' ; comptes créés à la date donnée (par défaut la veille de T).
function fauxAuth(crees = {}) {
  return {
    verifyIdToken: async t => { if (!t?.startsWith('jeton-')) throw new Error('x'); return { uid: t.slice(6) } },
    getUser: async uid => ({ metadata: { creationTime: new Date(crees[uid] ?? T - JOUR).toUTCString() } }),
  }
}
function fauxRes() {
  const r = { code: 0, body: null, status(c) { r.code = c; return r }, json(b) { r.body = b; return r } }
  return r
}
async function appel(corps, { db, auth = fauxAuth(), maintenant = T, hasard } = {}) {
  const res = fauxRes()
  await routeParrainage({ body: corps }, res, { db, auth, maintenant, hasard })
  return res
}
const codeDe = async (db, uid, opts) => (await appel({ idToken: `jeton-${uid}`, action: 'code' }, { db, ...opts })).body.code

describe('parrainage : les codes', () => {
  it('normalise ce que l’élève tape, refuse le reste', () => {
    expect(normaliserCode(' ab-c 23d ')).toBe('ABC23D')
    expect(normaliserCode('ABC23')).toBeNull()
    expect(normaliserCode('ABC1OL')).toBeNull() // 1, O et L ne sont jamais tirés
    expect(normaliserCode(null)).toBeNull()
  })
  it('tire des codes de 6 caractères sans caractère ambigu', () => {
    for (let i = 0; i < 200; i++) expect(tirerCode()).toMatch(CODE_RE)
    expect(lienParrainage('ABC234', 'https://app.revizapp.fr')).toBe('https://app.revizapp.fr/?parrain=ABC234')
  })
  it('donne un code à la première demande, puis toujours le même', async () => {
    const db = fauxDb({ 'users/parrain': { plan: 'free' } })
    const r1 = await appel({ idToken: 'jeton-parrain', action: 'code' }, { db })
    expect(r1.code).toBe(200)
    expect(r1.body).toMatchObject({ filleuls: 0, fin: null })
    expect(r1.body.code).toMatch(CODE_RE)
    expect(db.docs[`parrainages/${r1.body.code}`]).toEqual({ uid: 'parrain', creeLe: T })
    expect(db.docs['users/parrain']).toEqual({ plan: 'free', essaiPlus: { parrainage: { code: r1.body.code } } })
    const r2 = await appel({ idToken: 'jeton-parrain', action: 'code' }, { db })
    expect(r2.body.code).toBe(r1.body.code)
  })
  it('évite un code déjà pris', async () => {
    const tirages = ['AAAAAA', 'BBBBBB'].flatMap(c => [...c].map(l => 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'.indexOf(l) / 31 + 0.001))
    const hasard = () => tirages.shift()
    const db = fauxDb({ 'parrainages/AAAAAA': { uid: 'autre' } })
    expect(await codeDe(db, 'parrain', { hasard })).toBe('BBBBBB')
  })
  it('refuse sans jeton valable, ou sans action connue', async () => {
    expect((await appel({ action: 'code' }, { db: fauxDb() })).code).toBe(401)
    expect((await appel({ idToken: 'faux', action: 'code' }, { db: fauxDb() })).code).toBe(401)
    expect((await appel({ idToken: 'jeton-u', action: 'pirater' }, { db: fauxDb() })).code).toBe(400)
  })
})

describe('parrainage : utiliser le code d’un ami', () => {
  it('3 jours de Réviz+ pour les deux', async () => {
    const db = fauxDb({ 'users/parrain': { plan: 'free' }, 'users/filleul': { plan: 'free' } })
    const code = await codeDe(db, 'parrain')
    const r = await appel({ idToken: 'jeton-filleul', action: 'utiliser', code: code.toLowerCase() }, { db })
    expect(r.code).toBe(200)
    expect(r.body).toEqual({ fin: T + PARRAINAGE_MS })
    expect(db.docs['users/filleul'].essaiPlus.parrainage).toEqual({ fin: T + PARRAINAGE_MS, utiliseLe: T })
    expect(db.docs['users/parrain'].essaiPlus.parrainage).toEqual({ code, filleuls: 1, dernierFilleulLe: T, fin: T + PARRAINAGE_MS })
    // Réviz+ offert pour les deux, côté serveur.
    expect(essaiPlusActif(db.docs['users/filleul'], T + 1000)).toBe(true)
    expect(essaiPlusActif(db.docs['users/parrain'], T + PARRAINAGE_MS + 1)).toBe(false)
  })
  it('les jours s’ajoutent à un essai en cours, et ne consomment pas l’essai de 7 jours', async () => {
    const db = fauxDb({ 'users/parrain': { essaiPlus: { debut: T - JOUR, fin: T + 2 * JOUR } }, 'users/filleul': {} })
    const code = await codeDe(db, 'parrain')
    await appel({ idToken: 'jeton-filleul', action: 'utiliser', code }, { db })
    expect(db.docs['users/parrain'].essaiPlus.parrainage.fin).toBe(T + 2 * JOUR + PARRAINAGE_MS)
    expect(finPlusOffert(db.docs['users/parrain'])).toBe(T + 2 * JOUR + PARRAINAGE_MS)
    // Le filleul n'a pas encore pris son essai : il reste à prendre, et le parrainage n'est pas écrasé.
    const filleul = db.docs['users/filleul']
    expect(essaiPlusDejaPris(filleul)).toBe(false)
    const res = fauxRes()
    await routeEssaiPlus({ body: { idToken: 'ok' } }, res, {
      db: { collection: () => ({ doc: () => ({}) }), runTransaction: async fn => fn({ get: async () => ({ exists: true, data: () => filleul }), set: (_r, v) => { Object.assign(filleul, fusion(filleul, v)) } }) },
      auth: { verifyIdToken: async () => ({ uid: 'filleul' }) },
      maintenant: T + JOUR,
    })
    expect(res.body).toEqual({ fin: T + JOUR + ESSAI_MS, nouveau: true })
    expect(filleul.essaiPlus.parrainage.fin).toBe(T + PARRAINAGE_MS)
    expect(finPlusOffert(filleul)).toBe(T + JOUR + ESSAI_MS)
  })
  it('refuse son propre code, un code inconnu ou mal formé', async () => {
    const db = fauxDb({ 'users/parrain': {} })
    const code = await codeDe(db, 'parrain')
    expect((await appel({ idToken: 'jeton-parrain', action: 'utiliser', code }, { db })).body).toEqual({ error: 'SOI_MEME' })
    expect((await appel({ idToken: 'jeton-f', action: 'utiliser', code: 'ZZZZZZ' }, { db })).code).toBe(404)
    expect((await appel({ idToken: 'jeton-f', action: 'utiliser', code: '12' }, { db })).body).toEqual({ error: 'CODE_INVALIDE' })
  })
  it('un seul parrainage par compte, dans la semaine qui suit sa création', async () => {
    const db = fauxDb({ 'users/a': {}, 'users/b': {}, 'users/f': {} })
    const codeA = await codeDe(db, 'a')
    const codeB = await codeDe(db, 'b')
    expect((await appel({ idToken: 'jeton-f', action: 'utiliser', code: codeA }, { db })).code).toBe(200)
    const r = await appel({ idToken: 'jeton-f', action: 'utiliser', code: codeB }, { db })
    expect(r.code).toBe(409)
    expect(r.body).toEqual({ error: 'DEJA_PARRAINE' })
    expect(db.docs['users/b'].essaiPlus.parrainage.filleuls).toBeUndefined()

    const vieux = fauxAuth({ ancien: T - 8 * JOUR })
    const r2 = await appel({ idToken: 'jeton-ancien', action: 'utiliser', code: codeA }, { db, auth: vieux })
    expect(r2.body).toEqual({ error: 'TROP_TARD' })
  })
  it('un abonné qui parraine ne gagne pas de jours, son ami si', async () => {
    const db = fauxDb({ 'users/abonne': { plan: 'premium' }, 'users/f': {} })
    const code = await codeDe(db, 'abonne')
    const r = await appel({ idToken: 'jeton-f', action: 'utiliser', code }, { db })
    expect(r.body).toEqual({ fin: T + PARRAINAGE_MS })
    expect(db.docs['users/abonne'].essaiPlus.parrainage).toEqual({ code, filleuls: 1, dernierFilleulLe: T })
  })
  it(`récompense le parrain pour ${MAX_FILLEULS_RECOMPENSES} amis au plus`, async () => {
    const db = fauxDb({ 'users/p': {} })
    const code = await codeDe(db, 'p')
    for (let i = 1; i <= MAX_FILLEULS_RECOMPENSES + 1; i++) {
      expect((await appel({ idToken: `jeton-f${i}`, action: 'utiliser', code }, { db })).code).toBe(200)
    }
    const p = db.docs['users/p'].essaiPlus.parrainage
    expect(p.filleuls).toBe(MAX_FILLEULS_RECOMPENSES + 1)
    expect(p.fin).toBe(T + MAX_FILLEULS_RECOMPENSES * PARRAINAGE_MS)
  })
})
