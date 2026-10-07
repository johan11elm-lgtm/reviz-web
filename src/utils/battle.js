// -------------------------------------------------------
// Réviz — Battle : règles du duel (fonctions pures)
//
// Partagées par l'app (déroulé de la partie, affichage des rounds) et par le
// serveur (api/battle-fin.js recalcule tout avant d'écrire l'aura). Aucune
// dépendance à Firebase. Plan et décisions : docs/plan-battle.md.
//
// Un salon (battles/{code} dans Realtime Database) ressemble à :
//   { etat: 'salon'|'jeu'|'fin'|'abandon', hote: { uid, prenom, present },
//     invite: { … }, chapitre: { classe, matiere, id }, questions: [3, 0, …],
//     round: n, rounds: { n: { debut, reponses: { uid: { choix, ms } } } },
//     abandonPar?: uid }
// -------------------------------------------------------

export const ROUNDS = 5
// La 6e question ne sert qu'en cas d'égalité : la mort subite.
export const QUESTIONS_PAR_PARTIE = ROUNDS + 1

export const CHRONO_MS = 15_000
export const TEMPS_MIN_MS = 300          // en dessous : clic involontaire ou triche
// Une réponse partie juste avant la fin du chrono peut arriver un peu après :
// les règles l'acceptent pendant cette marge, et le round n'est clos qu'après.
export const MARGE_RESEAU_MS = 2_000
export const DECOMPTE_MS = 3_000         // « 3, 2, 1 » avant le premier round
export const REVELATION_MS = 5_000       // résultat du round et correction
export const PAUSE_ROUND_MS = 1_500      // annonce « Round 2 » avant la question
export const RETOUR_MS = 15_000          // délai pour revenir après une coupure
export const ROUNDS_MIN_BONUS_FORFAIT = 3

export const AURA = {
  roundGagne: 20,
  justeTropLent: 0,
  erreur: -10,
  victoire: 30,
  egalite: 10,
}
const AURA_PAR_ISSUE = {
  gagne: AURA.roundGagne,
  juste: AURA.justeTropLent,
  erreur: AURA.erreur,
  absent: AURA.erreur,
}
export const PARTIES_COMPTEES_PAR_JOUR = 5
export const PARTIES_COMPTEES_PAR_ADVERSAIRE = 2

// Sans O/0 ni I/1 : un code qui se dicte et se tape sans hésiter.
export const ALPHABET_CODE = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
export const LONGUEUR_CODE = 4
export const PRENOM_MAX = 20

export function genererCode(random = Math.random) {
  let code = ''
  for (let i = 0; i < LONGUEUR_CODE; i++) code += ALPHABET_CODE[Math.floor(random() * ALPHABET_CODE.length)]
  return code
}

/** « k7 rm » → « K7RM » ; null si ce n'est pas un code possible. */
export function normaliserCode(saisie) {
  const code = String(saisie ?? '').toUpperCase().replace(/[\s-]/g, '')
  if (code.length !== LONGUEUR_CODE) return null
  return [...code].every(c => ALPHABET_CODE.includes(c)) ? code : null
}

/** Prénom affiché à l'adversaire : espaces resserrés, 20 caractères, null si vide. */
export function nettoyerPrenom(saisie) {
  const prenom = String(saisie ?? '').replace(/\s+/g, ' ').trim().slice(0, PRENOM_MAX).trim()
  return prenom || null
}

