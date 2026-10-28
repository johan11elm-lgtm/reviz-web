import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { creerOutils, buildAgentRequest, OUTILS_AGENT, LIBELLES_OUTILS, traceCarte } from '../agent.js'

const programme = chemin => JSON.parse(readFileSync(join(process.cwd(), 'public/programme', chemin), 'utf8'))
const AUJ = '2026-11-03' // un mardi

function eleve(extra = {}) {
  return {
    agenda: async () => ({
      controles: [
        { id: 'c1', matiere: 'maths', titre: 'Pythagore', date: '2026-11-05', cree: '2026-10-30', chapitres: [{ id: 'theoreme-de-pythagore', titre: 'Racine carrée et théorème de Pythagore' }], classe: '4ème', programme: 'Maths' },
        { id: 'c0', matiere: 'svt', titre: 'Passé', date: '2026-10-20' },
      ],
    }),
    revisions: async () => [{ type: 'quiz', lessonId: 'prog-theoreme-de-pythagore', revisedAt: Date.parse('2026-11-02T17:00:00Z'), score: 4, total: 7 }],
    lecons: async () => [{ id: 'scan-1', titre: 'Les volcans de la Réunion', matiere: 'SVT', source: 'scan' }],
    lecon: async id => (id === 'scan-1' ? { metadata: { title: 'Les volcans de la Réunion', subject: 'SVT' }, aiData: { resume: { intro: 'Le Piton de la Fournaise est effusif.' } } } : null),
    catalogue: async cl => programme(`${cl}/index.json`),
    chapitre: async (cl, m, id) => programme(`${cl}/${m}/${id}.json`),
    erreurs: [{ lessonId: 'prog-theoreme-de-pythagore', titre: 'Racine carrée et théorème de Pythagore', matiere: 'maths', questions: ['Combien mesure AC ?'], at: Date.parse('2026-11-02T17:00:00Z') }],
    ...extra,
  }
}
const outils = (sources = eleve()) => creerOutils({ sources, level: { cycle: 'college', classe: '4ème' }, aujourdhui: AUJ })
const lire = r => JSON.parse(r.contenu)

describe('outils de lecture', () => {
  it('mes_controles : les contrôles à venir avec le plan calculé par l’appli', async () => {
    const [c] = lire(await outils().executer('mes_controles', {}))
    expect(c).toMatchObject({ id: 'c1', matiere: 'Maths', quand: 'dans 2 jours (jeudi 5 novembre)' })
    expect(c.plan.map(e => e.format_carte)).toEqual(['flashcards', 'erreurs', 'controle_blanc'])
    expect(c.plan[0].etat).toBe("à rattraper aujourd'hui")
    expect(c.preparation).toBe('Pas encore prêt')
  })

  it('mes_erreurs et mes_revisions : ce qui a été raté et fait, daté', async () => {
    const o = outils()
    expect(lire(await o.executer('mes_erreurs', {}))[0]).toMatchObject({ id: 'prog-theoreme-de-pythagore', quand: 'hier' })
    expect(lire(await o.executer('mes_revisions', {}))[0]).toMatchObject({ format: 'quiz', chapitre: 'Racine carrée et théorème de Pythagore', score: '4/7', quand: 'hier' })
  })

  it('chercher_chapitre : le programme de la classe et les cours scannés, à la racine près', async () => {
    const o = outils()
    const pyth = lire(await o.executer('chercher_chapitre', { recherche: 'pythagore' }))
    expect(pyth[0]).toMatchObject({ id: 'theoreme-de-pythagore', matiere: 'maths', type: 'programme' })
    const volcans = lire(await o.executer('chercher_chapitre', { recherche: 'volcans', matiere: 'svt' }))
    expect(volcans.map(v => v.id)).toEqual(expect.arrayContaining(['volcanisme', 'scan-1']))
  })

  it('lire_chapitre : le contenu relu, ou une erreur pour un id inconnu', async () => {
    const o = outils()
    expect((await o.executer('lire_chapitre', { id: 'prog-theoreme-de-pythagore' })).contenu).toContain('Racine carrée et théorème de Pythagore')
    expect((await o.executer('lire_chapitre', { id: 'scan-1' })).contenu).toContain('Piton de la Fournaise')
    expect((await o.executer('lire_chapitre', { id: 'nimporte' })).erreur).toBe(true)
  })
})

