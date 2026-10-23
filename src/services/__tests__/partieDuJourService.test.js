import { describe, it, expect, vi, beforeEach } from 'vitest'

const updateDoc = vi.fn(async () => {})
// Ce que « le compte » contient ; null = lecture impossible (hors ligne).
let compte = { jeux: { jours: ['2026-10-20'], record: 9000 } }
const getDoc = vi.fn(async () => {
  if (compte === null) throw new Error('hors ligne')
  return { data: () => compte }
})
vi.mock('../firebaseConfig', () => ({ db: {} }))
vi.mock('firebase/firestore', () => ({
  doc: (_db, ...chemin) => chemin.join('/'),
  updateDoc: (...a) => updateDoc(...a),
  getDoc: (...a) => getDoc(...a),
  arrayUnion: (...jours) => ({ arrayUnion: jours }),
}))
vi.mock('../statsService', () => ({ track: () => {} }))
vi.mock('../guestService', () => ({ isGuestUid: uid => uid.startsWith('invite-'), readGuest: () => null }))

const { avecHasardDuJour, serieDe, etatDuJour, etatPourLeJour, enregistrerPartieDuJour, synchroniserStats } = await import('../partieDuJourService')

const vider = () => new Promise(r => setTimeout(r, 0))

beforeEach(() => {
  localStorage.clear(); updateDoc.mockClear(); getDoc.mockClear()
  compte = { jeux: { jours: ['2026-10-20'], record: 9000 } }
})

