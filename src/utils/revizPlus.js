// -------------------------------------------------------
// Réviz — Réviz+ côté app : membre fondateur, quotas affichés
// -------------------------------------------------------
import { LANCEMENT_OFFERT, FONDATEURS_JUSQU_AU, FIN_LANCEMENT, VENTES_OUVERTES, lancementOffert } from '../../api/_lancement.js'

const JOUR = 24 * 60 * 60 * 1000

/** Compte créé pendant le lancement (date de création Firebase, chaîne ou ms). */
export function estFondateur(creationTime) {
  const t = typeof creationTime === 'number' ? creationTime : Date.parse(creationTime ?? '')
  if (!Number.isFinite(t)) return false
  if (FONDATEURS_JUSQU_AU) return t < Date.parse(FONDATEURS_JUSQU_AU)
  return LANCEMENT_OFFERT
}

/**
 * Où en est le lancement, pour l'affichage :
 * 'lancement' → 'derniers-jours' (3 derniers jours offerts) → 'payant'.
 * 'prolonge' : la date est passée mais les ventes ne sont pas ouvertes, la
 * gratuité continue ; on n'affiche alors plus de date.
 */
export function phaseRevizPlus(now = Date.now()) {
  if (!lancementOffert(now)) return 'payant'
  if (now >= Date.parse(FIN_LANCEMENT)) return VENTES_OUVERTES ? 'payant' : 'prolonge'
  return now >= Date.parse(FIN_LANCEMENT) - 3 * JOUR ? 'derniers-jours' : 'lancement'
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
// Lundi de la semaine en cours (UTC), comme api/_quota.js et api/_chatQuota.js.
const lundiUTC = () => {
  const d = new Date()
  const j = d.getUTCDay()
  d.setUTCDate(d.getUTCDate() + (j === 0 ? -6 : 1 - j))
  return d.toISOString().slice(0, 10)
}

/**
 * Mémorise le quota du coach renvoyé par le serveur (api/_chatQuota.js) : 10 questions par
 * semaine en gratuit, 50 par jour en Réviz+. `periode` : 'semaine' | 'jour'.
 */
export function memoriserQuotaCoach(remaining, limit, periode = 'jour') {
  if (typeof remaining !== 'number') return
  const quand = periode === 'semaine' ? { semaine: lundiUTC() } : { jour: jourUTC() }
  try { localStorage.setItem(CLE_COACH, JSON.stringify({ remaining, limit, periode, ...quand })) } catch { /* stockage indisponible */ }
}

/** Quota du coach connu pour la période en cours (jour ou semaine), ou null. */
export function quotaCoachDuJour() {
  try {
    const q = JSON.parse(localStorage.getItem(CLE_COACH) || 'null')
    // Sans période : noté avant le passage à 10 par semaine (29/10), plus juste ; le serveur
    // renverra le bon au prochain message.
    if (!q?.periode) return null
    return (q.periode === 'semaine' ? q.semaine === lundiUTC() : q.jour === jourUTC()) ? q : null
  } catch { return null }
}

/** « 26 octobre » (heure de Paris), espace insécable ; '' si la date manque. */
export function dateCourte(ms) {
  if (!Number.isFinite(ms)) return ''
  return new Date(ms).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', timeZone: 'Europe/Paris' }).replace(' ', ' ')
}
