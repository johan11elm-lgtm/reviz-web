// -------------------------------------------------------
// Réviz — Envoi de la demande de consentement parental
// L'uid est dérivé côté serveur du token Firebase (jamais envoyé en clair).
// -------------------------------------------------------
import { auth } from './firebaseConfig'

const ERROR_MESSAGES = {
  PARENT_EMAIL_IS_CHILD: "Utilise l'adresse d'un parent, pas la tienne.",
  INVALID_PARENT_EMAIL:  'Adresse email invalide.',
  RATE_LIMITED:          'Un email vient déjà d\'être envoyé. Patiente une minute avant de réessayer.',
  UNAUTHORIZED:          'Ta session a expiré. Reconnecte-toi puis réessaie.',
}

export function consentErrorMessage(code) {
  return ERROR_MESSAGES[code] ?? 'Impossible d\'envoyer l\'email. Réessaie.'
}

/**
 * Envoie la demande de consentement parental.
 * @returns {Promise<{ok:boolean, alreadyApproved?:boolean}>}
 * @throws {Error} avec un code serveur (PARENT_EMAIL_IS_CHILD, RATE_LIMITED, …)
 */
export async function sendParentalConsent(parentEmail, childName) {
  const idToken = await auth.currentUser?.getIdToken().catch(() => null)
  if (!idToken) throw new Error('UNAUTHORIZED')

  const res = await fetch('/api/send-parental-consent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken, parentEmail, childName }),
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || `HTTP_${res.status}`)
  }
  return res.json().catch(() => ({ ok: true }))
}
