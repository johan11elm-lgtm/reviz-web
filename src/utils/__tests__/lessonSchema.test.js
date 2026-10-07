import { describe, it, expect } from 'vitest'
import { parseLessonJson } from '../lessonSchema'

const lecon = resume => JSON.stringify({
  metadata: { title: 'T', subject: 'Maths' },
  flashcards: [{ front: 'Q', back: 'R' }],
  quiz: [{ question: 'Q', choices: ['a', 'b'], correct: '1', explanation: '' }],
  resume: { intro: 'i', keyPoints: [], sections: [{ title: 's', content: 'c' }], keyTerms: [], ...resume },
  mindmap: { branches: [{ label: 'a' }, { label: 'b' }] },
})

describe('parseLessonJson — rubriques du résumé', () => {
  it('accepte un résumé ancien (sans exemple, méthode ni pièges)', () => {
    const r = parseLessonJson(lecon({})).resume
    expect(r.sections[0].exemple).toBeNull()
    expect(r.methode).toBeNull()
    expect(r.pieges).toEqual([])
  })

  it('garde exemple, méthode et pièges quand ils sont bien formés', () => {
    const r = parseLessonJson(lecon({
      sections: [{ title: 's', content: 'c', exemple: ' 3² + 4² = 5² ' }],
      methode: { titre: 'Comment calculer', etapes: ['Repérer', ' ', 'Calculer'] },
      pieges: ['Ne confonds pas…', '', 42],
    })).resume
    expect(r.sections[0].exemple).toBe('3² + 4² = 5²')
    expect(r.methode).toEqual({ titre: 'Comment calculer', etapes: ['Repérer', 'Calculer'] })
    expect(r.pieges).toEqual(['Ne confonds pas…'])
  })

  it('écarte une méthode vide ou mal formée, sans rejeter la leçon', () => {
    expect(parseLessonJson(lecon({ methode: { titre: 'x', etapes: [] } })).resume.methode).toBeNull()
    expect(parseLessonJson(lecon({ methode: 'texte libre' })).resume.methode).toBeNull()
    expect(parseLessonJson(lecon({ methode: { etapes: ['a'] } })).resume.methode.titre).toBe('La méthode')
  })
})
