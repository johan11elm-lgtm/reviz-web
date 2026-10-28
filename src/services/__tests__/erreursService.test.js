import { describe, it, expect, vi, beforeEach } from 'vitest'

const lecons = [
  { id: 'prog-thales', matiere: 'maths', aiData: { quiz: [] }, metadata: { title: 'Thalès' } },
  { id: 'scan-1', metadata: { title: 'La Seconde Guerre mondiale', subject: 'Histoire' }, aiData: {} },
]
vi.mock('../historyService', () => ({
  loadLessons: () => lecons,
  restoreLesson: vi.fn(id => { localStorage.setItem('reviz-current-lesson-id', id); return true }),
}))
const { noterErreurs, erreursDe, leconAvecErreurs, preparerQuizErreurs } = await import('../erreursService')

const qs = [
  { question: 'Q1', correct: 0 }, { question: 'Q2', correct: 1 }, { question: 'Q3', correct: 2 },
]

describe('erreurs de quiz', () => {
  beforeEach(() => localStorage.clear())

  it('note les questions ratées, retire celles réussies ensuite', () => {
    noterErreurs('u1', 'prog-thales', qs, [0, 0, 0])
    expect(erreursDe('u1', 'prog-thales').sort()).toEqual(['Q2', 'Q3'])
    // Quiz des erreurs : Q2 réussie, Q3 encore ratée
    noterErreurs('u1', 'prog-thales', [qs[1], qs[2]], [1, 0])
    expect(erreursDe('u1', 'prog-thales')).toEqual(['Q3'])
    noterErreurs('u1', 'prog-thales', [qs[2]], [2])
    expect(erreursDe('u1', 'prog-thales')).toEqual([])
  })

  it('séparées par élève', () => {
    noterErreurs('u1', 'prog-thales', qs, [0, 0, 0])
    expect(erreursDe('u2', 'prog-thales')).toEqual([])
  })

  it('retrouve la leçon de la matière qui a des erreurs, programme ou leçon scannée', () => {
    noterErreurs('u1', 'scan-1', qs, [1, 1, 1])
    expect(leconAvecErreurs('u1', 'histoire')).toBe('scan-1')
    expect(leconAvecErreurs('u1', 'maths')).toBeNull()
    expect(preparerQuizErreurs('u1', 'maths')).toBe(false)
    expect(preparerQuizErreurs('u1', 'histoire')).toBe(true)
    expect(localStorage.getItem('reviz-current-lesson-id')).toBe('scan-1')
  })
})
