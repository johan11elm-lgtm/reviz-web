// -------------------------------------------------------
// Réviz — Outils des planisphères du groupe « géographie 5e-6e » (repères,
// régions exposées au changement climatique, répartition et densités de la
// population, croquis « Habiter le monde », anamorphose).
// S'appuie sur carto.mjs (carteMonde, Natural Earth) et _commun.mjs ; ne les modifie pas.
// -------------------------------------------------------
import { carteMonde } from '../carto.mjs'
import { C, anneaux, compact, r1, xml } from './_commun.mjs'

/**
 * Fond de planisphère : `cadre` { x, y, largeur }, options de carteMonde ({ sud, nord }),
 * `tol` (simplification, en unités du viewBox), `prec` et `aireMin` (écriture compacte).
 * Renvoie la carte (xy, hauteur, graticule…), les pays avec leurs anneaux, et le chemin
 * de toutes les terres réunies.
 */
export function fondMonde(cadre, { sud = -58, nord = 84, tol = 0.6, prec = 0.5, aireMin = 1.2 } = {}) {
  const m = carteMonde(cadre, { sud, nord })
  const pays = m.pays(tol).map(p => ({ ...p, rings: anneaux(p.d) }))
  const terres = compact(pays.flatMap(p => p.rings), { prec, aireMin })
  return {
    m,
    pays,
    terres,
    /** Chemin compact d'un ensemble de pays (filtre sur l'objet pays). */
    chemin: (filtre, opts = {}) => compact(pays.filter(filtre).flatMap(p => p.rings), { prec, aireMin, ...opts }),
    /**
     * Terres en aplat uni, sans frontières : trait encre épais dessous, aplat par-dessus
     * (le trait de l'aplat recouvre les frontières intérieures).
     */
    terresUnies: (fill = C.ocre, { trait = 1.1 } = {}) =>
      `<path d="${terres}" fill="none" stroke="${C.encre}" stroke-width="${trait}" stroke-linejoin="round" opacity="0.75"/>` +
      `<path d="${terres}" fill="${fill}" stroke="${fill}" stroke-width="0.7" stroke-linejoin="round"/>`,
  }
}

/** Texte posé sur la carte avec halo blanc (noms de lieux). */
export function nom(x, y, s, { ancre = 'middle', taille = 11.5, poids = 600, couleur = C.encre, rot = 0 } = {}) {
  const tr = rot ? ` transform="rotate(${rot} ${r1(x)} ${r1(y)})"` : ''
  const an = ancre === 'start' ? '' : ` text-anchor="${ancre}"`
  return `<text x="${r1(x)}" y="${r1(y)}"${an} font-size="${taille}" font-weight="${poids}" fill="${couleur}" stroke="#FFFFFF" stroke-width="3" stroke-linejoin="round" paint-order="stroke"${tr}>${s}</text>`
}

/**
 * Case masquable posée sur la carte (nom à apprendre) : texte avec halo, case blanche
 * en mode test. `lignes` : 1 ou 2 lignes ; (x, y) = ligne de base de la 1re ligne.
 */
export function nomMasquable(x, y, lignes, { ancre = 'middle', taille = 11.5, rot = 0, italique = false } = {}) {
  const L = [].concat(lignes)
  const w = Math.max(...L.map(s => s.length * 6.3 * (taille / 11.5))) + 6
  const h = 15 + (L.length - 1) * 13
  const gx = ancre === 'end' ? x - w + 3 : ancre === 'middle' ? x - w / 2 : x - 3
  const an = ancre === 'start' ? '' : ` text-anchor="${ancre}"`
  const it = italique ? ' font-style="italic"' : ''
  const t = L.length === 1
    ? `<text x="${r1(x)}" y="${r1(y)}"${an}${it}>${L[0]}</text>`
    : `<text x="${r1(x)}" y="${r1(y)}"${an}${it}>${L[0]}<tspan x="${r1(x)}" dy="13">${L[1]}</tspan></text>`
  const tr = rot ? ` transform="rotate(${rot} ${r1(x)} ${r1(y)})"` : ''
  return `<g class="ill-legende"${tr}><rect class="ill-fond" x="${r1(gx)}" y="${r1(y - 11)}" width="${r1(w)}" height="${h}" rx="4" fill="none"/>` +
    `<g stroke="#FFFFFF" stroke-width="3" stroke-linejoin="round" paint-order="stroke">${t}</g></g>`
}

/** Ligne ouverte écrite en relatif (coordonnées au dixième). */
export function polyligne(pts) {
  let s = `M${r1(pts[0][0])},${r1(pts[0][1])}l`
  const d = []
  for (let i = 1; i < pts.length; i++) d.push(`${r1(pts[i][0] - pts[i - 1][0])},${r1(pts[i][1] - pts[i - 1][1])}`)
  return (s + d.join(' ')).replace(/ -/g, '-').replace(/,-/g, '-').replace(/(^|[^\d])0\./g, '$1.')
}

/**
 * Graticule léger pour un planisphère carteMonde (projection Natural Earth : les
 * parallèles sont des droites horizontales) : parallèles en `M…H…`, méridiens échantillonnés tous les 6°.
 */
