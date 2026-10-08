// -------------------------------------------------------
// Réviz — Outils partagés par les cartes du groupe « géographie 3e-4e »
// (planisphères et cartes régionales des lots 2 et 3) : fond de planisphère
// prêt à l'emploi, fond régional découpé au cadre, cercles, étiquettes.
// S'appuie sur ../carto.mjs (Natural Earth, domaine public) et ./_commun.mjs.
// -------------------------------------------------------
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { carteMonde, carteZone, simplifier } from '../carto.mjs'
import { C, anneaux, compact, couperRect, r1 } from './_commun.mjs'

const ICI = path.dirname(fileURLToPath(import.meta.url))

export const MER = '#EEF3FA'
export const TERRE = '#F1EEE8'
export const TERRE_TRAIT = '#CFC8BA'

/**
 * Planisphère : { m, hauteur, svg (océan + terres + bord), terres(filtre, fill, stroke) }.
 * `filtre(p)` choisit les pays d'une couche (p.iso, p.unite, p.continent).
 */
export function fondMonde(cadre, { sud = -58, nord = 84, tol = 0.6, prec = 0.5 } = {}) {
  const m = carteMonde(cadre, { sud, nord })
  // Terres découpées aux latitudes limites (le bord du haut et du bas est droit).
  const R = [cadre.x - 1, cadre.y, cadre.x + cadre.largeur + 1, cadre.y + m.hauteur]
  const pays = m.pays(tol).map(p => ({ ...p, rings: couperRect(anneaux(p.d), R) })).filter(p => p.rings.length)
  const couche = (filtre, attrs) => {
    const d = compact(pays.filter(filtre).flatMap(p => p.rings), { prec, aireMin: 0.3 })
    return d ? `<path d="${d}" ${attrs}/>` : ''
  }
  const bord = m.bord()
  const svg = [
    `<path d="${bord}" fill="${MER}"/>`,
    couche(() => true, `fill="${TERRE}" stroke="${TERRE_TRAIT}" stroke-width="0.5" stroke-linejoin="round"`),
    `<path d="${bord}" fill="none" stroke="${C.encre}" stroke-width="1" opacity="0.5"/>`,
  ].join('\n')
  return { m, pays, hauteur: m.hauteur, svg, couche, bord }
}

/** Fond régional : pays découpés au cadre [x0, y0, x1, y1]. */
export function fondZone(cadre, emprise, centre = null, { tol = 0.35, prec = 0.5, marge = 0 } = {}) {
  const z = carteZone(cadre, emprise, centre)
  const R = [cadre.x, cadre.y, cadre.x + cadre.largeur, cadre.y + z.hauteur]
  // `marge` : découpe un peu au-delà du cadre (à masquer ensuite par un passe-partout), pour
  // qu'aucun trait épais ne longe le bord du cadre là où les pays sont coupés.
  const RC = [R[0] - marge, R[1] - marge, R[2] + marge, R[3] + marge]
  const pays = z.pays(tol).map(p => ({ ...p, rings: couperRect(anneaux(p.d), RC) })).filter(p => p.rings.length)
  const couche = (filtre, attrs, opts = {}) => {
    const d = compact(pays.filter(filtre).flatMap(p => p.rings), { prec, aireMin: 0.3, ...opts })
    return d ? `<path d="${d}" ${attrs}/>` : ''
  }
  const lacs = (noms = null) => compact(z.lacs(tol).filter(l => !noms || noms.includes(l.nom)).flatMap(l => couperRect(anneaux(l.d), R)), { prec, aireMin: 1 })
  /** Passe-partout blanc qui masque tout ce qui dépasse du cadre (dans un viewBox de largeur W et hauteur H). */
  const passePartout = (W, H) => `<path d="M0,0H${W}V${H}H0ZM${R[0]},${R[1]}V${R[3]}H${R[2]}V${R[1]}Z" fill="#FFFFFF" fill-rule="evenodd"/>`
  return { z, pays, R, couche, lacs, passePartout, hauteur: z.hauteur }
}

/** Cercle proportionnel à une valeur (surface ∝ valeur). */
export const rayon = (v, vRef, rRef) => r1(rRef * Math.sqrt(v / vRef))

