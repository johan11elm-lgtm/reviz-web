// -------------------------------------------------------
// Réviz — Petits outils propres aux cartes et schémas d'histoire
// (groupe « histoire », lots 2 et 3). S'appuie sur _commun.mjs et ../carto.mjs
// sans les modifier.
// -------------------------------------------------------
import { C, FONT, HALO, anneaux, compact, couperRect, r1 } from './_commun.mjs'

export { C, FONT, HALO }

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')

/** Largeur estimée d'un texte (6,3 par caractère à 11,5, un peu moins pour les minuscules étroites). */
export const larg = (s, taille = 11.5) => String(s).length * 6.3 * (taille / 11.5)

/**
 * Étiquette masquable (groupe ill-legende + case ill-fond), 1 ou 2 lignes,
 * ancrée à gauche, au centre ou à droite. y = ligne de base de la 1re ligne.
 */
export function etiq(x, y, lignes, { ancre = 'start', taille = 11.5, halo = false, fond = '#FFFFFF' } = {}) {
  const L = [].concat(lignes)
  const w = Math.max(...L.map(s => larg(s, taille))) + 6
  const h = 15 + (L.length - 1) * 13
  const x0 = ancre === 'start' ? x - 3 : ancre === 'middle' ? x - w / 2 : x - w + 3
  const a = ancre === 'start' ? '' : ` text-anchor="${ancre}"`
  const hal = halo ? ` ${HALO}` : ''
  const t = L.length === 1
    ? `<text x="${r1(x)}" y="${r1(y)}"${a}${hal}>${esc(L[0])}</text>`
    : `<text x="${r1(x)}" y="${r1(y)}"${a}${hal}>${esc(L[0])}${L.slice(1).map(l => `<tspan x="${r1(x)}" dy="13">${esc(l)}</tspan>`).join('')}</text>`
  return `<g class="ill-legende"><rect class="ill-fond" x="${r1(x0)}" y="${r1(y - 11)}" width="${r1(w)}" height="${h}" rx="4" fill="${fond}"/>${t}</g>`
}

/** Texte fixe (non masquable), 1 ou plusieurs lignes, avec halo blanc éventuel. */
export function txt(x, y, lignes, { ancre = 'start', halo = true, attrs = '' } = {}) {
  const L = [].concat(lignes)
  const a = ancre === 'start' ? '' : ` text-anchor="${ancre}"`
  const hal = halo ? ` ${HALO}` : ''
  const at = attrs ? ' ' + attrs : ''
  return `<text x="${r1(x)}" y="${r1(y)}"${a}${hal}${at}>${esc(L[0])}${L.slice(1).map(l => `<tspan x="${r1(x)}" dy="13">${esc(l)}</tspan>`).join('')}</text>`
}

/** Mention secondaire (11, semi-gras, gris, minuscules). */
export function mention(x, y, lignes, { ancre = 'start', halo = true } = {}) {
  return txt(x, y, lignes, { ancre, halo, attrs: `font-size="11" font-weight="600" fill="${C.gris}"` })
}

/** Trait de rappel : de (x1, y1) (bord de la case) vers (x2, y2) (point sur le dessin). */
export function rappel(x1, y1, x2, y2) {
  return `<path d="M${r1(x1)},${r1(y1)}L${r1(x2)},${r1(y2)}" stroke="${C.encre}" stroke-width="1" opacity="0.6" fill="none"/><circle cx="${r1(x2)}" cy="${r1(y2)}" r="1.8" fill="${C.encre}" opacity="0.8"/>`
}

/** Point de ville (r = 2,6, encre, liseré blanc). */
export function ville(x, y, { r = 2.6, fill = C.encre } = {}) {
  return `<circle cx="${r1(x)}" cy="${r1(y)}" r="${r}" fill="${fill}" stroke="#FFFFFF" stroke-width="1"/>`
}

/** Anneaux des pays (couche carto) découpés au cadre ; `filtre(p)` choisit les pays. */
export function ringsPays(couche, cadre, filtre = () => true) {
  return couche.filter(filtre).flatMap(p => couperRect(anneaux(p.d), cadre))
}

/** Chemin compact. */
export const dc = (rings, aireMin = 1, prec = 0.5) => compact(rings, { prec, aireMin })

