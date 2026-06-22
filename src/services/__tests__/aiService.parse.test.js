import { describe, it, expect } from 'vitest'
import { _parseResult } from '../aiService'

function validResult(overrides = {}) {
  return {
    metadata: { title: 'Théorème de Pythagore', subject: 'Maths', excerpt: 'x' },
    flashcards: [
      { front: 'Q0', back: 'R0' },
      { front: 'Q1', back: 'R1' },
    ],
    quiz: [
      { question: 'Q ?', choices: ['a', 'b', 'c', 'd'], correct: 2, explanation: 'e' },
    ],
    resume: {
      intro: 'i',
      keyPoints: ['k1', 'k2'],
      sections: [{ title: '1. S', content: 'c', formula: null, formulaCaption: null }],
      keyTerms: [{ term: 't', def: 'd' }],
    },
    mindmap: {
      branches: [
        { id: 'b1', label: 'L', emoji: '📐', detail: 'd', children: ['x'], position: 'top-left' },
      ],
    },
    ...overrides,
  }
}

describe('_parseResult — parsing & robustesse', () => {
  it('parse un JSON valide et colore les branches mindmap', () => {
    const out = _parseResult(JSON.stringify(validResult()))
    expect(out.metadata.title).toBe('Théorème de Pythagore')
    expect(out.mindmap.branches[0]).toHaveProperty('color')
  })

  it('parse un JSON entouré de ```json … ```', () => {
    const out = _parseResult('```json\n' + JSON.stringify(validResult()) + '\n```')
    expect(out.flashcards).toHaveLength(2)
  })

  it('extrait le JSON noyé dans du texte parasite', () => {
    const out = _parseResult('Voici le résultat : ' + JSON.stringify(validResult()) + ' Merci !')
    expect(out.quiz).toHaveLength(1)
  })

  it('coerce quiz.correct string → number (bug "1" vs 1)', () => {
    const out = _parseResult(JSON.stringify(validResult({
      quiz: [{ question: 'Q ?', choices: ['a', 'b', 'c', 'd'], correct: '3', explanation: 'e' }],
    })))
    expect(out.quiz[0].correct).toBe(3)
    expect(typeof out.quiz[0].correct).toBe('number')
  })

  it('lève NON_SCOLAIRE sur la sentinelle de refus', () => {
    expect(() => _parseResult('{"error":"NON_SCOLAIRE"}')).toThrow('NON_SCOLAIRE')
  })

  it('lève INVALID_JSON sur un autre champ error', () => {
    expect(() => _parseResult('{"error":"AUTRE"}')).toThrow('INVALID_JSON')
  })

  it('lève INVALID_JSON sur du texte non-JSON', () => {
    expect(() => _parseResult('désolé je ne peux pas')).toThrow('INVALID_JSON')
  })

  it('lève INVALID_JSON si un bloc principal manque', () => {
    const bad = validResult()
    delete bad.resume
    expect(() => _parseResult(JSON.stringify(bad))).toThrow('INVALID_JSON')
  })

  it('lève INVALID_JSON si correct est hors bornes', () => {
    expect(() => _parseResult(JSON.stringify(validResult({
      quiz: [{ question: 'Q ?', choices: ['a', 'b'], correct: 5, explanation: 'e' }],
    })))).toThrow('INVALID_JSON')
  })

  it('lève INVALID_JSON si une flashcard est malformée', () => {
    expect(() => _parseResult(JSON.stringify(validResult({
      flashcards: [{ front: 'sans back' }],
    })))).toThrow('INVALID_JSON')
  })

  it('lève INVALID_JSON si quiz.choices n\'est pas un tableau', () => {
    expect(() => _parseResult(JSON.stringify(validResult({
      quiz: [{ question: 'Q ?', choices: 'a,b,c', correct: 0, explanation: 'e' }],
    })))).toThrow('INVALID_JSON')
  })

  it('lève INVALID_JSON si resume.sections n\'est pas un tableau', () => {
    const bad = validResult()
    bad.resume.sections = 'oops'
    expect(() => _parseResult(JSON.stringify(bad))).toThrow('INVALID_JSON')
  })
})
