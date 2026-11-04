// -------------------------------------------------------
// Réviz — la séance d'accueil, juste après l'inscription (04/11)
// Jusqu'ici, la découverte lançait 5 exercices sur le chapitre de maths du
// moment (calcul littéral en 3e début novembre) : du 01 au 03/11, 39 % des
// élèves quittaient la séance dans les 10 premières secondes, et un sur trois
// seulement la finissait. À la place : 3 exercices écrits à la main, faciles
// et faisables de la 6e à la 3e sans avoir révisé, un par matière, le plus
// ludique en premier. Pas de chapitre derrière : la révision est notée
// « découverte » (utils/retour.js, api/_rappels.js).
// -------------------------------------------------------

/** Source notée sur la révision et sur la première session du compte. */
export const SOURCE_DECOUVERTE = 'decouverte'

/** Le titre affiché en tête de la séance. */
export const TITRE_DECOUVERTE = 'Découverte'

/** Les 3 exercices, dans l'ordre : Vrai ou faux (sciences), Intrus (français), Quiz (maths). */
export const SEANCE_ACCUEIL = Object.freeze([
  {
    id: 'decouverte-vraifaux', type: 'vraifaux', pose: 'thinking',
    consigne: 'Vrai ou faux ?',
    bulle: 'Glisse la carte : à droite si c’est vrai, à gauche si c’est faux.',
    titre: 'La Terre',
    affirmation: 'La Terre fait le tour du Soleil en un an.',
    vrai: true,
    explication: 'Vrai : la Terre met un peu plus de 365 jours à faire le tour du Soleil. C’est ce qui fait une année.',
    aRetenir: { question: 'La Terre fait le tour du Soleil en un an.', bonne: 'Vrai' },
  },
  {
    id: 'decouverte-intrus', type: 'intrus', pose: 'search',
    consigne: 'Trouve l’intrus',
    bulle: 'Trois cartes sont des verbes. Laquelle n’en est pas un ?',
    theme: 'Des verbes',
    cartes: ['chanter', 'courir', 'jardin', 'manger'],
    bonne: 2,
    explication: '« Jardin » est un nom : on dit « un jardin ». Chanter, courir et manger se conjuguent : je chante, je cours, je mange.',
    aRetenir: { question: 'L’intrus parmi « Des verbes »', bonne: 'jardin' },
  },
  {
    id: 'decouverte-qcm', type: 'qcm', pose: 'quiz',
    consigne: 'Choisis la bonne réponse',
    bulle: 'Combien font 7 × 8 ?',
    choix: ['54', '56', '63', '64'],
    bonne: 1,
    explication: '7 × 8 = 56. Une astuce pour ne plus l’oublier : 5, 6, 7, 8, soit 56 = 7 × 8.',
    aRetenir: { question: 'Combien font 7 × 8 ?', bonne: '56' },
  },
])
