// -------------------------------------------------------
// Réviz — Mode découverte des enseignants
// Un enseignant arrivé par l'affiche de la salle des profs (/profs)
// parcourt l'app en mode essai, comme un élève de la classe choisie.
// Ce drapeau local remplace alors « Créer mon compte » par « Donner mon
// avis » dans le bandeau d'essai et la barre latérale.
// -------------------------------------------------------
export const DECOUVERTE_KEY = 'reviz-decouverte-prof'

/** Lien vers le formulaire d'avis, provenance « affiche salle des profs ». */
export const AVIS_PROFS_URL = '/avis?src=affiche-profs'

/** Classes proposées à la découverte (contenus du programme : collège). */
export const CLASSES_DECOUVERTE = ['6ème', '5ème', '4ème', '3ème']

export function startDecouverte() {
  try { localStorage.setItem(DECOUVERTE_KEY, '1') } catch { /* stockage indisponible */ }
}

export function stopDecouverte() {
  try { localStorage.removeItem(DECOUVERTE_KEY) } catch { /* stockage indisponible */ }
}

export function isDecouverte() {
  try { return localStorage.getItem(DECOUVERTE_KEY) === '1' } catch { return false }
}
