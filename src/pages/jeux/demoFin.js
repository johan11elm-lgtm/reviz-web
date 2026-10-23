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
const SCORES = { 0: [2340, 18], 1: [2120, 17], 6: [1480, 12] };

export function finDeDemo(n) {
  const k = Math.max(0, Math.min(ERREURS.length, n));
  const [score, bonnes] = SCORES[k] ?? [1800, 18 - k];
  return { score, bonnes, erreurs: ERREURS.slice(0, k).map(erreurJeu) };
}
