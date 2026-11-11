// -------------------------------------------------------
// Réviz — Signaler une réponse de Réviz IA, ou une question d'exercice ou de quiz (11/11)
// L'élève signale une réponse fausse, choquante ou hors sujet : elle part
// avec sa question dans signalements/{id} (api/avis.js?op=signalement),
// que Johan relit. Règles 1.2 et 4.7 de l'App Store.
// -------------------------------------------------------
import { auth } from './firebaseConfig.js'
import { apiFetch, IS_NATIVE } from './apiClient.js'

/** @throws {Error} UNAUTHORIZED | NETWORK_ERROR | API_ERROR_xxx */
export async function signalerReponse({ raison, reponse, question, precision, lessonId, type, format }) {
  const idToken = await auth.currentUser?.getIdToken().catch(() => null)
  if (!idToken) throw new Error('UNAUTHORIZED')
  const device = IS_NATIVE ? 'app' : window.matchMedia?.('(pointer: coarse)').matches ? 'mobile' : 'ordinateur'
  let res
  try {
    res = await apiFetch('/api/avis?op=signalement', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken, raison, reponse, question, precision, lessonId, device, type, format }),
    })
  } catch {
    throw new Error('NETWORK_ERROR')
  }
  if (res.status === 401) throw new Error('UNAUTHORIZED')
  if (!res.ok) throw new Error(`API_ERROR_${res.status}`)
}