/** Document SVG final. */
export function doc(W, H, commentaire, corps) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${r1(H)}" font-family="${FONT}">
<!-- ${commentaire} -->
${corps}
</svg>
`
}

/** Polyligne lissée (Catmull-Rom → Bézier) passant par les points, pour les routes et trajets. */
export function lisse(pts) {
  if (pts.length < 3) return 'M' + pts.map(p => p.map(r1).join(',')).join('L')
  let d = `M${r1(pts[0][0])},${r1(pts[0][1])}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[i + 2] || p2
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6]
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6]
    d += `C${r1(c1[0])},${r1(c1[1])} ${r1(c2[0])},${r1(c2[1])} ${r1(p2[0])},${r1(p2[1])}`
  }
  return d
}

/** Pointe de flèche pleine en b, orientée a→b. */
export function pointe(a, b, { long = 7, large = 7, fill = C.accent } = {}) {
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  const l = Math.hypot(dx, dy) || 1
  const ux = dx / l
  const uy = dy / l
  const bx = b[0] - ux * long
  const by = b[1] - uy * long
  return `<path d="M${r1(b[0])},${r1(b[1])}L${r1(bx - uy * large / 2)},${r1(by + ux * large / 2)}L${r1(bx + uy * large / 2)},${r1(by - ux * large / 2)}Z" fill="${fill}"/>`
}

/**
 * Trajet fléché lissé passant par `pts` (coordonnées écran) ; la tige s'arrête
 * avant la pointe.
 */
export function trajet(pts, { couleur = C.accent, epaisseur = 2.25, tirets = '', long = 7, large = 7 } = {}) {
  const n = pts.length
  const b = pts[n - 1]
  const a = pts[n - 2]
  const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1
  const fin = [b[0] - (b[0] - a[0]) / l * (long - 1), b[1] - (b[1] - a[1]) / l * (long - 1)]
  const P = [...pts.slice(0, -1), fin]
  return `<path d="${lisse(P)}" fill="none" stroke="${couleur}" stroke-width="${epaisseur}" stroke-linecap="round" stroke-linejoin="round"${tirets ? ` stroke-dasharray="${tirets}"` : ''}/>` +
    pointe(a, b, { long, large, fill: couleur })
}



/**
 * Masque schématique : garde la partie des anneaux (coordonnées écran) située
 * dans un polygone CONVEXE donné en lon/lat (projeté par `xy`). Sert à
 * construire des limites historiques approximatives à partir de pays actuels.
 */
import { couperDemiPlan as _cdp } from './_commun.mjs'
export function masque(rings, polyLonLat, xy) {
  let pts = polyLonLat.map(([lo, la]) => xy(lo, la))
  // couperDemiPlan garde le côté droit de a→b à l'écran : sens horaire à l'écran.
  let a = 0
  for (let i = 0; i < pts.length; i++) {
    const [x1, y1] = pts[i]
    const [x2, y2] = pts[(i + 1) % pts.length]
    a += x1 * y2 - x2 * y1
  }
  if (a < 0) pts = pts.reverse()
  let r = rings
  for (let i = 0; i < pts.length; i++) r = _cdp(r, pts[i], pts[(i + 1) % pts.length])
  return r
}

/**
 * Région d'un planisphère (projection Natural Earth de carteMonde), agrandie et
 * cadrée : lonMin..lonMax (mesurés à la latitude `latRef`) tiennent dans
 * `largeur`, latMin..latMax donnent la hauteur. Les couches sont à découper au
 * cadre renvoyé (couperRect). Moins déformé qu'une carteZone très large.
 */
import { carteMonde as _carteMonde } from '../carto.mjs'
export function regionMonde({ x = 12, y = 12, largeur = 336 }, [lonMin, lonMax], [latMin, latMax], latRef = (latMin + latMax) / 2) {
  const m0 = _carteMonde({ x: 0, y: 0, largeur: 1000 }, { sud: -90, nord: 90 })
  const ax = m0.xy(lonMin, latRef)[0]
  const bx = m0.xy(lonMax, latRef)[0]
  const k = largeur / (bx - ax)
  const L = 1000 * k
  const m1 = _carteMonde({ x: 0, y: 0, largeur: L }, { sud: -90, nord: 90 })
  const ox = x - m1.xy(lonMin, latRef)[0]
  const oy = y - m1.xy((lonMin + lonMax) / 2, latMax)[1]
  const m = _carteMonde({ x: ox, y: oy, largeur: L }, { sud: -90, nord: 90 })
  const h = m.xy((lonMin + lonMax) / 2, latMin)[1] - y
  return { ...m, cadre: [x, y, x + largeur, Math.round((y + h) * 10) / 10], hauteur: Math.round(h * 10) / 10 }
}

