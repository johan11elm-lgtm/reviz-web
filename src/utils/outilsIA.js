// -------------------------------------------------------
// Réviz — Petites touches de Réviz IA (11/11, reprises de Knowunity) : l'accueil selon le moment
// de la journée, le clavier de maths, « Expliquer » sur un mot surligné.
// -------------------------------------------------------

/** « ce matin », « cet après-midi », « ce soir » : pour « On révise quoi … ? ». */
export function momentDeLaJournee(heure = new Date().getHours()) {
  if (heure >= 5 && heure < 12) return 'ce matin'
  if (heure >= 12 && heure < 17) return 'cet après-midi'
  return 'ce soir'
}

/** Les symboles du clavier de maths (le texte tel qu'il s'insère). */
export const SYMBOLES_MATHS = ['²', '³', '√', 'π', '×', '÷', '±', '≤', '≥', '≠', '≈', '½', '°', '→', '∞', '(', ')']

/** Insère `texte` à la place de la sélection d'un champ ; renvoie { valeur, curseur }. */
export function inserer(valeur, debut, fin, texte) {
  const d = Number.isInteger(debut) ? debut : valeur.length
  const f = Number.isInteger(fin) ? fin : d
  return { valeur: valeur.slice(0, d) + texte + valeur.slice(f), curseur: d + texte.length }
}

/** Le mot ou le passage surligné, s'il se prête à « Expliquer » (2 à 80 caractères), sinon null. */
export function passageAExpliquer(texte) {
  const t = String(texte ?? '').replace(/\s+/g, ' ').trim()
  return t.length >= 2 && t.length <= 80 ? t : null
}

export const questionExpliquer = passage => `Explique-moi « ${passage} » plus simplement, avec un exemple.`
