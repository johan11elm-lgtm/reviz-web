// Battle contre l'émulateur Realtime Database (npm run test:emulateur) :
// les règles de database.rules.json, puis des parties complètes jouées par
// deux élèves simulés avec battleService.js.
import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import { initializeApp, deleteApp } from 'firebase/app'
import { getDatabase, connectDatabaseEmulator, ref, get, set, update, remove, goOffline } from 'firebase/database'
import {
  creerBattle, rejoindreBattle, lireSalon, lancerPartie, repondre, avancer, declarerAbandon, ecouterBattle, quitterBattle,
  lancerRevanche,
} from '../battleService'
import { prochaineEtape, resoudrePartie, nouveauSalon, AURA } from '../../utils/battle'

const NS = 'demo-reviz-default-rtdb'
const EMU = { host: '127.0.0.1', port: 9000 }
const apps = []

// Un élève connecté (uid) ou anonyme (null), chacun avec sa propre connexion.
function eleve(uid) {
  const app = initializeApp({ projectId: 'demo-reviz', apiKey: 'demo', databaseURL: `https://${NS}.firebaseio.com` }, `eleve-${apps.length}`)
  apps.push(app)
  const db = getDatabase(app)
  connectDatabaseEmulator(db, EMU.host, EMU.port, uid ? { mockUserToken: { sub: uid, user_id: uid } } : undefined)
  return { db, uid }
}

// Écritures « admin » qui contournent les règles, pour préparer un état.
async function admin(methode, chemin, valeur) {
  const res = await fetch(`http://${EMU.host}:${EMU.port}/${chemin}.json?ns=${NS}`, {
    method: methode, headers: { Authorization: 'Bearer owner' }, body: valeur === undefined ? undefined : JSON.stringify(valeur),
  })
  if (!res.ok) throw new Error(`${methode} ${chemin} : ${res.status}`)
}

const refuse = promesse => expect(promesse).rejects.toThrow(/permission/i)
const attendre = ms => new Promise(r => setTimeout(r, ms))
const graine = (s = 3) => () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646

const CHAPITRE = { classe: '3eme', matiere: 'mathematiques', id: 'theoreme-de-thales' }
// Bonne réponse de la question i : i % 4
const QUIZ = Array.from({ length: 7 }, (_, i) => ({ question: `Q${i}`, choices: ['a', 'b', 'c', 'd'], correct: i % 4 }))

// Salon prêt à jouer, écrit directement (hôte « h », invité « i », round 1 en cours).
async function salonEnJeu(code = 'JEUX', debut = Date.now()) {
  await admin('PUT', `battles/${code}`, {
    ...nouveauSalon({ uid: 'h', prenom: 'Hôte', chapitre: CHAPITRE, questions: [0, 1, 2, 3, 4, 5] }),
    creeLe: Date.now() - 1000,
    etat: 'jeu',
    invite: { uid: 'i', prenom: 'Invité', present: true },
    round: 1,
    rounds: { 1: { debut } },
  })
  return code
}

beforeEach(() => admin('DELETE', ''))
afterAll(() => Promise.all(apps.map(app => deleteApp(app))))

