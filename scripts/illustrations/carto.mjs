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
//   const m = carteMonde({ x: 4, y: 4, largeur: 352 })  // planisphère (projection Natural Earth)
//   m.pays()               → [{ iso, unite, nom, continent, population, d }]
//   m.lacs(), m.fleuves(['Mississippi']), m.graticule(30), m.bord()
//   const z = carteZone({ x: 4, y: 4, largeur: 352 }, [[lon, lat], …])  // région du monde
//   z.pays(), z.lacs(), z.fleuves(), z.lander()   (à découper au cadre : couperRect de cartes/_commun.mjs)
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

let _monde = null
let _lacs = null
let _fleuves = null
let _lander = null
const mondeBrut = () => (_monde ??= JSON.parse(readFileSync(path.join(ICI, 'donnees/monde-pays.json'), 'utf8')).pays)
const lacsBruts = () => (_lacs ??= JSON.parse(readFileSync(path.join(ICI, 'donnees/monde-lacs.json'), 'utf8')).lacs)
const fleuvesBruts = () => (_fleuves ??= JSON.parse(readFileSync(path.join(ICI, 'donnees/monde-fleuves.json'), 'utf8')).fleuves)
const landerBruts = () => (_lander ??= JSON.parse(readFileSync(path.join(ICI, 'donnees/allemagne-lander.json'), 'utf8')).lander)

/** <path d> de lignes ouvertes (fleuves) en lon/lat. */
function cheminLignes(xy, lignes, tolerance = 0.4) {
  return lignes.map(l => {
    const pts = simplifier(l.map(([lo, la]) => xy(lo, la)), tolerance)
    return pts.length < 2 ? '' : 'M' + pts.map(p => p.join(',')).join('L')
  }).join('')
}

/** Couches communes à toutes les cartes du monde (pays, lacs, fleuves). */
function couchesMonde(xy, garder = () => true) {
  return {
    // Unités cartographiques : le Royaume-Uni en 4 nations, la France métropolitaine (FXX) séparée des DROM.
    pays: (tolerance = 0.45) => mondeBrut().filter(garder).map(p => ({
      iso: p.iso, unite: p.unite, nom: p.nom, continent: p.continent, population: p.population, d: chemin(xy, p.polygones, tolerance),
    })),
    lacs: (tolerance = 0.45) => lacsBruts().filter(garder).map(l => ({ nom: l.nom, d: chemin(xy, l.polygones, tolerance) })),
    /** Fleuves (noms anglais de Natural Earth) ; `noms` limite la liste. */
    fleuves: (noms = null, tolerance = 0.4) => fleuvesBruts()
      .filter(f => (!noms || noms.includes(f.nom)) && garder({ polygones: [f.lignes] }))
      .map(f => ({ nom: f.nom, d: cheminLignes(xy, f.lignes, tolerance) })),
    lander: (tolerance = 0.4) => landerBruts().map(l => ({ nom: l.nom, d: chemin(xy, l.polygones, tolerance) })),
  }
}

/** Projection Natural Earth (Šavrič et al., 2011), en radians. */
function naturalEarth(lon0 = 0) {
  return (lon, lat) => {
    const l = (lon - lon0) * RAD
    const p = lat * RAD
    const p2 = p * p
    const p4 = p2 * p2
    const x = l * (0.8707 - 0.131979 * p2 + p4 * (-0.013791 + p4 * (0.003971 * p2 - 0.001529 * p4)))
    const y = p * (1.007226 + p2 * (0.015085 + p4 * (-0.044475 + 0.028874 * p2 - 0.005916 * p4)))
    return [x, -y]
  }
}

/**
 * Planisphère centré sur Greenwich, projection Natural Earth.
 * `sud` : latitude du bas du cadre (−58 par défaut, sans l'Antarctique ; −90 pour l'inclure).
 * `nord` : latitude du haut (84 par défaut).
 */
export function carteMonde(cadre, { sud = -58, nord = 84 } = {}) {
  const proj = naturalEarth(0)
  const emprise = [[-180, 0], [180, 0], [0, sud], [0, nord]]
  const c = cadrer(proj, emprise, cadre)
  const garder = p => sud <= -65 || !p.polygones?.every?.(an => an[0].every(([, la]) => la < -60))
  const bordPts = []
  for (let la = sud; la <= nord; la += 2) bordPts.push(c.xy(180, la))
  for (let la = nord; la >= sud; la -= 2) bordPts.push(c.xy(-180, la))
  return {
    ...c,
    ...couchesMonde(c.xy, garder),
    /** Méridiens et parallèles tous les `pas` degrés (path ouvert). */
    graticule: (pas = 30) => {
      let s = ''
      for (let lo = -180; lo <= 180; lo += pas) {
        const pts = []
        for (let la = sud; la <= nord; la += 2) pts.push(c.xy(lo, la))
        s += 'M' + pts.map(p => p.join(',')).join('L')
      }
      for (let la = Math.ceil(sud / pas) * pas; la <= nord; la += pas) {
        const pts = []
        for (let lo = -180; lo <= 180; lo += 4) pts.push(c.xy(lo, la))
        s += 'M' + pts.map(p => p.join(',')).join('L')
      }
      return s
    },
    /** Parallèle de latitude `la` (équateur, tropiques, cercles polaires). */
    parallele: la => {
      const pts = []
      for (let lo = -180; lo <= 180; lo += 4) pts.push(c.xy(lo, la))
      return 'M' + pts.map(p => p.join(',')).join('L')
    },
    meridien: lo => {
      const pts = []
      for (let la = sud; la <= nord; la += 2) pts.push(c.xy(lo, la))
      return 'M' + pts.map(p => p.join(',')).join('L')
    },
    /** Bord du planisphère (côtés courbes, haut et bas droits). */
    bord: () => 'M' + simplifier(bordPts, 0.2).map(p => p.join(',')).join('L') + 'Z',
  }
}

/**
 * Région du monde (États-Unis, Afrique de l'Ouest, Méditerranée, îles Britanniques…),
 * Lambert azimutale équivalente centrée sur `centre` [lon, lat] (par défaut le milieu de l'emprise).
 * Les couches couvrent le monde entier : les découper au cadre (couperRect).
 */
export function carteZone(cadre, emprise, centre = null) {
  const lons = emprise.map(p => p[0])
  const lats = emprise.map(p => p[1])
  const [lon0, lat0] = centre ?? [(Math.min(...lons) + Math.max(...lons)) / 2, (Math.min(...lats) + Math.max(...lats)) / 2]
  const proj = lambertAzimutale(lon0, lat0)
  const c = cadrer(proj, emprise, cadre)
  // On écarte ce qui est à plus de 75° du centre (la projection s'y déforme trop).
  const proche = ([lo, la]) => {
    const p = la * RAD
    const p0 = lat0 * RAD
    return Math.sin(p0) * Math.sin(p) + Math.cos(p0) * Math.cos(p) * Math.cos((lo - lon0) * RAD) > Math.cos(75 * RAD)
  }
  const garder = p => p.polygones.some(an => an[0].some(proche))
  return { ...c, ...couchesMonde(c.xy, garder) }
}
