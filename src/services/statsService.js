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

/**
 * Provenance lue une seule fois dans l'adresse d'arrivée (`?via=tiktok` sur
 * /installer, par exemple) et gardée en mémoire le temps de la session : elle
 * accompagne tous les événements suivants (essai, compte, installation) sans
 * rien écrire sur l'appareil. Perdue au rechargement, et c'est voulu.
 * @param {string} [search]  chaîne de requête (par défaut celle de la page)
 */
export function readVia(search) {
  try {
    const s = search ?? window.location.search
    const v = new URLSearchParams(s).get('via')
    return v ? v.trim().toLowerCase().slice(0, 20) || null : null
  } catch { return null }
}

const VIA = readVia()

function mode() {
  try { return localStorage.getItem(GUEST_KEY) ? 'essai' : 'compte' }
  catch { return 'compte' }
}

/**
 * @param {'essai_demarre'|'compte_cree'|'programme_ouvert'|'chapitre_ouvert'|'revision'|'quiz_termine'
 *   |'battle_creee'|'battle_rejointe'|'battle_terminee'|'battle_revanche'|'battle_compte_propose'|'battle_annonce_cta'
 *   |'installer_ouvert'|'app_installee'} event
 * @param {object} [props]  classe, matiere, format, source, joueur, issue, plateforme, via (listes fermées côté serveur)
 */
export function track(event, props = {}) {
  if (import.meta.env.MODE === 'test') return
  try {
    const body = JSON.stringify({ event, props: { mode: mode(), device: device(), ...(VIA ? { via: VIA } : {}), ...props } })
    apiFetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => {})
  } catch { /* jamais bloquant */ }
}
