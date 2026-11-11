import { describe, it, expect, vi } from 'vitest'
import { routeCadeau, codeCadeau, enregistrerCadeau, mailCadeau } from '../_cadeau.js'
import { CODE_CADEAU_RE } from '../../src/utils/cadeau.js'

const SECRET = 'secret-de-test'
const T = 1_800_000_000_000

function fusion(a, b) {
  const r = { ...(a ?? {}) }
  for (const [k, v] of Object.entries(b)) r[k] = v && typeof v === 'object' && !Array.isArray(v) ? fusion(r[k], v) : v
  return r
}
function fauxDb(initial = {}) {
  const docs = { ...initial }
  const ref = (col, id) => ({
    chemin: `${col}/${id}`,
    get: async () => ({ exists: docs[`${col}/${id}`] != null, data: () => docs[`${col}/${id}`] }),
    set: async (v, o) => { docs[`${col}/${id}`] = o?.merge ? fusion(docs[`${col}/${id}`], v) : v },
    collection: sous => ({ doc: id2 => ref(`${col}/${id}/${sous}`, id2) }),
  })
  return {
    docs,
    collection: col => ({ doc: id => ref(col, id) }),
    runTransaction: async fn => fn({
      get: async r => ({ exists: docs[r.chemin] != null, data: () => docs[r.chemin] }),
      set: (r, v, o) => { docs[r.chemin] = o?.merge ? fusion(docs[r.chemin], v) : v },
    }),
  }
}
const auth = { verifyIdToken: async t => {
  if (t === 'anonyme') return { uid: 'anon', firebase: { sign_in_provider: 'anonymous' } }
  if (!t?.startsWith('jeton-')) throw new Error('x')
  return { uid: t.slice(6), firebase: { sign_in_provider: 'password' } }
} }
function fauxStripe({ statut = 'active', session = {} } = {}) {
  return {
    checkout: { sessions: { retrieve: vi.fn(async id => ({ id, status: 'complete', payment_status: 'paid', customer: 'cus_1', subscription: 'sub_1', metadata: { cadeau: '1', formule: 'annuel', fondateur: 'false' }, customer_details: { email: 'parent@famille.test' }, ...session })) } },
    subscriptions: { retrieve: vi.fn(async () => ({ status: statut })), update: vi.fn(async () => ({})) },
  }
}
function fauxRes() {
  const r = { code: 0, body: null, status(c) { r.code = c; return r }, json(b) { r.body = b; return r } }
  return r
}
async function appel(corps, deps) {
  const res = fauxRes()
  await routeCadeau({ body: corps }, res, { auth, secret: SECRET, maintenant: T, ...deps })
  return res
}
const SESSION = 'cs_test_a1B2c3D4e5F6g7H8'
const CODE = codeCadeau(SESSION, SECRET)

