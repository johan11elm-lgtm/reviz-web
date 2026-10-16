import { describe, it, expect, vi, beforeEach } from 'vitest'

const verifyIdToken = vi.fn()
const docGet = vi.fn()
const docSet = vi.fn()
const emailsSend = vi.fn()

function makeDb() {
  const docRef = { get: docGet, set: docSet }
  const sub = { doc: () => docRef }
  const userDoc = { collection: () => sub }
  return { collection: () => ({ doc: () => userDoc }) }
}

vi.mock('../_firebaseAdmin.js', () => ({
  getAuthAdmin: () => ({ verifyIdToken }),
  getDb: () => makeDb(),
}))
vi.mock('resend', () => ({
  Resend: class { constructor() { this.emails = { send: emailsSend } } },
}))

const { default: handler, relancerParents, relancerEleves, RELANCE_APRES_MS } = await import('../send-parental-consent.js')

function mockRes() {
  return {
    statusCode: 0, payload: null, body: null,
    status(c) { this.statusCode = c; return this },
    json(b) { this.payload = b; return this },
    send(b) { this.body = b; return this },
  }
}

beforeEach(() => {
  verifyIdToken.mockReset(); docGet.mockReset(); docSet.mockReset(); emailsSend.mockReset()
  docSet.mockResolvedValue(); emailsSend.mockResolvedValue()
})

