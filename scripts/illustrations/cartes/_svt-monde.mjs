// -------------------------------------------------------
// Réviz — Planisphère centré sur le Pacifique (projection Natural Earth, méridien central `lon0`),
// pour la carte des plaques de 4e SVT : carto.mjs ne fournit que des planisphères centrés sur
// Greenwich, où la ceinture de feu du Pacifique est coupée en deux. Mêmes données Natural Earth
// (donnees/monde-pays.json, domaine public) ; polygones découpés à l'antiméridien du nouveau centre.
// -------------------------------------------------------
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { simplifier } from '../carto.mjs'

const ICI = path.dirname(fileURLToPath(import.meta.url))
const RAD = Math.PI / 180

/** Projection Natural Earth (Šavrič et al., 2011), longitude déjà recentrée, en degrés. */
function ne(L, lat) {
  const l = L * RAD, p = lat * RAD, p2 = p * p, p4 = p2 * p2
  const x = l * (0.8707 - 0.131979 * p2 + p4 * (-0.013791 + p4 * (0.003971 * p2 - 0.001529 * p4)))
  const y = p * (1.007226 + p2 * (0.015085 + p4 * (-0.044475 + 0.028874 * p2 - 0.005916 * p4)))
  return [x, -y]
}
const recentrer = (lon, lon0) => ((((lon - lon0) % 360) + 540) % 360) - 180

/** Découpe d'un anneau (L, lat) dans la bande L ∈ [a, b] (Sutherland-Hodgman, deux demi-plans). */
function couperBande(ring, a, b) {
  const couper = (pts, garde, xl) => {
    const out = []
    for (let i = 0; i < pts.length; i++) {
      const P = pts[i], Q = pts[(i + 1) % pts.length]
      const gp = garde(P[0]), gq = garde(Q[0])
      if (gp) out.push(P)
      if (gp !== gq) { const t = (xl - P[0]) / (Q[0] - P[0]); out.push([xl, P[1] + t * (Q[1] - P[1])]) }
    }
    return out
  }
  return couper(couper(ring, x => x >= a, a), x => x <= b, b)
}

export function mondePacifique({ x = 0, y = 0, largeur }, { lon0 = 155, sud = -60, nord = 80 } = {}) {
  const coins = [ne(-180, 0), ne(180, 0), ne(0, sud), ne(0, nord)]
  const minX = Math.min(...coins.map(p => p[0])), maxX = Math.max(...coins.map(p => p[0]))
  const minY = Math.min(...coins.map(p => p[1])), maxY = Math.max(...coins.map(p => p[1]))
  const k = largeur / (maxX - minX)
  const proj = (L, la) => { const [px, py] = ne(L, la); return [x + (px - minX) * k, y + (py - minY) * k] }
  const xy = (lon, la) => proj(recentrer(lon, lon0), la)
  /** Anneaux projetés des terres (sans l'Antarctique), simplifiés à `tol` px. */
  function terres(tol = 0.8) {
    const pays = JSON.parse(readFileSync(path.join(ICI, '../donnees/monde-pays.json'), 'utf8')).pays
    const out = []
    for (const p of pays) {
      for (const poly of p.polygones) {
        const anneau = poly[0]
        if (anneau.every(([, la]) => la < sud)) continue
        // longitudes recentrées et déroulées
        const r = []
        for (const [lo, la] of anneau) {
          let L = recentrer(lo, lon0)
          if (r.length) { const d = L - r[r.length - 1][0]; if (d > 180) L -= 360; else if (d < -180) L += 360 }
          r.push([L, Math.max(la, sud)])
        }
        for (const dec of [0, 360, -360]) {
          const c = couperBande(r.map(([L, la]) => [L + dec, la]), -180, 180)
          if (c.length < 3) continue
          const pts = simplifier(c.map(([L, la]) => proj(L, la)), tol)
          if (pts.length >= 3) out.push(pts)
        }
      }
    }
    return out
  }
  /** Polylignes [lon, lat] → listes de points projetés, coupées à l'antiméridien et hors cadre. */
  function polylignes(ls) {
    const out = []
    for (const l of ls) {
      let m = [], prec = null
      const fin = () => { if (m.length > 1) out.push(m); m = [] }
      for (const [lo, la] of l) {
        const L = recentrer(lo, lon0)
        if (la < sud || la > nord || (prec !== null && Math.abs(L - prec) > 180)) fin()
        if (la >= sud && la <= nord) m.push(proj(L, la))
        prec = L
      }
      fin()
    }
    return out
  }
  const bord = () => {
    const pts = []
    for (let la = sud; la <= nord; la += 2) pts.push(proj(180, la))
    for (let la = nord; la >= sud; la -= 2) pts.push(proj(-180, la))
    return pts
  }
  return { xy, hauteur: (maxY - minY) * k, terres, polylignes, bord }
}
