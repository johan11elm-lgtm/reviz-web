// -------------------------------------------------------
// Réviz — appareils de l'équipe, retirés des mesures
// Ouvrir une fois `?interne=1` sur chaque navigateur (sur app. et sur www.)
// retire cet appareil de PostHog et du compteur /api/track ; `?interne=0`
// l'y remet. C'est le seul cas où la mesure écrit sur l'appareil, et
// seulement parce que la personne a ouvert ce lien exprès.
// -------------------------------------------------------
const CLE = 'reviz-interne'

/**
 * @param {string} [search]  chaîne de requête (par défaut celle de la page)
 * @returns {boolean} true si cet appareil est marqué comme appareil de l'équipe
 */
export function lireInterne(search) {
  try {
    const v = new URLSearchParams(search ?? window.location.search).get('interne')
    if (v === '1') localStorage.setItem(CLE, '1')
    else if (v === '0') localStorage.removeItem(CLE)
    return localStorage.getItem(CLE) === '1'
  } catch { return false }
}

export const INTERNE = lireInterne()
