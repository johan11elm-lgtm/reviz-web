import { describe, it, expect, vi, beforeEach } from 'vitest'

const track = vi.fn()
const updateDoc = vi.fn(async () => {})
let guest = null
vi.mock('../firebaseConfig', () => ({ db: {} }))
vi.mock('firebase/firestore', () => ({
  doc: (_db, ...chemin) => chemin.join('/'),
  updateDoc: (...a) => updateDoc(...a),
  arrayUnion: jour => ({ arrayUnion: jour }),
}))
vi.mock('../statsService', () => ({ track: (...a) => track(...a) }))
vi.mock('../guestService', () => ({
  isGuestUid: uid => uid.startsWith('invite-'),
  readGuest: () => guest,
}))

const { noterOuverture, tranche, ecartJours, jourParis } = await import('../retourService')

const LUNDI_10H = Date.parse('2026-10-19T08:00:00Z')
const compte = { uid: 'abc', isAnonymous: false, metadata: { creationTime: 'Sun, 18 Oct 2026 20:00:00 GMT' } }

beforeEach(() => {
  localStorage.clear()
  track.mockClear()
  updateDoc.mockClear()
  guest = null
})

describe('tranche et dates', () => {
  it('range les jours écoulés par tranche, préfixées du mode', () => {
    expect([0, 1, 2, 7, 8, 30, 31].map(n => tranche('essai', n))).toEqual(
      ['essai_j0', 'essai_j1', 'essai_j2_7', 'essai_j2_7', 'essai_j8_30', 'essai_j8_30', 'essai_j31_plus'])
  })
  it('compte en jours de Paris (23 h 30 UTC le 18 = déjà le 19)', () => {
    expect(jourParis(Date.parse('2026-10-18T23:30:00Z'))).toBe('2026-10-19')
    expect(ecartJours('2026-10-18', '2026-10-25')).toBe(7)
    expect(ecartJours('2026-10-24', '2026-10-26')).toBe(2) // passage à l'heure d'hiver
  })
})

describe('noterOuverture', () => {
  it("compte : ajoute le jour au profil et compte l'ouverture du lendemain", () => {
    noterOuverture(compte, LUNDI_10H)
    expect(updateDoc).toHaveBeenCalledWith('users/abc', { joursActifs: { arrayUnion: '2026-10-19' } })
    expect(track).toHaveBeenCalledWith('ouverture', { anciennete: 'compte_j1' })
  })
  it('une seule fois par jour, puis de nouveau le lendemain', () => {
    noterOuverture(compte, LUNDI_10H)
    noterOuverture(compte, LUNDI_10H + 3600e3)
    expect(track).toHaveBeenCalledTimes(1)
    noterOuverture(compte, LUNDI_10H + 864e5)
    expect(track).toHaveBeenCalledTimes(2)
    expect(track).toHaveBeenLastCalledWith('ouverture', { anciennete: 'compte_j2_7' })
  })
  it("essai : compte l'ouverture sans rien écrire dans Firestore", () => {
    guest = { uid: 'invite-x', createdAt: LUNDI_10H }
    noterOuverture({ uid: 'invite-x', isAnonymous: true }, LUNDI_10H)
    expect(track).toHaveBeenCalledWith('ouverture', { anciennete: 'essai_j0' })
    expect(updateDoc).not.toHaveBeenCalled()
  })
  it('ignore les invités anonymes de Battle et un utilisateur absent', () => {
    noterOuverture({ uid: 'anon123', isAnonymous: true }, LUNDI_10H)
    noterOuverture(null, LUNDI_10H)
    expect(track).not.toHaveBeenCalled()
    expect(updateDoc).not.toHaveBeenCalled()
  })
  it("sans date de création, compte l'ouverture sans ancienneté", () => {
    noterOuverture({ uid: 'abc', metadata: {} }, LUNDI_10H)
    expect(track).toHaveBeenCalledWith('ouverture', {})
  })
})
