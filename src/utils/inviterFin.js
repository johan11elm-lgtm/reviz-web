// -------------------------------------------------------
// Réviz — « Invite un ami » en fin de séance réussie (11/11) : le parrainage (api/_parrainage.js)
// n'était que dans « Moi ». Proposé après une séance réussie (SEUIL_REUSSITE), au plus une fois
// tous les ESPACEMENT_JOURS jours par appareil, jamais à la séance d'accueil.
// -------------------------------------------------------
export const SEUIL_REUSSITE = 0.7
export const ESPACEMENT_JOURS = 3
const cle = uid => `reviz-invite-fin-${uid}`

export function peutProposerInvitation(uid, score, total, maintenant = Date.now()) {
  if (!uid || !(total > 0) || score / total < SEUIL_REUSSITE) return false
  try {
    const derniere = Number(localStorage.getItem(cle(uid)))
    return !Number.isFinite(derniere) || derniere <= 0 || maintenant - derniere >= ESPACEMENT_JOURS * 86_400_000
  } catch { return false }
}
export function noterInvitationProposee(uid, maintenant = Date.now()) {
  try { localStorage.setItem(cle(uid), String(maintenant)) } catch { /* rien */ }
}