describe('Réviz+ offert par un parent', () => {
  it('le code : 8 caractères sans ambiguïté, toujours le même pour un paiement', () => {
    expect(CODE).toMatch(CODE_CADEAU_RE)
    expect(codeCadeau(SESSION, SECRET)).toBe(CODE)
    expect(codeCadeau('cs_test_autre_session_xyz', SECRET)).not.toBe(CODE)
    expect(() => codeCadeau(SESSION, '')).toThrow()
  })
  it('la caisse : une formule et l’adresse du parent, sans élève rattaché', async () => {
    const creerSession = vi.fn(async () => 'https://checkout.stripe.com/c/x')
    expect((await appel({ action: 'caisse', formule: 'annuel', email: 'pas-une-adresse' }, { db: fauxDb(), creerSession })).body).toEqual({ error: 'EMAIL' })
    expect((await appel({ action: 'caisse', formule: 'a-vie', email: 'p@f.fr' }, { db: fauxDb(), creerSession })).body).toEqual({ error: 'FORMULE' })
    const r = await appel({ action: 'caisse', formule: 'mensuel', email: ' parent@famille.test ' }, { db: fauxDb(), creerSession })
    expect(r.body).toEqual({ url: 'https://checkout.stripe.com/c/x' })
    expect(creerSession).toHaveBeenCalledWith(expect.objectContaining({
      uid: null, cadeau: true, parent: true, email: 'parent@famille.test', formule: 'mensuel',
      successUrl: 'https://app.revizapp.fr/parents/merci?session={CHECKOUT_SESSION_ID}',
    }))
  })
  it('la page de remerciement retrouve le code du paiement, et l’enregistre', async () => {
    const db = fauxDb()
    const r = await appel({ action: 'code', session: SESSION }, { db, stripe: fauxStripe() })
    expect(r.body).toEqual({ code: CODE, formule: 'annuel', active: false })
    expect(db.docs[`cadeaux/${CODE}`]).toMatchObject({ sessionId: SESSION, customer: 'cus_1', subscription: 'sub_1', formule: 'annuel', email: 'parent@famille.test', creeLe: T })
  })
  it('rien pour une session pas payée ou qui n’est pas un cadeau', async () => {
    expect((await appel({ action: 'code', session: SESSION }, { db: fauxDb(), stripe: fauxStripe({ session: { status: 'open', payment_status: 'unpaid' } }) })).body).toEqual({ error: 'PAS_PAYE' })
    expect((await appel({ action: 'code', session: SESSION }, { db: fauxDb(), stripe: fauxStripe({ session: { metadata: {} } }) })).body).toEqual({ error: 'PAS_PAYE' })
    expect((await appel({ action: 'code', session: 'pas-une-session' }, { db: fauxDb(), stripe: fauxStripe() })).code).toBe(400)
  })
  it('l’enfant active le code : l’abonnement lui est rattaché, une seule fois', async () => {
    const db = fauxDb()
    const stripe = fauxStripe()
    await enregistrerCadeau(db, await stripe.checkout.sessions.retrieve(SESSION), { maintenant: T, secret: SECRET })
    const r = await appel({ action: 'activer', idToken: 'jeton-tom', code: CODE.toLowerCase().replace(/^(.{4})/, '$1-') }, { db, stripe })
    expect(r.body).toEqual({ ok: true, formule: 'annuel' })
    expect(db.docs['users/tom']).toMatchObject({ plan: 'premium', stripeCustomerId: 'cus_1', stripeSubscriptionId: 'sub_1', subscriptionStatus: 'active', payeur: 'parent', formule: 'annuel' })
    expect(db.docs[`cadeaux/${CODE}`]).toMatchObject({ uid: 'tom', activeLe: T })
    expect(stripe.subscriptions.update).toHaveBeenCalledWith('sub_1', { metadata: { firebaseUid: 'tom', payeur: 'parent', cadeau: '1' } })
    // Le même élève peut retaper le code ; un autre non.
    expect((await appel({ action: 'activer', idToken: 'jeton-tom', code: CODE }, { db, stripe })).body).toMatchObject({ ok: true, deja: true })
    expect((await appel({ action: 'activer', idToken: 'jeton-lea', code: CODE }, { db, stripe })).body).toEqual({ error: 'DEJA_UTILISE' })
  })
  it('refuse un élève déjà abonné, un abonnement arrêté, un invité sans compte, un code inconnu', async () => {
    const stripe = fauxStripe()
    const session = await stripe.checkout.sessions.retrieve(SESSION)
    const db = fauxDb({ 'users/abonne': { plan: 'premium', stripeSubscriptionId: 'sub_perso' } })
    await enregistrerCadeau(db, session, { maintenant: T, secret: SECRET })
    expect((await appel({ action: 'activer', idToken: 'jeton-abonne', code: CODE }, { db, stripe })).body).toEqual({ error: 'DEJA_ABONNE' })
    expect((await appel({ action: 'activer', idToken: 'jeton-tom', code: CODE }, { db, stripe: fauxStripe({ statut: 'canceled' }) })).body).toEqual({ error: 'EXPIRE' })
    expect((await appel({ action: 'activer', idToken: 'anonyme', code: CODE }, { db, stripe })).body).toEqual({ error: 'COMPTE' })
    expect((await appel({ action: 'activer', idToken: 'jeton-tom', code: 'ZZZZZZZZ' }, { db, stripe })).code).toBe(404)
    expect((await appel({ action: 'activer', code: CODE }, { db, stripe })).code).toBe(401)
  })
  it('l’e-mail au parent donne le code et le lien', () => {
    const m = mailCadeau({ code: 'ABCDEFGH', formule: 'annuel' })
    expect(m.subject).toBe('Le code Réviz+ de votre enfant')
    expect(m.html).toContain('ABCD-EFGH')
    expect(m.html).toContain('https://app.revizapp.fr/?cadeau=ABCDEFGH')
  })
})

describe('Réviz+ offert par un parent : le paiement vaut accord parental (11/11)', () => {
  async function activer(consent) {
    const db = fauxDb(consent ? { 'users/tom/parentalConsent/consent': consent } : {})
    const stripe = fauxStripe()
    await enregistrerCadeau(db, await stripe.checkout.sessions.retrieve(SESSION), { maintenant: T, secret: SECRET })
    await appel({ action: 'activer', idToken: 'jeton-tom', code: CODE }, { db, stripe })
    return db.docs['users/tom/parentalConsent/consent']
  }
  it('un élève qui attend l’autorisation : accordée, avec l’adresse du parent', async () => {
    expect(await activer({ status: 'pending', createdAt: T - 1000, germe: 'g' })).toMatchObject({ status: 'approved', approvedAt: T, via: 'paiement', parentEmail: 'parent@famille.test', germe: null, token: null })
  })
  it('l’adresse déjà donnée par l’élève est gardée', async () => {
    expect((await activer({ status: 'pending', parentEmail: 'maman@x.test' })).parentEmail).toBe('maman@x.test')
  })
  it('un refus reste un refus ; rien n’est créé pour un élève sans demande', async () => {
    expect((await activer({ status: 'refused', refusedAt: 1 })).status).toBe('refused')
    expect(await activer(null)).toBeUndefined()
  })
  it('code activé pendant l’inscription, avant la trace « en attente » : accordé d’après la date de naissance', async () => {
    const db = fauxDb({ 'users/tom': { birthDate: '2014-03-01' } })
    const stripe = fauxStripe()
    await enregistrerCadeau(db, await stripe.checkout.sessions.retrieve(SESSION), { maintenant: T, secret: SECRET })
    await appel({ action: 'activer', idToken: 'jeton-tom', code: CODE }, { db, stripe })
    expect(db.docs['users/tom/parentalConsent/consent']).toMatchObject({ status: 'approved', via: 'paiement', parentEmail: 'parent@famille.test' })
  })
})
