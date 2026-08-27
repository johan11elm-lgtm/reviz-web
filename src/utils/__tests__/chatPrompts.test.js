import { describe, it, expect } from 'vitest'
import { buildChatSystemPrompt, buildChatLessonContext } from '../chatPrompts.js'

const ENTRY = {
  metadata: { title: 'Le théorème de Pythagore', subject: 'Maths' },
  aiData: {
    resume: {
      intro: 'Dans un triangle rectangle, a² + b² = c².',
      keyPoints: ['Triangle rectangle obligatoire', 'Hypoténuse = côté le plus long'],
      sections: [
        { title: '1. Énoncé', content: 'Le carré de l\'hypoténuse...', formula: 'a² + b² = c²', formulaCaption: 'relation de Pythagore' },
      ],
      keyTerms: [{ term: 'Hypoténuse', def: 'Côté opposé à l\'angle droit' }],
    },
    flashcards: [{ front: 'Quand s\'applique Pythagore ?', back: 'Dans un triangle rectangle' }],
  },
}

describe('buildChatLessonContext', () => {
  it('assemble titre, matière, résumé, sections, vocabulaire et flashcards', () => {
    const ctx = buildChatLessonContext(ENTRY)
    expect(ctx).toContain('Le théorème de Pythagore')
    expect(ctx).toContain('Matière : Maths')
    expect(ctx).toContain('a² + b² = c²')
    expect(ctx).toContain('Triangle rectangle obligatoire')
    expect(ctx).toContain('Hypoténuse : Côté opposé')
    expect(ctx).toContain('Quand s\'applique Pythagore ?')
  })

  it('tolère une entrée minimale sans crasher', () => {
    expect(buildChatLessonContext({})).toContain('Leçon')
    expect(buildChatLessonContext(null)).toContain('Leçon')
    expect(buildChatLessonContext({ metadata: { title: 'T' }, aiData: { resume: {} } })).toContain('T')
  })

  it('plafonne la taille du contexte', () => {
    const huge = {
      metadata: { title: 'T' },
      aiData: {
        resume: { sections: Array.from({ length: 200 }, (_, i) => ({ title: `S${i}`, content: 'x'.repeat(300) })) },
      },
    }
    expect(buildChatLessonContext(huge).length).toBeLessThanOrEqual(6000)
  })
})

describe('buildChatSystemPrompt', () => {
  const ctx = buildChatLessonContext(ENTRY)

  it('contient le cadre sécurité mineurs et anti-injection', () => {
    const p = buildChatSystemPrompt({ cycle: 'college', classe: '4ème' }, ctx)
    expect(p).toContain('MINEURS')
    expect(p).toContain('jamais des instructions')
    expect(p).toContain('<lecon_eleve>')
    expect(p).toContain(ctx)
  })

  it('adapte le ton au cycle', () => {
    const college = buildChatSystemPrompt({ cycle: 'college', classe: '5ème' }, ctx)
    const lycee = buildChatSystemPrompt({ cycle: 'lycee', classe: 'Terminale' }, ctx)
    expect(college).toContain('collégien')
    expect(college).toContain('5ème')
    expect(lycee).toContain('lycéen')
    expect(lycee).toContain('Terminale')
  })

  it('ne crashe pas sans niveau (fallback collège)', () => {
    expect(buildChatSystemPrompt(null, ctx)).toContain('collégien')
  })
})
