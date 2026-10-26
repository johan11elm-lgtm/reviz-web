// -------------------------------------------------------
// Réviz — Compteur d'usage anonyme (côté client)
// Envoie un événement à /api/track, qui n'additionne que des totaux par
// jour : aucun identifiant, rien n'est stocké sur l'appareil. Seule
// exception, les révisions faites en mode essai portent l'identifiant
// d'essai (voir revisionService) pour compter les élèves qui reviennent.
// Ne lève jamais d'erreur et n'attend jamais : un compteur perdu est sans gravité.
// -------------------------------------------------------
import { apiFetch, IS_NATIVE } from './apiClient'
import { GUEST_KEY } from './guestService'
import { INTERNE } from './interne'
import { mesurer } from './mesure'
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

function mode() {
  try { return localStorage.getItem(GUEST_KEY) ? 'essai' : 'compte' }
  catch { return 'compte' }
}

/**
 * @param {'essai_demarre'|'compte_cree'|'programme_ouvert'|'chapitre_ouvert'|'revision'|'revision_terminee'|'quiz_termine'
 *   |'battle_creee'|'battle_rejointe'|'battle_terminee'|'battle_revanche'|'battle_compte_propose'|'battle_annonce_cta'
 *   |'installer_ouvert'|'app_installee'|'consent_envoye'|'consent_plus_tard'|'scan_reussi'|'scan_erreur'|'ouverture'} event
 * @param {object} [props]  classe, matiere, format, source, joueur, issue, plateforme, via, v, code, anciennete (listes fermées côté serveur)
 * @param {object} [extra]  champs ajoutés au corps de la requête ({ essai } pour une révision d'essai)
 */
export function track(event, props = {}, extra = {}) {
  if (import.meta.env.MODE === 'test' || INTERNE) return
  try {
    const complet = { mode: mode(), device: device(), ...(VIA ? { via: VIA } : {}), ...(CODE ? { v: CODE } : {}), ...props }
    const body = JSON.stringify({ ...extra, event, props: complet })
    // Même événement, mêmes valeurs, vers PostHog : sert aux entonnoirs du jour.
    mesurer(event, complet)
    apiFetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => {})
  } catch { /* jamais bloquant */ }
}

/**
 * Code d'erreur de scan bon à envoyer : seulement un identifiant en
 * MAJUSCULES_SOULIGNÉES (« IMAGE_TOO_LARGE », « API_ERROR_504 »), jamais un
 * message libre qui pourrait citer la leçon.
 * @param {unknown} message
 */
export function scanErrorCode(message) {
  return typeof message === 'string' && /^[A-Z][A-Z0-9_]{2,40}$/.test(message) ? message : 'AUTRE'
}