export function graticuleLeger(m, pas = 30, sud = -58, nord = 84) {
  let s = ''
  for (let la = Math.ceil(sud / pas) * pas; la <= nord; la += pas) s += parallele(m, la)
  for (let lo = -180 + pas; lo < 180; lo += pas) {
    const pts = []
    for (let la = sud; la < nord; la += 6) pts.push(m.xy(lo, la))
    pts.push(m.xy(lo, nord))
    s += polyligne(pts)
  }
  return s
}

/** Parallèle droit d'un planisphère carteMonde. */
export function parallele(m, la) {
  const [x1, y] = m.xy(-180, la)
  const [x2] = m.xy(180, la)
  return `M${x1},${y}H${x2}`
}

/** Méridien (courbe) d'un planisphère carteMonde. */
export function meridien(m, lo, sud = -58, nord = 84) {
  const pts = []
  for (let la = sud; la < nord; la += 6) pts.push(m.xy(lo, la))
  pts.push(m.xy(lo, nord))
  return polyligne(pts)
}

/** Bord du planisphère, écrit en relatif. */
export function bordLeger(m, sud = -58, nord = 84) {
  const pts = []
  for (let la = sud; la < nord; la += 4) pts.push(m.xy(180, la))
  pts.push(m.xy(180, nord))
  for (let la = nord; la > sud; la -= 4) pts.push(m.xy(-180, la))
  pts.push(m.xy(-180, sud))
  return polyligne(pts) + 'z'
}

// ---- Densités par pays (ONU, WPP 2024), voir extraire-densites-wpp.mjs
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
const ICI_G = path.dirname(fileURLToPath(import.meta.url))
let _dens = null
const densBrutes = () => (_dens ??= Object.fromEntries(JSON.parse(readFileSync(path.join(ICI_G, '../donnees/densites-pays-2024.json'), 'utf8')).pays.map(p => [p.iso, p])))
// Unités Natural Earth sans code ONU propre → pays ONU qui les comprend.
const ALIAS = { SDS: 'SSD', SAH: 'ESH', KOS: 'XKX', PSX: 'PSE', SOL: 'SOM', CYN: 'CYP', ALD: 'FIN', KAS: 'IND' }
/** Fiche ONU (densité, population en milliers) d'un pays de carteMonde, ou null (Antarctique, îles inhabitées). */
export function fichePays(p) {
  const d = densBrutes()
  return d[p.unite] ?? d[ALIAS[p.unite]] ?? d[p.iso] ?? d[ALIAS[p.iso]] ?? null
}

/** Classes de densité (hab./km²) et teintes (mêmes teintes que la carte des densités de France, 3e). */
export const CLASSES_DENSITE = [
  { max: 10, texte: '< 10' },
  { max: 50, texte: '10 à 50' },
  { max: 100, texte: '50 à 100' },
  { max: 300, texte: '100 à 300' },
  { max: Infinity, texte: '> 300' },
]
export const TEINTES_DENSITE = ['#F6F4F9', '#DCD8EA', '#B2ABD0', '#7D74AE', '#46407D']
export const classeDensite = d => CLASSES_DENSITE.findIndex(c => (d ?? 0) < c.max)

/**
 * Couches d'un planisphère des densités par pays (ONU, WPP 2024) : mer blanche, graticule,
 * côtes en encre (trait épais dessous), pays en 5 teintes séparés par un trait blanc, bord.
 * `f` = fondMonde(…). Renvoie { dessous, dessus } (le bord va au-dessus des figurés).
 */
export function couchesDensites(f, sud, nord, { prec = 0.5, aireMin = 2.5 } = {}) {
  const parClasse = CLASSES_DENSITE.map(() => [])
  for (const p of f.pays) parClasse[classeDensite(fichePays(p)?.densite)].push(...p.rings)
  const bord = bordLeger(f.m, sud, nord)
  return {
    dessous: `<path d="${bord}" fill="#FFFFFF"/>
<path d="${graticuleLeger(f.m, 30, sud, nord)}" fill="none" stroke="${C.grisTrait}" stroke-width="0.5" opacity="0.7"/>
<path d="${f.terres}" fill="none" stroke="${C.encre}" stroke-width="1.7" stroke-linejoin="round"/>
${parClasse.map((rings, i) => `<path d="${compact(rings, { prec, aireMin })}" fill="${TEINTES_DENSITE[i]}" stroke="#FFFFFF" stroke-width="0.4" stroke-linejoin="round"/>`).join('\n')}`,
    dessus: `<path d="${bord}" fill="none" stroke="${C.encre}" stroke-width="0.75"/>`,
  }
}

/** Légende des 5 classes de densité (rangée de cases), y = ligne du titre. */
export function legendeDensites(y, titre = 'Densité de population en 2024 (hab./km²)') {
  const lw = 62
  const cases = CLASSES_DENSITE.map((c, i) => {
    const x = 14 + i * (lw + 4)
    return `<rect x="${x}" y="${y + 6}" width="${lw}" height="12" fill="${TEINTES_DENSITE[i]}" stroke="${C.encre}" stroke-width="0.75"/>` +
      `<text x="${x + lw / 2}" y="${y + 33}" text-anchor="middle">${xml(c.texte)}</text>`
  }).join('')
  return `<text x="12" y="${y}" font-size="11" font-weight="600" fill="${C.gris}">${titre}</text>
<g font-size="11" font-weight="600" fill="${C.encre}">${cases}</g>`
}
