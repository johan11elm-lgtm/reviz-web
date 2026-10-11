import { describe, it, expect } from 'vitest'
import { nextStep } from '../nextStep'

const lesson = { flashcardsCount: 8, quizCount: 7, resumeMinutes: 5 }
const jamais = () => false

describe('nextStep (carte « Ta prochaine étape »)', () => {
  it('leçon neuve : le résumé d’abord', () => {
    expect(nextStep(lesson, { seen: 0, seenDue: 0 }, jamais)).toMatchObject({ to: '/resume', title: 'Lis le résumé' })
    expect(nextStep(lesson, null, jamais).to).toBe('/resume')
  })

  it('résumé lu, aucune carte vue : apprendre les flashcards (pas « revois »)', () => {
    const step = nextStep(lesson, { seen: 0, seenDue: 0 }, f => f === 'resume')
    expect(step).toMatchObject({ to: '/flashcards', title: 'Apprends les flashcards' })
    expect(step.sub).toMatch(/^8 cartes encore jamais vues/)
  })

  it('cartes vues arrivées à échéance : les revoir en priorité', () => {
    expect(nextStep(lesson, { seen: 5, seenDue: 2 }, jamais)).toMatchObject({ to: '/flashcards', title: 'Revois tes 2 cartes' })
  })

  it('toutes les cartes vues et à jour : le quiz, puis le refaire', () => {
    expect(nextStep(lesson, { seen: 8, seenDue: 0 }, jamais)).toMatchObject({ to: '/quiz', action: 'Faire le quiz' })
    expect(nextStep(lesson, { seen: 8, seenDue: 0 }, f => f === 'quiz')).toMatchObject({ to: '/quiz', action: 'Refaire le quiz' })
  })
})