describe('send-parental-consent — sécurité', () => {
  it('refuse (401) sans idToken', async () => {
    const res = mockRes()
    await handler({ method: 'POST', body: { parentEmail: 'p@test.fr', childName: 'Léa' } }, res)
    expect(res.statusCode).toBe(401)
    expect(emailsSend).not.toHaveBeenCalled()
  })

  it('refuse (401) si le token est invalide', async () => {
    verifyIdToken.mockRejectedValue(new Error('bad'))
    const res = mockRes()
    await handler({ method: 'POST', body: { idToken: 'x', parentEmail: 'p@test.fr', childName: 'Léa' } }, res)
    expect(res.statusCode).toBe(401)
    expect(emailsSend).not.toHaveBeenCalled()
  })

  it('refuse (403) un compte anonyme (invité de la Battle)', async () => {
    verifyIdToken.mockResolvedValue({ uid: 'anon', firebase: { sign_in_provider: 'anonymous' } })
    const res = mockRes()
    await handler({ method: 'POST', body: { idToken: 'ok', parentEmail: 'p@test.fr', childName: 'Léa' } }, res)
    expect(res.statusCode).toBe(403)
    expect(emailsSend).not.toHaveBeenCalled()
    expect(docSet).not.toHaveBeenCalled()
  })

  it('refuse (400) si l\'email parent est celui de l\'enfant', async () => {
    verifyIdToken.mockResolvedValue({ uid: 'u1', email: 'kid@test.fr' })
    const res = mockRes()
    await handler({ method: 'POST', body: { idToken: 'ok', parentEmail: 'KID@test.fr', childName: 'Léa' } }, res)
    expect(res.statusCode).toBe(400)
    expect(res.payload.error).toBe('PARENT_EMAIL_IS_CHILD')
    expect(emailsSend).not.toHaveBeenCalled()
  })

  it('refuse (400) un email parent mal formé', async () => {
    verifyIdToken.mockResolvedValue({ uid: 'u1', email: 'kid@test.fr' })
    const res = mockRes()
    await handler({ method: 'POST', body: { idToken: 'ok', parentEmail: 'pasunemail', childName: 'Léa' } }, res)
    expect(res.statusCode).toBe(400)
    expect(res.payload.error).toBe('INVALID_PARENT_EMAIL')
  })

  it('happy path : envoie l\'email et stocke un consentement pending', async () => {
    verifyIdToken.mockResolvedValue({ uid: 'real-uid', email: 'kid@test.fr' })
    docGet.mockResolvedValue({ exists: false })
    const res = mockRes()
    await handler({ method: 'POST', body: { idToken: 'ok', parentEmail: 'parent@test.fr', childName: 'Léa' } }, res)
    expect(res.statusCode).toBe(200)
    expect(res.payload.ok).toBe(true)
    expect(docSet).toHaveBeenCalledWith(expect.objectContaining({ status: 'pending', parentEmail: 'parent@test.fr' }))
    expect(emailsSend).toHaveBeenCalledWith(expect.objectContaining({ to: 'parent@test.fr' }))
  })

  it('le délai de réponse démarre au premier envoi et survit aux renvois (même après un refus)', async () => {
    verifyIdToken.mockResolvedValue({ uid: 'u1', email: 'kid@test.fr' })
    docGet.mockResolvedValue({ exists: false })
    await handler({ method: 'POST', body: { idToken: 'ok', parentEmail: 'parent@test.fr', childName: 'Léa' } }, mockRes())
    expect(docSet.mock.calls[0][0].firstRequestedAt).toEqual(expect.any(Number))

    docSet.mockClear()
    docGet.mockResolvedValue({ exists: true, data: () => ({ status: 'refused', token: null, createdAt: 1000, firstRequestedAt: 1000 }) })
    const res = mockRes()
    await handler({ method: 'POST', body: { idToken: 'ok', parentEmail: 'parent@test.fr', childName: 'Léa' } }, res)
    expect(res.statusCode).toBe(200)
    expect(docSet).toHaveBeenCalledWith(expect.objectContaining({ status: 'pending', firstRequestedAt: 1000 }))
  })

  it('l\'email propose seulement de donner son autorisation', async () => {
    verifyIdToken.mockResolvedValue({ uid: 'u1', email: 'kid@test.fr' })
    docGet.mockResolvedValue({ exists: false })
    await handler({ method: 'POST', body: { idToken: 'ok', parentEmail: 'parent@test.fr', childName: 'Léa' } }, mockRes())
    const html = emailsSend.mock.calls[0][0].html
    expect(html).toContain('Donner mon autorisation')
    expect(html).toMatch(/approve-consent\?token=[^"]+&uid=u1"/)
    expect(html).not.toContain('refuse')
  })

  it('échappe childName dans le HTML de l\'email (anti-injection)', async () => {
    verifyIdToken.mockResolvedValue({ uid: 'u1', email: 'kid@test.fr' })
    docGet.mockResolvedValue({ exists: false })
    const res = mockRes()
    await handler({ method: 'POST', body: { idToken: 'ok', parentEmail: 'parent@test.fr', childName: '<img src=x onerror=alert(1)>' } }, res)
    const html = emailsSend.mock.calls[0][0].html
    expect(html).not.toContain('<img src=x')
    expect(html).toContain('&lt;img')
  })

  it('ne réinitialise pas un consentement déjà approuvé (anti-lockout)', async () => {
    verifyIdToken.mockResolvedValue({ uid: 'u1', email: 'kid@test.fr' })
    docGet.mockResolvedValue({ exists: true, data: () => ({ status: 'approved' }) })
    const res = mockRes()
    await handler({ method: 'POST', body: { idToken: 'ok', parentEmail: 'parent@test.fr', childName: 'Léa' } }, res)
    expect(res.statusCode).toBe(200)
    expect(res.payload.alreadyApproved).toBe(true)
    expect(docSet).not.toHaveBeenCalled()
    expect(emailsSend).not.toHaveBeenCalled()
  })

  it('throttle (429) un renvoi trop rapproché (email déjà parti = token présent)', async () => {
    verifyIdToken.mockResolvedValue({ uid: 'u1', email: 'kid@test.fr' })
    docGet.mockResolvedValue({ exists: true, data: () => ({ status: 'pending', token: 'tok-1', createdAt: Date.now() }) })
    const res = mockRes()
    await handler({ method: 'POST', body: { idToken: 'ok', parentEmail: 'parent@test.fr', childName: 'Léa' } }, res)
    expect(res.statusCode).toBe(429)
    expect(emailsSend).not.toHaveBeenCalled()
  })

  it('ne throttle PAS le doc pending posé au signup (sans token, aucun email envoyé)', async () => {
    verifyIdToken.mockResolvedValue({ uid: 'u1', email: 'kid@test.fr' })
    docGet.mockResolvedValue({ exists: true, data: () => ({ status: 'pending', createdAt: Date.now() }) })
    const res = mockRes()
    await handler({ method: 'POST', body: { idToken: 'ok', parentEmail: 'parent@test.fr', childName: 'Léa' } }, res)
    expect(res.statusCode).toBe(200)
    expect(emailsSend).toHaveBeenCalledWith(expect.objectContaining({ to: 'parent@test.fr' }))
  })
})

describe('send-parental-consent — relance quotidienne (cron)', () => {
  const DAY = 24 * 60 * 60 * 1000
  const now = 1_800_000_000_000
  // Faux Firestore : demandes (collectionGroup) + profils users/{uid}.
  function fakeDb(demandes, profils = {}) {
    const docs = Object.entries(demandes).map(([uid, data]) => ({
      data: () => data,
      ref: { parent: { parent: { id: uid } }, update: vi.fn(async () => {}) },
    }))
    return {
      docs,
      collectionGroup: () => ({ get: async () => ({ docs }) }),
      collection: () => ({ doc: uid => ({ get: async () => ({ exists: !!profils[uid], data: () => profils[uid] }) }) }),
    }
  }
  const enAttente = (depuis, extra = {}) => ({ status: 'pending', token: 'tok', parentEmail: 'p@f.fr', createdAt: now - depuis, firstRequestedAt: now - depuis, ...extra })

  it('relance une fois les parents sans réponse depuis 7 jours, avec le prénom et le même lien', async () => {
    const db = fakeDb({ u1: enAttente(RELANCE_APRES_MS + DAY / 2) }, { u1: { prenom: 'Léa' } })
    const envoyer = vi.fn(async () => {})
    expect(await relancerParents({ db, envoyer, maintenant: now })).toEqual({ relances: 1 })
    const mail = envoyer.mock.calls[0][0]
    expect(mail.to).toBe('p@f.fr')
    expect(mail.subject).toContain('plus que 3 jours')
    expect(mail.html).toContain('Léa')
    expect(mail.html).toContain('approve-consent?token=tok&uid=u1')
    expect(db.docs[0].ref.update).toHaveBeenCalledWith({ relanceLe: now })
  })

  it('ne relance pas : trop tôt, déjà relancé, accès déjà suspendu, autorisé, ou rien d\'envoyé', async () => {
    const db = fakeDb({
      tot: enAttente(6 * DAY),
      deja: enAttente(8 * DAY, { relanceLe: now - DAY }),
      tard: enAttente(10 * DAY),
      ok: { ...enAttente(8 * DAY), status: 'approved' },
      vide: { status: 'pending', createdAt: now - 8 * DAY },
    })
    const envoyer = vi.fn(async () => {})
    expect(await relancerParents({ db, envoyer, maintenant: now })).toEqual({ relances: 0 })
    expect(envoyer).not.toHaveBeenCalled()
  })

  it('un envoi en échec n\'est pas marqué relancé (réessayé le lendemain)', async () => {
    const db = fakeDb({ u1: enAttente(8 * DAY) })
    const envoyer = vi.fn(async () => { throw new Error('resend down') })
    expect(await relancerParents({ db, envoyer, maintenant: now })).toEqual({ relances: 0 })
    expect(db.docs[0].ref.update).not.toHaveBeenCalled()
  })

  it('GET sans le secret du cron → 401', async () => {
    process.env.CRON_SECRET = 'cron-secret'
    const res = mockRes()
    await handler({ method: 'GET', headers: { authorization: 'Bearer faux' } }, res)
    expect(res.statusCode).toBe(401)
    delete process.env.CRON_SECRET
  })

  it('un renvoi par l\'élève garde la trace de la relance', async () => {
    verifyIdToken.mockResolvedValue({ uid: 'u1', email: 'kid@test.fr' })
    docGet.mockResolvedValue({ exists: true, data: () => ({ status: 'pending', token: 't', createdAt: 0, firstRequestedAt: 0, relanceLe: 5 }) })
    await handler({ method: 'POST', body: { idToken: 'ok', parentEmail: 'parent@test.fr', childName: 'Léa' } }, mockRes())
    expect(docSet).toHaveBeenCalledWith(expect.objectContaining({ relanceLe: 5, firstRequestedAt: 0 }))
  })
})


describe('send-parental-consent — relance des élèves sans email parent (cron)', () => {
  const DAY = 24 * 60 * 60 * 1000
  const now = 1_800_000_000_000
  function fakeDb(demandes, profils = {}) {
    const docs = Object.entries(demandes).map(([uid, data]) => ({
      data: () => data,
      ref: { parent: { parent: { id: uid } }, update: vi.fn(async () => {}) },
    }))
    return {
      docs,
      collectionGroup: () => ({ get: async () => ({ docs }) }),
      collection: () => ({ doc: uid => ({ get: async () => ({ exists: !!profils[uid], data: () => profils[uid] }) }) }),
    }
  }
  const sansAdresse = (depuis, extra = {}) => ({ status: 'pending', createdAt: now - depuis, ...extra })
  const emailDe = async uid => `${uid}@eleve.fr`

  it('J+3 : un email à l\'élève avec les jours restants et le lien vers l\'écran parent', async () => {
    const db = fakeDb({ u1: sansAdresse(3 * DAY + DAY / 2) }, { u1: { prenom: 'Léa' } })
    const envoyer = vi.fn(async () => {})
    expect(await relancerEleves({ db, envoyer, emailDe, maintenant: now })).toEqual({ relancesEleves: 1 })
    const mail = envoyer.mock.calls[0][0]
    expect(mail.to).toBe('u1@eleve.fr')
    expect(mail.subject).toContain('Plus que 12 jours')
    expect(mail.html).toContain('Léa')
    expect(mail.html).toContain('app.revizapp.fr/consent-pending')
    expect(db.docs[0].ref.update).toHaveBeenCalledWith({ relancesEleve: [3] })
  })

  it('J+14 : dernier jour ; un palier manqué n\'est pas envoyé en double', async () => {
    const db = fakeDb({ u1: sansAdresse(14 * DAY + DAY / 2, { relancesEleve: [3] }) })
    const envoyer = vi.fn(async () => {})
    expect(await relancerEleves({ db, envoyer, emailDe, maintenant: now })).toEqual({ relancesEleves: 1 })
    expect(envoyer.mock.calls[0][0].subject).toContain('Dernier jour')
    expect(db.docs[0].ref.update).toHaveBeenCalledWith({ relancesEleve: [3, 10, 14] })
  })

  it('ne relance pas : trop tôt, palier déjà fait, délai écoulé, email parent donné, autorisé, sans email', async () => {
    const db = fakeDb({
      tot: sansAdresse(2 * DAY),
      fait: sansAdresse(4 * DAY, { relancesEleve: [3] }),
      tard: sansAdresse(15 * DAY),
      parent: sansAdresse(4 * DAY, { parentEmail: 'p@f.fr', token: 't' }),
      ok: sansAdresse(4 * DAY, { status: 'approved' }),
      anonyme: sansAdresse(4 * DAY),
    })
    const envoyer = vi.fn(async () => {})
    const emailSauf = async uid => (uid === 'anonyme' ? null : `${uid}@eleve.fr`)
    expect(await relancerEleves({ db, envoyer, emailDe: emailSauf, maintenant: now })).toEqual({ relancesEleves: 0 })
    expect(envoyer).not.toHaveBeenCalled()
  })

  it('un envoi en échec n\'est pas marqué (réessayé le lendemain)', async () => {
    const db = fakeDb({ u1: sansAdresse(3 * DAY) })
    const envoyer = vi.fn(async () => { throw new Error('resend down') })
    expect(await relancerEleves({ db, envoyer, emailDe, maintenant: now })).toEqual({ relancesEleves: 0 })
    expect(db.docs[0].ref.update).not.toHaveBeenCalled()
  })
})
