import { describe, it, expect } from 'vitest'
import {
  AURA, CHRONO_MS, MARGE_RESEAU_MS, REVELATION_MS, PAUSE_ROUND_MS, QUESTIONS_PAR_PARTIE,
  genererCode, normaliserCode, nettoyerPrenom, tirerQuestions, nouveauSalon,
  reponseValable, roundTermine, finDuRound, resoudreRound, resoudrePartie,
  prochaineEtape, partieComptee, appliquerAura, phaseDeJeu, formaterAura, formaterTemps, lienBattle,
  DECOMPTE_MS,
} from '../battle'

// Générateur pseudo-aléatoire reproductible
const graine = (s = 42) => () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646

// Quiz de 7 questions : la bonne réponse de la question i est i % 4
const QUIZ = Array.from({ length: 7 }, (_, i) => ({ question: `Q${i}`, choices: ['a', 'b', 'c', 'd'], correct: i % 4 }))
const A = 'hote', B = 'invite'

// Salon en cours : questions 0 à 5 dans l'ordre, un round par entrée de `jeu`.
// jeu = [[réponseA, réponseB], …] avec réponse = [choix, ms] ou null
function salon(jeu, extra = {}) {
  const rounds = {}
  jeu.forEach(([ra, rb], i) => {
    const reponses = {}
    if (ra) reponses[A] = { choix: ra[0], ms: ra[1] }
    if (rb) reponses[B] = { choix: rb[0], ms: rb[1] }
    rounds[i + 1] = { debut: 1000 * (i + 1) * 100, reponses }
  })
  return {
    etat: 'jeu', round: jeu.length,
    hote: { uid: A, prenom: 'Johan', present: true },
    invite: { uid: B, prenom: 'Léa', present: true },
    questions: [0, 1, 2, 3, 4, 5], rounds, ...extra,
  }
}
const juste = (n, ms = 2000) => [QUIZ[n].correct, ms]
const faux = n => [(QUIZ[n].correct + 1) % 4, 2000]

describe('codes et prénoms', () => {
  it('génère des codes de 4 caractères sans O, 0, I ni 1', () => {
    const r = graine()
    for (let i = 0; i < 200; i++) {
      const code = genererCode(r)
      expect(code).toMatch(/^[A-HJ-NP-Z2-9]{4}$/)
    }
  })

  it('normalise la saisie et refuse ce qui ne peut pas être un code', () => {
    expect(normaliserCode(' k7 rm ')).toBe('K7RM')
    expect(normaliserCode('k7-r m')).toBe('K7RM')
    expect(normaliserCode('K0RM')).toBeNull()
    expect(normaliserCode('ABC')).toBeNull()
    expect(normaliserCode(null)).toBeNull()
  })

  it('nettoie le prénom affiché à l’adversaire', () => {
    expect(nettoyerPrenom('  Léa   Marie ')).toBe('Léa Marie')
    expect(nettoyerPrenom('x'.repeat(30))).toHaveLength(20)
    expect(nettoyerPrenom('   ')).toBeNull()
  })
})

describe('tirage des questions', () => {
  it('tire 6 questions distinctes du chapitre', () => {
    const q = tirerQuestions(9, graine(7))
    expect(q).toHaveLength(QUESTIONS_PAR_PARTIE)
    expect(new Set(q).size).toBe(QUESTIONS_PAR_PARTIE)
    expect(q.every(i => i >= 0 && i < 9)).toBe(true)
  })

  it('refuse un chapitre trop court', () => {
    expect(() => tirerQuestions(5)).toThrow(/au moins 6/)
  })

  it('le salon de départ ne contient que ce que les règles attendent', () => {
    const s = nouveauSalon({ uid: A, prenom: 'Johan', chapitre: { classe: '3eme', matiere: 'maths', id: 'thales', titre: 'x' }, questions: [1, 2, 3, 4, 5, 6] })
    expect(s).toEqual({
      etat: 'salon',
      hote: { uid: A, prenom: 'Johan', present: true },
      chapitre: { classe: '3eme', matiere: 'maths', id: 'thales' },
      questions: [1, 2, 3, 4, 5, 6],
    })
  })
})

