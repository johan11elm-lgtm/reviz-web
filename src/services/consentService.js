// -------------------------------------------------------
// Réviz — Envoi de la demande de consentement parental
// L'uid est dérivé côté serveur du token Firebase (jamais envoyé en clair).
// -------------------------------------------------------
import { auth } from './firebaseConfig'
import { apiFetch } from './apiClient.js'

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
 * Envoie la demande de consentement parental. Avec `resultat`
 * ({ score, total, chapitre?: { classe, matiere (slug), id } }), le mail montre
 * aussi au parent le score d'un quiz (carte « Montre ça à tes parents »).
 * @returns {Promise<{ok:boolean, alreadyApproved?:boolean}>}
 * @throws {Error} avec un code serveur (PARENT_EMAIL_IS_CHILD, RATE_LIMITED, …)
 */
export async function sendParentalConsent(parentEmail, childName, resultat = null) {
  const idToken = await auth.currentUser?.getIdToken().catch(() => null)
  if (!idToken) throw new Error('UNAUTHORIZED')

  const res = await apiFetch('/api/send-parental-consent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken, parentEmail, childName, ...(resultat ? { resultat } : {}) }),
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || `HTTP_${res.status}`)
  }
  return res.json().catch(() => ({ ok: true }))
}

/**
 * Le lien que l'élève envoie à son parent par message quand il ne connaît pas
 * son adresse : le parent la saisit lui-même sur la page du lien, puis reçoit
 * l'e-mail d'autorisation habituel (api/_accordParent.js). Avec `resultat`
 * ({ score, total }), la page montre aussi ce score.
 * @returns {Promise<{ lien?: string, alreadyApproved?: boolean }>}
 * @throws {Error} avec un code serveur (UNAUTHORIZED, LIEN_INDISPONIBLE, …)
 */
export async function lienPourParent(resultat = null) {
  const idToken = await auth.currentUser?.getIdToken().catch(() => null)
  if (!idToken) throw new Error('UNAUTHORIZED')

  const res = await apiFetch('/api/send-parental-consent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken, op: 'lien', ...(resultat ? { resultat: { score: resultat.score, total: resultat.total } } : {}) }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || `HTTP_${res.status}`)
  }
  const body = await res.json().catch(() => ({}))
  if (!body.alreadyApproved && !body.lien) throw new Error('LIEN_INDISPONIBLE')
  return body
}

/** Le message que l'élève envoie avec le lien, écrit à sa place (il peut le changer). */
export function messagePourParent(resultat = null) {
  const debut = resultat
    ? `Coucou, j'ai eu ${resultat.score}/${resultat.total} à un quiz sur Réviz, l'appli avec laquelle je révise.`
    : 'Coucou, je révise mes cours avec Réviz.'
  return `${debut} Comme j'ai moins de 15 ans, il faut l'accord d'un parent pour que je garde mon compte. Ça prend une minute :`
}
