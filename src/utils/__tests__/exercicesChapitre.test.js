import { describe, it, expect } from 'vitest'
import { construireSeance, lirePointDate, creerAlea, normaliser } from '../exercicesChapitre'

const branche = (label, children, detail = '') => ({ label, children, detail })
const CHAPITRE = {
  metadata: { title: 'Le Consulat et l’Empire', subject: 'Histoire' },
  flashcards: [{ front: 'Code civil ?', back: '1804' }],
  quiz: [
    { question: 'Quelle bataille marque la fin de l’Empire ?', choices: ['Austerlitz', 'Iéna', 'Waterloo', 'Trafalgar'], correct: 2, explanation: 'Waterloo, 18 juin 1815.' },
    { question: 'Qui crée les préfets ?', choices: ['Bonaparte', 'Louis XVI'], correct: 0, explanation: 'En 1800.' },
    { question: 'Question cassée', choices: ['A'], correct: 3 },
  ],
  resume: {
    keyPoints: [
      '9 novembre 1799 (18 brumaire) : coup d’État, Consulat',
      '1801 : Concordat',
      '1804 : Code civil, sacre le 2 décembre',
      '2 décembre 1805 : victoire d’Austerlitz',
      'Un empire européen sous influence',
    ],
    keyTerms: [
      { term: 'Concordat', def: 'Accord de 1801 entre Bonaparte et le pape' },
      { term: 'Code civil', def: 'Recueil de lois de 1804 qui organise la vie des Français' },
      { term: 'Plébiscite', def: 'Vote par oui ou par non pour approuver un dirigeant' },
      { term: 'Préfet', def: 'Représentant de l’État dans le département' },
    ],
  },
  mindmap: {
    branches: [
      branche('Prise du pouvoir', ['18 brumaire', 'Consulat', 'Constitution de l’an VIII'], 'Bonaparte prend le pouvoir en 1799'),
      branche('Réformes', ['Code civil', 'Préfets', 'Lycées']),
      branche('Empire', ['Sacre 1804', 'Noblesse d’Empire', 'Légion d’honneur']),
      branche('Conquêtes et chute', ['Austerlitz 1805', 'Russie 1812', 'Waterloo 1815']),
    ],
  },
}

describe('lirePointDate', () => {
  it('lit une date en tête de point, avec jour, mois et précision entre parenthèses', () => {
    expect(lirePointDate('9 novembre 1799 (18 brumaire) : coup d’État, Consulat')).toEqual({ annee: 1799, date: '9 novembre 1799', evenement: 'Coup d’État, Consulat' })
    expect(lirePointDate('1801 : Concordat.')).toEqual({ annee: 1801, date: '1801', evenement: 'Concordat' })
    expect(lirePointDate('221 av. J.-C. : Qin Shi Huangdi, premier empereur')).toMatchObject({ annee: -221 })
  })
  it('ignore les points sans date en tête', () => {
    expect(lirePointDate('Chine des Han : 206 av. J.-C. - 220 apr. J.-C.')).toBeNull()
    expect(lirePointDate('Environ 650 millions de personnes ont faim')).toBeNull()
    expect(lirePointDate('Causes : pauvreté, conflits')).toBeNull()
  })
})

