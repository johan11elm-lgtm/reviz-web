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
        { id: 'b1', label: 'L1', emoji: '📐', detail: 'd1', children: ['x'], position: 'top-left' },
        { id: 'b2', label: 'L2', emoji: '📏', detail: 'd2', children: ['y'], position: 'top-right' },
        { id: 'b3', label: 'L3', emoji: '🔄', detail: 'd3', children: ['z'], position: 'bottom-left' },
        { id: 'b4', label: 'L4', emoji: '💡', detail: 'd4', children: ['w'], position: 'bottom-right' },
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

describe('_parseResult — normalisation mindmap', () => {
  it('tronque à 4 branches et réassigne les positions canoniques par index', () => {
    const five = validResult()
    five.mindmap.branches.push({ id: 'b5', label: 'L5', emoji: '➕', detail: 'd5', children: [], position: 'top' })
    const out = _parseResult(JSON.stringify(five))
    expect(out.mindmap.branches).toHaveLength(4)
    expect(out.mindmap.branches.map(b => b.position))
      .toEqual(['top-left', 'top-right', 'bottom-left', 'bottom-right'])
  })

  it('réassigne les positions même si le modèle renvoie des doublons', () => {
    const dup = validResult()
    dup.mindmap.branches.forEach(b => { b.position = 'top-left' })
    const out = _parseResult(JSON.stringify(dup))
    expect(new Set(out.mindmap.branches.map(b => b.position)).size).toBe(4)
  })

  it('normalise les champs manquants (emoji, detail, children non-tableau)', () => {
    const messy = validResult()
    messy.mindmap.branches[0] = { id: 'b1', label: '  Fractions  ', children: 'pas un tableau' }
    const out = _parseResult(JSON.stringify(messy))
    const b = out.mindmap.branches[0]
    expect(b.label).toBe('Fractions')
    expect(b.emoji).toBe('📌')
    expect(b.detail).toBe('')
    expect(b.children).toEqual([])
  })

  it('déduplique les ids de branches', () => {
    const dup = validResult()
    dup.mindmap.branches[1].id = 'b1'
    const out = _parseResult(JSON.stringify(dup))
    const ids = out.mindmap.branches.map(b => b.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('écarte les branches sans label et lève INVALID_JSON sous 2 branches valides', () => {
    const bad = validResult()
    bad.mindmap.branches = [
      { id: 'b1', label: 'Seule', emoji: '📐', detail: 'd', children: [], position: 'top-left' },
      { id: 'b2', detail: 'sans label', children: [], position: 'top-right' },
    ]
    expect(() => _parseResult(JSON.stringify(bad))).toThrow('INVALID_JSON')
  })

  it('plafonne children à 6 éléments', () => {
    const many = validResult()
    many.mindmap.branches[0].children = ['1', '2', '3', '4', '5', '6', '7', '8']
    const out = _parseResult(JSON.stringify(many))
    expect(out.mindmap.branches[0].children).toHaveLength(6)
  })

  it('applique la palette design system (couleur violette en branche 0)', () => {
    const out = _parseResult(JSON.stringify(validResult()))
    expect(out.mindmap.branches[0].color).toBe('#6B4EFF')
  })
})
