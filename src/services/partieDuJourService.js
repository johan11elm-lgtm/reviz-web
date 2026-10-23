// -------------------------------------------------------
// Réviz Games — la partie du jour (23/10)
// Une Partie rapide tirée au sort une fois par jour, la même pour tout le monde
// (on peut comparer son score avec les copains), gratuite pour toujours : c'est
// elle qui porte l'habitude. Elle tient la série de jours de jeu et le record.
// Gardé sur l'appareil (par élève) et recopié dans users/{uid}.jeux pour suivre
// l'élève d'un appareil à l'autre ; un invité ne garde que l'appareil.
// -------------------------------------------------------
import { db } from './firebaseConfig'
import { doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore'
import { isGuestUid } from './guestService'
import { jourParis, ecartJours } from './retourService'

// Un tirage au sort qui ne dépend que du jour (mulberry32 sur un hachage du jour).
function graine(texte) {
  let h = 1779033703 ^ texte.length
  for (let i = 0; i < texte.length; i++) { h = Math.imul(h ^ texte.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19) }
  return () => {
    h |= 0; h = (h + 0x6D2B79F5) | 0
    let t = Math.imul(h ^ (h >>> 15), 1 | h)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Fabrique la partie du jour : `fabriquer` (partieMelangee) est appelée avec un hasard qui ne dépend
 * que du jour. Les générateurs des jeux tirent tous Math.random : on le remplace le temps du tirage
 * (synchrone), puis on le rend.
 */
export function avecHasardDuJour(fabriquer, jour = jourParis()) {
  const vrai = Math.random
  Math.random = graine(`reviz-jeux-${jour}`)
  try { return fabriquer() } finally { Math.random = vrai }
}

const cle = uid => `reviz-jeux-jour-${uid ?? 'anonyme'}`
const vide = () => ({ jours: [], record: 0, scores: {} })

export function lireStats(uid) {
  try { return { ...vide(), ...JSON.parse(localStorage.getItem(cle(uid)) || '{}') } } catch { return vide() }
}
function ecrire(uid, s) {
  try { localStorage.setItem(cle(uid), JSON.stringify(s)) } catch { /* stockage indisponible */ }
}

/** Jours de suite joués, jusqu'à aujourd'hui (ou hier : la série tient tant que la journée n'est pas finie). */
export function serieDe(jours, aujourdhui = jourParis()) {
  const set = new Set(jours)
  let d = set.has(aujourdhui) ? aujourdhui : null
  if (!d) {
    const hier = jourAvant(aujourdhui)
    if (!set.has(hier)) return 0
    d = hier
  }
  let n = 0
  while (set.has(d)) { n += 1; d = jourAvant(d) }
  return n
}
function jourAvant(jour) {
  const t = Date.parse(`${jour}T12:00:00Z`) - 864e5
  return new Date(t).toISOString().slice(0, 10)
}

/** Où en est l'élève aujourd'hui : partie faite ? son score, sa série, son record. */
export function etatDuJour(uid, aujourdhui = jourParis()) {
  const s = lireStats(uid)
  return {
    jour: aujourdhui,
    faite: s.jours.includes(aujourdhui),
    score: s.scores[aujourdhui] ?? null,
    serie: serieDe(s.jours, aujourdhui),
    record: s.record,
    jours: s.jours,
  }
}

/**
 * L'état du jour recalculé pour un autre jour à partir d'un état déjà lu (sans relire le stockage) :
 * un accueil ou un hub restés ouverts après minuit ne gardent pas « Faite ! ». Le score du nouveau jour
 * n'est connu que s'il est déjà dans l'état (sinon null : l'affichage tient sans le score).
 */
export function etatPourLeJour(etat, aujourdhui = jourParis()) {
  if (!etat || etat.jour === aujourdhui) return etat
  const jours = etat.jours ?? []
  return { ...etat, jour: aujourdhui, faite: jours.includes(aujourdhui), score: null, serie: serieDe(jours, aujourdhui) }
}

/** Fin de la partie du jour : le jour compte pour la série, le meilleur score du jour et le record. */
export function enregistrerPartieDuJour(uid, score, aujourdhui = jourParis()) {
  const s = lireStats(uid)
  if (!s.jours.includes(aujourdhui)) s.jours = [...s.jours, aujourdhui].slice(-400)
  s.scores = { ...s.scores, [aujourdhui]: Math.max(score, s.scores[aujourdhui] ?? 0) }
  // On ne garde que les scores des 60 derniers jours.
  for (const j of Object.keys(s.scores)) if (ecartJours(j, aujourdhui) > 60) delete s.scores[j]
  const nouveauRecord = score > s.record
  s.record = Math.max(s.record, score)
  ecrire(uid, s)
  // Vers le compte : on relit d'abord ce qu'il a (un autre appareil a pu jouer), on n'écrit que ce qui
  // lui manque et jamais un record ou un score plus petit. Raté (hors ligne) : repart à la prochaine synchro.
  if (uid && !isGuestUid(uid)) fusionnerAvecCompte(uid, aujourdhui).catch(() => {})
  return { ...etatDuJour(uid, aujourdhui), nouveauRecord }
}

const nombreOk = n => (typeof n === 'number' && Number.isFinite(n) && n >= 0 ? n : 0)

/**
 * Fusionne le local et users/{uid}.jeux dans les deux sens : l'appareil reprend les jours, le record
 * et les scores des 60 derniers jours du compte ; le compte reçoit les jours, le score et le record
 * qu'il n'a pas encore (arrayUnion et maximum, jamais plus petit que ce qu'il a). Lance si la lecture échoue.
 */
async function fusionnerAvecCompte(uid, aujourdhui = jourParis()) {
  const snap = await getDoc(doc(db, 'users', uid))
  const j = snap.data()?.jeux ?? {}
  const compte = { jours: Array.isArray(j.jours) ? j.jours : [], record: nombreOk(j.record), scores: j.scores && typeof j.scores === 'object' ? j.scores : {} }
  const s = lireStats(uid)
  s.jours = [...new Set([...s.jours, ...compte.jours])].sort().slice(-400)
  s.record = Math.max(s.record, compte.record)
  const scores = { ...s.scores }
  for (const [jour, v] of Object.entries(compte.scores)) scores[jour] = Math.max(nombreOk(v), scores[jour] ?? 0)
  for (const jour of Object.keys(scores)) if (ecartJours(jour, aujourdhui) > 60) delete scores[jour]
  s.scores = scores
  ecrire(uid, s)

  const maj = {}
  const joursManquants = s.jours.filter(x => !compte.jours.includes(x))
  if (joursManquants.length) maj['jeux.jours'] = arrayUnion(...joursManquants)
  if (s.record > compte.record) maj['jeux.record'] = s.record
  for (const [jour, v] of Object.entries(scores)) if (v > nombreOk(compte.scores[jour]) || !(jour in compte.scores)) maj[`jeux.scores.${jour}`] = v
  if (Object.keys(maj).length) await updateDoc(doc(db, 'users', uid), maj)
  return s
}

/** Au démarrage : on reprend les jours, le record et les scores du compte (autre appareil), et on lui renvoie les nôtres. */
export async function synchroniserStats(uid, aujourdhui = jourParis()) {
  if (!uid || isGuestUid(uid)) return lireStats(uid)
  try {
    return await fusionnerAvecCompte(uid, aujourdhui)
  } catch {
    return lireStats(uid)
  }
}
