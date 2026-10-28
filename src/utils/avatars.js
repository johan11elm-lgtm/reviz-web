// -------------------------------------------------------
// Réviz — Photos de profil (28/10)
//
// Dans le style du logo autocollant : la tête de Réviz du logo, sans bouche comme lui, posée sur
// un disque de couleur. L'élève choisit sa tête et la couleur du fond, à part. Les huit premières
// têtes sont à tous ; les quinze autres, les plus travaillées, sont réservées à Réviz+ (dessinées
// par Codex d'après la tête du logo, public/logo/pastille.png).
// -------------------------------------------------------
export const TETES = [
  { id: 'logo', nom: 'Le logo' },
  { id: 'aux-anges', nom: 'Aux anges' },
  { id: 'clin-oeil', nom: 'Clin d’œil' },
  { id: 'lunettes', nom: 'Lunettes' },
  { id: 'etoiles', nom: 'Étoiles' },
  { id: 'casquette', nom: 'Casquette' },
  { id: 'casque', nom: 'Casque audio' },
  { id: 'couronne', nom: 'Couronne' },
  { id: 'astronaute', nom: 'Astronaute', plus: true },
  { id: 'sorcier', nom: 'Sorcier', plus: true },
  { id: 'pirate', nom: 'Pirate', plus: true },
  { id: 'ninja', nom: 'Ninja', plus: true },
  { id: 'chef', nom: 'Chef', plus: true },
  { id: 'diplome', nom: 'Diplômé', plus: true },
  { id: 'soleil', nom: 'Lunettes de soleil', plus: true },
  { id: 'viking', nom: 'Viking', plus: true },
  { id: 'fleurs', nom: 'Fleurs', plus: true },
  { id: 'gamer', nom: 'Gamer', plus: true },
  { id: 'heros', nom: 'Super-héros', plus: true },
  { id: 'aureole', nom: 'Auréole', plus: true },
  { id: 'alien', nom: 'Antennes', plus: true },
  { id: 'detective', nom: 'Détective', plus: true },
  { id: 'bonnet', nom: 'Bonnet', plus: true },
].map(t => ({ ...t, src: `/avatars/tetes/${t.id}.png` }))

export const FONDS = [
  { id: 'orange', nom: 'Orange', couleur: '#FA5C1B' },
  { id: 'peche', nom: 'Pêche', couleur: '#FFB08F' },
  { id: 'jaune', nom: 'Jaune', couleur: '#FFC24B' },
  { id: 'menthe', nom: 'Menthe', couleur: '#6FD6A8' },
  { id: 'turquoise', nom: 'Turquoise', couleur: '#04ADB3' },
  { id: 'ciel', nom: 'Ciel', couleur: '#7FB8FF' },
  { id: 'lavande', nom: 'Lavande', couleur: '#B9A6FB' },
  { id: 'rose', nom: 'Rose', couleur: '#FF8FB1' },
  { id: 'rouge', nom: 'Rouge', couleur: '#E0364D' },
  { id: 'marine', nom: 'Marine', couleur: '#042A65' },
]

export const AVATAR_PAR_DEFAUT = { tete: 'logo', fond: 'orange' }

/** Le choix rangé (« casquette:menthe », ou l'objet du profil) ; ce qui est inconnu prend le défaut. */
export function lireChoix(valeur) {
  const [tete, fond] = typeof valeur === 'string' ? valeur.split(':') : [valeur?.tete, valeur?.fond]
  return {
    tete: TETES.some(t => t.id === tete) ? tete : AVATAR_PAR_DEFAUT.tete,
    fond: FONDS.some(f => f.id === fond) ? fond : AVATAR_PAR_DEFAUT.fond,
  }
}

export const enTexte = choix => `${choix.tete}:${choix.fond}`

/** Ce qui s'affiche : une tête Réviz+ sans Réviz+ (abonnement fini) redevient la tête du logo. */
export function avatarAffiche(choix, hasRevizPlus) {
  const tete = TETES.find(t => t.id === choix.tete) ?? TETES[0]
  return {
    tete: tete.plus && !hasRevizPlus ? TETES[0] : tete,
    fond: FONDS.find(f => f.id === choix.fond) ?? FONDS[0],
  }
}
