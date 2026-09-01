/**
 * Typographie française pour les textes générés par l'IA.
 * L'IA renvoie des espaces normales avant ?!:;» — en fin de ligne le signe
 * se retrouve orphelin. On les remplace par des insécables à l'affichage.
 */
export function nbsp(text) {
  if (typeof text !== 'string') return text;
  return text
    .replace(/ ([?!:;»%])/g, ' $1')
    .replace(/« /g, '« ');
}