describe('règles — création et lecture du salon', () => {
  it('l’hôte crée un salon, un autre ne peut pas l’écraser', async () => {
    const hote = eleve('h')
    const code = await creerBattle(hote, { prenom: 'Johan', chapitre: CHAPITRE, nbQuestions: 7, random: graine() })
    expect(code).toMatch(/^[A-HJ-NP-Z2-9]{4}$/)
    const autre = eleve('x')
    await refuse(set(ref(autre.db, `battles/${code}`), {
      ...nouveauSalon({ uid: 'x', prenom: 'X', chapitre: CHAPITRE, questions: [0, 1, 2, 3, 4, 5] }), creeLe: Date.now() - 10,
    }))
  })

  it('refuse un salon créé au nom d’un autre, déjà rempli, hors code ou sans connexion', async () => {
    const base = { ...nouveauSalon({ uid: 'h', prenom: 'H', chapitre: CHAPITRE, questions: [0, 1, 2, 3, 4, 5] }), creeLe: Date.now() - 10 }
    await refuse(set(ref(eleve('x').db, 'battles/ABCD'), base))
    await refuse(set(ref(eleve('h').db, 'battles/ABCD'), { ...base, round: 1 }))
    await refuse(set(ref(eleve('h').db, 'battles/ABCD'), { ...base, invite: { uid: 'i', prenom: 'I', present: true } }))
    await refuse(set(ref(eleve('h').db, 'battles/AB0D'), base))
    await refuse(set(ref(eleve('h').db, 'battles/ABCD'), { ...base, aura: 9999 }))
    await refuse(set(ref(eleve(null).db, 'battles/ABCD'), base))
    await set(ref(eleve('h').db, 'battles/ABCD'), base)
  })

  it('un élève connecté voit un salon qui attend, plus après l’arrivée de l’invité', async () => {
    const hote = eleve('h')
    const code = await creerBattle(hote, { prenom: 'Johan', chapitre: CHAPITRE, nbQuestions: 7, random: graine() })
    const curieux = eleve('x')
    expect((await lireSalon(curieux, code)).hote.prenom).toBe('Johan')
    await expect(lireSalon(eleve(null), code)).resolves.toBeNull()
    await rejoindreBattle(eleve('i'), code, 'Léa')
    await expect(lireSalon(curieux, code)).resolves.toBeNull()
    expect((await lireSalon(hote, code)).invite.prenom).toBe('Léa')
  })

  it('rien n’est lisible ni inscriptible hors des salons', async () => {
    await refuse(set(ref(eleve('h').db, 'users/h/aura'), 9999))
    await refuse(get(ref(eleve('h').db, 'battles')))
  })
})

describe('règles — rejoindre, lancer, quitter', () => {
  it('une seule place d’invité, que l’hôte ne peut pas prendre', async () => {
    const hote = eleve('h')
    const code = await creerBattle(hote, { prenom: 'Johan', chapitre: CHAPITRE, nbQuestions: 7, random: graine() })
    await refuse(set(ref(hote.db, `battles/${code}/invite`), { uid: 'h', prenom: 'Moi', present: true }))
    await rejoindreBattle(eleve('i'), code, 'Léa')
    await expect(rejoindreBattle(eleve('z'), code, 'Zoé')).rejects.toMatchObject({ raison: 'introuvable' })
    await refuse(set(ref(eleve('z').db, `battles/${code}/invite`), { uid: 'z', prenom: 'Zoé', present: true }))
  })

  it('seul l’hôte lance, et seulement quand l’invité est là', async () => {
    const hote = eleve('h')
    const code = await creerBattle(hote, { prenom: 'Johan', chapitre: CHAPITRE, nbQuestions: 7, random: graine() })
    await refuse(lancerPartie(hote, code, Date.now()))
    const invite = eleve('i')
    await rejoindreBattle(invite, code, 'Léa')
    await refuse(lancerPartie(invite, code, Date.now()))
    await lancerPartie(hote, code, Date.now())
    const salon = await lireSalon(hote, code)
    expect(salon).toMatchObject({ etat: 'jeu', round: 1 })
  })

  it('l’hôte ferme un salon qui attend ; l’invité ne peut pas le supprimer', async () => {
    const hote = eleve('h')
    const code = await creerBattle(hote, { prenom: 'Johan', chapitre: CHAPITRE, nbQuestions: 7, random: graine() })
    const invite = eleve('i')
    await rejoindreBattle(invite, code, 'Léa')
    await refuse(remove(ref(invite.db, `battles/${code}`)))
    await quitterBattle(hote, code, await lireSalon(hote, code))
    await expect(lireSalon(hote, code)).resolves.toBeNull()
  })
})

