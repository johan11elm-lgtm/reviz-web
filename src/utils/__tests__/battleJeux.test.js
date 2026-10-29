import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { exercicesDeLaBattle, manchesDe, texteDeChoix, contenuDuel } from '../battleJeux'
import { FORMATS_DUEL, graineDuel } from '../exercicesChapitre'
import { resoudreRound } from '../battle'

const DATA = JSON.parse(readFileSync('public/programme/4eme/histoire/consulat-et-empire.json', 'utf8'))
const salon = (questions = [3, 0, 5, 1, 6, 2]) => ({ chapitre: { classe: '4ème', matiere: 'Histoire', id: 'consulat-et-empire' }, questions })

describe('Battle en mini-jeux', () => {
  it('6 mini-jeux, tous différents, les mêmes sur les deux téléphones', () => {
    const a = exercicesDeLaBattle(DATA, salon())
    expect(a).toHaveLength(6)
    expect(new Set(a.map(e => e.type)).size).toBe(6)
    for (const e of a) expect([...FORMATS_DUEL, 'qcm']).toContain(e.type)
    // Le salon arrive par la base temps réel : un objet { 0: 3, 1: 0, … } donne les mêmes mini-jeux.
    expect(exercicesDeLaBattle(DATA, { ...salon(), questions: { ...[3, 0, 5, 1, 6, 2] } })).toEqual(a)
    expect(JSON.stringify(exercicesDeLaBattle(JSON.parse(JSON.stringify(DATA)), salon()))).toBe(JSON.stringify(a))
  })

  it('une revanche (d’autres questions) tire d’autres mini-jeux', () => {
    expect(graineDuel([0, 1, 2, 3, 4, 5])).not.toBe(graineDuel([5, 4, 3, 2, 1, 0]))
    const a = exercicesDeLaBattle(DATA, salon([0, 1, 2, 3, 4, 5]))
    const b = exercicesDeLaBattle(DATA, salon([6, 4, 2, 0, 1, 3]))
    expect(JSON.stringify(a)).not.toBe(JSON.stringify(b))
  })

  it('chaque manche tient dans les règles de la base : une case entre 0 et 3', () => {
    for (const qs of [[0, 1, 2, 3, 4, 5], [6, 5, 4, 3, 2, 1], [2, 4, 6, 1, 3, 5]]) {
      for (const m of manchesDe(exercicesDeLaBattle(DATA, salon(qs)))) {
        expect(m.nbChoix).toBeGreaterThanOrEqual(2)
        expect(m.nbChoix).toBeLessThanOrEqual(4)
        expect(m.correct).toBeGreaterThanOrEqual(0)
        expect(m.correct).toBeLessThan(m.nbChoix)
      }
    }
  })

  it('la bonne case gagne le round, une autre case le perd', () => {
    const ex = exercicesDeLaBattle(DATA, salon())
    const [m] = manchesDe(ex)
    const r = resoudreRound({ joueurs: ['h', 'i'], correct: m.correct, nbChoix: m.nbChoix, reponses: { h: { choix: m.correct, ms: 2000 }, i: { choix: (m.correct + 1) % m.nbChoix, ms: 1000 } } })
    expect(r.gagnant).toBe('h')
    expect(r.issues.i).toBe('erreur')
  })

  it('la réponse d’un joueur se lit en clair', () => {
    for (const ex of exercicesDeLaBattle(DATA, salon())) {
      const bonne = manchesDe([ex])[0].correct
      expect(texteDeChoix(ex, bonne)).toBeTruthy()
      if (ex.type === 'vraifaux') expect(texteDeChoix(ex, bonne)).toBe(ex.vrai ? 'Vrai' : 'Faux')
    }
    expect(texteDeChoix({ type: 'coins', coins: ['a'] }, undefined)).toBeNull()
  })

  it('la matière du salon décide de la mise en forme (pas de majuscule forcée en maths)', () => {
    expect(contenuDuel({ metadata: { subject: 'Histoire' } }, { matiere: 'Maths' }).metadata.subject).toBe('Maths')
  })
})
