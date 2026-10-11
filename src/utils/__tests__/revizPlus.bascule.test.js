import { describe, it, expect, vi, beforeEach } from 'vitest'

// Simule l'interrupteur des ventes ; les dates sont les vraies.
const reglage = vi.hoisted(() => ({ ventes: false }))
vi.mock('../../../api/_lancement.js', async importOriginal => {
  const vrai = await importOriginal()
  const fin = Date.parse(vrai.FIN_LANCEMENT)
  return {
    ...vrai,
    get VENTES_OUVERTES() { return reglage.ventes },
    lancementOffert: (now = Date.now()) => !reglage.ventes || now < fin,
  }
})

const { estFondateur, phaseRevizPlus, joursAvant } = await import('../revizPlus.js')
const { tarifFondateurOuvert } = await import('../../../api/_lancement.js')

const t = iso => Date.parse(iso)

describe('lancement Réviz+ — dates', () => {
  beforeEach(() => { reglage.ventes = true })

  it('lancement, puis derniers jours à partir du 23 octobre, puis payant le 26', () => {
    expect(phaseRevizPlus(t('2026-10-11T12:00:00+02:00'))).toBe('lancement')
    expect(phaseRevizPlus(t('2026-10-23T08:00:00+02:00'))).toBe('derniers-jours')
    expect(phaseRevizPlus(t('2026-10-25T23:30:00+01:00'))).toBe('derniers-jours')
    expect(phaseRevizPlus(t('2026-10-26T00:30:00+01:00'))).toBe('payant')
  })

  it('tarif fondateur : abonnement pris avant le 26 octobre à 0 h', () => {
    expect(tarifFondateurOuvert(t('2026-10-25T23:59:00+01:00'))).toBe(true)
    expect(tarifFondateurOuvert(t('2026-10-26T00:00:01+01:00'))).toBe(false)
  })

  it('compte à rebours : 1 le dernier jour, 0 après', () => {
    expect(joursAvant('2026-10-26T00:00:00+01:00', t('2026-10-25T10:00:00+01:00'))).toBe(1)
    expect(joursAvant('2026-10-26T00:00:00+01:00', t('2026-10-26T10:00:00+01:00'))).toBe(0)
    expect(joursAvant('2026-10-26T00:00:00+01:00', t('2026-10-12T00:00:00+02:00'))).toBe(14)
  })

  it('sceau « Membre fondateur » : compte créé avant le 26 octobre', () => {
    expect(estFondateur('2026-10-02T10:00:00Z')).toBe(true)
    expect(estFondateur('2026-10-26T00:30:00+01:00')).toBe(false)
  })
})

describe('lancement Réviz+ — ventes fermées', () => {
  beforeEach(() => { reglage.ventes = false })

  it('la gratuité continue après la date, sans date affichée', () => {
    expect(phaseRevizPlus(t('2026-10-27T08:00:00+01:00'))).toBe('prolonge')
  })
})