/** Tire les questions d'une partie (5 + mort subite) parmi celles du chapitre. */
export function tirerQuestions(nbDisponibles, random = Math.random) {
  if (nbDisponibles < QUESTIONS_PAR_PARTIE) {
    throw new Error(`Il faut au moins ${QUESTIONS_PAR_PARTIE} questions, le chapitre en a ${nbDisponibles}.`)
  }
  const pool = Array.from({ length: nbDisponibles }, (_, i) => i)
  for (let i = 0; i < QUESTIONS_PAR_PARTIE; i++) {
    const j = i + Math.floor(random() * (pool.length - i))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  return pool.slice(0, QUESTIONS_PAR_PARTIE)
}

/** Le salon tel que l'hôte l'écrit à la création (l'horodatage est ajouté par le service). */
export function nouveauSalon({ uid, prenom, chapitre, questions }) {
  return {
    etat: 'salon',
    hote: { uid, prenom, present: true },
    chapitre: { classe: chapitre.classe, matiere: chapitre.matiere, id: chapitre.id },
    questions,
  }
}

export function joueursDe(battle) {
  return [battle?.hote?.uid, battle?.invite?.uid].filter(Boolean)
}

export function maintenantServeur(decalage = 0, maintenantLocal = Date.now()) {
  return maintenantLocal + decalage
}

/** Une réponse compte si elle vise un des choix dans le temps du chrono. */
export function reponseValable(reponse, nbChoix = 4) {
  return !!reponse
    && Number.isInteger(reponse.choix) && reponse.choix >= 0 && reponse.choix < nbChoix
    && Number.isFinite(reponse.ms) && reponse.ms >= TEMPS_MIN_MS && reponse.ms <= CHRONO_MS
}

function toutLeMondeARepondu(round, joueurs) {
  return joueurs.length === 2 && joueurs.every(uid => round?.reponses?.[uid])
}

/** Le round est clos : les deux ont répondu, ou le chrono et sa marge sont écoulés. */
export function roundTermine(round, joueurs, maintenant) {
  if (!round?.debut) return false
  return toutLeMondeARepondu(round, joueurs) || maintenant >= round.debut + CHRONO_MS + MARGE_RESEAU_MS
}

/**
 * Instant (horloge serveur) où le round s'est clos. Calculé à partir des
 * seules données, pour que les deux téléphones enchaînent au même moment.
 */
export function finDuRound(round, joueurs) {
  if (toutLeMondeARepondu(round, joueurs)) {
    return round.debut + Math.min(CHRONO_MS, Math.max(...joueurs.map(uid => round.reponses[uid].ms ?? CHRONO_MS)))
  }
  return round.debut + CHRONO_MS + MARGE_RESEAU_MS
}

/**
 * Résout un round : le plus rapide parmi les bonnes réponses le gagne.
 * Bonne réponse plus lente : 0 aura ; erreur ou pas de réponse : −10.
 * Deux bonnes réponses exactement aussi rapides : les deux gagnent le round.
 * @returns {{ gagnant: string|null, issues: Record<string, 'gagne'|'juste'|'erreur'|'absent'>, aura: Record<string, number> }}
 */
export function resoudreRound({ joueurs, correct, reponses = {}, nbChoix = 4 }) {
  const issues = {}
  const justes = []
  for (const uid of joueurs) {
    const reponse = reponses?.[uid]
    if (!reponseValable(reponse, nbChoix)) issues[uid] = 'absent'
    else if (reponse.choix === correct) { issues[uid] = 'juste'; justes.push(uid) }
    else issues[uid] = 'erreur'
  }
  let gagnant = null
  if (justes.length) {
    const meilleur = Math.min(...justes.map(uid => reponses[uid].ms))
    const premiers = justes.filter(uid => reponses[uid].ms === meilleur)
    for (const uid of premiers) issues[uid] = 'gagne'
    if (premiers.length === 1) gagnant = premiers[0]
  }
  const aura = Object.fromEntries(joueurs.map(uid => [uid, AURA_PAR_ISSUE[issues[uid]]]))
  return { gagnant, issues, aura }
}

/**
 * Résout la partie à partir du salon et du quiz du chapitre. Seuls les rounds
 * clos à `maintenant` comptent (par défaut tous : c'est le cas du serveur en
 * fin de partie, qui passe aussi son heure pour ignorer un round pas commencé).
 * @returns {{
 *   rounds: Array<{ n, question, mortSubite, gagnant, issues, aura }>,
 *   scores: Record<string, number>, aura: Record<string, number>,
 *   terminee: boolean, issue: null|'victoire'|'egalite'|'forfait', vainqueur: string|null,
 *   bonus: Record<string, number>,
 * }}
 */
export function resoudrePartie(battle, quiz, maintenant = Infinity) {
  const joueurs = joueursDe(battle)
  const scores = Object.fromEntries(joueurs.map(uid => [uid, 0]))
  const aura = Object.fromEntries(joueurs.map(uid => [uid, 0]))
  const bonus = Object.fromEntries(joueurs.map(uid => [uid, 0]))
  const rounds = []
  const resultat = { rounds, scores, aura, bonus, terminee: false, issue: null, vainqueur: null }
  if (joueurs.length < 2) return resultat
  const [a, b] = joueurs

  for (let n = 1; n <= QUESTIONS_PAR_PARTIE; n++) {
    const mortSubite = n === QUESTIONS_PAR_PARTIE
    if (mortSubite && scores[a] !== scores[b]) break
    const round = battle.rounds?.[n]
    if (!roundTermine(round, joueurs, maintenant)) break
    const question = quiz[battle.questions[n - 1]]
    const res = resoudreRound({
      joueurs, correct: question.correct, reponses: round.reponses, nbChoix: question.choices?.length ?? 4,
    })
    for (const uid of joueurs) {
      aura[uid] += res.aura[uid]
      if (res.issues[uid] === 'gagne') scores[uid]++
    }
    rounds.push({ n, question: battle.questions[n - 1], mortSubite, ...res })
  }

  const joues = rounds.length
  if (battle.abandonPar && joueurs.includes(battle.abandonPar)) {
    resultat.terminee = true
    resultat.issue = 'forfait'
    resultat.vainqueur = battle.abandonPar === a ? b : a
    if (joues >= ROUNDS_MIN_BONUS_FORFAIT) bonus[resultat.vainqueur] = AURA.victoire
  } else if ((joues === ROUNDS && scores[a] !== scores[b]) || joues === QUESTIONS_PAR_PARTIE) {
    resultat.terminee = true
    if (scores[a] === scores[b]) {
      resultat.issue = 'egalite'
      bonus[a] = bonus[b] = AURA.egalite
    } else {
      resultat.issue = 'victoire'
      resultat.vainqueur = scores[a] > scores[b] ? a : b
      bonus[resultat.vainqueur] = AURA.victoire
    }
  }
  for (const uid of joueurs) aura[uid] += bonus[uid]
  return resultat
}

/**
 * Ce que l'hôte doit écrire pour faire avancer la partie, ou null. Tout
 * l'enchaînement se déduit des données : fin du round, révélation, puis
 * round suivant ou fin de partie.
 * @returns {null | { type: 'round', n: number, debut: number } | { type: 'fin' }}
 */
export function prochaineEtape(battle, quiz, maintenant) {
  if (battle?.etat !== 'jeu') return null
  const joueurs = joueursDe(battle)
  const n = battle.round
  const round = battle.rounds?.[n]
  if (!roundTermine(round, joueurs, maintenant)) return null
  if (resoudrePartie(battle, quiz, maintenant).terminee) return { type: 'fin' }
  const debut = Math.max(finDuRound(round, joueurs) + REVELATION_MS + PAUSE_ROUND_MS, maintenant + PAUSE_ROUND_MS)
  return { type: 'round', n: n + 1, debut }
}

/** La partie fait-elle encore bouger l'aura de ce joueur aujourd'hui contre cet adversaire ? */
export function partieComptee(jour, adversaire, date) {
  if (jour?.date !== date) return true
  return (jour.parties ?? 0) < PARTIES_COMPTEES_PAR_JOUR
    && (jour.adversaires?.[adversaire] ?? 0) < PARTIES_COMPTEES_PAR_ADVERSAIRE
}

/**
 * Applique l'aura d'une partie au compte d'un joueur (côté serveur) :
 * plancher à 0, et seulement pour 5 parties par jour dont 2 contre le même adversaire.
 * @param {{ aura?: number, jour?: { date: string, parties: number, adversaires: Record<string, number> } }} compte
 * @returns {{ aura: number, jour: object, comptee: boolean }}
 */
export function appliquerAura(compte, { delta, adversaire, date }) {
  const auraActuelle = compte?.aura ?? 0
  const jour = compte?.jour?.date === date ? compte.jour : { date, parties: 0, adversaires: {} }
  if (!partieComptee(jour, adversaire, date)) return { aura: auraActuelle, jour, comptee: false }
  return {
    aura: Math.max(0, auraActuelle + delta),
    jour: {
      date,
      parties: (jour.parties ?? 0) + 1,
      adversaires: { ...jour.adversaires, [adversaire]: (jour.adversaires?.[adversaire] ?? 0) + 1 },
    },
    comptee: true,
  }
}
