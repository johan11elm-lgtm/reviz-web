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
  if (uid && !isGuestUid(uid)) {
    updateDoc(doc(db, 'users', uid), { 'jeux.jours': arrayUnion(aujourdhui), 'jeux.record': s.record }).catch(() => {})
  }
  return { ...etatDuJour(uid, aujourdhui), nouveauRecord }
}

/** Au démarrage : on reprend les jours et le record gardés sur le compte (autre appareil). */
export async function synchroniserStats(uid) {
  if (!uid || isGuestUid(uid)) return lireStats(uid)
  try {
    const snap = await getDoc(doc(db, 'users', uid))
    const j = snap.data()?.jeux
    if (!j) return lireStats(uid)
    const s = lireStats(uid)
    s.jours = [...new Set([...s.jours, ...(j.jours ?? [])])].sort().slice(-400)
    s.record = Math.max(s.record, j.record ?? 0)
    ecrire(uid, s)
    return s
  } catch {
    return lireStats(uid)
  }
}
