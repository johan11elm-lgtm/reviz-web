import { describe, it, expect } from 'vitest'
import { routeLigue, pseudoLigue, zones, ligueSuivante, xpPlausible, TAILLE_GROUPE, XP_JOUR_MAX, XP_PAR_MINUTE } from '../_ligues.js'

// Firestore en mémoire, avec sous-collections, where('==') et transactions.
function fauxDb(initial = {}) {
  const docs = { ...initial }
  const docRef = chemin => ({
    chemin,
    collection: nom => colRef(`${chemin}/${nom}`),
    get: async () => ({ exists: docs[chemin] != null, data: () => docs[chemin] }),
    set: async (v, o) => { docs[chemin] = o?.merge ? { ...(docs[chemin] ?? {}), ...v } : v },
  })
  const colRef = chemin => ({
    doc: id => docRef(`${chemin}/${id}`),
    where: (champ, _op, val) => ({
      get: async () => ({ docs: Object.entries(docs)
        .filter(([c, v]) => c.startsWith(`${chemin}/`) && !c.slice(chemin.length + 1).includes('/') && v?.[champ] === val)
        .map(([c, v]) => ({ id: c.split('/').pop(), data: () => v })) }),
    }),
  })
  return {
    docs,
    collection: nom => colRef(nom),
    runTransaction: async fn => fn({ get: r => r.get(), set: (r, v, o) => r.set(v, o) }),
  }
}
const auth = { verifyIdToken: async t => {
  if (t === 'anon') return { uid: 'a', firebase: { sign_in_provider: 'anonymous' } }
  if (!t?.startsWith('jeton-')) throw new Error('x')
  return { uid: t.slice(6), firebase: { sign_in_provider: 'password' } }
} }
const MERCREDI = Date.parse('2026-11-11T18:00:00+01:00')
const SEMAINE_PRO = Date.parse('2026-11-17T18:00:00+01:00')
async function appel(db, uid, xpSemaine, maintenant = MERCREDI) {
  const r = { code: 0, body: null, status(c) { r.code = c; return r }, json(b) { r.body = b; return r } }
  await routeLigue({ body: { idToken: `jeton-${uid}`, xpSemaine } }, r, { db, auth, maintenant })
  return r
}

describe('ligues de la semaine', () => {
  it('le pseudo ne dit rien de l’élève et ne change pas', () => {
    expect(pseudoLigue('uid-lea')).toMatch(/^\S+ \S+ \d{2}$/)
    expect(pseudoLigue('uid-lea')).toBe(pseudoLigue('uid-lea'))
  })
  it('zones : pas de descente en Bronze, pas de montée en Or, et un tiers au plus du groupe', () => {
    expect(zones('bronze', 30)).toEqual({ montee: 5, descente: null })
    expect(zones('argent', 30)).toEqual({ montee: 5, descente: 26 })
    expect(zones('or', 30)).toEqual({ montee: 0, descente: 26 })
    expect(zones('argent', 6)).toEqual({ montee: 2, descente: 5 })
    expect(ligueSuivante('bronze', 1, 30)).toBe('argent')
    expect(ligueSuivante('argent', 30, 30)).toBe('bronze')
    expect(ligueSuivante('argent', 10, 30)).toBe('argent')
  })
  it('sans XP, on attend ; avec, on entre en Bronze, classé avec son groupe', async () => {
    const db = fauxDb()
    expect((await appel(db, 'lea', 0)).body).toMatchObject({ attente: true })
    await appel(db, 'tom', 120)
    const r = await appel(db, 'lea', 80)
    expect(r.body).toMatchObject({ ligue: 'bronze', rang: 2, total: 2 })
    expect(r.body.membres).toEqual([
      { rang: 1, pseudo: pseudoLigue('tom'), xp: 120, moi: false },
      { rang: 2, pseudo: pseudoLigue('lea'), xp: 80, moi: true },
    ])
    expect(new Date(r.body.fin).toISOString()).toBe('2026-11-15T23:00:00.000Z')
    // L'XP ne redescend pas, et elle est bridée à ce qu'un élève peut faire.
    expect((await appel(db, 'lea', 50)).body.membres.find(m => m.moi).xp).toBe(80)
    expect((await appel(db, 'lea', 99_999, MERCREDI + 5 * 60_000)).body.membres.find(m => m.moi).xp).toBe(80 + 5 * XP_PAR_MINUTE)
    expect((await appel(db, 'lea', 99_999, MERCREDI + 3 * 3600_000)).body.membres.find(m => m.moi).xp).toBe(3 * XP_JOUR_MAX)
  })
  it('XP envoyée par l’app : jamais plus que le plafond du jour × les jours déjà commencés de la semaine', () => {
    const lundi = Date.parse('2026-11-09T09:00:00+01:00')
    expect(xpPlausible(99_999, { maintenant: lundi, semaine: '2026-11-09' })).toBe(XP_JOUR_MAX)
    expect(xpPlausible(99_999, { maintenant: MERCREDI, semaine: '2026-11-09' })).toBe(3 * XP_JOUR_MAX)
    expect(xpPlausible(120, { maintenant: MERCREDI, semaine: '2026-11-09' })).toBe(120)
    // Juste après la dernière mise à jour : rien de plus.
    expect(xpPlausible(900, { maintenant: MERCREDI, semaine: '2026-11-09', avant: { xp: 100, majLe: MERCREDI } })).toBe(100)
    expect(xpPlausible('n’importe quoi', { maintenant: MERCREDI, semaine: '2026-11-09' })).toBe(0)
  })
  it(`des groupes de ${TAILLE_GROUPE} au plus`, async () => {
    const db = fauxDb()
    for (let i = 0; i < TAILLE_GROUPE + 1; i++) await appel(db, `e${i}`, 10 + i)
    expect((await appel(db, 'e0', 10)).body.total).toBe(TAILLE_GROUPE)
    expect((await appel(db, `e${TAILLE_GROUPE}`, 1)).body).toMatchObject({ total: 1, rang: 1 })
  })
  it('la semaine suivante : les premiers montent, avec le résultat à annoncer', async () => {
    const db = fauxDb()
    for (let i = 0; i < 15; i++) await appel(db, `e${i}`, 100 - i) // e0 premier, e14 dernier
    const r = await appel(db, 'e0', 10, SEMAINE_PRO)
    expect(r.body).toMatchObject({ ligue: 'argent', resultat: { rang: 1, total: 15, avant: 'bronze', apres: 'argent' } })
    expect((await appel(db, 'e14', 10, SEMAINE_PRO)).body.ligue).toBe('bronze')
  })
  it('retiré des ligues, ou invité sans compte : rien', async () => {
    const db = fauxDb({ 'users/discret': { ligueMasquee: true } })
    expect((await appel(db, 'discret', 100)).body).toEqual({ masquee: true })
    const r = { code: 0, body: null, status(c) { r.code = c; return r }, json(b) { r.body = b; return r } }
    await routeLigue({ body: { idToken: 'anon', xpSemaine: 10 } }, r, { db, auth })
    expect(r.code).toBe(409)
  })
})
