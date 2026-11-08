import { describe, it, expect, vi } from 'vitest'
import { lienOffrir, lienOffrirValide, activiteSemaine, mailDemandePlus, routeDemandePlus, routeOffrir, INTERVALLE_MS } from '../_demandePlus.js'

const SECRET = 'secret-de-test'
const T = 1_800_000_000_000
const UID = 'eleveABC12345'

function fauxDb(profil, revisions = []) {
  const etat = { profil }
  const ref = {
    get: async () => ({ exists: etat.profil != null, data: () => etat.profil }),
    set: async v => { etat.profil = { ...(etat.profil ?? {}), ...v } },
    collection: () => ({ where: () => ({ get: async () => ({ docs: revisions.map(r => ({ data: () => r })) }) }) }),
  }
  return { etat, collection: () => ({ doc: () => ref }) }
}
const auth = { verifyIdToken: async t => { if (t !== 'ok') throw new Error('x'); return { uid: UID, email: 'eleve@exemple.fr' } } }
function fauxRes() {
  const r = { code: 0, body: null, headers: {}, status(c) { r.code = c; return r }, json(b) { r.body = b; return r }, send(b) { r.body = b; return r }, setHeader(k, v) { r.headers[k] = v } }
  return r
}

describe('lien « Offrir Réviz+ »', () => {
  it('est signé et expire', () => {
    const lien = new URL(lienOffrir(UID, { maintenant: T, secret: SECRET }))
    const [u, e, t] = ['u', 'e', 't'].map(k => lien.searchParams.get(k))
    expect(lienOffrirValide(u, e, t, { maintenant: T, secret: SECRET })).toBe(true)
    expect(lienOffrirValide(u, e, t + 'x', { maintenant: T, secret: SECRET })).toBe(false)
    expect(lienOffrirValide('autreUID12345', e, t, { maintenant: T, secret: SECRET })).toBe(false)
    expect(lienOffrirValide(u, e, t, { maintenant: T + 31 * 864e5, secret: SECRET })).toBe(false)
  })
})

describe('e-mail au parent', () => {
  it('résume la semaine et porte le lien', () => {
    const act = activiteSemaine([
      { type: 'exercices', revisedAt: T - 3600e3 },
      { type: 'quiz', revisedAt: T - 2 * 864e5 },
      { type: 'exercices', revisedAt: T - 9 * 864e5 },
    ], T)
    expect(act).toEqual({ revisions: 2, exercices: 1, jours: 2 })
    const m = mailDemandePlus({ prenom: 'Léa', activite: act, lien: 'https://app.revizapp.fr/x?a=1&b=2' })
    expect(m.subject).toBe('Léa aimerait Réviz+')
    expect(m.html).toContain('href="https://app.revizapp.fr/x?a=1&amp;b=2"')
    expect(m.html).toContain('3 par jour')
    expect(m.html).toContain('49 €')
  })
})

describe('?op=demande-plus', () => {
  it('envoie au parent puis attend 2 jours', async () => {
    const db = fauxDb({ prenom: 'Léa', plan: 'free' })
    const envoyer = vi.fn(async () => ({ id: 'x' }))
    const r = fauxRes()
    await routeDemandePlus({ body: { idToken: 'ok', email: ' Parent@Exemple.fr ' } }, r, { db, auth, envoyer, maintenant: T, secret: SECRET })
    expect(r.code).toBe(200)
    expect(envoyer).toHaveBeenCalledOnce()
    expect(envoyer.mock.calls[0][0].to).toBe('parent@exemple.fr')
    expect(db.etat.profil.demandePlusLe).toBe(T)
    const r2 = fauxRes()
    await routeDemandePlus({ body: { idToken: 'ok', email: 'parent@exemple.fr' } }, r2, { db, auth, envoyer, maintenant: T + INTERVALLE_MS - 1, secret: SECRET })
    expect(r2.code).toBe(429)
  })
  it('refuse une adresse invalide, celle de l\'élève, et un abonné', async () => {
    const envoyer = vi.fn()
    for (const [profil, email, code] of [
      [{ plan: 'free' }, 'pas-une-adresse', 400],
      [{ plan: 'free' }, 'eleve@exemple.fr', 400],
      [{ plan: 'premium', subscriptionStatus: 'active' }, 'parent@exemple.fr', 409],
    ]) {
      const r = fauxRes()
      await routeDemandePlus({ body: { idToken: 'ok', email } }, r, { db: fauxDb(profil), auth, envoyer, maintenant: T, secret: SECRET })
      expect(r.code).toBe(code)
    }
    expect(envoyer).not.toHaveBeenCalled()
  })
})

describe('?op=offrir', () => {
  const query = () => {
    const l = new URL(lienOffrir(UID, { maintenant: T, secret: SECRET }))
    return Object.fromEntries(l.searchParams)
  }
  it('GET montre la page sans rien créer, POST ouvre le paiement', async () => {
    const creerSession = vi.fn(async () => 'https://checkout.stripe.com/s')
    const db = fauxDb({ prenom: 'Léa', plan: 'free' })
    const r = fauxRes()
    await routeOffrir({ method: 'GET', query: query() }, r, { db, creerSession, maintenant: T, secret: SECRET })
    expect(r.code).toBe(200)
    expect(r.body).toContain('Offrir Réviz+ à Léa')
    expect(creerSession).not.toHaveBeenCalled()
    const r2 = fauxRes()
    await routeOffrir({ method: 'POST', query: { ...query(), f: 'mensuel' } }, r2, { db, creerSession, maintenant: T, secret: SECRET })
    expect(r2.code).toBe(303)
    expect(r2.headers.Location).toBe('https://checkout.stripe.com/s')
    expect(creerSession.mock.calls[0][0]).toMatchObject({ uid: UID, formule: 'mensuel', parent: true })
  })
  it('refuse un lien falsifié et ne revend pas à un abonné', async () => {
    const creerSession = vi.fn()
    const r = fauxRes()
    await routeOffrir({ method: 'POST', query: { ...query(), t: 'faux' } }, r, { db: fauxDb({}), creerSession, maintenant: T, secret: SECRET })
    expect(r.code).toBe(400)
    const r2 = fauxRes()
    await routeOffrir({ method: 'POST', query: query() }, r2, { db: fauxDb({ prenom: 'Léa', plan: 'premium', subscriptionStatus: 'active' }), creerSession, maintenant: T, secret: SECRET })
    expect(r2.body).toContain('déjà Réviz+')
    expect(creerSession).not.toHaveBeenCalled()
  })
})