describe('règles — réponses et rounds', () => {
  it('chacun répond une fois, pour lui-même, dans les bornes', async () => {
    const code = await salonEnJeu()
    const invite = eleve('i')
    await refuse(set(ref(invite.db, `battles/${code}/rounds/1/reponses/h`), { choix: 0, ms: 900 }))
    await refuse(repondre(invite, code, 1, { choix: 0, ms: 100 }))
    await refuse(repondre(invite, code, 1, { choix: 7, ms: 900 }))
    await refuse(set(ref(invite.db, `battles/${code}/rounds/1/reponses/i`), { choix: 0, ms: 900, triche: true }))
    await repondre(invite, code, 1, { choix: 0, ms: 900 })
    await refuse(repondre(invite, code, 1, { choix: 1, ms: 800 }))
    await refuse(repondre(eleve('x'), code, 1, { choix: 0, ms: 900 }))
  })

  it('personne ne réécrit le salon après coup', async () => {
    const code = await salonEnJeu()
    const hote = eleve('h'), invite = eleve('i')
    await refuse(set(ref(hote.db, `battles/${code}/questions/0`), 3))
    await refuse(set(ref(hote.db, `battles/${code}/chapitre/id`), 'autre'))
    await refuse(set(ref(invite.db, `battles/${code}/hote/prenom`), 'Nul'))
    await refuse(set(ref(hote.db, `battles/${code}/invite/uid`), 'h'))
    await refuse(set(ref(hote.db, `battles/${code}/etat`), 'salon'))
    await avancer(hote, code, { type: 'fin' })
    await refuse(set(ref(hote.db, `battles/${code}/etat`), 'jeu'))
    await refuse(avancer(hote, code, { type: 'round', n: 2, debut: Date.now() + 2000 }))
  })

  it('pas de réponse avant la question ni après le chrono', async () => {
    await salonEnJeu('TARD', Date.now() - 20_000)
    await refuse(repondre(eleve('i'), 'TARD', 1, { choix: 0, ms: 900 }))
    await salonEnJeu('TOTT', Date.now() + 10_000)
    await refuse(repondre(eleve('i'), 'TOTT', 1, { choix: 0, ms: 900 }))
  })

  it('seul l’hôte fait avancer, un round à la fois, à une heure plausible', async () => {
    const code = await salonEnJeu()
    const hote = eleve('h')
    await refuse(avancer(eleve('i'), code, { type: 'round', n: 2, debut: Date.now() + 2000 }))
    await refuse(avancer(hote, code, { type: 'round', n: 3, debut: Date.now() + 2000 }))
    await refuse(avancer(hote, code, { type: 'round', n: 2, debut: Date.now() - 60_000 }))
    await avancer(hote, code, { type: 'round', n: 2, debut: Date.now() + 2000 })
    await refuse(update(ref(hote.db, `battles/${code}`), { 'rounds/2/debut': Date.now() + 5000 }))
    await refuse(avancer(eleve('i'), code, { type: 'fin' }))
    await avancer(hote, code, { type: 'fin' })
  })

  it('revanche : l’hôte seul, une fois la partie finie, et l’invitée la rejoint', async () => {
    const code = await salonEnJeu()
    const hote = eleve('h'), invite = eleve('i')
    const salon = await lireSalon(hote, code)
    await refuse(lancerRevanche(hote, code, salon, { prenom: 'Hôte', nbQuestions: 7, random: graine(2) }))
    await avancer(hote, code, { type: 'fin' })
    await refuse(set(ref(invite.db, `battles/${code}/revanche`), 'ABCD'))
    const nouveau = await lancerRevanche(hote, code, salon, { prenom: 'Hôte', nbQuestions: 7, random: graine(2) })
    expect((await lireSalon(invite, code)).revanche).toBe(nouveau)
    await refuse(set(ref(hote.db, `battles/${code}/revanche`), 'WXYZ'))
    const { salon: rejoint } = await rejoindreBattle(invite, nouveau, 'Invité')
    expect(rejoint).toMatchObject({ etat: 'salon', chapitre: CHAPITRE, invite: { uid: 'i' } })
  })

  it('l’abandon ne se déclare que contre un joueur parti', async () => {
    const code = await salonEnJeu()
    const hote = eleve('h')
    await refuse(declarerAbandon(hote, code, 'i'))
    await refuse(set(ref(hote.db, `battles/${code}/invite/present`), false))
    await set(ref(eleve('i').db, `battles/${code}/invite/present`), false)
    await refuse(declarerAbandon(hote, code, 'h'))
    await declarerAbandon(hote, code, 'i')
    expect(await lireSalon(hote, code)).toMatchObject({ etat: 'abandon', abandonPar: 'i' })
  })
})

