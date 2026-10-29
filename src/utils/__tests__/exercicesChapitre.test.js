import { describe, it, expect } from 'vitest'
import { construireSeance, lirePointDate, creerAlea, normaliser, lireExercices, lirePassage, reponseAcceptee, lireNombre } from '../exercicesChapitre'

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
    // 8 formats différents au plus, les datés d'abord, puis 2 questions du quiz au moins.
    expect(types.size).toBeGreaterThanOrEqual(8)
    for (const t of ['ordre', 'annee', 'qcm']) expect(types.has(t)).toBe(true)
    expect(s.filter(e => e.type === 'qcm').length).toBeGreaterThanOrEqual(2)
    for (let i = 1; i < s.length; i++) expect(s[i].type).not.toBe(s[i - 1].type)
    expect(new Set(s.map(e => e.id)).size).toBe(10)
  })

  it('les 12 formats sortent tous, d’une séance à l’autre', () => {
    const vus = new Set()
    for (let graine = 1; graine <= 30; graine++) for (const e of construireSeance(CHAPITRE, { graine })) vus.add(e.type)
    expect([...vus].sort()).toEqual(['annee', 'classement', 'coins', 'definition', 'indices', 'intrus', 'memory', 'ordre', 'paires', 'phrase', 'qcm', 'vraifaux'])
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

  it('les nouveaux formats (vrai ou faux, phrase, mémory, classement) tiennent leurs données', () => {
    const termes = CHAPITRE.resume.keyTerms
    const branche = nom => CHAPITRE.mindmap.branches.find(x => x.label === nom)
    for (let graine = 1; graine <= 30; graine++) {
      for (const e of construireSeance(CHAPITRE, { graine })) {
        if (e.type === 'vraifaux') {
          const k = termes.find(x => x.term === e.titre)
          if (k) expect(e.vrai).toBe(e.affirmation === k.def)
          else expect(e.titre).toMatch(/^\d{3,4}$/) // une date
        }
        if (e.type === 'phrase') {
          expect(e.mots).toHaveLength(3)
          const texte = `${e.avant}${e.mots[e.bonne]}${e.apres}`
          expect(CHAPITRE.resume.keyPoints).toContain(texte)
          expect(termes.map(x => x.term)).toContain(e.mots[e.bonne])
        }
        if (e.type === 'memory') {
          expect(e.cartes).toHaveLength(6)
          for (const i of [0, 1, 2]) {
            const deux = e.cartes.filter(c => c.paire === i)
            expect(deux.map(c => c.cote).sort()).toEqual(['definition', 'mot'])
            expect(termes.find(x => x.term === deux.find(c => c.cote === 'mot').texte).def).toBe(deux.find(c => c.cote === 'definition').texte)
          }
        }
        if (e.type === 'classement') {
          expect(e.cartes).toHaveLength(4)
          for (const c of e.cartes) expect(branche(e.dossiers[c.dossier]).children).toContain(c.texte)
          expect(e.cartes.filter(c => c.dossier === 0)).toHaveLength(2)
        }
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

// ── Le bloc `exercices` relu (pilote du 29/10) ──

const cat = (nom, cartes) => ({ nom, detail: `Tout sur ${nom.toLowerCase()}`, cartes })
const RELU = {
  version: 1,
  categories: [
    cat('Prendre le pouvoir', ['Le coup d’État du 18 brumaire', 'La Constitution de l’an VIII', 'Bonaparte Premier consul', 'Le plébiscite de 1800', 'Les trois consuls']),
    cat('Réorganiser la France', ['La création des préfets', 'Le Code civil de 1804', 'La création des lycées', 'La Banque de France', 'Le franc germinal']),
    cat('Un empereur sacré', ['Le sacre à Notre-Dame', 'La noblesse d’Empire', 'La Légion d’honneur', 'Le catéchisme impérial', 'La cour impériale']),
    cat('Conquérir l’Europe', ['La victoire d’Austerlitz', 'La campagne de Russie', 'Le Blocus continental', 'La défaite de Waterloo', 'Le Grand Empire']),
  ],
  causes: [
    { fait: 'la chute de l’Empire', carte: 'La retraite de Russie', role: 'cause', explication: 'La Grande Armée y est détruite.' },
    { fait: 'la chute de l’Empire', carte: 'Le retour des Bourbons', role: 'consequence', explication: 'Louis XVIII monte sur le trône.' },
  ],
  etiquettes: [
    { consigne: 'Quelle est la nature du mot en couleur ?', texte: 'Le Code civil [protège] la propriété.', choix: ['Nom', 'Verbe', 'Adjectif'], bonne: 1, explication: 'Protège est un verbe conjugué.' },
    { consigne: 'Mal formé', texte: 'Pas de crochets ici', choix: ['A', 'B'], bonne: 0 },
  ],
  devinettes: [
    { reponse: 'Napoléon Bonaparte', acceptees: ['Napoléon', 'Bonaparte'], indices: ['Je suis né en Corse.', 'Je deviens Premier consul en 1799.', 'Je me fais sacrer empereur en 1804.'], explication: 'Napoléon Ier.' },
    { reponse: 'Waterloo', indices: ['Je suis une bataille.', 'Waterloo, 1815.'] },
  ],
  calculs: [
    { question: 'Le Consulat dure de 1799 à 1804. Combien d’années ?', reponse: 5, unite: 'ans', tolerance: 0, explication: '1804 − 1799 = 5.' },
    { question: 'Une armée parcourt 36 km en 2 jours. Combien de km par jour ?', reponse: 18, unite: 'km', tolerance: 0, explication: '36 ÷ 2 = 18.' },
    { question: 'Réponse cassée', reponse: '12' },
  ],
  etapes: [{ titre: 'L’ascension de Bonaparte', etapes: ['Général en Italie', 'Coup d’État de brumaire', 'Premier consul', 'Empereur des Français'] }],
}

describe('lireExercices', () => {
  it('garde les éléments bien formés et écarte les autres', () => {
    const ex = lireExercices(RELU)
    expect(ex.categories).toHaveLength(4)
    expect(ex.etiquettes).toHaveLength(1) // sans passage entre crochets
    expect(ex.devinettes).toHaveLength(1) // un indice contient la réponse
    expect(ex.calculs).toHaveLength(2) // réponse en texte
    expect(lireExercices({ categories: [cat('Seule', ['a', 'b'])] })).toBeNull()
    expect(lireExercices(null)).toBeNull()
  })
  it('lit le passage entre crochets', () => {
    expect(lirePassage('Le chien ronge [un os] sous la table.')).toEqual({ avant: 'Le chien ronge ', passage: 'un os', apres: ' sous la table.' })
    expect(lirePassage('[a] et [b]')).toBeNull()
  })
})

describe('séance avec un bloc relu', () => {
  const ai = { ...CHAPITRE, exercices: RELU }
  it('les catégories relues remplacent la carte mentale', () => {
    const cartes = RELU.categories.flatMap(c => c.cartes)
    for (let graine = 1; graine <= 20; graine++) {
      for (const e of construireSeance(ai, { graine })) {
        if (e.type === 'coins') { expect(cartes).toContain(e.carte); expect(RELU.categories[RELU.categories.findIndex(c => c.nom === e.coins[e.bonne])].cartes).toContain(e.carte) }
        if (e.type === 'intrus') expect(cartes).toContain(e.cartes[e.bonne])
        if (e.type === 'selection') {
          const c = RELU.categories.find(x => x.nom === e.theme)
          expect(e.cartes).toHaveLength(6)
          for (const k of e.cartes) expect(c.cartes.includes(k.texte)).toBe(k.bonne)
        }
      }
    }
  })
  it('les nouveaux formats sortent tous, avec des données cohérentes', () => {
    const vus = new Set()
    for (let graine = 1; graine <= 40; graine++) {
      const s = construireSeance(ai, { graine })
      expect(s).toHaveLength(10)
      for (let i = 1; i < s.length; i++) expect(s[i].type).not.toBe(s[i - 1].type)
      for (const e of s) {
        vus.add(e.type)
        if (e.type === 'cause') expect(e.choix[e.bonne]).toBe(RELU.causes.find(c => c.carte === e.carte).role === 'cause' ? 'Cause' : 'Conséquence')
        if (e.type === 'etiquette') { expect(e.passage).toBe('protège'); expect(e.choix[e.bonne]).toBe('Verbe') }
        if (e.type === 'calcul') expect([5, 18]).toContain(e.reponse)
        if (e.type === 'etapes') expect(e.bonOrdre.map(i => e.evenements[i].texte)).toEqual(RELU.etapes[0].etapes)
        if (e.type === 'definition') expect(e.choix).toHaveLength(3)
      }
    }
    for (const t of ['selection', 'cause', 'etiquette', 'devinette', 'calcul', 'etapes']) expect(vus.has(t)).toBe(true)
  })
  it('sans bloc relu, pas de sélection (elle serait ambiguë avec la carte mentale)', () => {
    for (let graine = 1; graine <= 20; graine++) expect(construireSeance(CHAPITRE, { graine }).some(e => e.type === 'selection')).toBe(false)
  })
})

describe('réponses tapées', () => {
  const d = { reponse: 'Napoléon Bonaparte', acceptees: ['Napoléon', 'Bonaparte'] }
  it('Qui suis-je ? : sans casse, accents, article, et une faute de frappe pardonnée', () => {
    for (const s of ['napoleon bonaparte', 'NAPOLÉON', 'Bonaparte', ' le Napoléon ', 'Napoleon Bonaprte']) expect(reponseAcceptee(s, d)).toBe(true)
    for (const s of ['', 'Louis XVI', 'Napo']) expect(reponseAcceptee(s, d)).toBe(false)
    expect(reponseAcceptee('l’apartheid', { reponse: 'Apartheid' })).toBe(true)
  })
  it('Trouve le nombre : virgule, signe moins et espaces', () => {
    expect(lireNombre('12,5')).toBe(12.5)
    expect(lireNombre('−3')).toBe(-3)
    expect(lireNombre('1 200')).toBe(1200)
    expect(lireNombre('12,')).toBeNull()
    expect(lireNombre('abc')).toBeNull()
  })
})

describe('mise en forme', () => {
  it('met une majuscule aux éléments et aux mots-clés, sauf en maths', () => {
    const minuscules = { ...CHAPITRE, mindmap: { branches: CHAPITRE.mindmap.branches.map(b => ({ ...b, children: b.children.map(c => c.toLowerCase()) })) },
      resume: { ...CHAPITRE.resume, keyTerms: CHAPITRE.resume.keyTerms.map(k => ({ ...k, term: k.term.toLowerCase() })) } }
    // Les cartes du Classement et du Mémory sont des objets { texte } ; celles du Mémory comptent aussi les définitions, laissées telles quelles.
    const textes = ai => construireSeance(ai, { graine: 3 }).flatMap(e => [e.carte, ...(e.type === 'memory' ? [] : (e.cartes ?? []).map(c => c.texte ?? c)), ...(e.indices ?? []), ...(e.type === 'definition' ? e.choix : [])]).filter(Boolean)
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

describe('séance relue en maths et en physique', () => {
  it('deux calculs à chaque séance', () => {
    const ai = { ...CHAPITRE, metadata: { title: 'Thalès', subject: 'Maths' }, exercices: RELU }
    for (let graine = 1; graine <= 20; graine++) expect(construireSeance(ai, { graine }).filter(e => e.type === 'calcul')).toHaveLength(2)
  })
})