describe('construireSeance', () => {
  it('donne 10 exercices variés, sans deux formats identiques d’affilée', () => {
    const s = construireSeance(CHAPITRE, { graine: 42 })
    expect(s).toHaveLength(10)
    const types = new Set(s.map(e => e.type))
    for (const t of ['coins', 'intrus', 'indices', 'definition', 'paires', 'ordre', 'annee', 'qcm']) expect(types.has(t)).toBe(true)
    for (let i = 1; i < s.length; i++) expect(s[i].type).not.toBe(s[i - 1].type)
    expect(new Set(s.map(e => e.id)).size).toBe(10)
  })

  it('la même graine redonne la même séance, une autre graine la mélange', () => {
    const a = construireSeance(CHAPITRE, { graine: 7 })
    expect(construireSeance(CHAPITRE, { graine: 7 })).toEqual(a)
    expect(construireSeance(CHAPITRE, { graine: 8 }).map(e => e.id)).not.toEqual(a.map(e => e.id))
  })

  it('chaque exercice a une bonne réponse cohérente avec ses données', () => {
    for (const graine of [1, 2, 3, 4, 5]) {
      for (const e of construireSeance(CHAPITRE, { graine })) {
        expect(e.consigne).toBeTruthy()
        expect(e.aRetenir?.bonne).toBeTruthy()
        if (e.type === 'coins') {
          expect(e.coins).toHaveLength(4)
          const b = CHAPITRE.mindmap.branches.find(x => x.label === e.coins[e.bonne])
          expect(b.children).toContain(e.carte)
        }
        if (e.type === 'intrus') {
          const theme = CHAPITRE.mindmap.branches.find(x => x.label === e.theme)
          expect(theme.children).not.toContain(e.cartes[e.bonne])
          expect(e.cartes.filter(c => theme.children.includes(c))).toHaveLength(3)
        }
        if (e.type === 'indices') {
          const b = CHAPITRE.mindmap.branches.find(x => x.label === e.choix[e.bonne])
          for (const i of e.indices) expect(b.children).toContain(i)
        }
        if (e.type === 'definition') {
          const k = CHAPITRE.resume.keyTerms.find(x => x.term === e.choix[e.bonne])
          expect(k).toBeTruthy()
          expect(normaliser(e.bulle)).not.toContain(normaliser(k.term))
        }
        if (e.type === 'ordre') {
          const annees = e.bonOrdre.map(i => Number(e.evenements[i].date.match(/\d{4}/)[0]))
          expect([...annees].sort((x, y) => x - y)).toEqual(annees)
        }
        if (e.type === 'annee') {
          expect(e.annee).toBeGreaterThanOrEqual(e.min)
          expect(e.annee).toBeLessThanOrEqual(e.max)
          expect(e.max - e.min).toBeLessThanOrEqual(60)
        }
        if (e.type === 'qcm') expect(e.choix[e.bonne]).toBeTruthy()
      }
    }
  })

  it('cache le mot à trouver dans la définition', () => {
    const ai = { ...CHAPITRE, resume: { ...CHAPITRE.resume, keyTerms: [
      { term: 'Suffrage universel', def: 'Droit de vote accordé à tous : le suffrage est dit universel' },
      { term: 'Égalité', def: 'Principe d’égalité devant la loi' },
    ] } }
    const defs = []
    for (const graine of [1, 2, 3, 4, 5, 6]) defs.push(...construireSeance(ai, { graine }).filter(e => e.type === 'definition'))
    expect(defs.length).toBeGreaterThan(0)
    for (const d of defs) {
      expect(normaliser(d.bulle)).not.toMatch(/suffrage|universel|egalite/)
      expect(d.bulle).toContain('…')
    }
  })

  it('un chapitre sans dates garde les autres formats ; un contenu trop maigre ne donne rien', () => {
    const sansDates = { ...CHAPITRE, resume: { ...CHAPITRE.resume, keyPoints: ['Un point', 'Un autre'] } }
    const types = new Set(construireSeance(sansDates, { graine: 3 }).map(e => e.type))
    expect(types.has('ordre')).toBe(false)
    expect(types.has('annee')).toBe(false)
    expect(types.has('coins')).toBe(true)
    expect(construireSeance({ quiz: CHAPITRE.quiz.slice(0, 2) }, { graine: 1 })).toEqual([])
    expect(construireSeance(null, { graine: 1 })).toEqual([])
  })

  it('écarte les éléments présents dans deux branches', () => {
    const ai = { ...CHAPITRE, mindmap: { branches: [
      branche('A', ['Commun', 'a1', 'a2']), branche('B', ['Commun', 'b1', 'b2']),
      branche('C', ['c1', 'c2', 'c3']), branche('D', ['d1', 'd2', 'd3']),
    ] } }
    for (const graine of [1, 2, 3, 4, 5, 6, 7, 8]) {
      for (const e of construireSeance(ai, { graine })) {
        if (e.type === 'coins') expect(e.carte).not.toBe('Commun')
        if (e.type === 'intrus') expect(e.cartes).not.toContain('Commun')
      }
    }
  })
})

describe('mise en forme', () => {
  it('met une majuscule aux éléments et aux mots-clés, sauf en maths', () => {
    const minuscules = { ...CHAPITRE, mindmap: { branches: CHAPITRE.mindmap.branches.map(b => ({ ...b, children: b.children.map(c => c.toLowerCase()) })) },
      resume: { ...CHAPITRE.resume, keyTerms: CHAPITRE.resume.keyTerms.map(k => ({ ...k, term: k.term.toLowerCase() })) } }
    const textes = ai => construireSeance(ai, { graine: 3 }).flatMap(e => [e.carte, ...(e.cartes ?? []), ...(e.indices ?? []), ...(e.type === 'definition' ? e.choix : [])]).filter(Boolean)
    for (const t of textes(minuscules)) expect(t[0]).toBe(t[0].toUpperCase())
    const maths = { ...minuscules, metadata: { title: 'Fonctions', subject: 'Maths' } }
    expect(textes(maths).some(t => t[0] !== t[0].toUpperCase())).toBe(true)
  })
})

describe('creerAlea', () => {
  it('reste entre 0 et 1 et se répète pour une même graine', () => {
    const a = creerAlea(5), b = creerAlea(5)
    const suite = Array.from({ length: 20 }, () => a())
    expect(suite.every(x => x >= 0 && x < 1)).toBe(true)
    expect(Array.from({ length: 20 }, () => b())).toEqual(suite)
  })
})
