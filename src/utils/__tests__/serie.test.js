import { describe, it, expect } from 'vitest'
import { computeStreak, detailSerie } from '../gamification'

const AUJ = new Date(2026, 9, 28, 15)
const revision = n => { const d = new Date(AUJ); d.setDate(AUJ.getDate() - n); return { revisedAt: d.toISOString() } }
const jours = ns => ns.map(revision)

describe('série', () => {
  it('compte les jours consécutifs, aujourd’hui pas encore révisé ne casse rien', () => {
    expect(computeStreak(jours([0, 1, 2]), 'revisedAt', { aujourdhui: AUJ })).toBe(3)
    expect(detailSerie(jours([1, 2, 3]), 'revisedAt', { aujourdhui: AUJ }).serie).toBe(3)
    expect(detailSerie(jours([0, 2, 3]), 'revisedAt', { aujourdhui: AUJ }).serie).toBe(1)
  })

  it('avec le gel : un jour manqué par semaine ne casse pas la série, sans compter dedans', () => {
    const d = detailSerie(jours([0, 2, 3, 4]), 'revisedAt', { gel: true, aujourdhui: AUJ })
    expect(d.serie).toBe(4)
    expect(d.gels).toHaveLength(1)
  })

  it('deux jours manqués d’affilée cassent la série, même avec le gel', () => {
    expect(detailSerie(jours([0, 3, 4]), 'revisedAt', { gel: true, aujourdhui: AUJ }).serie).toBe(1)
  })

  it('un seul gel par semaine', () => {
    // Manqués : J-1 et J-3 (deux dans la même semaine) → le second casse
    expect(detailSerie(jours([0, 2, 4, 5]), 'revisedAt', { gel: true, aujourdhui: AUJ }).serie).toBe(2)
    // Manqués : J-1 et J-9 (une semaine d'écart) → les deux gelés
    const loin = detailSerie(jours([0, 2, 3, 4, 5, 6, 7, 8, 10, 11]), 'revisedAt', { gel: true, aujourdhui: AUJ })
    expect(loin.serie).toBe(10)
    expect(loin.gels).toHaveLength(2)
  })
})
