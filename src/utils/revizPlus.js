// -------------------------------------------------------
// Réviz — Réviz+ côté app : membre fondateur, quotas affichés
// -------------------------------------------------------
import { LANCEMENT_OFFERT, FONDATEURS_JUSQU_AU, FIN_LANCEMENT, FIN_GRACE_FONDATEURS } from '../../api/_lancement.js'

const JOUR = 24 * 60 * 60 * 1000

/** Compte créé pendant le lancement (date de création Firebase, chaîne ou ms). */
export function estFondateur(creationTime) {
  const t = typeof creationTime === 'number' ? creationTime : Date.parse(creationTime ?? '')
  if (!Number.isFinite(t)) return false
  if (FONDATEURS_JUSQU_AU) return t < Date.parse(FONDATEURS_JUSQU_AU)
  return LANCEMENT_OFFERT
}

/**
 * Réviz+ offert à ce compte : à tous pendant le lancement, puis aux seuls
 * fondateurs jusqu'à la fin du délai de grâce. Même règle côté serveur
 * (api/_offert.js) et côté app (AuthContext).
 */
export function revizPlusOffertPour(creationTime, now = Date.now()) {
  if (LANCEMENT_OFFERT) return true
  return estFondateur(creationTime) && now < Date.parse(FIN_GRACE_FONDATEURS)
}

/**
 * Où en est la bascule, pour l'affichage :
 * 'lancement' → 'derniers-jours' (3 derniers jours offerts) → 'grace'
 * (payant, fondateurs encore offerts) → 'payant'.
 */
export function phaseRevizPlus(now = Date.now()) {
  if (LANCEMENT_OFFERT) return now >= Date.parse(FIN_LANCEMENT) - 3 * JOUR ? 'derniers-jours' : 'lancement'
  return now < Date.parse(FIN_GRACE_FONDATEURS) ? 'grace' : 'payant'
}

// Jour du calendrier à Paris (minuit UTC de ce jour), insensible au
// changement d'heure du 25 octobre.
function jourParis(ms) {
  const [a, m, j] = new Date(ms).toLocaleDateString('en-CA', { timeZone: 'Europe/Paris' }).split('-').map(Number)
  return Date.UTC(a, m - 1, j)
}

/**
 * Jours restants avant une date ISO, en jours du calendrier à Paris, le jour
 * même compris : 1 le dernier jour, 0 à partir de la date.
 */
export function joursAvant(iso, now = Date.now()) {
  return Math.max(0, Math.round((jourParis(Date.parse(iso)) - jourParis(now)) / JOUR))
}

/** « octobre 2026 » à partir de la date de création du compte. */
export function moisInscription(creationTime) {
  const d = new Date(creationTime ?? NaN)
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
}

const CLE_COACH = 'reviz-coach-quota'
const jourUTC = () => new Date().toISOString().slice(0, 10)

/** Mémorise le quota du coach renvoyé par le serveur (journée UTC, comme api/_chatQuota.js). */
export function memoriserQuotaCoach(remaining, limit) {
  if (typeof remaining !== 'number') return
  try { localStorage.setItem(CLE_COACH, JSON.stringify({ remaining, limit, jour: jourUTC() })) } catch { /* stockage indisponible */ }
}

/** Quota du coach connu pour aujourd'hui, ou null. */
export function quotaCoachDuJour() {
  try {
    const q = JSON.parse(localStorage.getItem(CLE_COACH) || 'null')
    return q && q.jour === jourUTC() ? q : null
  } catch { return null }
}
