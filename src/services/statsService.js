// -------------------------------------------------------
// Réviz — Compteur d'usage anonyme (côté client)
// Envoie un événement à /api/track, qui n'additionne que des totaux par
// jour : aucun identifiant, rien n'est stocké sur l'appareil. Ne lève
// jamais d'erreur et n'attend jamais : un compteur perdu est sans gravité.
// -------------------------------------------------------
import { apiFetch, IS_NATIVE } from './apiClient'
import { GUEST_KEY } from './guestService'
import { INTERNE } from './interne'
import { normaliserCode } from '../utils/codesVideo'

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

/** Code de la vidéo d'origine (`&v=vf6`, voir utils/codesVideo.js), ou null. */
export function readCodeVideo(search) {
  try { return normaliserCode(new URLSearchParams(search ?? window.location.search).get('v')) }
  catch { return null }
}

let VIA = readVia()
let CODE = readCodeVideo()

/**
 * Provenance fixée en cours de route : l'adresse courte /v/<code> la connaît
 * avant de rediriger vers l'essai (la page n'est pas rechargée).
 */
export function setProvenance(via, code) {
  VIA = via || null
  CODE = normaliserCode(code)
}

// Événements aussi envoyés à PostHog (entonnoir par vidéo, dans la journée :
// le hash sans cookie de PostHog change chaque jour). Mêmes propriétés que
// le compteur : des listes fermées, rien qui identifie l'élève.
const POSTHOG_EVENTS = ['essai_demarre', 'chapitre_ouvert', 'quiz_termine', 'compte_cree']
let posthog = null
let enAttente = []

/** Appelé par main.jsx une fois PostHog chargé : vide la file d'attente. */
export function brancherPosthog(ph) {
  posthog = ph
  for (const [e, p] of enAttente) { try { ph.capture(e, p) } catch { /* jamais bloquant */ } }
  enAttente = []
}

function versPosthog(event, props) {
  if (!POSTHOG_EVENTS.includes(event)) return
  if (posthog) { try { posthog.capture(event, props) } catch { /* jamais bloquant */ } }
  else if (enAttente.length < 20) enAttente.push([event, props])
}

function mode() {
  try { return localStorage.getItem(GUEST_KEY) ? 'essai' : 'compte' }
  catch { return 'compte' }
}

/**
 * @param {'essai_demarre'|'compte_cree'|'programme_ouvert'|'chapitre_ouvert'|'revision'|'quiz_termine'
 *   |'battle_creee'|'battle_rejointe'|'battle_terminee'|'battle_revanche'|'battle_compte_propose'|'battle_annonce_cta'
 *   |'installer_ouvert'|'app_installee'|'consent_envoye'|'consent_plus_tard'} event
 * @param {object} [props]  classe, matiere, format, source, joueur, issue, plateforme, via, v (listes fermées côté serveur)
 */
export function track(event, props = {}) {
  if (import.meta.env.MODE === 'test' || INTERNE) return
  try {
    const all = { mode: mode(), device: device(), ...(VIA ? { via: VIA } : {}), ...(CODE ? { v: CODE } : {}), ...props }
    versPosthog(event, all)
    const body = JSON.stringify({ event, props: all })
    apiFetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => {})
  } catch { /* jamais bloquant */ }
}
