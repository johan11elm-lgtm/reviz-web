import { describe, it, expect } from 'vitest'
import { seancesDuJour, limiteExercicesAtteinte, LIMITE_EXERCICES_GRATUIT } from '../limiteExercices'

const midi = Date.parse('2026-11-08T12:00:00+01:00')
const rev = (type, at, source) => ({ type, revisedAt: at, ...(source ? { source } : {}) })

describe('limite d\'exercices du jour', () => {
  it('compte les séances d\'exercices du jour (heure de Paris), sans la séance d\'accueil', () => {
    const revs = [
      rev('exercices', midi - 3600e3),
      rev('exercices', Date.parse('2026-11-08T00:30:00+01:00')),
      rev('exercices', Date.parse('2026-11-07T23:30:00+01:00')), // la veille à Paris
      rev('quiz', midi - 60e3),
      rev('exercices', midi - 120e3, 'decouverte'),
    ]
    expect(seancesDuJour(revs, midi)).toBe(2)
    expect(limiteExercicesAtteinte(revs, midi)).toBe(false)
  })
  it('bloque à partir de la limite', () => {
    const revs = Array.from({ length: LIMITE_EXERCICES_GRATUIT }, (_, i) => rev('exercices', midi - i * 60e3))
    expect(LIMITE_EXERCICES_GRATUIT).toBe(3)
    expect(limiteExercicesAtteinte(revs, midi)).toBe(true)
    expect(limiteExercicesAtteinte(null, midi)).toBe(false)
  })
})