describe('un round', () => {
  const joueurs = [A, B]

  it('le plus rapide parmi les bonnes réponses gagne : +20, le plus lent juste : 0', () => {
    const r = resoudreRound({ joueurs, correct: 2, reponses: { [A]: { choix: 2, ms: 3100 }, [B]: { choix: 2, ms: 2400 } } })
    expect(r.gagnant).toBe(B)
    expect(r.issues).toEqual({ [A]: 'juste', [B]: 'gagne' })
    expect(r.aura).toEqual({ [A]: AURA.justeTropLent, [B]: AURA.roundGagne })
  })

  it('une bonne réponse lente bat une erreur rapide', () => {
    const r = resoudreRound({ joueurs, correct: 1, reponses: { [A]: { choix: 0, ms: 500 }, [B]: { choix: 1, ms: 14000 } } })
    expect(r.gagnant).toBe(B)
    expect(r.aura).toEqual({ [A]: -10, [B]: 20 })
  })

  it('deux erreurs, ou personne à temps : personne ne gagne, −10 chacun', () => {
    expect(resoudreRound({ joueurs, correct: 1, reponses: { [A]: { choix: 0, ms: 900 }, [B]: { choix: 3, ms: 900 } } }))
      .toEqual({ gagnant: null, issues: { [A]: 'erreur', [B]: 'erreur' }, aura: { [A]: -10, [B]: -10 } })
    expect(resoudreRound({ joueurs, correct: 1, reponses: {} }).issues).toEqual({ [A]: 'absent', [B]: 'absent' })
  })

  it('une réponse hors chrono ou hors choix compte comme pas de réponse', () => {
    expect(reponseValable({ choix: 1, ms: CHRONO_MS + 1 })).toBe(false)
    expect(reponseValable({ choix: 1, ms: 100 })).toBe(false)
    expect(reponseValable({ choix: 4, ms: 2000 })).toBe(false)
    expect(reponseValable({ choix: 1.5, ms: 2000 })).toBe(false)
    const r = resoudreRound({ joueurs, correct: 1, reponses: { [A]: { choix: 1, ms: 100 }, [B]: { choix: 1, ms: 5000 } } })
    expect(r.gagnant).toBe(B)
    expect(r.issues[A]).toBe('absent')
  })

  it('deux bonnes réponses au même millième : les deux gagnent le round', () => {
    const r = resoudreRound({ joueurs, correct: 0, reponses: { [A]: { choix: 0, ms: 1500 }, [B]: { choix: 0, ms: 1500 } } })
    expect(r.gagnant).toBeNull()
    expect(r.issues).toEqual({ [A]: 'gagne', [B]: 'gagne' })
  })

  it('se clôt quand les deux ont répondu, sinon après le chrono et la marge réseau', () => {
    const debut = 10_000
    const un = { debut, reponses: { [A]: { choix: 0, ms: 1200 } } }
    expect(roundTermine(un, joueurs, debut + CHRONO_MS)).toBe(false)
    expect(roundTermine(un, joueurs, debut + CHRONO_MS + MARGE_RESEAU_MS)).toBe(true)
    expect(finDuRound(un, joueurs)).toBe(debut + CHRONO_MS + MARGE_RESEAU_MS)
    const deux = { debut, reponses: { [A]: { choix: 0, ms: 1200 }, [B]: { choix: 2, ms: 4300 } } }
    expect(roundTermine(deux, joueurs, debut + 4400)).toBe(true)
    expect(finDuRound(deux, joueurs)).toBe(debut + 4300)
    expect(roundTermine({ reponses: {} }, joueurs, Infinity)).toBe(false)
  })
})

