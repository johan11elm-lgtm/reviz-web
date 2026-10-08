// Réviz — Contour d'une chromatide (bâtonnet arrondi, étranglé au centromère), pour les schémas de 3e SVT.
import { r1 } from './_svt.mjs'

/**
 * Chromatide de (x, haut) à (x, bas), centromère en yc, demi-largeur hw.
 * ecart(y) : décalage horizontal de l'axe (pour la forme en X), 0 au centromère.
 * Renvoie un chemin fermé (points tous les `pas` px).
 */
export function chromatide(x, haut, yc, bas, hw, { ecart = () => 0, pas = 2.5, etrangle = 0.45 } = {}) {
  const d = [], g = []
  const n = Math.ceil((bas - haut) / pas)
  for (let i = 0; i <= n; i++) {
    const y = haut + (bas - haut) * i / n
    // arrondi des extrémités
    const dh = Math.min(y - haut, bas - y)
    const cap = dh >= hw ? 1 : Math.sqrt(Math.max(0, 1 - ((hw - dh) / hw) ** 2))
    const w = hw * cap * (1 - etrangle * Math.exp(-(((y - yc) / (hw * 1.1)) ** 2)))
    const cx = x + ecart(y)
    d.push([cx + w, y]); g.push([cx - w, y])
  }
  const pts = [...d, ...g.reverse()]
  return 'M' + pts.map(([a, b]) => `${r1(a)},${r1(b)}`).join('L') + 'Z'
}
