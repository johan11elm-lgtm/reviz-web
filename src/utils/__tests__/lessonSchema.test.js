import { describe, it, expect } from 'vitest'
import { parseLessonJson, parseIllustrations } from '../lessonSchema'

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

describe('parseIllustrations', () => {
  const coeur = {
    id: 'coeur',
    src: '/programme/illustrations/5eme/svt/coeur-vu-de-face.svg',
    alt: ' Le cœur vu de face ',
    legende: 'Le cœur droit est à gauche du dessin.',
    ancre: 'resume.sections[0]',
    legendesMasquables: true,
  }

  it('garde une illustration de nos fichiers, ancrée dans le résumé', () => {
    expect(parseIllustrations([coeur])).toEqual([{
      id: 'coeur',
      src: '/programme/illustrations/5eme/svt/coeur-vu-de-face.svg',
      alt: 'Le cœur vu de face',
      legende: 'Le cœur droit est à gauche du dessin.',
      credit: null,
      ancre: 'resume.sections[0]',
      legendesMasquables: true,
    }])
  })

  it('écarte les sources extérieures, les chemins détournés, sans texte alternatif ou mal ancrées', () => {
    const rejets = [
      { ...coeur, src: 'https://exemple.com/coeur.svg' },
      { ...coeur, src: '/programme/illustrations/../../index.html' },
      { ...coeur, src: '/autre/coeur.svg' },
      { ...coeur, src: '/programme/illustrations/coeur.gif' },
      { ...coeur, alt: '  ' },
      { ...coeur, ancre: 'quiz[0]' },
      { ...coeur, ancre: 'resume.sections[x]' },
      null,
      'coeur.svg',
    ]
    expect(parseIllustrations(rejets)).toEqual([])
    expect(parseIllustrations(undefined)).toEqual([])
  })

  it('ne masque les légendes que dans un SVG, et nomme une entrée sans id', () => {
    const [img] = parseIllustrations([{ ...coeur, id: undefined, src: '/programme/illustrations/4eme/histoire/sacre.webp' }])
    expect(img.legendesMasquables).toBe(false)
    expect(img.id).toBe('illustration-0')
  })

  it('parseLessonJson : champ absent → tableau vide, champ présent → normalisé', () => {
    expect(parseLessonJson(lecon()).illustrations).toEqual([])
    const avec = JSON.parse(lecon())
    avec.illustrations = [coeur, { src: 'https://exemple.com/x.png', alt: 'x', ancre: 'resume.intro' }]
    expect(parseLessonJson(JSON.stringify(avec)).illustrations.map(i => i.id)).toEqual(['coeur'])
  })
})
