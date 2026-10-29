import { describe, it, expect, vi, beforeEach } from 'vitest'

const setDoc = vi.fn(async () => {})
vi.mock('../firebaseConfig', () => ({ db: {} }))
vi.mock('firebase/firestore', () => ({
  doc: (_db, ...chemin) => chemin.join('/'),
  setDoc: (...a) => setDoc(...a),
}))
vi.mock('../guestService', () => ({ isGuestUid: uid => uid.startsWith('invite-') }))

const { lireReclamees, recupererQuete, reprendreQuetesDuProfil, xpQuetes, EVENEMENT_QUETES } = await import('../quetesService')

const quete = (cle, xp = 50, champs = {}) => ({ cle, xp, faite: true, recuperee: false, ...champs })

beforeEach(() => { localStorage.clear(); setDoc.mockClear() })

describe('Récompenses de quêtes', () => {
  it('récupérer : sur l’appareil, sur le compte, et une seule fois', async () => {
    const vu = vi.fn()
    window.addEventListener(EVENEMENT_QUETES, vu)
    expect(await recupererQuete('u1', quete('j2026-10-29:combo5'))).toBe(true)
    expect(lireReclamees('u1')).toEqual({ 'j2026-10-29:combo5': 50 })
    expect(setDoc).toHaveBeenCalledWith('users/u1', { quetes: { 'j2026-10-29:combo5': 50 } }, { merge: true })
    expect(vu).toHaveBeenCalledTimes(1)
    expect(await recupererQuete('u1', quete('j2026-10-29:combo5'))).toBe(false)
    expect(xpQuetes('u1')).toBe(50)
    window.removeEventListener(EVENEMENT_QUETES, vu)
  })

  it('une quête pas finie ou déjà prise ne rapporte rien', async () => {
    expect(await recupererQuete('u1', quete('a', 50, { faite: false }))).toBe(false)
    expect(await recupererQuete('u1', quete('b', 50, { recuperee: true }))).toBe(false)
    expect(xpQuetes('u1')).toBe(0)
  })

  it('en mode essai, rien ne part sur un compte', async () => {
    expect(await recupererQuete('invite-abc123', quete('s2026-10-26:jours4', 150))).toBe(true)
    expect(setDoc).not.toHaveBeenCalled()
    expect(xpQuetes('invite-abc123')).toBe(150)
  })

  it('nouvel appareil : les récompenses du profil s’ajoutent, sans écraser', async () => {
    await recupererQuete('u2', quete('local', 40))
    reprendreQuetesDuProfil('u2', { local: 999, distante: 150, bizarre: 'x' })
    expect(lireReclamees('u2')).toEqual({ local: 40, distante: 150 })
    reprendreQuetesDuProfil('u2', null)
    expect(xpQuetes('u2')).toBe(190)
  })
})
