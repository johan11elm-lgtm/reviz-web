import { describe, it, expect, vi, beforeEach } from 'vitest'

const docGet = vi.fn()
const docUpdate = vi.fn()
const docSet = vi.fn()
const profilGet = vi.fn()
const getUser = vi.fn()
const emailsSend = vi.fn()

function makeDb() {
  const docRef = { get: docGet, update: docUpdate, set: docSet }
  const sub = { doc: () => docRef }
  const userDoc = { collection: () => sub, get: profilGet }
  return { collection: () => ({ doc: () => userDoc }) }
}

vi.mock('../_firebaseAdmin.js', () => ({ getDb: () => makeDb(), getAuthAdmin: () => ({ getUser }) }))
vi.mock('resend', () => ({
  Resend: class { constructor() { this.emails = { send: emailsSend } } },
}))

const { default: handler } = await import('../approve-consent.js')
const { nouvelleDemande, lienPartage } = await import('../_accordParent.js')

function mockRes() {
  return {
    statusCode: 0, body: null,
    status(c) { this.statusCode = c; return this },
    send(b) { this.body = b; return this },
  }
}

const DAY = 24 * 60 * 60 * 1000

beforeEach(() => {
  for (const f of [docGet, docUpdate, docSet, profilGet, getUser, emailsSend]) f.mockReset()
  docUpdate.mockResolvedValue(); docSet.mockResolvedValue(); emailsSend.mockResolvedValue()
  profilGet.mockResolvedValue({ exists: true, data: () => ({ prenom: 'Léa' }) })
  getUser.mockResolvedValue({ email: 'kid@test.fr' })
})

describe('approve-consent — GET ne mute rien', () => {
  it('GET affiche une page de confirmation avec un formulaire POST', async () => {
    const res = mockRes()
    await handler({ method: 'GET', query: { token: 't', uid: 'u' } }, res)
    expect(res.statusCode).toBe(200)
    expect(res.body).toContain('method="POST"')
    expect(res.body).toContain('name="token"')
    expect(docUpdate).not.toHaveBeenCalled() // <- aucun pré-fetch ne peut approuver
  })

  it('GET sans token → 400', async () => {
    const res = mockRes()
    await handler({ method: 'GET', query: { uid: 'u' } }, res)
    expect(res.statusCode).toBe(400)
    expect(docUpdate).not.toHaveBeenCalled()
  })
})

describe('approve-consent — POST approuve', () => {
  it('POST avec token valide et non expiré → approuve + invalide le token', async () => {
    docGet.mockResolvedValue({ exists: true, data: () => ({ status: 'pending', token: 'good', createdAt: Date.now() }) })
    const res = mockRes()
    await handler({ method: 'POST', body: { token: 'good', uid: 'u' } }, res)
    expect(res.statusCode).toBe(200)
    expect(res.body).toContain('accord est enregistré')
    expect(docUpdate).toHaveBeenCalledWith(expect.objectContaining({ status: 'approved', token: null }))
  })

  it('POST avec mauvais token → 403, pas de mutation', async () => {
    docGet.mockResolvedValue({ exists: true, data: () => ({ status: 'pending', token: 'good', createdAt: Date.now() }) })
    const res = mockRes()
    await handler({ method: 'POST', body: { token: 'WRONG', uid: 'u' } }, res)
    expect(res.statusCode).toBe(403)
    expect(docUpdate).not.toHaveBeenCalled()
  })

  it('POST avec token expiré → 410', async () => {
    docGet.mockResolvedValue({ exists: true, data: () => ({ status: 'pending', token: 'good', createdAt: Date.now() - 11 * DAY }) })
    const res = mockRes()
    await handler({ method: 'POST', body: { token: 'good', uid: 'u' } }, res)
    expect(res.statusCode).toBe(410)
    expect(docUpdate).not.toHaveBeenCalled()
  })

  it('POST sur un consentement déjà approuvé → idempotent, pas de mutation', async () => {
    docGet.mockResolvedValue({ exists: true, data: () => ({ status: 'approved' }) })
    const res = mockRes()
    await handler({ method: 'POST', body: { token: 'whatever', uid: 'u' } }, res)
    expect(res.statusCode).toBe(200)
    expect(docUpdate).not.toHaveBeenCalled()
  })
})

