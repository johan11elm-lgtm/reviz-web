// -------------------------------------------------------
// Réviz — Réviz+ côté app : membre fondateur, quotas affichés
// -------------------------------------------------------
import { LANCEMENT_OFFERT, FONDATEURS_JUSQU_AU } from '../../api/_lancement.js'

/** Compte créé pendant le lancement (date de création Firebase, chaîne ou ms). */
export function estFondateur(creationTime) {
  const t = typeof creationTime === 'number' ? creationTime : Date.parse(creationTime ?? '')
  if (!Number.isFinite(t)) return false
  if (FONDATEURS_JUSQU_AU) return t < Date.parse(FONDATEURS_JUSQU_AU)
  return LANCEMENT_OFFERT
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
