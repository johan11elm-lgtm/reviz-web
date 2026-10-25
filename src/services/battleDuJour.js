// -------------------------------------------------------
// Réviz — une Battle jouée aujourd'hui sur cet appareil (étape 3 du plan du
// jour de l'accueil). Seulement le jour de la dernière partie finie, rien
// d'autre ; un fichier à part pour que l'accueil ne charge pas la Battle.
// -------------------------------------------------------
const CLE = 'reviz-battle-jour'
const aujourdhui = () => new Date().toDateString()

export function noterBattleDuJour() {
  try { localStorage.setItem(CLE, aujourdhui()) } catch { /* stockage indisponible */ }
}

export function battleFaiteAujourdhui() {
  try { return localStorage.getItem(CLE) === aujourdhui() } catch { return false }
}
