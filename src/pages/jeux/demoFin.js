import { erreurJeu } from '../../data/erreursJeux';

/**
 * Fin de partie de démonstration (?fin=0|1|6, en développement seulement) : l'écran de fin et le
 * récap sans jouer, avec des erreurs fixes des 3 jeux (captures, essais sur iPhone).
 */
const ERREURS = [
  { jeu: 'magie', tour: { theme: 'tables', titre: 'Table de 7 !' }, paire: { a: '7 × 8', b: '56' }, question: '7 × 8 = ?', donnee: '54', bonne: '56' },
  { jeu: 'buzzer', tour: { theme: 'capitales', titre: 'Les capitales !' }, paire: { a: 'Italie', b: 'Rome' }, question: "La capitale de l'Italie, c'est Paris !", donnee: 'Vrai', bonne: 'Faux', autre: 'Paris' },
  { jeu: 'lance', tour: { theme: 'contraires', titre: 'Les contraires !' }, paire: { a: 'lourd', b: 'léger' }, question: 'lourd : son contraire ?', donnee: 'lent', bonne: 'léger' },
  { jeu: 'lance', tour: { theme: 'dates', titre: 'Les grandes dates !' }, paire: { a: '1789', b: 'Révolution française' }, question: 'Révolution française : en quelle année ?', donnee: null, bonne: '1789' },
  { jeu: 'magie', tour: { theme: 'animaux', titre: 'Animals !' }, paire: { a: 'duck', b: 'canard' }, question: '« duck » va avec…', donnee: 'cochon', bonne: 'canard' },
  { jeu: 'buzzer', tour: { theme: 'sciences', titre: 'Sciences !' }, paire: { a: 'Lune', b: 'Un satellite' }, question: 'La Lune est un satellite !', donnee: 'Faux', bonne: 'Vrai', autre: null },
];
// Les jeux qui écrivent leur erreur eux-mêmes (pizzeria, ninja, taupe) : déjà au format commun.
const ERREURS_DIRECTES = [
  { jeu: 'pizzeria', theme: 'Les fractions égales', question: '3/4 de pizza', donnee: '5/8', bonne: '6/8', libelles: { donnee: 'Tu as servi', bonne: 'Il fallait' }, explication: '3/4 = 6/8 : 6 parts, pizza coupée en 8. Tu en as servi 5 : pas assez.' },
  { jeu: 'ninja', theme: 'Les pluriels', question: 'chevals', donnee: 'laissé passer', bonne: 'chevaux', libelles: { donnee: 'Tu l’as', bonne: 'Ça s’écrit' }, explication: 'Les mots en -al font -aux au pluriel : des chevaux.' },
  { jeu: 'ninja', theme: 'Les homophones', question: 'il a faim', donnee: 'tranché', bonne: 'le laisser', libelles: { donnee: 'Tu l’as', bonne: 'Il fallait' }, explication: '« il a faim » était bien écrit. « a », c’est le verbe avoir : on peut dire « avait ».' },
  { jeu: 'taupe', theme: 'Que les multiples de 3', question: '14', donnee: 'tapée', bonne: 'la laisser', libelles: { donnee: 'Tu l’as', bonne: 'Il fallait' }, explication: '14 n’est pas dans la table de 3 : il fallait la laisser.' },
  { jeu: 'taupe', theme: 'Que les calculs = 12', question: '3 × 4', donnee: 'laissée filer', bonne: 'la taper', libelles: { donnee: 'Tu l’as', bonne: 'Il fallait' }, explication: '3 × 4 = 12 : il fallait la taper.' },
];
const SCORES = { 0: [2340, 18], 1: [2120, 17], 6: [1480, 12], 11: [1120, 9] };

export function finDeDemo(n) {
  const toutes = [...ERREURS.map(erreurJeu), ...ERREURS_DIRECTES];
  const k = Math.max(0, Math.min(toutes.length, n));
  const [score, bonnes] = SCORES[k] ?? [1800, 18 - k];
  // ?fin=11 : toutes, les nouveaux jeux d'abord (pour les voir sans faire défiler).
  return { score, bonnes, erreurs: k > ERREURS.length ? [...ERREURS_DIRECTES, ...ERREURS.map(erreurJeu)].slice(0, k) : toutes.slice(0, k) };
}
