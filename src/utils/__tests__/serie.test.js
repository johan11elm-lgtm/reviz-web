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

describe('série : les week-ends ne comptent pas (11/11)', () => {
  const LUNDI = new Date(2026, 10, 9, 15) // lundi 9 novembre 2026
  const r = ns => ns.map(n => { const d = new Date(LUNDI); d.setDate(LUNDI.getDate() - n); return { revisedAt: d.toISOString() } })
  const opts = extra => ({ aujourdhui: LUNDI, gel: true, weekendLibre: true, ...extra })

  it('un week-end sans révision ne casse rien et ne coûte pas de gel', () => {
    // Révisé vendredi (J-3), jeudi (J-4) et ce lundi : samedi et dimanche sautés.
    const d = detailSerie(r([0, 3, 4]), 'revisedAt', opts())
    expect(d).toEqual({ serie: 3, gels: [] })
    // Sans la règle, le week-end casse la série.
    expect(detailSerie(r([0, 3, 4]), 'revisedAt', { aujourdhui: LUNDI }).serie).toBe(1)
  })
  it('réviser le week-end compte quand même', () => {
    expect(detailSerie(r([0, 1, 2, 3]), 'revisedAt', opts()).serie).toBe(4)
  })
  it('un vendredi manqué avant le week-end peut encore être gelé', () => {
    const d = detailSerie(r([0, 4, 5]), 'revisedAt', opts())
    expect(d.serie).toBe(3)
    expect(d.gels).toHaveLength(1)
    // Sans gel, le vendredi manqué casse la série.
    expect(detailSerie(r([0, 4, 5]), 'revisedAt', opts({ gel: false })).serie).toBe(1)
  })
  it('un jour d’école manqué de trop casse toujours la série', () => {
    // Vendredi et jeudi manqués : deux jours d'école d'affilée.
    expect(detailSerie(r([0, 5, 6]), 'revisedAt', opts()).serie).toBe(1)
  })
})
