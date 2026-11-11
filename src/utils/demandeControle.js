// -------------------------------------------------------
// Réviz — Quand demander le prochain contrôle (11/11)
// Un élève qui a noté un contrôle revient trois fois plus le lendemain
// (42 % contre 13 %, relevé du 10/11) : on le lui demande dès la fin de sa
// première séance, puis en fin de séance tant qu'il n'en a aucun à venir —
// sans forcer : au plus MAX_DEMANDES fois d'affilée sans réponse utile,
// espacées d'au moins ESPACEMENT_MS. Un contrôle noté remet le compteur à
// zéro : une fois ce contrôle passé, on redemande le suivant.
// Compté par élève et par appareil.
// -------------------------------------------------------
import { controlesAVenir } from './agenda.js'

export const MAX_DEMANDES = 3
export const ESPACEMENT_MS = 3 * 24 * 60 * 60 * 1000

const cle = uid => `reviz-controle-demande-${uid}`

/** { fois, derniere } : demandes restées sans contrôle noté, sur cet appareil. */
export function lireDemandes(uid) {
  try {
    const d = JSON.parse(localStorage.getItem(cle(uid)) || 'null')
    return { fois: Number.isInteger(d?.fois) ? d.fois : 0, derniere: Number.isFinite(d?.derniere) ? d.derniere : null }
  } catch {
    return { fois: 0, derniere: null }
  }
}

/**
 * Peut-on demander le prochain contrôle maintenant ? Jamais s'il en a déjà un à venir.
 * @param {string|null} uid
 * @param {{ controles?: object[] }|null} agenda
 */
export function peutDemanderControle(uid, agenda, maintenant = Date.now()) {
  if (!uid) return false
  // Les épreuves du brevet (juin) ne comptent pas : on demande quand même le prochain contrôle.
  if (controlesAVenir((agenda?.controles ?? []).filter(c => !c?.brevet)).length) return false
  const { fois, derniere } = lireDemandes(uid)
  return fois < MAX_DEMANDES && (derniere == null || maintenant - derniere >= ESPACEMENT_MS)
}

/** Note une demande affichée. */
export function noterDemandeControle(uid, maintenant = Date.now()) {
  if (!uid) return
  const { fois } = lireDemandes(uid)
  try { localStorage.setItem(cle(uid), JSON.stringify({ fois: fois + 1, derniere: maintenant })) } catch { /* stockage indisponible */ }
}

/** Un contrôle vient d'être noté : le compteur repart de zéro pour le suivant. */
export function noterControleNote(uid) {
  if (!uid) return
  try { localStorage.removeItem(cle(uid)) } catch { /* stockage indisponible */ }
}
