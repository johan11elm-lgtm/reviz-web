// -------------------------------------------------------
// Réviz — Outils de cartographie pour les illustrations (cartes et croquis).
// Fonds tirés de Natural Earth (domaine public), extraits dans
// scripts/illustrations/donnees/ par extraire-natural-earth.mjs.
//
//   import { carteFrance, carteEurope } from './carto.mjs'
//   const c = carteFrance({ x: 8, y: 8, largeur: 344 })   // cadre dans le viewBox
//   c.xy(2.35, 48.86)      → [x, y] de Paris
//   c.contour()            → <path d> du contour de la métropole (Corse comprise)
//   c.departements()       → [{ code, nom, region, d }]
//   c.voisins()            → <path d> des pays voisins (Espagne, Italie…)
//   const e = carteEurope({ x: 4, y: 4, largeur: 352 })
//   e.pays()               → [{ iso, nom, ue, d }]
//
// Tout le reste du croquis (aplats, flèches, figurés, légende) s'écrit à la
// main dans le script de la carte, avec les couleurs de docs/illustrations-style.md.
// -------------------------------------------------------
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ICI = path.dirname(fileURLToPath(import.meta.url))
const RAD = Math.PI / 180
const r1 = v => Math.round(v * 10) / 10

/** Douglas-Peucker sur une liste de points [x, y]. */
export function simplifier(points, tolerance) {
  if (points.length <= 3) return points
  const garder = new Uint8Array(points.length)
  garder[0] = garder[points.length - 1] = 1
  const pile = [[0, points.length - 1]]
  while (pile.length) {
    const [a, b] = pile.pop()
    const [ax, ay] = points[a]
    const [bx, by] = points[b]
    const dx = bx - ax
    const dy = by - ay
    const l2 = dx * dx + dy * dy || 1e-12
    let max = 0
    let idx = -1
    for (let i = a + 1; i < b; i++) {
      const [px, py] = points[i]
      const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / l2))
      const d = Math.hypot(px - (ax + t * dx), py - (ay + t * dy))
      if (d > max) { max = d; idx = i }
    }
    if (max > tolerance && idx > 0) {
      garder[idx] = 1
      pile.push([a, idx], [idx, b])
    }
  }
  return points.filter((_, i) => garder[i])
}

/** Lambert conique conforme (sphère), parallèles standards φ1, φ2. */
function lambertConique(lon0, lat0, lat1, lat2) {
  const f1 = lat1 * RAD
  const f2 = lat2 * RAD
  const n = Math.log(Math.cos(f1) / Math.cos(f2)) / Math.log(Math.tan(Math.PI / 4 + f2 / 2) / Math.tan(Math.PI / 4 + f1 / 2))
  const F = (Math.cos(f1) * Math.tan(Math.PI / 4 + f1 / 2) ** n) / n
  const rho = lat => F / Math.tan(Math.PI / 4 + (lat * RAD) / 2) ** n
  const rho0 = rho(lat0)
  return (lon, lat) => {
    const t = n * (lon - lon0) * RAD
    const r = rho(lat)
    return [r * Math.sin(t), -(rho0 - r * Math.cos(t))]
  }
}

/** Lambert azimutale équivalente (projection officielle de l'Europe, EPSG:3035). */
function lambertAzimutale(lon0, lat0) {
  const p0 = lat0 * RAD
  return (lon, lat) => {
    const l = (lon - lon0) * RAD
    const p = lat * RAD
    const k = Math.sqrt(2 / (1 + Math.sin(p0) * Math.sin(p) + Math.cos(p0) * Math.cos(p) * Math.cos(l)))
    return [k * Math.cos(p) * Math.sin(l), -k * (Math.cos(p0) * Math.sin(p) - Math.sin(p0) * Math.cos(p) * Math.cos(l))]
  }
}

/** Projection + mise à l'échelle pour que l'emprise tienne dans le cadre. */
function cadrer(proj, emprise, { x = 0, y = 0, largeur }) {
  const pts = emprise.map(([lo, la]) => proj(lo, la))
  const xs = pts.map(p => p[0])
  const ys = pts.map(p => p[1])
  const minX = Math.min(...xs)
  const minY = Math.min(...ys)
  const k = largeur / (Math.max(...xs) - minX)
  const hauteur = (Math.max(...ys) - minY) * k
  const xy = (lon, lat) => {
    const [px, py] = proj(lon, lat)
    return [r1(x + (px - minX) * k), r1(y + (py - minY) * k)]
  }
  return { xy, hauteur: r1(hauteur), largeur }
}

/** <path d> d'une liste de polygones [[anneau, trous…], …] en lon/lat. */
function chemin(xy, polygones, tolerance = 0.4) {
  return polygones
    .flatMap(anneaux => anneaux.map(a => {
      const pts = simplifier(a.map(([lo, la]) => xy(lo, la)), tolerance)
      if (pts.length < 3) return ''
      return 'M' + pts.map(p => p.join(',')).join('L') + 'Z'
    }))
    .join('')
}

let _departements = null
let _pays = null
const departementsBruts = () =>
  (_departements ??= JSON.parse(readFileSync(path.join(ICI, 'donnees/france-departements.json'), 'utf8')).departements)
const paysBruts = () =>
  (_pays ??= JSON.parse(readFileSync(path.join(ICI, 'donnees/europe-pays.json'), 'utf8')).pays)

/**
 * France métropolitaine (Corse comprise), Lambert conique (proche du Lambert 93).
 * Emprise : de la pointe du Raz à l'Alsace, de Dunkerque à Bonifacio.
 */
export function carteFrance(cadre) {
  const proj = lambertConique(3, 46.5, 44, 49)
  const emprise = [[-5.2, 48.4], [8.3, 48.9], [2.5, 51.1], [9.6, 41.3], [3.1, 42.3], [-1.8, 43.3], [7.6, 43.7], [-4.8, 48.8], [8.2, 49.1]]
  const c = cadrer(proj, emprise, cadre)
  const deps = departementsBruts()
  return {
    ...c,
    departements: (tolerance = 0.35) => deps.map(d => ({ code: d.code, nom: d.nom, region: d.region, d: chemin(c.xy, d.polygones, tolerance) })),
    // Contour : la France des pays d'Europe (frontières et côtes), réduite à la métropole.
    contour: (tolerance = 0.4) => {
      const fra = paysBruts().find(p => p.iso === 'FRA')
      const metro = fra.polygones.filter(an => an[0].every(([lo, la]) => lo > -6 && lo < 10 && la > 41 && la < 52))
      return chemin(c.xy, metro, tolerance)
    },
    voisins: (tolerance = 0.5) => paysBruts()
      .filter(p => ['ESP', 'AND', 'ITA', 'CHE', 'DEU', 'BEL', 'LUX', 'GBR', 'NLD', 'MCO', 'AUT'].includes(p.iso))
      .map(p => chemin(c.xy, p.polygones, tolerance)).join(''),
  }
}

/** Europe, Lambert azimutale équivalente centrée sur 10° E, 52° N. */
export function carteEurope(cadre, emprise = [[-10.5, 36], [-10, 52], [34.5, 35], [31, 70.5], [20, 71], [26, 34.5], [-9.5, 43]]) {
  const proj = lambertAzimutale(10, 52)
  const c = cadrer(proj, emprise, cadre)
  return {
    ...c,
    pays: (tolerance = 0.45) => paysBruts().map(p => ({ iso: p.iso, nom: p.nom, ue: p.ue, d: chemin(c.xy, p.polygones, tolerance) })),
  }
}
