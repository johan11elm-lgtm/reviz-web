import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Faux Firestore : chaque écriture est notée avec son chemin complet.
const ecritures = []
function ref(chemin) {
  return {
    set: vi.fn(async (data, opts) => { ecritures.push({ chemin, data, opts }) }),
    collection: nom => ({ doc: id => ref(`${chemin}/${nom}/${id}`) }),
  }
}
vi.mock('../_firebaseAdmin.js', () => ({
  getDb: () => ({ collection: nom => ({ doc: id => ref(`${nom}/${id}`) }) }),
}))
vi.mock('firebase-admin/firestore', () => ({ FieldValue: { increment: n => ({ inc: n }) } }))

const { default: handler, essaiRevision } = await import('../track.js')
const { signatureDesabo } = await import('../_rappels.js')

function mockRes() {
  return {
    statusCode: 0, payload: null, headers: {},
    status(c) { this.statusCode = c; return this },
    send(b) { this.payload = b; return this },
    setHeader(k, v) { this.headers[k] = v },
  }
}

const ESSAI = 'invite-ab12cd34mgx1y2z3'
const REV = { id: '1760700000000', type: 'quiz', source: 'programme', chapterId: 'pythagore', classe: '4ème', matiere: 'Maths' }

beforeEach(() => { ecritures.length = 0; vi.stubEnv('CRON_SECRET', 'secret-test') })
afterEach(() => vi.unstubAllEnvs())

describe('essaiRevision', () => {
  it('garde une révision d’essai valide, datée par le serveur', () => {
    expect(essaiRevision('revision', { id: ESSAI, revision: REV }, 42)).toEqual({
      id: ESSAI, revisionId: REV.id,
      data: { type: 'quiz', source: 'programme', chapterId: 'pythagore', classe: '4ème', matiere: 'Maths', revisedAt: 42 },
    })
  })
  it('n’accepte que les identifiants d’essai et les valeurs des listes fermées', () => {
    expect(essaiRevision('revision', { id: 'uid-de-compte', revision: REV })).toBeNull()
    expect(essaiRevision('revision', { id: ESSAI, revision: { ...REV, id: '../x' } })).toBeNull()
    expect(essaiRevision('revision', { id: ESSAI, revision: { ...REV, type: 'jeu' } })).toBeNull()
    expect(essaiRevision('chapitre_ouvert', { id: ESSAI, revision: REV })).toBeNull()
    const r = essaiRevision('revision', { id: ESSAI, revision: { ...REV, chapterId: '<b>', classe: 'CM2', matiere: 'Jardinage', prenom: 'Léa' } }, 1)
    expect(r.data).toEqual({ type: 'quiz', source: 'programme', revisedAt: 1 })
  })
  it('une fin de révision ne pose que sa date de fin', () => {
    expect(essaiRevision('revision_terminee', { id: ESSAI, revision: REV }, 7)).toEqual({ id: ESSAI, revisionId: REV.id, data: { termineAt: 7 } })
  })
})

describe('handler — révisions d’essai', () => {
  it('enregistre la révision sous essais/{id} en plus du compteur du jour', async () => {
    const res = mockRes()
    await handler({ method: 'POST', body: { event: 'revision', props: { format: 'quiz', mode: 'essai' }, essai: { id: ESSAI, revision: REV } } }, res)
    expect(res.statusCode).toBe(204)
    const chemins = ecritures.map(e => e.chemin)
    expect(chemins).toContain(`essais/${ESSAI}/revisions/${REV.id}`)
    expect(chemins).toContain(`essais/${ESSAI}`)
    expect(chemins.some(c => c.startsWith('stats/'))).toBe(true)
    expect(ecritures.find(e => e.chemin === `essais/${ESSAI}`).data.revisions).toEqual({ inc: 1 })
  })
  it('sans essai valide, seul le compteur anonyme est écrit', async () => {
    const res = mockRes()
    await handler({ method: 'POST', body: { event: 'revision', props: {}, essai: { id: 'x', revision: REV } } }, res)
    expect(res.statusCode).toBe(204)
    expect(ecritures.map(e => e.chemin).every(c => c.startsWith('stats/'))).toBe(true)
  })
})

describe('handler — désinscription des rappels', () => {
  const uid = 'AbCdEf1234567890'
  const query = t => ({ op: 'desabonner', uid, t })

  it('GET affiche la confirmation sans rien modifier (scanners de liens)', async () => {
    const res = mockRes()
    await handler({ method: 'GET', query: query(signatureDesabo(uid)) }, res)
    expect(res.statusCode).toBe(200)
    expect(res.payload).toContain('<form method="post"')
    expect(ecritures).toEqual([])
  })
  it('POST avec une signature valide coupe les rappels', async () => {
    const res = mockRes()
    await handler({ method: 'POST', query: query(signatureDesabo(uid)), body: 'List-Unsubscribe=One-Click' }, res)
    expect(res.statusCode).toBe(200)
    expect(ecritures).toEqual([{ chemin: `users/${uid}`, data: { rappels: false }, opts: { merge: true } }])
  })
  it('refuse une signature fausse ou celle d’un autre compte', async () => {
    for (const t of ['0'.repeat(32), signatureDesabo('AutreCompte1234'), undefined]) {
      const res = mockRes()
      await handler({ method: 'POST', query: query(t) }, res)
      expect(res.statusCode).toBe(400)
    }
    expect(ecritures).toEqual([])
  })
})
