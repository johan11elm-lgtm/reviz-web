// -------------------------------------------------------
// Réviz — Battle en mini-jeux (29/10)
//
// Chaque round d'une Battle est un mini-jeu des exercices en jeu (4 coins,
// intrus, trois indices, définition, vrai ou faux, phrase à trous, quiz) tiré
// du chapitre du salon. L'app et le serveur (api/battle-fin.js) passent par ici
// pour obtenir exactement les mêmes mini-jeux, dans le même ordre.
// -------------------------------------------------------
import { construireDuel, bonneReponseDuel, nbChoixDuel } from './exercicesChapitre.js'

/** Le contenu du chapitre tel que la Battle le lit : sa matière est celle du salon. */
export function contenuDuel(data, chapitre) {
  return { ...data, metadata: { ...(data?.metadata ?? {}), subject: chapitre?.matiere ?? data?.metadata?.subject ?? '' } }
}

/** Les mini-jeux d'un salon, un par round. */
export function exercicesDeLaBattle(data, battle) {
  // La base temps réel peut rendre un tableau sous forme d'objet { 0: 3, 1: 0, … }.
  const q = battle?.questions
  const questions = Array.isArray(q) ? q : Object.keys(q ?? {}).sort((a, b) => a - b).map(k => q[k])
  return construireDuel(contenuDuel(data, battle?.chapitre), questions)
}

/** Ce que les règles (utils/battle.js) ont besoin de savoir de chaque round : la bonne case et le nombre de cases. */
export function manchesDe(exercices) {
  return (exercices ?? []).map(ex => ({ correct: bonneReponseDuel(ex), nbChoix: nbChoixDuel(ex) }))
}

/** Ce qu'un joueur a répondu, en clair (« Waterloo 1815 », « Vrai »…), ou null. */
export function texteDeChoix(ex, choix) {
  if (!Number.isInteger(choix)) return null
  if (ex.type === 'vraifaux') return choix ? 'Vrai' : 'Faux'
  if (ex.type === 'coins') return ex.coins[choix] ?? null
  if (ex.type === 'intrus') return ex.cartes[choix] ?? null
  if (ex.type === 'phrase') return ex.mots[choix] ?? null
  return ex.choix?.[choix] ?? null
}