/** Courbe lisse (Catmull-Rom → Bézier cubiques) passant par des points [x, y]. */
export function lisse(P, tension = 1) {
  if (P.length < 2) return ''
  let d = `M${r1(P[0][0])},${r1(P[0][1])}`
  for (let i = 0; i < P.length - 1; i++) {
    const p0 = P[i - 1] ?? P[i]
    const p1 = P[i]
    const p2 = P[i + 1]
    const p3 = P[i + 2] ?? p2
    const c1 = [p1[0] + ((p2[0] - p0[0]) / 6) * tension, p1[1] + ((p2[1] - p0[1]) / 6) * tension]
    const c2 = [p2[0] - ((p3[0] - p1[0]) / 6) * tension, p2[1] - ((p3[1] - p1[1]) / 6) * tension]
    d += `C${r1(c1[0])},${r1(c1[1])} ${r1(c2[0])},${r1(c2[1])} ${r1(p2[0])},${r1(p2[1])}`
  }
  return d
}

/** Rond numéroté (repère de légende) : fond encre ou accent, chiffre blanc. */
export function rondNumero(x, y, n, { fill = C.encre, r = 7, forme = 'rond' } = {}) {
  const fig = forme === 'carre'
    ? `<rect x="${r1(x - r + 0.5)}" y="${r1(y - r + 0.5)}" width="${2 * r - 1}" height="${2 * r - 1}" rx="1.5" fill="${fill}" stroke="#FFFFFF" stroke-width="1"/>`
    : `<circle cx="${r1(x)}" cy="${r1(y)}" r="${r}" fill="${fill}" stroke="#FFFFFF" stroke-width="1"/>`
  const deux = n > 9
  return fig + `<text x="${r1(x)}" y="${r1(y + (deux ? 3.2 : 3.5))}" text-anchor="middle" fill="#FFFFFF" font-size="${deux ? 9 : 10}" font-weight="700"${deux ? ' letter-spacing="-0.4"' : ''}>${n}</text>`
}

/**
 * Fond des États-Unis contigus (croquis et carte de localisation de 4e) :
 * Lambert azimutale centrée sur 96° O, 38° N, pays voisins, Grands Lacs, États
 * (donnees/etats-unis-etats.json, Natural Earth 1:50m Admin 1).
 * `etats(codes)` → anneaux projetés des États choisis.
 */
export function fondEtatsUnis(cadre, emprise = [[-125, 24], [-125, 49.5], [-66, 49.5], [-66, 24], [-97, 52], [-97, 22.5]]) {
  const f = fondZone(cadre, emprise, [-96, 38])
  const xy = f.z.xy
  const brut = JSON.parse(readFileSync(path.join(ICI, '../donnees/etats-unis-etats.json'), 'utf8')).etats
  const etatsRings = Object.fromEntries(brut.map(e => [e.code, e.polygones.flatMap(an => an.map(a => simplifier(a.map(([lo, la]) => xy(lo, la)), 0.35)))]))
  const etats = codes => codes.flatMap(c => etatsRings[c] ?? [])
  const GRANDS_LACS = ['Supérieur', 'Michigan', 'Huron', 'Érié', 'Ontario']
  const lacs = compact(f.z.lacs(0.35).filter(l => GRANDS_LACS.includes(l.nom)).flatMap(l => couperRect(anneaux(l.d), f.R)), { prec: 0.5, aireMin: 1 })
  return { ...f, xy, etats, lacs }
}

/** Façades maritimes des États-Unis : points du trait de côte (lon, lat) par lesquels passe le trait lissé. */
export const FACADES_ETATS_UNIS = [
  // Atlantique : de Boston à Miami
  [[-70.6, 42.6], [-70.3, 41.6], [-73.6, 40.5], [-74.3, 39.4], [-75.4, 38.3], [-75.9, 36.6], [-75.6, 35.3], [-77.9, 33.9], [-79.9, 32.7], [-81.2, 31.6], [-81.3, 30.2], [-80.6, 28.4], [-80.1, 26.2]],
  // Golfe du Mexique : de Tampa à Brownsville
  [[-82.7, 27.6], [-82.9, 29.1], [-84.4, 29.9], [-87.2, 30.3], [-88.6, 30.3], [-89.4, 29.4], [-91.5, 29.4], [-93.9, 29.6], [-94.9, 29.3], [-97.2, 27.7], [-97.3, 26.1]],
  // Pacifique : de Seattle à San Diego
  [[-124.6, 48.2], [-124.1, 46.4], [-124.0, 44.2], [-124.4, 42.2], [-124.2, 40.4], [-123.7, 38.9], [-122.6, 37.7], [-121.9, 36.6], [-120.6, 34.6], [-118.4, 33.8], [-117.2, 32.7]],
]
