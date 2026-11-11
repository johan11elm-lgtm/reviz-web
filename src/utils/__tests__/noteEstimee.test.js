import { describe, it, expect } from 'vitest'
import { noteEstimee, ecrireNote } from '../noteEstimee'

const T = Date.parse('2026-11-11T18:00:00+01:00')
const il = (h, r) => ({ revisedAt: T - h * 3_600_000, ...r })
const thales = { id: '3eme-maths-theoreme-de-thales', titre: 'Le théorème de Thalès' }
const pytha = { id: '3eme-maths-pythagore', titre: 'Le théorème de Pythagore' }
const controle = { matiere: 'maths', cree: '2026-11-08', chapitres: [thales, pytha] }

describe('note estimée d’un contrôle', () => {
  it('rien sans séance notée', () => {
    expect(noteEstimee(controle, [], T)).toBeNull()
    expect(noteEstimee(controle, [il(1, { type: 'resume', lessonId: 'prog-3eme-maths-theoreme-de-thales' })], T)).toBeNull()
  })
  it('un chapitre pas travaillé tire la note vers le bas, et c’est lui qu’on conseille', () => {
    const revs = [il(2, { type: 'exercices', lessonId: 'prog-3eme-maths-theoreme-de-thales', score: 9, total: 10 })]
    const e = noteEstimee(controle, revs, T)
    // (0,9 + 0,45) / 2 = 0,675 → 13,5/20
    expect(e).toMatchObject({ note: 13.5, seances: 1, blanc: false })
    expect(e.conseil).toEqual({ titre: 'Le théorème de Pythagore', visee: 17.5 })
    expect(ecrireNote(e.note)).toBe('13,5')
  })
  it('la séance la plus récente pèse le plus', () => {
    const revs = [
      il(50, { type: 'quiz', lessonId: 'prog-3eme-maths-theoreme-de-thales', score: 2, total: 10 }),
      il(1, { type: 'exercices', lessonId: 'prog-3eme-maths-theoreme-de-thales', score: 10, total: 10 }),
      il(1, { type: 'exercices', lessonId: 'prog-3eme-maths-pythagore', score: 8, total: 10 }),
    ]
    // Thalès : (3 × 1 + 2 × 0,2) / 5 = 0,68 ; Pythagore 0,8 → 0,74 → 15/20 (arrondi au demi-point)
    expect(noteEstimee(controle, revs, T).note).toBe(15)
  })
  it('le contrôle blanc de la matière compte pour 60 %, s’il est fait depuis que le contrôle est noté', () => {
    const revs = [
      il(3, { type: 'exercices', lessonId: 'prog-3eme-maths-theoreme-de-thales', score: 10, total: 10 }),
      il(3, { type: 'exercices', lessonId: 'prog-3eme-maths-pythagore', score: 10, total: 10 }),
      il(1, { type: 'controle', lessonId: null, matiere: 'maths', score: 5, total: 10 }),
    ]
    expect(noteEstimee(controle, revs, T)).toMatchObject({ note: 14, blanc: true, seances: 3 })
    // Un contrôle blanc d'avant ne compte pas.
    const ancien = [...revs.slice(0, 2), { ...revs[2], revisedAt: Date.parse('2026-11-01T12:00:00+01:00') }]
    expect(noteEstimee(controle, ancien, T)).toMatchObject({ note: 20, blanc: false })
  })
  it('sans chapitres cochés : les chapitres de la matière déjà travaillés', () => {
    const revs = [
      il(2, { type: 'quiz', lessonId: 'prog-3eme-maths-fractions', score: 6, total: 10 }),
      il(2, { type: 'quiz', lessonId: 'prog-3eme-francais-le-recit', score: 10, total: 10 }),
    ]
    expect(noteEstimee({ matiere: 'maths' }, revs, T)).toMatchObject({ note: 12, conseil: null })
  })
  it('oublie les séances de plus de 45 jours', () => {
    const revs = [il(24 * 50, { type: 'exercices', lessonId: 'prog-3eme-maths-theoreme-de-thales', score: 10, total: 10 })]
    expect(noteEstimee(controle, revs, T)).toBeNull()
  })
})