describe('approve-consent — refus (plus proposé, toujours géré)', () => {
  it('la page de confirmation ne propose pas de refus', async () => {
    const res = mockRes()
    await handler({ method: 'GET', query: { token: 't', uid: 'u' } }, res)
    expect(res.body).toContain('Donner mon autorisation')
    expect(res.body).not.toContain('value="refuser"')
  })

  it('POST decision=refuser → statut refusé + token invalidé', async () => {
    docGet.mockResolvedValue({ exists: true, data: () => ({ status: 'pending', token: 'good', createdAt: Date.now() }) })
    const res = mockRes()
    await handler({ method: 'POST', body: { token: 'good', uid: 'u', decision: 'refuser' } }, res)
    expect(res.statusCode).toBe(200)
    expect(res.body).toContain('suspendu')
    expect(docUpdate).toHaveBeenCalledWith(expect.objectContaining({ status: 'refused', token: null }))
  })

  it('POST decision=refuser avec mauvais token → 403, pas de mutation', async () => {
    docGet.mockResolvedValue({ exists: true, data: () => ({ status: 'pending', token: 'good', createdAt: Date.now() }) })
    const res = mockRes()
    await handler({ method: 'POST', body: { token: 'WRONG', uid: 'u', decision: 'refuser' } }, res)
    expect(res.statusCode).toBe(403)
    expect(docUpdate).not.toHaveBeenCalled()
  })
})

describe('approve-consent — jeton protégé (le document ne contient qu’un germe)', () => {
  const UID = 'AbCdEfGhIjKlMnOpQrStUvWxYz12'
  const avecCle = async fn => {
    process.env.CRON_SECRET = 'cron-secret'
    try { await fn() } finally { delete process.env.CRON_SECRET }
  }

  it('le jeton du lien approuve, et le germe est effacé', () => avecCle(async () => {
    const { champs, jeton } = nouvelleDemande(UID)
    docGet.mockResolvedValue({ exists: true, data: () => ({ status: 'pending', ...champs, createdAt: Date.now() }) })
    const res = mockRes()
    await handler({ method: 'POST', body: { token: jeton, uid: UID } }, res)
    expect(res.statusCode).toBe(200)
    expect(docUpdate).toHaveBeenCalledWith(expect.objectContaining({ status: 'approved', token: null, germe: null }))
  }))

  it('l’élève qui lit son document n’a pas de quoi s’approuver : le germe est refusé', () => avecCle(async () => {
    const { champs } = nouvelleDemande(UID)
    docGet.mockResolvedValue({ exists: true, data: () => ({ status: 'pending', ...champs, createdAt: Date.now() }) })
    const res = mockRes()
    await handler({ method: 'POST', body: { token: champs.germe, uid: UID } }, res)
    expect(res.statusCode).toBe(403)
    expect(docUpdate).not.toHaveBeenCalled()
  }))

  it('le jeton d’une demande ne vaut pas pour un autre élève', () => avecCle(async () => {
    const { jeton } = nouvelleDemande(UID)
    const autre = nouvelleDemande('UnAutreEleve1234567890')
    docGet.mockResolvedValue({ exists: true, data: () => ({ status: 'pending', ...autre.champs, createdAt: Date.now() }) })
    const res = mockRes()
    await handler({ method: 'POST', body: { token: jeton, uid: 'UnAutreEleve1234567890' } }, res)
    expect(res.statusCode).toBe(403)
  }))
})

