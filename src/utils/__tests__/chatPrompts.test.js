import { describe, it, expect } from 'vitest'
import { buildChatSystemPrompt, buildChatLessonContext, buildChatRequest, blocCalendrier, CHAT_MODEL } from '../chatPrompts.js'

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

  it('donne les jours qui viennent quand on lui passe le jour, sinon rien', () => {
    expect(buildChatSystemPrompt(null, ctx, '2026-11-03')).toContain("aujourd'hui : mardi 3 novembre 2026")
    expect(buildChatSystemPrompt(null, ctx)).not.toContain('LES JOURS QUI VIENNENT')
  })
})

describe('blocCalendrier', () => {
  it('nomme chaque jour sans erreur de décompte, fin de mois comprise', () => {
    const c = blocCalendrier('2026-10-28')
    expect(c).toContain("aujourd'hui : mercredi 28 octobre 2026")
    expect(c).toContain('demain : jeudi 29 octobre')
    expect(c).toContain('dans 2 jours : vendredi 30 octobre')
    expect(c).toContain('dans 4 jours : dimanche 1 novembre')
    expect(c).toContain('dans 13 jours : mardi 10 novembre')
  })

  it("ne dépend pas du fuseau de la machine (passage à l'heure d'hiver)", () => {
    expect(blocCalendrier('2026-10-24')).toContain('demain : dimanche 25 octobre')
    expect(blocCalendrier('2026-10-24')).toContain('dans 2 jours : lundi 26 octobre')
  })
})

describe('buildChatRequest', () => {
  it('assemble modèle, plafond, effort, cache et prompt, sans paramètre refusé par Haiku 5.5', () => {
    const messages = [{ role: 'user', content: 'Explique' }]
    const r = buildChatRequest({ level: { cycle: 'college', classe: '4ème' }, lessonContext: 'ctx', messages, aujourdhui: '2026-11-03' })
    expect(r.model).toBe(CHAT_MODEL)
    expect(r.messages).toBe(messages)
    expect(r.output_config).toEqual({ effort: 'low' })
    expect(r.cache_control).toEqual({ type: 'ephemeral' })
    expect(r.system).toContain('mardi 3 novembre')
    for (const interdit of ['temperature', 'top_p', 'top_k', 'thinking']) expect(r).not.toHaveProperty(interdit)
  })

  it("laisse choisir l'effort (banc d'essai)", () => {
    expect(buildChatRequest({ lessonContext: '', messages: [], effort: 'medium' }).output_config).toEqual({ effort: 'medium' })
  })
})