describe('une partie', () => {
  it('3 rounds à 2 : victoire, aura des rounds + 30', () => {
    const p = resoudrePartie(salon([
      [juste(0, 1000), juste(0, 2000)], // A
      [juste(1, 3000), juste(1, 2000)], // B
      [juste(2), faux(2)],              // A
      [faux(3), juste(3)],              // B
      [juste(4, 900), null],            // A
    ]), QUIZ)
    expect(p.terminee).toBe(true)
    expect(p.issue).toBe('victoire')
    expect(p.vainqueur).toBe(A)
    expect(p.scores).toEqual({ [A]: 3, [B]: 2 })
    // A : 20 + 0 + 20 − 10 + 20 + 30 ; B : 0 + 20 − 10 + 20 − 10
    expect(p.aura).toEqual({ [A]: 80, [B]: 20 })
    expect(p.bonus).toEqual({ [A]: 30, [B]: 0 })
  })

  it('égalité après 5 rounds : la partie attend la mort subite', () => {
    const cinq = [
      [juste(0, 1000), juste(0, 2000)],
      [juste(1, 3000), juste(1, 2000)],
      [faux(2), faux(2)],
      [null, null],
      [faux(4), faux(4)],
    ]
    const p = resoudrePartie(salon(cinq), QUIZ)
    expect(p.rounds).toHaveLength(5)
    expect(p.scores).toEqual({ [A]: 1, [B]: 1 })
    expect(p.terminee).toBe(false)
    expect(prochaineEtape(salon(cinq), QUIZ, 1e9)).toMatchObject({ type: 'round', n: 6 })

    const gagnee = resoudrePartie(salon([...cinq, [faux(5), juste(5)]]), QUIZ)
    expect(gagnee.rounds[5].mortSubite).toBe(true)
    expect(gagnee).toMatchObject({ terminee: true, issue: 'victoire', vainqueur: B, scores: { [A]: 1, [B]: 2 } })

    const nulle = resoudrePartie(salon([...cinq, [faux(5), null]]), QUIZ)
    expect(nulle).toMatchObject({ terminee: true, issue: 'egalite', vainqueur: null })
    expect(nulle.bonus).toEqual({ [A]: AURA.egalite, [B]: AURA.egalite })
  })

  it('pas de mort subite quand les scores diffèrent déjà', () => {
    const jeu = [[juste(0), faux(0)], [juste(1), faux(1)], [juste(2), faux(2)], [juste(3), faux(3)], [juste(4), faux(4)], [faux(5), juste(5)]]
    const p = resoudrePartie(salon(jeu), QUIZ)
    expect(p.rounds).toHaveLength(5)
    expect(p.scores).toEqual({ [A]: 5, [B]: 0 })
  })

  it('ne compte que les rounds clos à l’instant donné', () => {
    const s = salon([[juste(0), faux(0)], [juste(1, 1000), null]])
    const debut2 = s.rounds[2].debut
    expect(resoudrePartie(s, QUIZ, debut2 + 3000).rounds).toHaveLength(1)
    expect(resoudrePartie(s, QUIZ, debut2 + CHRONO_MS + MARGE_RESEAU_MS).rounds).toHaveLength(2)
  })

  it('forfait : l’autre gagne, avec le bonus seulement après 3 rounds', () => {
    const trois = [[juste(0), faux(0)], [faux(1), juste(1)], [faux(2), juste(2)]]
    const p = resoudrePartie(salon(trois, { etat: 'abandon', abandonPar: B }), QUIZ)
    expect(p).toMatchObject({ terminee: true, issue: 'forfait', vainqueur: A })
    expect(p.bonus[A]).toBe(AURA.victoire)
    // celui qui part garde ses −10 : on ne fuit pas un round perdu
    expect(p.aura[B]).toBe(-10 + 20 + 20)

    const deux = resoudrePartie(salon(trois.slice(0, 2), { etat: 'abandon', abandonPar: B }), QUIZ)
    expect(deux.vainqueur).toBe(A)
    expect(deux.bonus[A]).toBe(0)
  })

  it('sans invité, rien à résoudre', () => {
    expect(resoudrePartie({ hote: { uid: A }, questions: [] }, QUIZ)).toMatchObject({ terminee: false, rounds: [] })
  })
})

describe('enchaînement des rounds (hôte)', () => {
  it('attend la fin du round, puis programme le suivant après la révélation', () => {
    const s = salon([[juste(0, 1200), null]])
    const debut = s.rounds[1].debut
    expect(prochaineEtape(s, QUIZ, debut + 5000)).toBeNull()
    s.rounds[1].reponses[B] = { choix: 0, ms: 4000 }
    expect(prochaineEtape(s, QUIZ, debut + 4100)).toEqual({
      type: 'round', n: 2, debut: debut + 4000 + REVELATION_MS + PAUSE_ROUND_MS,
    })
  })

  it('ne programme jamais un round dans le passé', () => {
    const s = salon([[null, null]])
    const tard = s.rounds[1].debut + 60_000
    expect(prochaineEtape(s, QUIZ, tard)).toEqual({ type: 'round', n: 2, debut: tard + PAUSE_ROUND_MS })
  })

  it('annonce la fin quand la partie est jouée', () => {
    const s = salon([[juste(0), faux(0)], [juste(1), faux(1)], [juste(2), faux(2)], [juste(3), faux(3)], [juste(4), faux(4)]])
    expect(prochaineEtape(s, QUIZ, Infinity)).toEqual({ type: 'fin' })
  })

  it('ne fait rien hors de la phase de jeu', () => {
    expect(prochaineEtape({ ...salon([]), etat: 'salon' }, QUIZ, Infinity)).toBeNull()
    expect(prochaineEtape(null, QUIZ, Infinity)).toBeNull()
  })
})

