import { describe, it, expect, vi, beforeEach } from 'vitest'

const updateDoc = vi.fn(async () => {})
vi.mock('../firebaseConfig', () => ({ db: {} }))
vi.mock('firebase/firestore', () => ({
  doc: (_db, ...chemin) => chemin.join('/'),
  updateDoc: (...a) => updateDoc(...a),
  getDoc: async () => ({ data: () => ({ jeux: { jours: ['2026-10-20'], record: 9000 } }) }),
  arrayUnion: jour => ({ arrayUnion: jour }),
}))
vi.mock('../statsService', () => ({ track: () => {} }))
vi.mock('../guestService', () => ({ isGuestUid: uid => uid.startsWith('invite-'), readGuest: () => null }))

const { avecHasardDuJour, serieDe, etatDuJour, enregistrerPartieDuJour, synchroniserStats } = await import('../partieDuJourService')

beforeEach(() => { localStorage.clear(); updateDoc.mockClear() })

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

  it('enregistre le jour, le meilleur score du jour et le record, et les recopie sur le compte', () => {
    const r1 = enregistrerPartieDuJour('abc', 1200, '2026-10-23')
    expect(r1).toMatchObject({ faite: true, score: 1200, serie: 1, record: 1200, nouveauRecord: true })
    const r2 = enregistrerPartieDuJour('abc', 800, '2026-10-23')
    expect(r2).toMatchObject({ score: 1200, record: 1200, nouveauRecord: false })
    expect(etatDuJour('abc', '2026-10-24')).toMatchObject({ faite: false, score: null, serie: 1, record: 1200 })
    expect(updateDoc).toHaveBeenCalledWith('users/abc', { 'jeux.jours': { arrayUnion: '2026-10-23' }, 'jeux.record': 1200 })
  })

  it('un invité ne garde que l’appareil', () => {
    enregistrerPartieDuJour('invite-1', 500, '2026-10-23')
    expect(updateDoc).not.toHaveBeenCalled()
    expect(etatDuJour('invite-1', '2026-10-23').faite).toBe(true)
  })

  it('reprend les jours et le record du compte', async () => {
    enregistrerPartieDuJour('abc', 300, '2026-10-21')
    const s = await synchroniserStats('abc')
    expect(s.jours).toEqual(['2026-10-20', '2026-10-21'])
    expect(s.record).toBe(9000)
  })
})
