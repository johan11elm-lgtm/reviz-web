// Rechargement unique après une mise à jour de l'app.
//
// Un onglet ou une PWA ouverts avant un déploiement gardent l'ancien index.html en mémoire ;
// quand ils demandent un chunk paresseux (/assets/Jeux-<ancien hash>.js), Vercel répond par
// index.html en 200 (réécriture vers l'app) et le module est refusé. Un seul rechargement
// suffit à récupérer la nouvelle version. La garde en sessionStorage (horodatage) empêche toute
// boucle : si le rechargement n'a rien réglé, l'écran d'erreur normal prend le relais.
const CLE = 'reviz-rechargement';
// Pas de second rechargement avant ce délai (ms).
export const DELAI_GARDE = 60_000;

const MESSAGES_CHUNK = [
  'Failed to fetch dynamically imported module', // Chrome, Edge, Firefox récent
  'error loading dynamically imported module',   // Firefox
  'Importing a module script failed',            // Safari
  'Unable to preload CSS',                       // préchargement CSS de Vite
];

/** L'erreur vient-elle d'un fichier de l'app qu'on n'a pas pu charger (chunk disparu) ? */
export function estErreurDeChunk(erreur) {
  if (!erreur) return false;
  if (erreur.name === 'ChunkLoadError') return true;
  const message = String(erreur.message ?? erreur);
  return MESSAGES_CHUNK.some(m => message.includes(m));
}

let enCours = false;
/** Un rechargement vient-il d'être lancé par cette page ? (l'écran d'erreur reste alors vide) */
export const rechargementEnCours = () => enCours;

function lire() {
  try { return Number(sessionStorage.getItem(CLE)) || 0; } catch { return null; }
}

/** Un rechargement a-t-il déjà été tenté il y a moins de DELAI_GARDE ms ? */
export function dejaTente(maintenant = Date.now()) {
  const t = lire();
  return t === null || (t > 0 && maintenant - t < DELAI_GARDE);
}

/**
 * Recharge la page, une seule fois par DELAI_GARDE. Renvoie true si le rechargement est lancé,
 * false s'il a déjà été tenté — ou si sessionStorage est inutilisable : sans garde, on préfère
 * l'écran d'erreur à un risque de boucle.
 */
export function rechargerUneFois(recharger = () => window.location.reload(), maintenant = Date.now()) {
  if (enCours) return true;
  if (dejaTente(maintenant)) return false;
  try { sessionStorage.setItem(CLE, String(maintenant)); } catch { return false; }
  enCours = true;
  recharger();
  return true;
}

/**
 * Écoute l'événement de Vite quand un chunk ou son CSS ne se charge pas. On ne bloque pas
 * l'erreur (pas de preventDefault) : le lazy échoue normalement et l'ErrorBoundary,
 * qui sait qu'un rechargement est en cours, reste vide jusqu'au rechargement.
 */
export function ecouterErreurDeChunk(cible = window) {
  const onErreur = (e) => { if (estErreurDeChunk(e.payload)) rechargerUneFois(); };
  cible.addEventListener('vite:preloadError', onErreur);
  return () => cible.removeEventListener('vite:preloadError', onErreur);
}

/** Pour les tests : remet le module à l'état initial. */
export function _reinitialiser() {
  enCours = false;
  try { sessionStorage.removeItem(CLE); } catch { /* sans effet */ }
}
