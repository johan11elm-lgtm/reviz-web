import { describe, it, expect, beforeEach } from 'vitest'
import { demarrer, mettreEnPause, reprendre, arreter, lireConcentration, etatConcentration, minuteur, bilanConcentration } from '../concentration'

const T = 1_800_000_000_000
describe('mode concentration', () => {
  beforeEach(() => localStorage.clear())
  it('le temps qui reste, pauses non comptées', () => {
    demarrer('u', 25, T)
    expect(etatConcentration(lireConcentration('u'), T + 60_000)).toMatchObject({ restant: 24 * 60_000, enPause: false, fini: false })
    mettreEnPause('u', T + 60_000)
    expect(etatConcentration(lireConcentration('u'), T + 10 * 60_000).restant).toBe(24 * 60_000)
    reprendre('u', T + 10 * 60_000)
    expect(etatConcentration(lireConcentration('u'), T + 11 * 60_000).restant).toBe(23 * 60_000)
    expect(etatConcentration(lireConcentration('u'), T + 40 * 60_000)).toMatchObject({ restant: 0, fini: true })
    arreter('u')
    expect(lireConcentration('u')).toBeNull()
  })
  it('affiche mm:ss', () => {
    expect(minuteur(24 * 60_000 + 5_400)).toBe('24:06')
    expect(minuteur(0)).toBe('00:00')
  })
  it('le bilan : ce qui a été fait pendant la séance', () => {
    const revs = [
      { type: 'exercices', revisedAt: T + 1000, xp: 60 },
      { type: 'quiz', revisedAt: T + 2000, xp: 40 },
      { type: 'flashcards', revisedAt: T + 3000 },
      { type: 'exercices', revisedAt: T - 1000, xp: 99 },
    ]
    expect(bilanConcentration(revs, T, T + 25 * 60_000)).toEqual({ exercices: 1, quiz: 1, flashcards: 1, lectures: 0, xp: 100 })
  })
})
