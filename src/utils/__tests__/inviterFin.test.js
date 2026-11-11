import { describe, it, expect, beforeEach } from 'vitest'
import { peutProposerInvitation, noterInvitationProposee } from '../inviterFin'

const T = 1_800_000_000_000
describe('« Invite un ami » en fin de séance', () => {
  beforeEach(() => localStorage.clear())
  it('seulement après une séance réussie', () => {
    expect(peutProposerInvitation('u', 6, 10, T)).toBe(false)
    expect(peutProposerInvitation('u', 7, 10, T)).toBe(true)
    expect(peutProposerInvitation(null, 10, 10, T)).toBe(false)
    expect(peutProposerInvitation('u', 0, 0, T)).toBe(false)
  })
  it('au plus une fois tous les 3 jours', () => {
    noterInvitationProposee('u', T)
    expect(peutProposerInvitation('u', 10, 10, T + 2 * 86_400_000)).toBe(false)
    expect(peutProposerInvitation('u', 10, 10, T + 3 * 86_400_000)).toBe(true)
  })
})
