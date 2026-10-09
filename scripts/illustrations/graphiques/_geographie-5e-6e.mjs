// -------------------------------------------------------
// Réviz — Outils des graphiques du groupe « géographie 5e-6e » (courbes
// de population, de température, de CO₂, indices). Repère, axes, graduations
// et chemins au format de docs/illustrations-style.md (règles v2).
// S'appuie sur scripts/illustrations/cartes/_commun.mjs (couleurs, flèches, écriture).
// -------------------------------------------------------
import { C, pointe, r1 } from '../cartes/_commun.mjs'

export const fmtNombre = v => String(v).replace('.', ',').replace('-', '−')

/**
 * Repère cartésien : `cadre` = { x0, x1, y0 (haut), y1 (bas) } en unités du viewBox,
 * `dx` = [min, max] des abscisses, `dy` = [min, max] des ordonnées.
 */
export function repere(cadre, dx, dy) {
  const { x0, x1, y0, y1 } = cadre
  const X = v => r1(x0 + ((v - dx[0]) / (dx[1] - dx[0])) * (x1 - x0))
  const Y = v => r1(y1 - ((v - dy[0]) / (dy[1] - dy[0])) * (y1 - y0))
  return {
    X, Y, ...cadre,
    /** Chemin d'une série [[x, y], …]. */
    ligne: pts => 'M' + pts.map(([a, b]) => `${X(a)},${Y(b)}`).join('L'),
    /** Quadrillage léger (verticales en `xs`, horizontales en `ys`). */
    grille: (xs, ys) => `<path d="${xs.map(v => `M${X(v)},${y1}V${y0}`).join('')}${ys.map(v => `M${x0},${Y(v)}H${x1}`).join('')}" stroke="${C.violet}" stroke-width="1" fill="none"/>`,
    /** Axes encre avec flèches (abscisses vers la droite, ordonnées vers le haut). */
    axes: ({ depasseX = 10, depasseY = 12, gauche = true } = {}) => {
      const xa = gauche ? x0 : x1
      return `<path d="M${x0},${y1}H${x1 + depasseX - 6}M${xa},${y1}V${y0 - depasseY + 6}" stroke="${C.encre}" stroke-width="1.75" fill="none"/>` +
        pointe([x0, y1], [x1 + depasseX, y1], { long: 8, large: 8 }) + pointe([xa, y1], [xa, y0 - depasseY], { long: 8, large: 8 })
    },
    /** Graduations et nombres en mention secondaire. */
    gradX: (vals, texte = fmtNombre) => `<path d="${vals.map(v => `M${X(v)},${y1}v4`).join('')}" stroke="${C.encre}" stroke-width="1.5"/>` +
      `<g font-size="11" font-weight="600" fill="${C.gris}" text-anchor="middle">${vals.map(v => `<text x="${X(v)}" y="${y1 + 16}">${texte(v)}</text>`).join('')}</g>`,
    gradY: (vals, texte = fmtNombre, { cote = 'gauche' } = {}) => {
      const g = cote === 'gauche'
      const xa = g ? x0 : x1
      return `<path d="${vals.map(v => `M${xa},${Y(v)}h${g ? -4 : 4}`).join('')}" stroke="${C.encre}" stroke-width="1.5"/>` +
        `<g font-size="11" font-weight="600" fill="${C.gris}" text-anchor="${g ? 'end' : 'start'}">${vals.map(v => `<text x="${g ? xa - 7 : xa + 7}" y="${r1(Y(v) + 4)}">${texte(v)}</text>`).join('')}</g>`
    },
  }
}

/** Trait de rappel (de la case vers le dessin) avec un point au bout côté dessin. */
export function rappel(a, b) {
  return `<path d="M${r1(a[0])},${r1(a[1])}L${r1(b[0])},${r1(b[1])}" stroke="${C.encre}" stroke-width="1" opacity="0.6" fill="none"/>` +
    `<circle cx="${r1(b[0])}" cy="${r1(b[1])}" r="1.8" fill="${C.encre}"/>`
}

/** Point de donnée (r = 3, cerné de blanc). */
export const point = (x, y, couleur = C.encre) => `<circle cx="${r1(x)}" cy="${r1(y)}" r="3" fill="${couleur}" stroke="#FFFFFF" stroke-width="1"/>`

/**
 * Case masquable (légende) : `lignes` (1 ou 2), ancrée à gauche (x = bord gauche du texte),
 * y = ligne de base de la 1re ligne. `ancre` : 'start' | 'end' | 'middle'.
 * Renvoie { svg, boite: [x, y, w, h] } pour accrocher un trait de rappel au bord.
 */
export function etiquette(x, y, lignes, { ancre = 'start', taille = 11.5 } = {}) {
  const L = [].concat(lignes)
  const w = Math.max(...L.map(s => s.length * 6.3 * (taille / 11.5))) + 6
  const h = 15 + (L.length - 1) * 13
  const gx = ancre === 'end' ? x - w + 3 : ancre === 'middle' ? x - w / 2 : x - 3
  const tx = ancre === 'end' ? x : ancre === 'middle' ? x : x
  const at = ancre === 'start' ? '' : ` text-anchor="${ancre}"`
  const t = L.length === 1
    ? `<text x="${r1(tx)}" y="${r1(y)}"${at}>${L[0]}</text>`
    : `<text x="${r1(tx)}" y="${r1(y)}"${at}>${L[0]}<tspan x="${r1(tx)}" dy="13">${L[1]}</tspan></text>`
  const boite = [r1(gx), r1(y - 11), r1(w), h]
  return {
    svg: `<g class="ill-legende"><rect class="ill-fond" x="${boite[0]}" y="${boite[1]}" width="${boite[2]}" height="${h}" rx="4" fill="#FFFFFF"/>${t}</g>`,
    boite,
  }
}