describe('approve-consent — lien partagé par l’élève', () => {
  const UID = 'AbCdEfGhIjKlMnOpQrStUvWxYz12'
  const avecCle = async fn => {
    process.env.CRON_SECRET = 'cron-secret'
    try { await fn() } finally { delete process.env.CRON_SECRET }
  }
  const params = (extra = {}) => {
    const url = new URL(lienPartage(UID, extra))
    return Object.fromEntries(url.searchParams)
  }

  it('GET : la page demande au parent son adresse, nomme l’élève, et ne change rien', () => avecCle(async () => {
    docGet.mockResolvedValue({ exists: true, data: () => ({ status: 'pending', createdAt: Date.now() }) })
    const res = mockRes()
    await handler({ method: 'GET', query: params() }, res)
    expect(res.statusCode).toBe(200)
    expect(res.body).toContain('Léa a besoin de votre accord')
    expect(res.body).toContain('name="parentEmail"')
    expect(res.body).toContain('method="POST"')
    expect(res.body).toContain('og:title') // aperçu du lien dans la messagerie
    expect(res.body).not.toContain('Donner mon autorisation</button>') // l'accord se donne depuis l'e-mail
    expect(docUpdate).not.toHaveBeenCalled()
    expect(docSet).not.toHaveBeenCalled()
    expect(emailsSend).not.toHaveBeenCalled()
  }))

  it('GET avec un score : le parent voit ce que l’élève voulait montrer', () => avecCle(async () => {
    docGet.mockResolvedValue({ exists: false })
    const res = mockRes()
    await handler({ method: 'GET', query: params({ resultat: { score: 8, total: 10 } }) }, res)
    expect(res.body).toContain('8 / 10')
    expect(res.body).toContain('name="n" value="8"')
  }))

  it('GET : un prénom douteux dans le profil n’est jamais recopié tel quel', () => avecCle(async () => {
    profilGet.mockResolvedValue({ exists: true, data: () => ({ prenom: '<script>alert(1)</script> http://x.fr' }) })
    docGet.mockResolvedValue({ exists: false })
    const res = mockRes()
    await handler({ method: 'GET', query: params() }, res)
    expect(res.body).not.toContain('<script>alert')
    expect(res.body).not.toContain('http://x.fr')
  }))

  it('GET : lien retouché ou expiré → 410, rien n’est lu', () => avecCle(async () => {
    const res = mockRes()
    await handler({ method: 'GET', query: { ...params(), uid: 'UnAutreEleve1234567890' } }, res)
    expect(res.statusCode).toBe(410)
    expect(docGet).not.toHaveBeenCalled()
    const vieux = mockRes()
    await handler({ method: 'GET', query: params({ maintenant: Date.now() - 20 * DAY }) }, vieux)
    expect(vieux.statusCode).toBe(410)
  }))

  it('GET : accord déjà donné → on le dit, sans formulaire', () => avecCle(async () => {
    docGet.mockResolvedValue({ exists: true, data: () => ({ status: 'approved' }) })
    const res = mockRes()
    await handler({ method: 'GET', query: params() }, res)
    expect(res.body).toContain('déjà donné votre accord')
    expect(res.body).not.toContain('name="parentEmail"')
  }))

  it('POST : la demande est enregistrée et le parent reçoit l’e-mail d’autorisation habituel', () => avecCle(async () => {
    docGet.mockResolvedValue({ exists: true, data: () => ({ status: 'pending', createdAt: 1000, lienCreeLe: 900 }) })
    const res = mockRes()
    await handler({ method: 'POST', body: { ...params({ resultat: { score: 8, total: 10 } }), parentEmail: ' parent@test.fr ' } }, res)
    expect(res.statusCode).toBe(200)
    expect(res.body).toContain('parent@test.fr')
    expect(res.body).toContain('Donner mon autorisation') // ce qu'il doit toucher dans l'e-mail
    const doc = docSet.mock.calls[0][0]
    expect(doc).toMatchObject({ status: 'pending', parentEmail: 'parent@test.fr', lienEnvois: 1, lienCreeLe: 900, token: null })
    expect(doc.germe).toMatch(/^[0-9a-f]{32}$/)
    expect(doc.firstRequestedAt).toEqual(expect.any(Number))
    const mail = emailsSend.mock.calls[0][0]
    expect(mail.to).toBe('parent@test.fr')
    expect(mail.html).toContain(`uid=${UID}`)
    expect(mail.html).toContain('approve-consent?token=')
    expect(mail.subject).toContain('8/10')
    // Le parent n'est pas approuvé pour autant : c'est le clic dans l'e-mail qui vaut accord.
    expect(docUpdate).not.toHaveBeenCalled()
  }))

  it('POST : l’adresse du compte de l’élève est refusée, le formulaire revient avec l’explication', () => avecCle(async () => {
    docGet.mockResolvedValue({ exists: true, data: () => ({ status: 'pending', createdAt: 1000 }) })
    const res = mockRes()
    await handler({ method: 'POST', body: { ...params(), parentEmail: 'KID@test.fr' } }, res)
    expect(res.statusCode).toBe(400)
    expect(res.body).toContain('adresse du compte de votre enfant')
    expect(res.body).toContain('name="parentEmail"')
    expect(emailsSend).not.toHaveBeenCalled()
    expect(docSet).not.toHaveBeenCalled()
  }))

  it('POST : adresse mal formée → 400, rien ne part', () => avecCle(async () => {
    docGet.mockResolvedValue({ exists: false })
    const res = mockRes()
    await handler({ method: 'POST', body: { ...params(), parentEmail: 'pasunemail' } }, res)
    expect(res.statusCode).toBe(400)
    expect(res.body).toContain('ne semble pas valide')
    expect(emailsSend).not.toHaveBeenCalled()
  }))

  it('POST : lien retouché → 410 ; compte supprimé → 404', () => avecCle(async () => {
    let res = mockRes()
    await handler({ method: 'POST', body: { ...params(), s: '0'.repeat(32), parentEmail: 'parent@test.fr' } }, res)
    expect(res.statusCode).toBe(410)
    expect(emailsSend).not.toHaveBeenCalled()

    getUser.mockRejectedValue(new Error('auth/user-not-found'))
    docGet.mockResolvedValue({ exists: false })
    res = mockRes()
    await handler({ method: 'POST', body: { ...params(), parentEmail: 'parent@test.fr' } }, res)
    expect(res.statusCode).toBe(404)
    expect(emailsSend).not.toHaveBeenCalled()
  }))

  it('POST : pas plus d’un e-mail par minute, ni plus de cinq par élève depuis les liens', () => avecCle(async () => {
    docGet.mockResolvedValue({ exists: true, data: () => ({ status: 'pending', germe: 'a'.repeat(32), parentEmail: 'p@f.fr', createdAt: Date.now() - 5000, lienEnvois: 1 }) })
    let res = mockRes()
    await handler({ method: 'POST', body: { ...params(), parentEmail: 'parent@test.fr' } }, res)
    expect(res.statusCode).toBe(429)
    expect(emailsSend).not.toHaveBeenCalled()

    docGet.mockResolvedValue({ exists: true, data: () => ({ status: 'pending', germe: 'a'.repeat(32), parentEmail: 'p@f.fr', createdAt: Date.now() - DAY, lienEnvois: 5 }) })
    res = mockRes()
    await handler({ method: 'POST', body: { ...params(), parentEmail: 'parent@test.fr' } }, res)
    expect(res.statusCode).toBe(429)
    expect(res.body).toContain('Trop de demandes')
    expect(emailsSend).not.toHaveBeenCalled()
  }))

  it('POST : accord déjà donné → rien ne repart', () => avecCle(async () => {
    docGet.mockResolvedValue({ exists: true, data: () => ({ status: 'approved' }) })
    const res = mockRes()
    await handler({ method: 'POST', body: { ...params(), parentEmail: 'parent@test.fr' } }, res)
    expect(res.statusCode).toBe(200)
    expect(res.body).toContain('déjà donné votre accord')
    expect(emailsSend).not.toHaveBeenCalled()
    expect(docSet).not.toHaveBeenCalled()
  }))

  it('GET : une demande déjà partie est rappelée, adresse masquée', () => avecCle(async () => {
    docGet.mockResolvedValue({ exists: true, data: () => ({ status: 'pending', germe: 'a'.repeat(32), parentEmail: 'jeanne.durand@test.fr', createdAt: Date.now() - DAY }) })
    const res = mockRes()
    await handler({ method: 'GET', query: params() }, res)
    expect(res.body).toContain('j•••@test.fr')
    expect(res.body).not.toContain('jeanne.durand')
  }))
})