describe('parties complètes avec battleService', () => {
  // L'hôte suit le salon et applique prochaineEtape(), comme le fera l'écran de jeu ;
  // pour aller vite, chaque round démarre tout de suite au lieu d'attendre la révélation.
  async function jouer(hote, invite, code, reponsesParRound) {
    let salon = await lireSalon(hote, code)
    let avance = 0
    await lancerPartie(hote, code, Date.now() - 2500)
    for (const [n, [rh, ri]] of reponsesParRound.entries()) {
      const round = n + 1
      salon = await lireSalon(hote, code)
      const q = QUIZ[salon.questions[round - 1]]
      const choix = juste => juste ? q.correct : (q.correct + 1) % 4
      if (rh) await repondre(hote, code, round, { choix: choix(rh[0]), ms: rh[1] })
      if (ri) await repondre(invite, code, round, { choix: choix(ri[0]), ms: ri[1] })
      salon = await lireSalon(hote, code)
      // Un round où quelqu'un n'a pas répondu ne se clôt qu'au bout du chrono :
      // l'horloge virtuelle avance d'une minute et garde cette avance ensuite.
      if (!(rh && ri)) avance += 60_000
      const etape = prochaineEtape(salon, QUIZ, Date.now() + avance)
      if (etape.type === 'fin') { await avancer(hote, code, etape); break }
      expect(etape).toMatchObject({ type: 'round', n: round + 1 })
      await avancer(hote, code, { ...etape, debut: Date.now() - 500 })
    }
    return lireSalon(hote, code)
  }

  it('une partie jouée de bout en bout : l’hôte gagne 3–2', async () => {
    const hote = eleve('h'), invite = eleve('i')
    const code = await creerBattle(hote, { prenom: 'Johan', chapitre: CHAPITRE, nbQuestions: 7, random: graine(11) })
    await rejoindreBattle(invite, ` ${code.toLowerCase()} `, 'Léa')

    const vus = []
    const arreter = ecouterBattle(invite, code, s => s && vus.push(s.etat))

    const salon = await jouer(hote, invite, code, [
      [[true, 1200], [true, 2500]],  // hôte
      [[true, 3000], [true, 1800]],  // invitée
      [[true, 2000], [false, 900]],  // hôte
      [[false, 1500], [true, 4000]], // invitée
      [[true, 5000], [false, 700]],  // hôte
    ])
    arreter()

    expect(salon.etat).toBe('fin')
    expect(vus).toContain('jeu')
    const p = resoudrePartie(salon, QUIZ)
    expect(p).toMatchObject({ terminee: true, issue: 'victoire', vainqueur: 'h', scores: { h: 3, i: 2 } })
    expect(p.aura).toEqual({ h: 20 + 0 + 20 - 10 + 20 + AURA.victoire, i: 0 + 20 - 10 + 20 - 10 })
  })

  it('égalité, mort subite, et victoire de l’invitée', async () => {
    const hote = eleve('h'), invite = eleve('i')
    const code = await creerBattle(hote, { prenom: 'Johan', chapitre: CHAPITRE, nbQuestions: 7, random: graine(5) })
    await rejoindreBattle(invite, code, 'Léa')
    const salon = await jouer(hote, invite, code, [
      [[true, 1000], [false, 900]],
      [[false, 1000], [true, 900]],
      [[false, 1000], [false, 900]],
      [null, null],
      [[false, 1000], [false, 900]],
      [[true, 3000], [true, 2000]],
    ])
    const p = resoudrePartie(salon, QUIZ)
    expect(p.rounds).toHaveLength(6)
    expect(p).toMatchObject({ issue: 'victoire', vainqueur: 'i', scores: { h: 1, i: 2 } })
  })

  it('l’invitée coupe : sa présence tombe toute seule, l’hôte gagne par forfait', async () => {
    const hote = eleve('h'), invite = eleve('i')
    const code = await creerBattle(hote, { prenom: 'Johan', chapitre: CHAPITRE, nbQuestions: 7, random: graine(9) })
    await rejoindreBattle(invite, code, 'Léa')
    await jouer(hote, invite, code, [
      [[true, 1000], [false, 900]],
      [[true, 1000], [false, 900]],
      [[true, 1000], [true, 1500]],
    ])
    goOffline(invite.db)
    // Le serveur applique l'onDisconnect posé à l'arrivée de l'invitée.
    for (let i = 0; i < 20 && (await lireSalon(hote, code)).invite.present; i++) await attendre(100)
    expect((await lireSalon(hote, code)).invite.present).toBe(false)
    await declarerAbandon(hote, code, 'i')
    const p = resoudrePartie(await lireSalon(hote, code), QUIZ, Date.now())
    expect(p).toMatchObject({ terminee: true, issue: 'forfait', vainqueur: 'h' })
    expect(p.bonus.h).toBe(AURA.victoire)
  })
})