describe('cartes', () => {
  it('proposer_controle : une carte prête pour ajouterControle', async () => {
    const r = await outils().executer('proposer_controle', { matiere: 'svt', date: '2026-11-10', chapitres: ['volcanisme'] })
    expect(r.erreur).toBeUndefined()
    expect(r.carte).toMatchObject({
      type: 'controle', matiere: 'svt', date: '2026-11-10', jour: 'mardi 10 novembre', titre: 'Le volcanisme',
      chapitres: [{ id: 'volcanisme', titre: 'Le volcanisme' }], classe: '4ème', programme: 'SVT',
    })
    expect(r.contenu).toMatch(/toucher Ajouter/)
    expect(traceCarte(r.carte)).toBe('[carte : Contrôle de SVT du mardi 10 novembre à ajouter (Le volcanisme)]')
  })

  it('proposer_controle : refuse une date passée, un chapitre d’une autre matière, un doublon', async () => {
    const o = outils()
    expect((await o.executer('proposer_controle', { matiere: 'svt', date: '2026-11-02', chapitres: ['volcanisme'] })).erreur).toBe(true)
    expect((await o.executer('proposer_controle', { matiere: 'svt', date: '2026-11-10', chapitres: ['theoreme-de-pythagore'] })).contenu).toMatch(/Pas des chapitres de SVT/)
    expect((await o.executer('proposer_controle', { matiere: 'maths', date: '2026-11-05', chapitres: ['theoreme-de-pythagore'] })).contenu).toMatch(/déjà dans l'agenda \(id c1\)/)
    expect((await o.executer('proposer_controle', { matiere: 'svt', date: '2026-11-10', chapitres: [] })).erreur).toBe(true)
  })

  it('proposer_revision : chapitre, erreurs, contrôle blanc, et deux cartes au plus', async () => {
    const o = outils()
    const flash = await o.executer('proposer_revision', { format: 'flashcards', chapitre: 'theoreme-de-pythagore' })
    expect(flash.carte).toMatchObject({ format: 'flashcards', chapitre: { id: 'theoreme-de-pythagore' }, classe: '4ème', programme: 'Maths' })
    const err = await o.executer('proposer_revision', { format: 'erreurs', chapitre: 'theoreme-de-pythagore' })
    expect(err.carte).toMatchObject({ format: 'erreurs', lessonId: 'prog-theoreme-de-pythagore', sous: 'Racine carrée et théorème de Pythagore · 1 question' })
    expect((await o.executer('proposer_revision', { format: 'controle_blanc', controle: 'c1' })).erreur).toBe(true) // 3e carte
    expect((await outils().executer('proposer_revision', { format: 'controle_blanc', controle: 'c1' })).carte).toMatchObject({ controleId: 'c1' })
    expect((await outils().executer('proposer_revision', { format: 'controle_blanc', controle: 'c0' })).erreur).toBe(true) // passé
  })

  it('un outil inconnu ou une source qui plante : une erreur lisible, jamais une exception', async () => {
    expect((await outils().executer('effacer_tout', {})).erreur).toBe(true)
    const casse = outils(eleve({ agenda: async () => { throw new Error('réseau') } }))
    expect((await casse.executer('mes_controles', {})).erreur).toBe(true)
  })
})

describe('requête', () => {
  it('outils, calendrier, et plus d’outil au dernier tour', () => {
    const r = buildAgentRequest({ level: { cycle: 'college', classe: '4ème' }, messages: [], aujourdhui: AUJ })
    expect(r.tools).toBe(OUTILS_AGENT)
    expect(r.system).toContain("aujourd'hui : mardi 3 novembre 2026")
    expect(r.tool_choice).toBeUndefined()
    expect(buildAgentRequest({ messages: [], aujourdhui: AUJ, dernierTour: true }).tool_choice).toEqual({ type: 'none' })
    for (const o of OUTILS_AGENT) expect(LIBELLES_OUTILS[o.name]).toBeTruthy()
  })
})
