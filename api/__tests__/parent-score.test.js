import { describe, it, expect, vi, beforeEach } from 'vitest'

const verifyIdToken = vi.fn()
const docGet = vi.fn()
const docSet = vi.fn()
const emailsSend = vi.fn()
vi.mock('../_firebaseAdmin.js', () => ({
  getAuthAdmin: () => ({ verifyIdToken }),
  getDb: () => {
    const docRef = { get: docGet, set: docSet }
    return { collection: () => ({ doc: () => ({ collection: () => ({ doc: () => docRef }) }) }) }
  },
}))
vi.mock('resend', () => ({ Resend: class { constructor() { this.emails = { send: emailsSend } } } }))

const { default: handler, mailParent, resultatQuiz } = await import('../send-parental-consent.js')

const CATALOGUE = { matieres: [{ slug: 'maths', chapitres: [{ id: 'theoreme-de-thales', titre: 'Théorème de Thalès et sa réciproque' }] }] }
const lire = vi.fn(async () => CATALOGUE)

describe('score du quiz montré au parent — validation', () => {
  it('garde le score, et relit le titre du chapitre dans le catalogue', async () => {
    expect(await resultatQuiz({ score: 6, total: 7, chapitre: { classe: '3ème', matiere: 'maths', id: 'theoreme-de-thales' } }, lire))
      .toEqual({ score: 6, total: 7, titre: 'Théorème de Thalès et sa réciproque' })
    expect(lire).toHaveBeenCalledWith('3ème')
  })
  it('sans chapitre (leçon scannée) ou chapitre inconnu : le score seul', async () => {
    expect(await resultatQuiz({ score: 3, total: 5 }, lire)).toEqual({ score: 3, total: 5, titre: null })
    expect(await resultatQuiz({ score: 3, total: 5, chapitre: { classe: '3ème', matiere: 'maths', id: 'inconnu' } }, lire)).toMatchObject({ titre: null })
    expect(await resultatQuiz({ score: 3, total: 5, chapitre: { classe: '3ème', matiere: 'maths', id: '../x' } }, lire)).toMatchObject({ titre: null })
  })
  it('catalogue illisible : le score seul, sans erreur', async () => {
    expect(await resultatQuiz({ score: 1, total: 2, chapitre: { classe: '4ème', matiere: 'svt', id: 'x' } }, async () => { throw new Error('réseau') }))
      .toEqual({ score: 1, total: 2, titre: null })
  })
  it('refuse un score incohérent', async () => {
    for (const r of [null, {}, { score: 8, total: 7 }, { score: -1, total: 7 }, { score: 2.5, total: 7 }, { score: 1, total: 0 }, { score: 1, total: 99 }, { score: '6', total: 'x' }]) {
      expect(await resultatQuiz(r, lire)).toBeNull()
    }
  })
})

describe('score du quiz montré au parent — le mail', () => {
  it('le sujet et l’encadré montrent le score, la demande d’autorisation reste', () => {
    const m = mailParent({ prenom: 'Léa', lien: 'https://app.revizapp.fr/api/approve-consent?token=t&uid=u', resultat: { score: 6, total: 7, titre: 'Théorème de Thalès' } })
    expect(m.subject).toBe('Léa vient d\'avoir 6/7 à un quiz sur Réviz')
    expect(m.html).toContain('Léa voulait vous montrer ça')
    expect(m.html).toContain('6 / 7')
    expect(m.html).toContain('au quiz sur <strong>Théorème de Thalès</strong>')
    expect(m.html).toContain('Donner mon autorisation')
    expect(m.html).toContain('Ce que l\'application collecte')
  })
  it('échappe le titre, et sans résultat le mail ne change pas', () => {
    expect(mailParent({ prenom: 'Léa', lien: 'x', resultat: { score: 1, total: 2, titre: '<b>x</b>' } }).html).toContain('&lt;b&gt;x&lt;/b&gt;')
    const sans = mailParent({ prenom: 'Léa', lien: 'x' })
    expect(sans.subject).toBe('Votre enfant utilise Réviz : votre autorisation')
    expect(sans.html).not.toContain('voulait vous montrer')
    // Une relance ne montre jamais de score.
    expect(mailParent({ prenom: 'Léa', lien: 'x', joursRestants: 3, resultat: { score: 1, total: 2 } }).html).not.toContain('voulait vous montrer')
  })
})

describe('score du quiz montré au parent — la requête', () => {
  beforeEach(() => {
    verifyIdToken.mockReset(); docGet.mockReset(); docSet.mockReset(); emailsSend.mockReset()
    verifyIdToken.mockResolvedValue({ uid: 'lea', email: 'lea@test.fr', firebase: { sign_in_provider: 'password' } })
    docGet.mockResolvedValue({ exists: true, data: () => ({ status: 'pending', createdAt: Date.now() - 86400000 }) })
    docSet.mockResolvedValue(); emailsSend.mockResolvedValue({ data: { id: 'm' } })
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => CATALOGUE })))
  })
  it('envoie au parent le mail avec le score', async () => {
    const res = { statusCode: 0, status(c) { this.statusCode = c; return this }, json() { return this } }
    await handler({ method: 'POST', body: { idToken: 't', parentEmail: 'maman@test.fr', childName: 'Léa', resultat: { score: 6, total: 7, chapitre: { classe: '3ème', matiere: 'maths', id: 'theoreme-de-thales' } } } }, res)
    expect(res.statusCode).toBe(200)
    const m = emailsSend.mock.calls[0][0]
    expect(m.to).toBe('maman@test.fr')
    expect(m.subject).toBe('Léa vient d\'avoir 6/7 à un quiz sur Réviz')
    expect(m.html).toContain('Théorème de Thalès et sa réciproque')
    expect(fetch).toHaveBeenCalledWith('https://app.revizapp.fr/programme/3eme/index.json', expect.anything())
  })
})
