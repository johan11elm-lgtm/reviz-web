import { describe, it, expect } from 'vitest'
import { computeBadges } from '../gamification'

const day = 864e5
const rev = (type, lessonId, t = Date.now()) => ({ type, lessonId, revisedAt: t })

describe('computeBadges', () => {
  it('rien fait : tout est verrouillé, à zéro', () => {
    const badges = computeBadges([], [], 0, 1)
    expect(badges).toHaveLength(18)
    expect(badges.every(b => b.locked)).toBe(true)
    expect(badges.find(b => b.id === 'regulier')).toMatchObject({ current: 0, target: 3, hint: '3 jours de suite' })
  })

  it('débloque selon les mêmes seuils et plafonne la progression à la cible', () => {
    const lessons = Array.from({ length: 6 }, (_, i) => ({ id: `l${i}`, flashcardsCount: 10 }))
    const revisions = [rev('flashcards', 'l0'), rev('quiz', 'l0'), rev('resume', 'l0', Date.now() - day)]
    const byId = Object.fromEntries(computeBadges(lessons, revisions, 4, 2).map(b => [b.id, b]))
    expect(byId.lanceur).toMatchObject({ locked: false, current: 1, target: 1 })
    expect(byId.etudiant).toMatchObject({ locked: false, current: 5 })
    expect(byId.expert).toMatchObject({ locked: true, current: 6, target: 10 })
    expect(byId.curieux.locked).toBe(false)
    expect(byId.precis).toMatchObject({ locked: true, current: 3, target: 4 })
    expect(byId.regulier.locked).toBe(false)
    expect(byId['7jours']).toMatchObject({ locked: true, current: 4 })
    expect(byId.chercheur).toMatchObject({ locked: false, current: 50 })
    expect(byId.approfondi).toMatchObject({ current: 3, target: 5 })
  })

  it('« Précis » ne compte que les quatre formats', () => {
    const revisions = ['flashcards', 'quiz', 'resume', 'autre'].map(t => rev(t, 'l0'))
    const precis = computeBadges([], revisions, 0, 1).find(b => b.id === 'precis')
    expect(precis).toMatchObject({ locked: true, current: 3 })
  })
})
