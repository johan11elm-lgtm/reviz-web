// -------------------------------------------------------
// Réviz — boutons retour sans boucle. D'abord l'aller et retour entre la
// fiche d'un chapitre (/analyse) et ses exercices (résumé, flashcards, quiz,
// carte mentale), puis le retour générique d'une page (revenir).
// La fiche ouvre un exercice avec DEPUIS_FICHE dans l'état de navigation.
// Fermer l'exercice revient alors d'un cran (la fiche est juste derrière) ;
// sinon (arrivé de l'accueil, d'un lien) la fiche remplace l'exercice. Passer
// d'un exercice à l'autre remplace l'écran au lieu de l'empiler : le
// « ← Programme » de la fiche, qui revient d'un cran, ne retombe jamais sur un
// exercice déjà fermé.
// -------------------------------------------------------

export const DEPUIS_FICHE = { depuisFiche: true }

/** Ferme un exercice : retour à la fiche du chapitre. */
export function fermerVersFiche(navigate, location) {
  if (location.state?.depuisFiche && window.history.state?.idx > 0) navigate(-1)
  else navigate('/analyse', { replace: true })
}

/** D'un exercice à l'autre (Quiz → Revoir les cartes…) : même place dans l'historique. */
export function versExercice(navigate, location, to) {
  navigate(to, { replace: true, state: location.state })
}

/**
 * Bouton retour d'une page : revient d'un cran s'il y a de l'historique dans l'app, sinon va à la page
 * parente en remplaçant l'écran (arrivée par un lien direct, app installée sans bouton du navigateur).
 * Pousser la page parente à chaque retour ferait tourner en rond avec le retour du téléphone.
 */
export function revenir(navigate, parent) {
  if (window.history.state?.idx > 0) navigate(-1)
  else navigate(parent, { replace: true })
}
