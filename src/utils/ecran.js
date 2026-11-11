// -------------------------------------------------------
// Réviz — Téléphone ou pas ?
// Un écran de moins de 600 px de large est un téléphone : la page occupe tout l'écran
// (global.css, bloc « mobile réel »). L'ancienne limite, 430 px, datait de l'iPhone 15 Pro Max ;
// les iPhone 16 et 17 Pro Max font 440 px et tombaient dans la branche « tablette » : carte
// centrée avec des marges, et barre de saisie de Réviz IA derrière le clavier (Johan, 11/11).
// Les feuilles de style écrivent la même limite en dur : (max-width: 599px) pour le téléphone,
// (min-width: 600px) pour la tablette. En changer ici, c'est en changer là-bas.
// -------------------------------------------------------

export const LARGEUR_MAX_TELEPHONE = 599
export const REQUETE_TELEPHONE = `(max-width: ${LARGEUR_MAX_TELEPHONE}px)`

/** L'écran est-il un téléphone ? L'app native l'est toujours (plein écran, classe .native). */
export function estTelephone(win = typeof window !== 'undefined' ? window : undefined) {
  if (!win) return false
  if (win.document?.documentElement?.classList.contains('native')) return true
  return !!win.matchMedia?.(REQUETE_TELEPHONE)?.matches
}
