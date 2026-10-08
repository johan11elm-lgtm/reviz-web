import { describe, it, expect, vi, beforeEach } from 'vitest'

const set = vi.fn(async () => {})
const docFn = vi.fn(() => ({ set }))
vi.mock('../_firebaseAdmin.js', () => ({
  getDb: () => ({ collection: () => ({ doc: docFn }) }),
}))
vi.mock('firebase-admin/firestore', () => ({ FieldValue: { increment: n => ({ inc: n }) } }))

const { default: handler, buildUpdate, parisDay } = await import('../track.js')

function mockRes() {
  return {
    statusCode: 0, payload: null,
    status(c) { this.statusCode = c; return this },
    send(b) { this.payload = b; return this },
  }
}

beforeEach(() => { set.mockClear(); docFn.mockClear() })

describe('buildUpdate', () => {
  it('compte le total et les propriétés autorisées', () => {
    expect(buildUpdate('chapitre_ouvert', { classe: '3ème', matiere: 'Maths', mode: 'essai', device: 'ordinateur' })).toEqual({
      chapitre_ouvert: { total: 1, classe: { '3ème': 1 }, matiere: { Maths: 1 }, mode: { essai: 1 }, device: { ordinateur: 1 } },
    })
  })
  it("compte les installations de l'app par plateforme", () => {
    expect(buildUpdate('app_installee', { plateforme: 'android', device: 'mobile' })).toEqual({
      app_installee: { total: 1, device: { mobile: 1 }, plateforme: { android: 1 } },
    })
    expect(buildUpdate('installer_ouvert', { plateforme: 'windows' })).toEqual({ installer_ouvert: { total: 1 } })
  })
  it('ignore les valeurs hors liste, sauf la matière qui devient « Autre »', () => {
    expect(buildUpdate('revision', { classe: 'CM2', matiere: 'Jardinage', prenom: 'Léa', format: 'quiz' })).toEqual({
      revision: { total: 1, matiere: { Autre: 1 }, format: { quiz: 1 } },
    })
  })
  it('compte les parties de Battle avec leur issue et le type de joueur', () => {
    expect(buildUpdate('battle_terminee', { issue: 'victoire', joueur: 'invite', mode: 'compte' })).toEqual({
      battle_terminee: { total: 1, issue: { victoire: 1 }, joueur: { invite: 1 }, mode: { compte: 1 } },
    })
    expect(buildUpdate('battle_creee', { joueur: 'anonyme', issue: 'abandon' })).toEqual({ battle_creee: { total: 1 } })
  })
  it('compte la provenance (?via=) et ignore une valeur inconnue', () => {
    expect(buildUpdate('installer_ouvert', { plateforme: 'ios', via: 'tiktok' })).toEqual({
      installer_ouvert: { total: 1, plateforme: { ios: 1 }, via: { tiktok: 1 } },
    })
    expect(buildUpdate('compte_cree', { via: 'javascript:alert(1)' })).toEqual({ compte_cree: { total: 1 } })
  })
  it('refuse un événement inconnu', () => {
    expect(buildUpdate('mouchard', {})).toBeNull()
  })
})

describe('parisDay', () => {
  it('donne la date à Paris (un 23 h 30 UTC du 6 est déjà le 7 à Paris)', () => {
    expect(parisDay(new Date('2026-10-06T23:30:00Z'))).toBe('2026-10-07')
  })
})

describe('handler', () => {
  it('incrémente le document du jour et répond 204', async () => {
    const res = mockRes()
    await handler({ method: 'POST', body: { event: 'essai_demarre', props: { classe: '5ème' } } }, res)
    expect(res.statusCode).toBe(204)
    expect(docFn).toHaveBeenCalledWith(parisDay())
    expect(set).toHaveBeenCalledWith({ essai_demarre: { total: { inc: 1 }, classe: { '5ème': { inc: 1 } } } }, { merge: true })
  })
  it('accepte un corps en texte (sendBeacon) et rejette le reste', async () => {
    const ok = mockRes()
    await handler({ method: 'POST', body: JSON.stringify({ event: 'quiz_termine' }) }, ok)
    expect(ok.statusCode).toBe(204)
    const bad = mockRes()
    await handler({ method: 'POST', body: { event: 'inconnu' } }, bad)
    expect(bad.statusCode).toBe(400)
    const get = mockRes()
    await handler({ method: 'GET' }, get)
    expect(get.statusCode).toBe(405)
  })
})
