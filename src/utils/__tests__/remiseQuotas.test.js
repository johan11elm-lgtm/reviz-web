import { describe, it, expect } from 'vitest'
import { minuitParis, prochaineRemise, dansCombien, parSemaine } from '../remiseQuotas'

describe('quand les quotas reviennent', () => {
  it('minuit à Paris, en hiver comme en été', () => {
    expect(new Date(minuitParis('2026-11-12')).toISOString()).toBe('2026-11-11T23:00:00.000Z')
    expect(new Date(minuitParis('2026-07-01')).toISOString()).toBe('2026-06-30T22:00:00.000Z')
  })
  it('exercices : demain à minuit ; scans et Réviz IA : lundi à minuit', () => {
    const mercredi = Date.parse('2026-11-11T19:30:00+01:00')
    expect(new Date(prochaineRemise('exercices', mercredi)).toISOString()).toBe('2026-11-11T23:00:00.000Z')
    expect(new Date(prochaineRemise('scan', mercredi)).toISOString()).toBe('2026-11-15T23:00:00.000Z')
    // Un dimanche soir, lundi est dans quelques heures.
    const dimanche = Date.parse('2026-11-15T21:00:00+01:00')
    expect(new Date(prochaineRemise('ia', dimanche)).toISOString()).toBe('2026-11-15T23:00:00.000Z')
  })
  it('dit le temps restant, ou rien au-delà de 24 h', () => {
    const t = Date.parse('2026-11-11T19:48:00+01:00')
    expect(dansCombien(prochaineRemise('exercices', t), t)).toBe('dans 4 h 12 min')
    expect(dansCombien(t + 35 * 60_000, t)).toBe('dans 35 min')
    expect(dansCombien(t + 2 * 3_600_000, t)).toBe('dans 2 h')
    expect(dansCombien(prochaineRemise('scan', t), t)).toBeNull()
  })
  it('ramène le prix annuel à la semaine', () => {
    expect(parSemaine(4900)).toBe('0,94 €')
    expect(parSemaine(2900)).toBe('0,56 €')
  })
})
