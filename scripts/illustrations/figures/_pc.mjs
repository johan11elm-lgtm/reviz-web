// -------------------------------------------------------
// Réviz — Outils des figures de physique-chimie (et sciences 6e) calculées par
// script : document SVG, étiquettes masquables, traits de rappel, flèches.
// Format : docs/illustrations-style.md (règles v2). S'appuie sur ../cartes/_commun.mjs.
// -------------------------------------------------------
import { C, FONT, r1, pointe, ecrireSvg, largeurTexte } from '../cartes/_commun.mjs'
export { C, r1, pointe, ecrireSvg, largeurTexte }

/** Document complet : largeur 360, hauteur h, commentaire en tête. */
export function doc(h, commentaire, corps) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 ${h}" font-family="${FONT}">\n  <!-- ${commentaire} -->\n${corps.filter(Boolean).map(l => '  ' + l).join('\n')}\n</svg>\n`
}

const ATTR_ETQ = `font-size="11.5" font-weight="600" fill="${C.encre}"`
const ATTR_SEC = `font-size="11" font-weight="600" fill="${C.gris}"`

function lignesTexte(x, y, L, ancre) {
  const a = ancre === 'start' ? '' : ` text-anchor="${ancre}"`
  if (L.length === 1) return `<text x="${r1(x)}" y="${r1(y)}"${a}>${L[0]}</text>`
  return `<text x="${r1(x)}" y="${r1(y)}"${a}>${L[0]}${L.slice(1).map(s => `<tspan x="${r1(x)}" dy="13">${s}</tspan>`).join('')}</text>`
}

/** Boîte occupée par une étiquette (x, y = ligne de base de la 1re ligne). */
export function boite(x, y, lignes, ancre = 'start', taille = 11.5) {
  const L = [].concat(lignes)
  const w = Math.max(...L.map(s => largeurTexte(s, taille))) + 6
  const h = 15 + (L.length - 1) * 13
  const x0 = ancre === 'start' ? x - 3 : ancre === 'middle' ? x - w / 2 : x - w + 3
  return { x0, y0: y - 11, x1: x0 + w, y1: y - 11 + h, w, h }
}

/** Étiquette masquable (ill-legende + ill-fond). */
export function etq(x, y, lignes, ancre = 'start') {
  const L = [].concat(lignes)
  const b = boite(x, y, L, ancre)
  return `<g class="ill-legende" ${ATTR_ETQ}><rect class="ill-fond" x="${r1(b.x0)}" y="${r1(b.y0)}" width="${r1(b.w)}" height="${b.h}" rx="4" fill="#FFFFFF"/>${lignesTexte(x, y, L, ancre)}</g>`
}

/** Étiquette fixe (non masquable), style étiquette. */
export function etqFixe(x, y, lignes, ancre = 'start', extra = '') {
  return `<g ${ATTR_ETQ}${extra ? ' ' + extra : ''}>${lignesTexte(x, y, [].concat(lignes), ancre)}</g>`
}

/** Mention secondaire (11, semi-gras, gris, minuscules). */
export function mention(x, y, lignes, ancre = 'start') {
  return `<g ${ATTR_SEC}>${lignesTexte(x, y, [].concat(lignes), ancre)}</g>`
}

/** Trait de rappel de a (bord de la case) à b (sur le dessin), point au bout. */
export function rappel(a, b) {
  return `<path d="M${r1(a[0])},${r1(a[1])} L${r1(b[0])},${r1(b[1])}" stroke="${C.encre}" stroke-width="1" opacity="0.6" fill="none"/><circle cx="${r1(b[0])}" cy="${r1(b[1])}" r="1.8" fill="${C.encre}"/>`
}

/** Flèche droite de a à b (tige arrêtée sous la pointe). */
export function flecheDroite(a, b, { couleur = C.encre, epaisseur = 1.75, long = 8, large = 7, tirets = '' } = {}) {
  const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy)
  const f = [b[0] - dx / l * (long - 1), b[1] - dy / l * (long - 1)]
  return `<path d="M${r1(a[0])},${r1(a[1])} L${r1(f[0])},${r1(f[1])}" stroke="${couleur}" stroke-width="${epaisseur}" fill="none"${tirets ? ` stroke-dasharray="${tirets}"` : ''}/>` + pointe(a, b, { long, large, fill: couleur })
}

/** Nombre au format français (virgule). */
export const fr = v => String(Math.round(v * 1000) / 1000).replace('.', ',').replace('-', '−')

/** Chemin polyligne. */
export const poly = (pts, ferme = false) => 'M' + pts.map(p => `${r1(p[0])},${r1(p[1])}`).join(' L') + (ferme ? ' Z' : '')
