/**
 * Typographie française pour les textes générés par l'IA.
 * L'IA renvoie des espaces normales avant ?!:;» — en fin de ligne le signe
 * se retrouve orphelin. On les remplace par des insécables à l'affichage.
 */
export function nbsp(text) {
  if (typeof text !== 'string') return text;
  return text
    .replace(/ ([?!:;»%])/g, ' $1')
    .replace(/« /g, '« ')
    // « y a-t-il » ne se coupe pas après « a- » : gluons invisibles (U+2060).
    .replace(/(\S)-t-(il|elle|on|ils|elles)\b/g, '$1\u2060-\u2060t\u2060-\u2060$2');
}
