// -------------------------------------------------------
// Réviz — Quand proposer le rappel de 17 h (08/11)
// Demandé à la fin de la première séance, puis à l'ouverture de l'app tant
// que ce n'est pas fait — sans forcer : au plus MAX_DEMANDES fois en tout,
// espacées d'au moins ESPACEMENT_MS. Compté par élève et par appareil.
// -------------------------------------------------------

export const MAX_DEMANDES = 3
export const ESPACEMENT_MS = 3 * 24 * 60 * 60 * 1000

const cle = uid => `reviz-rappel-demande-${uid}`

/** { fois, derniere } : demandes déjà faites sur cet appareil. */
export function lireDemandes(uid) {
  try {
    const d = JSON.parse(localStorage.getItem(cle(uid)) || 'null')
    return { fois: Number.isInteger(d?.fois) ? d.fois : 0, derniere: Number.isFinite(d?.derniere) ? d.derniere : null }
  } catch {
    return { fois: 0, derniere: null }
  }
}

/** Peut-on proposer le rappel maintenant ? */
export function peutDemander(uid, maintenant = Date.now()) {
  if (!uid) return false
  const { fois, derniere } = lireDemandes(uid)
  return fois < MAX_DEMANDES && (derniere == null || maintenant - derniere >= ESPACEMENT_MS)
}

/** Note une demande affichée. */
export function noterDemande(uid, maintenant = Date.now()) {
  if (!uid) return
  const { fois } = lireDemandes(uid)
  try { localStorage.setItem(cle(uid), JSON.stringify({ fois: fois + 1, derniere: maintenant })) } catch { /* stockage indisponible */ }
}

/** États du navigateur où l'on peut proposer quelque chose (voir etatPush). */
export const ETATS_PROPOSABLES = ['proposables', 'installer']
