// -------------------------------------------------------
// Réviz — Photos de profil (28/10)
//
// Dans le style du logo autocollant : la pastille orange du logo et ses variantes (couleur du
// disque, expression ou accessoire), dessinées par Codex d'après public/logo/pastille.png.
// L'élève en choisit une depuis « Moi » ; sans choix, c'est la pastille du logo.
// -------------------------------------------------------
export const AVATARS = [
  { id: 'orange', nom: 'Le logo' },
  { id: 'lavande', nom: 'Aux anges' },
  { id: 'turquoise', nom: 'Clin d’œil' },
  { id: 'marine', nom: 'Lunettes' },
  { id: 'rose', nom: 'Étoiles' },
  { id: 'jaune', nom: 'Casquette' },
  { id: 'menthe', nom: 'Casque audio' },
  { id: 'ciel', nom: 'Couronne' },
].map(a => ({ ...a, src: `/avatars/${a.id}.png` }))

export const AVATAR_PAR_DEFAUT = 'orange'

/** La photo d'après son id (inconnu ou absent : la pastille du logo). */
export function avatarParId(id) {
  return AVATARS.find(a => a.id === id) ?? AVATARS[0]
}
