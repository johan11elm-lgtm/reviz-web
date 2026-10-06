import { describe, it, expect } from 'vitest'
import {
  slugify, classeSlug, matiereSlug, hasProgramme, chapterLessonId, isProgrammeLessonId,
  catalogueUrl, chapterContentUrl, chapterState, MATIERES_3E, MATIERES_6E, PROGRAMME_CLASSES,
} from '../programme'
import { SUBJECT_MAP } from '../subjects'

describe('programme — slugs et chemins', () => {
  it('slugifie sans accents ni espaces', () => {
    expect(slugify('3ème')).toBe('3eme')
    expect(slugify('Physique-Chimie')).toBe('physique-chimie')
    expect(slugify('Le théorème de Thalès !')).toBe('le-theoreme-de-thales')
    expect(classeSlug('Terminale')).toBe('terminale')
    expect(matiereSlug('Français')).toBe('francais')
  })

  it('construit les URL des fichiers statiques', () => {
    expect(catalogueUrl('3ème')).toBe('/programme/3eme/index.json')
    expect(chapterContentUrl('3ème', 'Maths', 'theoreme-de-thales')).toBe('/programme/3eme/maths/theoreme-de-thales.json')
  })

  it('identifiants de leçon stables et reconnaissables', () => {
    expect(chapterLessonId('thales')).toBe('prog-thales')
    expect(isProgrammeLessonId('prog-thales')).toBe(true)
    expect(isProgrammeLessonId('1759690000000')).toBe(false)
    expect(isProgrammeLessonId(null)).toBe(false)
  })
})

describe('programme — classes et matières', () => {
  it('tout le collège est publié, pas encore le lycée', () => {
    for (const c of ['6ème', '5ème', '4ème', '3ème']) expect(hasProgramme({ cycle: 'college', classe: c })).toBe(true)
    expect(hasProgramme({ cycle: 'lycee', classe: '2nde' })).toBe(false)
    expect(hasProgramme(null)).toBe(false)
  })

  it('chaque matière de 3e a une entrée dans SUBJECT_MAP (mascotte, couleur)', () => {
    for (const m of [...MATIERES_3E, ...MATIERES_6E]) {
      const key = Object.keys(SUBJECT_MAP).find(k => m.toLowerCase().includes(k))
      expect(key, m).toBeTruthy()
    }
  })
})

describe('chapterState', () => {
  const lesson = { id: 'prog-x', flashcardsCount: 6 }
  it('nouveau sans leçon', () => {
    expect(chapterState({ lesson: null, dueCards: 0, reviewedCards: 0 })).toBe('nouveau')
  })
  it('commencé quand ouvert mais aucune carte revue', () => {
    expect(chapterState({ lesson, dueCards: 6, reviewedCards: 0 })).toBe('commence')
  })
  it('à revoir quand des cartes sont dues', () => {
    expect(chapterState({ lesson, dueCards: 2, reviewedCards: 6 })).toBe('a-revoir')
  })
  it('maîtrisé quand tout est revu et rien n’est dû', () => {
    expect(chapterState({ lesson, dueCards: 0, reviewedCards: 6 })).toBe('maitrise')
  })
})
