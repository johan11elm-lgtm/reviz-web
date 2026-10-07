// -------------------------------------------------------
// Réviz — Aides d'affichage du résumé (page Résumé, page Analyse)
// -------------------------------------------------------

// Un collégien qui révise lit plus lentement qu'un adulte : ≈ 150 mots/min.
const MOTS_PAR_MINUTE = 150

/** Temps de lecture du résumé, en minutes (au moins 1). */
export function resumeReadingMinutes(resume) {
  if (!resume) return 1
  const morceaux = [
    resume.intro,
    ...(resume.keyPoints ?? []),
    ...(resume.sections ?? []).flatMap(s => [s?.title, s?.content, s?.exemple, s?.formula]),
    resume.methode?.titre,
    ...(resume.methode?.etapes ?? []),
    ...(resume.pieges ?? []),
    ...(resume.keyTerms ?? []).flatMap(t => [t?.term, t?.def]),
  ]
  const mots = morceaux
    .filter(m => typeof m === 'string')
    .reduce((n, m) => n + m.split(/\s+/).filter(Boolean).length, 0)
  return Math.max(1, Math.round(mots / MOTS_PAR_MINUTE))
}

/**
 * Découpe un texte pour mettre en valeur la première occurrence de chaque
 * terme du vocabulaire. Renvoie [{ text, term }] où term vaut le terme
 * d'origine (tel qu'écrit dans le vocabulaire) sur un terme repéré, false
 * ailleurs. Insensible à la casse, mots entiers seulement, pluriel en
 * -s/-x toléré ; la partie entre parenthèses d'un terme est ignorée
 * (« Racine carrée (√) » → « Racine carrée »).
 * Pas de lookbehind : l'app iOS vise iOS 15, qui ne le connaît pas.
 */
export function splitOnTerms(text, terms) {
  if (typeof text !== 'string' || !text) return [{ text: text ?? '', term: false }]
  // forme cherchée (minuscules, sans parenthèses) → terme d'origine
  const origine = new Map()
  for (const t of terms ?? []) {
    const mot = String(t ?? '').replace(/\s*\([^)]*\)\s*/g, ' ').trim()
    if (mot.length >= 3 && !origine.has(mot.toLowerCase())) origine.set(mot.toLowerCase(), t)
  }
  const mots = [...origine.keys()].sort((a, b) => b.length - a.length)
  if (!mots.length) return [{ text, term: false }]

  const echappe = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const re = new RegExp(`(^|[^\\p{L}\\p{N}])(${mots.map(echappe).join('|')})((?:s|x)?)(?![\\p{L}\\p{N}])`, 'giu')

  const segments = []
  const vus = new Set()
  let curseur = 0
  for (const m of text.matchAll(re)) {
    const cle = m[2].toLowerCase()
    if (vus.has(cle)) continue
    vus.add(cle)
    const debut = m.index + m[1].length
    if (debut > curseur) segments.push({ text: text.slice(curseur, debut), term: false })
    const fin = debut + m[2].length + m[3].length
    segments.push({ text: text.slice(debut, fin), term: origine.get(cle) })
    curseur = fin
  }
  if (curseur < text.length) segments.push({ text: text.slice(curseur), term: false })
  return segments
}

/**
 * Trois cartes réparties dans le paquet (début, milieu, fin) pour « Vérifie-toi ».
 * Chaque carte garde son `index` dans le paquet : c'est la clé de la répétition
 * espacée (srsService), partagée avec la page Flashcards.
 */
export function pickCheckCards(flashcards, n = 3) {
  const cartes = (flashcards ?? [])
    .map((c, index) => ({ ...c, index }))
    .filter(c => typeof c.front === 'string' && typeof c.back === 'string')
  if (cartes.length <= n) return cartes
  const indices = new Set(Array.from({ length: n }, (_, i) => Math.round(i * (cartes.length - 1) / (n - 1))))
  return [...indices].map(i => cartes[i])
}
