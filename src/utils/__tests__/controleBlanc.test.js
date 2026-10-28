import { describe, it, expect } from 'vitest'
import { sujetControle, noteSur20, noteEnClair, chrono, dureeControle, leconDeLaMatiere } from '../controleBlanc'

const q = (texte, correct = 0) => ({ question: texte, choices: ['a', 'b', 'c', 'd'], correct, explanation: 'e' })
const lecon = (id, subject, n, extra = {}) => ({
  id, metadata: { title: `Chapitre ${id}`, subject }, ...extra,
  aiData: { quiz: Array.from({ length: n }, (_, i) => q(`${id} question ${i + 1}`)) },
})
// Aléa déterministe pour les tests.
const graine = (s = 1) => () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646 }

describe('mode contrôle : le sujet', () => {
  it('ne prend que les leçons de la matière du contrôle', () => {
    const lecons = [lecon('m1', 'Maths', 7), lecon('f1', 'Français', 7), lecon('m2', 'Mathématiques', 7)]
    const { questions, chapitres } = sujetControle({ lecons, matiere: 'maths', alea: graine() })
    expect(questions).toHaveLength(10)
    expect(questions.every(x => x.lessonId === 'm1' || x.lessonId === 'm2')).toBe(true)
    expect(chapitres.sort()).toEqual(['Chapitre m1', 'Chapitre m2'])
  })

  it('couvre chaque chapitre ouvert, à tour de rôle', () => {
    const lecons = [lecon('a', 'Maths', 7), lecon('b', 'Maths', 7), lecon('c', 'Maths', 7)]
    const { questions } = sujetControle({ lecons, matiere: 'maths', alea: graine(3) })
    const parLecon = id => questions.filter(x => x.lessonId === id).length
    expect([parLecon('a'), parLecon('b'), parLecon('c')].sort()).toEqual([3, 3, 4])
  })

  it('donne leur place aux questions ratées, sans dépasser un tiers du sujet', () => {
    const lecons = [lecon('a', 'Maths', 10), lecon('b', 'Maths', 10)]
    const ratees = new Set(['a question 1', 'a question 2', 'a question 3', 'a question 4', 'b question 1'])
    const { questions } = sujetControle({ lecons, matiere: 'maths', ratees, alea: graine(5) })
    expect(questions.filter(x => ratees.has(x.question)).length).toBeGreaterThanOrEqual(3)
    expect(new Set(questions.map(x => x.question)).size).toBe(10)
  })

  it('reconnaît la matière par le nom du programme (« Maths ») ou par le sujet scanné', () => {
    expect(leconDeLaMatiere({ matiere: 'Physique-Chimie', metadata: { subject: 'Physique-Chimie' } }, 'physique-chimie')).toBe(true)
    expect(leconDeLaMatiere({ metadata: { subject: 'SVT' } }, 'maths')).toBe(false)
    expect(leconDeLaMatiere({ metadata: { subject: 'Latin' } }, 'autre')).toBe(true)
  })

  it('écarte les doublons et les questions mal formées', () => {
    const lecons = [
      { id: 'x', metadata: { title: 'X', subject: 'Maths' }, aiData: { quiz: [q('même'), q('même'), { question: 'sans choix' }, q('ok')] } },
    ]
    const { questions } = sujetControle({ lecons, matiere: 'maths', alea: graine() })
    expect(questions.map(x => x.question).sort()).toEqual(['même', 'ok'])
  })

  it('rend un sujet vide sans leçon de la matière', () => {
    expect(sujetControle({ lecons: [lecon('f', 'Français', 7)], matiere: 'maths' }).questions).toEqual([])
  })
})

describe('mode contrôle : note et chrono', () => {
  it('note sur 20 au demi-point, écrite à la française', () => {
    expect(noteSur20(7, 10)).toBe(14)
    expect(noteSur20(5, 7)).toBe(14.5)
    expect(noteSur20(0, 0)).toBe(0)
    expect(noteEnClair(13.5)).toBe('13,5')
  })
  it('une minute par question, affichée en mm:ss', () => {
    expect(dureeControle(10)).toBe(600)
    expect(chrono(582.2)).toBe('09:43')
    expect(chrono(-3)).toBe('00:00')
  })
})
