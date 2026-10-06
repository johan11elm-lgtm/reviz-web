// -------------------------------------------------------
// Réviz — Compteur d'usage anonyme (côté client)
// Envoie un événement à /api/track, qui n'additionne que des totaux par
// jour : aucun identifiant, rien n'est stocké sur l'appareil. Ne lève
// jamais d'erreur et n'attend jamais : un compteur perdu est sans gravité.
// -------------------------------------------------------
import { apiFetch, IS_NATIVE } from './apiClient'
import { GUEST_KEY } from './guestService'

function device() {
  if (IS_NATIVE) return 'app'
  try { return window.matchMedia('(min-width: 1024px)').matches ? 'ordinateur' : 'mobile' }
  catch { return 'mobile' }
}

function mode() {
  try { return localStorage.getItem(GUEST_KEY) ? 'essai' : 'compte' }
  catch { return 'compte' }
}

/**
 * @param {'essai_demarre'|'compte_cree'|'programme_ouvert'|'chapitre_ouvert'|'revision'|'quiz_termine'} event
 * @param {object} [props]  classe, matiere, format, source (listes fermées côté serveur)
 */
export function track(event, props = {}) {
  if (import.meta.env.MODE === 'test') return
  try {
    const body = JSON.stringify({ event, props: { mode: mode(), device: device(), ...props } })
    apiFetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => {})
  } catch { /* jamais bloquant */ }
}
