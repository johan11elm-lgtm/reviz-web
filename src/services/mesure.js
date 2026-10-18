// -------------------------------------------------------
// Réviz — pont vers PostHog (mesure d'audience sans cookie)
// PostHog se charge après le premier affichage (main.jsx) : les événements
// émis avant sont gardés en file puis rejoués dès qu'il est prêt. Aucun
// identifiant : PostHog est en cookieless_mode 'always', un visiteur n'y est
// qu'un hash du jour. Les valeurs viennent des mêmes listes fermées que le
// compteur /api/track (classe, matière, source…), jamais de texte libre.
// -------------------------------------------------------
import { INTERNE } from './interne'

const FILE_MAX = 50
const file = []
let posthog = null

/** Appelé par main.jsx une fois posthog.init() fait. */
export function brancherPosthog(instance) {
  posthog = instance
  for (const [event, props] of file.splice(0)) posthog.capture(event, props)
}

/**
 * Envoie un événement à PostHog (rien ne part en local, en test ni depuis un
 * appareil de l'équipe : dans ces cas PostHog n'est jamais branché).
 * @param {string} event
 * @param {object} [props]
 */
export function mesurer(event, props = {}) {
  if (import.meta.env.MODE === 'test' || INTERNE) return
  try {
    if (posthog) posthog.capture(event, props)
    else if (file.length < FILE_MAX) file.push([event, props])
  } catch { /* la mesure ne bloque jamais l'app */ }
}