describe('aura du compte (serveur)', () => {
  const date = '2026-10-07'

  it('ajoute l’aura de la partie et compte la partie', () => {
    expect(appliquerAura({ aura: 100 }, { delta: 80, adversaire: B, date })).toEqual({
      aura: 180, comptee: true, jour: { date, parties: 1, adversaires: { [B]: 1 } },
    })
  })

  it('ne descend jamais sous 0', () => {
    expect(appliquerAura({ aura: 20 }, { delta: -60, adversaire: B, date }).aura).toBe(0)
    expect(appliquerAura(undefined, { delta: -10, adversaire: B, date }).aura).toBe(0)
  })

  it('au-delà de 2 parties contre le même adversaire, la partie est amicale', () => {
    let compte = { aura: 0 }
    for (let i = 0; i < 2; i++) compte = appliquerAura(compte, { delta: 50, adversaire: B, date })
    const troisieme = appliquerAura(compte, { delta: 50, adversaire: B, date })
    expect(troisieme.comptee).toBe(false)
    expect(troisieme.aura).toBe(100)
    expect(partieComptee(compte.jour, 'autre', date)).toBe(true)
  })

  it('au-delà de 5 parties par jour, plus rien ne bouge ; le lendemain, on repart', () => {
    let compte = { aura: 0 }
    for (const adv of ['a', 'b', 'c', 'd', 'e']) compte = appliquerAura(compte, { delta: 10, adversaire: adv, date })
    expect(partieComptee(compte.jour, 'f', date)).toBe(false)
    expect(appliquerAura(compte, { delta: 10, adversaire: 'f', date }).comptee).toBe(false)
    const demain = appliquerAura(compte, { delta: 10, adversaire: 'f', date: '2026-10-08' })
    expect(demain).toMatchObject({ comptee: true, aura: 60, jour: { parties: 1 } })
  })
})

describe('phase affichée', () => {
  it('salon, puis décompte, question, révélation, annonce du round suivant', () => {
    expect(phaseDeJeu(null, 0)).toEqual({ type: 'ferme' })
    expect(phaseDeJeu({ ...salon([]), etat: 'salon' }, 0)).toEqual({ type: 'salon' })

    const s = salon([[null, null]])
    const d1 = s.rounds[1].debut
    expect(phaseDeJeu(s, d1 - DECOMPTE_MS)).toEqual({ type: 'annonce', n: 1, depart: d1 })
    expect(phaseDeJeu(s, d1 + 100)).toEqual({ type: 'question', n: 1, fin: d1 + CHRONO_MS })
    // chrono écoulé mais marge réseau en cours : la question reste (temps écoulé)
    expect(phaseDeJeu(s, d1 + CHRONO_MS + 500).type).toBe('question')
    expect(phaseDeJeu(s, d1 + CHRONO_MS + MARGE_RESEAU_MS)).toEqual({ type: 'revelation', n: 1 })

    // l'hôte a programmé le round 2 : révélation du 1, puis annonce du 2
    s.round = 2
    const d2 = d1 + CHRONO_MS + MARGE_RESEAU_MS + REVELATION_MS + PAUSE_ROUND_MS
    s.rounds[2] = { debut: d2 }
    expect(phaseDeJeu(s, d2 - PAUSE_ROUND_MS - 1)).toEqual({ type: 'revelation', n: 1 })
    expect(phaseDeJeu(s, d2 - 100)).toEqual({ type: 'annonce', n: 2, depart: d2 })
  })

  it('les deux ont répondu : révélation tout de suite', () => {
    const s = salon([[juste(0, 1200), faux(0)]])
    expect(phaseDeJeu(s, s.rounds[1].debut + 2100)).toEqual({ type: 'revelation', n: 1 })
  })

  it('en fin de partie, la dernière révélation reste affichée avant l’écran de fin', () => {
    const s = { ...salon([[juste(0, 1000), faux(0)]]), etat: 'fin' }
    const fin = s.rounds[1].debut + 2000
    expect(phaseDeJeu(s, fin + REVELATION_MS - 1)).toEqual({ type: 'revelation', n: 1 })
    expect(phaseDeJeu(s, fin + REVELATION_MS)).toEqual({ type: 'fin' })
    expect(phaseDeJeu({ ...s, etat: 'abandon' }, 0)).toEqual({ type: 'fin' })
  })
})

describe('affichage', () => {
  it('formate l’aura avec un vrai signe moins', () => {
    expect(formaterAura(20)).toBe('+20 aura')
    expect(formaterAura(-10)).toBe('−10 aura')
    expect(formaterAura(0)).toBe('0 aura')
  })

  it('formate le temps de réponse à la française', () => {
    expect(formaterTemps(2437)).toBe('2,4 s')
  })

  it('le lien d’invitation pointe toujours vers le site', () => {
    expect(lienBattle('K7RM', 'http://localhost:5173')).toBe('http://localhost:5173/battle/K7RM')
    expect(lienBattle('K7RM', 'capacitor://localhost')).toBe('https://app.revizapp.fr/battle/K7RM')
  })
})
