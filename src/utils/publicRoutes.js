// -------------------------------------------------------
// Réviz — Routes publiques (sans Firebase)
// Source unique pour main.jsx (préchauffage du cœur connecté) et App.jsx.
// -------------------------------------------------------

// Pages servies sans Firebase : l'accueil public (acquisition, SEO brevet),
// les pages légales, l'inscription (ses étapes s'affichent sans Firebase,
// qui n'arrive qu'à la création du compte), les avis, la page profs et le
// tutoriel d'installation. Tout le reste passe par <AuthShell /> (Firebase Auth).
const PUBLIC_PATH = /^\/(welcome|legal|inscription|avis|profs|installer)(\/|$)/;

export function isPublicPath(pathname = '') {
  return PUBLIC_PATH.test(pathname);
}

// Sur une page publique, on précharge le cœur connecté une fois le navigateur
// inactif (le clic « Commencer gratuitement » est alors instantané) — sauf si
// l'élève a demandé à économiser les données ou navigue en 2G.
export function shouldPrefetchAuthShell(nav = globalThis.navigator) {
  const conn = nav?.connection;
  if (!conn) return true;
  if (conn.saveData) return false;
  return !/2g/.test(conn.effectiveType ?? '');
}
