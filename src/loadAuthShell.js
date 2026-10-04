// Point d'entrée unique du chunk « cœur connecté » (AuthContext + Firebase +
// pages privées). Partagé entre App.jsx (lazy) et main.jsx (préchauffage) :
// le même import dynamique → une seule requête, un seul chunk.
export const loadAuthShell = () => import('./AuthShell.jsx');
