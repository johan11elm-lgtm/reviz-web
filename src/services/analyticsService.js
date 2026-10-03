// -------------------------------------------------------
// Réviz — Mesure d'audience (PostHog) soumise au consentement
//
// Public mineur : rien ne se charge, rien ne s'écrit (ni cookie, ni
// localStorage PostHog) tant que l'élève n'a pas dit « oui ». Le refus
// est aussi simple que l'accord (bannière à deux boutons égaux) et le
// choix se change à tout moment dans Réglages (CNIL, lignes directrices
// cookies & traceurs ; RGPD art. 7-3).
//
// Ce qui est mesuré quand c'est accepté : pages vues et quelques
// événements explicites (trackEvent). Pas d'autocapture, pas
// d'enregistrement de session, pas d'adresse IP, hébergement UE.
// -------------------------------------------------------

export const CONSENT_KEY = 'reviz-analytics-consent'
export const CONSENT_EVENT = 'reviz:analytics-consent'

const GRANTED = 'granted'
const DENIED = 'denied'

let posthogInstance = null
let loading = null

function storage() {
  try { return globalThis.localStorage ?? null } catch { return null }
}

/** @returns {'granted'|'denied'|null} null = pas encore choisi */
export function getAnalyticsConsent() {
  let v = null
  try { v = storage()?.getItem(CONSENT_KEY) ?? null } catch { v = null }
  return v === GRANTED || v === DENIED ? v : null
}

export function hasAnalyticsConsent() {
  return getAnalyticsConsent() === GRANTED
}

export function analyticsConfigured() {
  return Boolean(import.meta.env.VITE_POSTHOG_KEY)
}

/** La bannière doit-elle s'afficher ? (aucun choix enregistré et mesure configurée) */
export function needsAnalyticsChoice() {
  return analyticsConfigured() && getAnalyticsConsent() === null
}

/**
 * Enregistre le choix et l'applique tout de suite : chargement de PostHog
 * si accepté, arrêt + purge si refusé. Notifie les écrans ouverts.
 * @param {boolean} granted
 */
export function setAnalyticsConsent(granted) {
  const value = granted ? GRANTED : DENIED
  try { storage()?.setItem(CONSENT_KEY, value) } catch { /* stockage indisponible : le choix vaut pour la session */ }
  if (granted) initAnalytics()
  else shutdownAnalytics()
  try { globalThis.dispatchEvent?.(new CustomEvent(CONSENT_EVENT, { detail: value })) } catch { /* env sans CustomEvent */ }
}

/** Abonne un écran aux changements de consentement. Renvoie la fonction de désabonnement. */
export function onAnalyticsConsentChange(cb) {
  const handler = (e) => cb(e.detail ?? getAnalyticsConsent())
  globalThis.addEventListener?.(CONSENT_EVENT, handler)
  return () => globalThis.removeEventListener?.(CONSENT_EVENT, handler)
}

/**
 * Charge et initialise PostHog — seulement si consenti et configuré.
 * Idempotent : un seul chargement, les appels suivants renvoient l'instance.
 * @returns {Promise<object|null>} l'instance PostHog, ou null si rien n'est chargé
 */
export function initAnalytics() {
  if (!hasAnalyticsConsent() || !analyticsConfigured()) return Promise.resolve(null)
  if (posthogInstance) {
    // Réactivation après un refus dans la même session.
    try { posthogInstance.opt_in_capturing?.() } catch { /* ignore */ }
    return Promise.resolve(posthogInstance)
  }
  if (loading) return loading
  loading = import('posthog-js').then(({ default: posthog }) => {
    // Le consentement a pu être retiré pendant le chargement du chunk.
    if (!hasAnalyticsConsent()) { loading = null; return null }
    posthog.init(import.meta.env.VITE_POSTHOG_KEY, {
      api_host: 'https://eu.i.posthog.com',
      // Pages vues à chaque changement de route (SPA React Router).
      capture_pageview: 'history_change',
      capture_pageleave: true,
      // Minimisation (public mineur) : rien d'automatique au-delà des pages.
      autocapture: false,
      disable_session_recording: true,
      disable_surveys: true,
      person_profiles: 'identified_only',
      // Pas de cookie : identifiant anonyme en localStorage uniquement.
      persistence: 'localStorage',
      // Adresse IP non conservée.
      ip: false,
    })
    posthogInstance = posthog
    return posthog
  }).catch(() => { loading = null; return null })
  return loading
}

/** Retrait du consentement : arrêt de la capture et purge de l'identifiant. */
export function shutdownAnalytics() {
  if (!posthogInstance) return
  try {
    posthogInstance.opt_out_capturing?.()
    posthogInstance.reset?.()
  } catch { /* instance déjà arrêtée */ }
}

/**
 * Événement produit (ex. 'scan_done', 'quiz_finished'). Sans consentement
 * ou sans PostHog chargé : no-op silencieux.
 */
export function trackEvent(name, props = {}) {
  if (!posthogInstance || !hasAnalyticsConsent()) return
  try { posthogInstance.capture(name, props) } catch { /* jamais bloquant */ }
}

/** Pour les tests : remet l'état du module à zéro. */
export function _resetAnalyticsForTests() {
  posthogInstance = null
  loading = null
}