describe('La partie du jour', () => {
  it('le même tirage pour tout le monde le même jour, un autre le lendemain', () => {
    const tirage = () => Array.from({ length: 5 }, () => Math.random())
    expect(avecHasardDuJour(tirage, '2026-10-23')).toEqual(avecHasardDuJour(tirage, '2026-10-23'))
    expect(avecHasardDuJour(tirage, '2026-10-23')).not.toEqual(avecHasardDuJour(tirage, '2026-10-24'))
  })
  it('rend le vrai hasard après le tirage, même si la fabrique échoue', () => {
    const vrai = Math.random
    expect(() => avecHasardDuJour(() => { throw new Error('x') }, '2026-10-23')).toThrow()
    expect(Math.random).toBe(vrai)
  })

  it('la série : jours de suite jusqu’à aujourd’hui, ou hier si on n’a pas encore joué', () => {
    expect(serieDe([], '2026-10-23')).toBe(0)
    expect(serieDe(['2026-10-21', '2026-10-22', '2026-10-23'], '2026-10-23')).toBe(3)
    expect(serieDe(['2026-10-21', '2026-10-22'], '2026-10-23')).toBe(2)
    expect(serieDe(['2026-10-20', '2026-10-22'], '2026-10-23')).toBe(1)
    expect(serieDe(['2026-10-20'], '2026-10-23')).toBe(0)
    // Changement de mois et d'heure (fin octobre).
    expect(serieDe(['2026-10-31', '2026-11-01'], '2026-11-01')).toBe(2)
  })

  it('enregistre le jour, le meilleur score du jour et le record', () => {
    const r1 = enregistrerPartieDuJour('abc', 1200, '2026-10-23')
    expect(r1).toMatchObject({ faite: true, score: 1200, serie: 1, record: 1200, nouveauRecord: true })
    const r2 = enregistrerPartieDuJour('abc', 800, '2026-10-23')
    expect(r2).toMatchObject({ score: 1200, record: 1200, nouveauRecord: false })
    expect(etatDuJour('abc', '2026-10-24')).toMatchObject({ faite: false, score: null, serie: 1, record: 1200 })
  })

  it('un invité ne garde que l’appareil', async () => {
    enregistrerPartieDuJour('invite-1', 500, '2026-10-23')
    await vider()
    expect(updateDoc).not.toHaveBeenCalled()
    expect(getDoc).not.toHaveBeenCalled()
    expect(etatDuJour('invite-1', '2026-10-23').faite).toBe(true)
  })

  it('reprend les jours et le record du compte', async () => {
    enregistrerPartieDuJour('abc', 300, '2026-10-21')
    await vider()
    const s = await synchroniserStats('abc', '2026-10-23')
    expect(s.jours).toEqual(['2026-10-20', '2026-10-21'])
    expect(s.record).toBe(9000)
  })

  it('2 — reprend le score du jour fait sur un autre appareil (plus de « Ton score : 0 »)', async () => {
    compte = { jeux: { jours: ['2026-10-23'], record: 4200, scores: { '2026-10-23': 4200, '2020-01-01': 99 } } }
    await synchroniserStats('abc', '2026-10-23')
    expect(etatDuJour('abc', '2026-10-23')).toMatchObject({ faite: true, score: 4200, serie: 1, record: 4200 })
    // Les scores de plus de 60 jours ne sont pas gardés, comme en local.
    expect(JSON.parse(localStorage.getItem('reviz-jeux-jour-abc')).scores).toEqual({ '2026-10-23': 4200 })
  })

  it('2 — la fin d’une partie ne remplace jamais un record ou un score plus grand du compte', async () => {
    compte = { jeux: { jours: ['2026-10-23'], record: 9000, scores: { '2026-10-23': 9000 } } }
    enregistrerPartieDuJour('abc', 300, '2026-10-23')
    await vider()
    // Rien de plus grand que le compte : aucune écriture (ni record 300, ni score 300).
    expect(updateDoc).not.toHaveBeenCalled()
    expect(etatDuJour('abc', '2026-10-23')).toMatchObject({ score: 9000, record: 9000 })
  })

  it('2 — lecture impossible : aucune écriture, et le local est renvoyé à la prochaine synchro réussie', async () => {
    compte = null
    enregistrerPartieDuJour('abc', 300, '2026-10-23')
    await vider()
    expect(updateDoc).not.toHaveBeenCalled()
    compte = { jeux: { jours: ['2026-10-20'], record: 9000 } }
    await synchroniserStats('abc', '2026-10-23')
    expect(updateDoc).toHaveBeenCalledTimes(1)
    const [, maj] = updateDoc.mock.calls[0]
    expect(maj['jeux.jours']).toEqual({ arrayUnion: ['2026-10-23'] })
    expect(maj['jeux.scores.2026-10-23']).toBe(300)
    expect(maj).not.toHaveProperty('jeux.record') // 300 < 9000
  })

  it('2 — renvoie vers le compte les jours, le score et le record qu’il n’a pas', async () => {
    compte = { jeux: { jours: ['2026-10-20'], record: 100, scores: { '2026-10-20': 100 } } }
    enregistrerPartieDuJour('abc', 1200, '2026-10-23')
    await vider()
    expect(updateDoc).toHaveBeenCalledWith('users/abc', {
      'jeux.jours': { arrayUnion: ['2026-10-23'] },
      'jeux.record': 1200,
      'jeux.scores.2026-10-23': 1200,
    })
    // Déjà à jour : une deuxième synchro n'écrit plus rien.
    updateDoc.mockClear()
    compte = { jeux: { jours: ['2026-10-20', '2026-10-23'], record: 1200, scores: { '2026-10-20': 100, '2026-10-23': 1200 } } }
    await synchroniserStats('abc', '2026-10-23')
    expect(updateDoc).not.toHaveBeenCalled()
  })

  it('5 — après minuit, l’état déjà lu passe au nouveau jour : plus de « Faite ! », la série tient', () => {
    enregistrerPartieDuJour('abc', 1200, '2026-10-23')
    const lu = etatDuJour('abc', '2026-10-23')
    expect(lu).toMatchObject({ faite: true, score: 1200 })
    expect(etatPourLeJour(lu, '2026-10-23')).toBe(lu)
    expect(etatPourLeJour(lu, '2026-10-24')).toMatchObject({ jour: '2026-10-24', faite: false, score: null, serie: 1, record: 1200 })
    // Deux jours plus tard sans jouer : la série retombe.
    expect(etatPourLeJour(lu, '2026-10-25')).toMatchObject({ faite: false, serie: 0 })
  })
})
