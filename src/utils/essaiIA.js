// -------------------------------------------------------
// Réviz — Questions d'essai de Réviz IA (e-mail pas encore confirmé)
//
// Un compte e-mail + mot de passe qui n'a pas cliqué le lien de confirmation peut poser
// quelques questions à Réviz IA avant qu'on lui demande de confirmer (comme le scan d'essai).
// Le serveur est seul juge (api/_chatQuota.js) ; l'appli retient ce qu'il a répondu, par
// élève, pour montrer la carte d'activation dès l'ouverture une fois les essais utilisés.
// -------------------------------------------------------

/** Nombre de questions d'essai, au total (jamais remises à zéro). */
export const QUESTIONS_SANS_EMAIL = 3

const cle = uid => `reviz-ia-essai-${uid}`

/**
 * Ce que l'appli sait de l'essai de cet élève.
 * @returns {{ restant: number, fini: boolean }} restant : questions d'essai encore possibles
 */
export function essaiIA(uid) {
  if (!uid) return { restant: QUESTIONS_SANS_EMAIL, fini: false }
  try {
    const n = JSON.parse(localStorage.getItem(cle(uid)) ?? 'null')
    if (Number.isInteger(n) && n >= 0 && n <= QUESTIONS_SANS_EMAIL) return { restant: n, fini: n === 0 }
  } catch { /* stockage indisponible ou valeur illisible */ }
  return { restant: QUESTIONS_SANS_EMAIL, fini: false }
}

/** Le serveur vient de dire combien de questions d'essai il reste (0 : la carte d'activation). */
export function noterEssaiIA(uid, restant) {
  if (!uid || !Number.isInteger(restant) || restant < 0) return
  try { localStorage.setItem(cle(uid), JSON.stringify(Math.min(restant, QUESTIONS_SANS_EMAIL))) } catch { /* stockage indisponible */ }
}
