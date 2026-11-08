import { describe, it, expect, beforeEach } from 'vitest'
import { peutDemander, noterDemande, lireDemandes, MAX_DEMANDES, ESPACEMENT_MS } from '../demandeRappel'

describe('demande du rappel de 17 h', () => {
  beforeEach(() => localStorage.clear())
  it('au plus 3 fois, espacées de 3 jours', () => {
    const t = 1_800_000_000_000
    expect(peutDemander('u1', t)).toBe(true)
    noterDemande('u1', t)
    expect(peutDemander('u1', t + ESPACEMENT_MS - 1)).toBe(false)
    expect(peutDemander('u1', t + ESPACEMENT_MS)).toBe(true)
    noterDemande('u1', t + ESPACEMENT_MS)
    noterDemande('u1', t + 2 * ESPACEMENT_MS)
    expect(lireDemandes('u1').fois).toBe(MAX_DEMANDES)
    expect(peutDemander('u1', t + 10 * ESPACEMENT_MS)).toBe(false)
    expect(peutDemander('u2', t)).toBe(true) // par élève
    expect(peutDemander(null, t)).toBe(false)
  })
})
