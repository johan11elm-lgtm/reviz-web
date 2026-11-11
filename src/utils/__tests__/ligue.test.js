import { describe, it, expect } from 'vitest'
import { xpDeLaSemaine, messageLigue, finDeLigue } from '../ligue'

const MERCREDI = Date.parse('2026-11-11T18:00:00+01:00')
describe('ligue côté app', () => {
  it('l’XP de la semaine, du lundi à maintenant', () => {
    const revs = [
      { xp: 50, revisedAt: Date.parse('2026-11-09T10:00:00+01:00') }, // lundi
      { xp: 30, revisedAt: MERCREDI - 3_600_000 },
      { xp: 99, revisedAt: Date.parse('2026-11-08T20:00:00+01:00') }, // dimanche d'avant
      { revisedAt: MERCREDI },
    ]
    expect(xpDeLaSemaine(revs, MERCREDI)).toBe(80)
  })
  it('le message suit la place', () => {
    expect(messageLigue({ ligue: 'bronze', rang: 2, zones: { montee: 5, descente: null } })).toMatch(/zone de montée/)
    expect(messageLigue({ ligue: 'bronze', rang: 6, zones: { montee: 5, descente: null } })).toBe('Plus qu’une place avant la zone de montée.')
    expect(messageLigue({ ligue: 'argent', rang: 27, zones: { montee: 5, descente: 26 } })).toMatch(/Zone de descente/)
    expect(messageLigue({ ligue: 'or', rang: 3, zones: { montee: 0, descente: 26 } })).toMatch(/meilleure ligue/)
  })
  it('la fin de la semaine', () => {
    expect(finDeLigue(MERCREDI + 4.2 * 86_400_000, MERCREDI)).toBe('fin dans 4 jours')
    expect(finDeLigue(MERCREDI + 1.5 * 86_400_000, MERCREDI)).toBe('fin demain soir')
  })
})
