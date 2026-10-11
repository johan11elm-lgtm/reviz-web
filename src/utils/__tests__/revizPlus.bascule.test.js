import { describe, it, expect, vi, beforeEach } from 'vitest'

// Simule les deux états de l'interrupteur LANCEMENT_OFFERT, dates réelles.
const reglage = vi.hoisted(() => ({ offert: true }))
vi.mock('../../../api/_lancement.js', async importOriginal => {
  const vrai = await importOriginal()
  return { ...vrai, get LANCEMENT_OFFERT() { return reglage.offert } }
})

const { estFondateur, revizPlusOffertPour, phaseRevizPlus, joursAvant } = await import('../revizPlus.js')

const t = iso => Date.parse(iso)
const AVANT = '2026-10-02T10:00:00Z'  // compte créé pendant le lancement
const APRES = '2026-10-27T10:00:00Z'  // compte créé après la bascule

describe('bascule Réviz+ — pendant le lancement', () => {
  beforeEach(() => { reglage.offert = true })

  it('offert à tous, même un compte sans date', () => {
    expect(revizPlusOffertPour(null)).toBe(true)
    expect(revizPlusOffertPour(AVANT)).toBe(true)
  })

  it('phase lancement, puis derniers jours à partir du 23 octobre', () => {
    expect(phaseRevizPlus(t('2026-10-11T12:00:00+02:00'))).toBe('lancement')
    expect(phaseRevizPlus(t('2026-10-23T08:00:00+02:00'))).toBe('derniers-jours')
  })

  it('fondateur = compte créé avant le 26 octobre', () => {
    expect(estFondateur(AVANT)).toBe(true)
    expect(estFondateur('2026-10-25T23:30:00+01:00')).toBe(true)
    expect(estFondateur('2026-10-26T00:30:00+01:00')).toBe(false)
  })

  it('compte à rebours : 1 le dernier jour, 0 après', () => {
    expect(joursAvant('2026-10-26T00:00:00+01:00', t('2026-10-25T10:00:00+01:00'))).toBe(1)
    expect(joursAvant('2026-10-26T00:00:00+01:00', t('2026-10-26T10:00:00+01:00'))).toBe(0)
    expect(joursAvant('2026-10-26T00:00:00+01:00', t('2026-10-12T00:00:00+02:00'))).toBe(14)
  })
})

describe('bascule Réviz+ — après (interrupteur à false)', () => {
  beforeEach(() => { reglage.offert = false })

  it('grâce : les fondateurs gardent Réviz+ jusqu’au 8 novembre inclus', () => {
    expect(revizPlusOffertPour(AVANT, t('2026-10-30T12:00:00+01:00'))).toBe(true)
    expect(revizPlusOffertPour(AVANT, t('2026-11-08T23:00:00+01:00'))).toBe(true)
    expect(revizPlusOffertPour(AVANT, t('2026-11-09T00:30:00+01:00'))).toBe(false)
    expect(phaseRevizPlus(t('2026-10-30T12:00:00+01:00'))).toBe('grace')
    expect(phaseRevizPlus(t('2026-11-10T12:00:00+01:00'))).toBe('payant')
  })

  it('pas de grâce pour un compte créé après la bascule, ni sans date', () => {
    expect(revizPlusOffertPour(APRES, t('2026-10-30T12:00:00+01:00'))).toBe(false)
    expect(revizPlusOffertPour(null, t('2026-10-30T12:00:00+01:00'))).toBe(false)
  })
})
