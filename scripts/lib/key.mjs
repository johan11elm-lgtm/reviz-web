// -------------------------------------------------------
// Réviz — Cœur du détourage des mascottes (fond magenta)
//
// Extrait de scripts/key-mascot.mjs (technique validée le 2026-08-29 sur la
// série matières/situations) pour être partagé avec scripts/import-mascots.mjs.
// -------------------------------------------------------
import sharp from 'sharp'

export const DEFAULT_BG = [244, 4, 240]

/**
 * Détoure un PNG à fond uni magenta et renvoie un master 1024×1024 à alpha doux.
 *
 * Clé par distance colorimétrique au fond (rampe douce 70→150) : les couleurs
 * du personnage (crème, corail, or, rose/violet des accessoires) restent à
 * distance > 150 du magenta — aucune ne peut être mangée. Puis despill des
 * bords, érosion 1 px du alpha (anneau contaminé) et réduction Lanczos depuis
 * la résolution native (anti-aliasing).
 *
 * @param {string|Buffer} src — chemin ou buffer du PNG brut
 * @param {number[]} [bg=DEFAULT_BG] — couleur du fond à retirer
 * @returns {Promise<Buffer>} PNG 1024×1024 RGBA
 */
export async function keyMascot(src, bg = DEFAULT_BG) {
  const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const { width: w, height: h } = info

  const A = new Float32Array(w * h)
  for (let i = 0; i < w * h; i++) {
    const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2]
    const d = Math.hypot(r - bg[0], g - bg[1], b - bg[2])
    A[i] = Math.max(0, Math.min(1, (d - 70) / 80))
    if (A[i] > 0 && A[i] < 1) {
      const spill = Math.min(r, b) - g
      if (spill > 15) {
        data[i * 4] = Math.max(0, r - spill * 0.9)
        data[i * 4 + 2] = Math.max(0, b - spill * 0.9)
      }
    }
  }

  // Érosion 1 px (min 3×3) du alpha
  const E = new Float32Array(w * h)
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let m = 1
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const yy = Math.min(h - 1, Math.max(0, y + dy)), xx = Math.min(w - 1, Math.max(0, x + dx))
      m = Math.min(m, A[yy * w + xx])
    }
    E[y * w + x] = m
  }
  for (let i = 0; i < w * h; i++) data[i * 4 + 3] = Math.round(E[i] * 255)

  return sharp(data, { raw: { width: w, height: h, channels: 4 } })
    .resize(1024, 1024, { kernel: 'lanczos3' }).png().toBuffer()
}

/**
 * Mesure la qualité d'un master détouré (cf. scripts/qa-mascots.mjs).
 * @returns {Promise<{soft:number, edge:number, spill:number, fragments:number, bbox:number[]}>}
 */
export async function inspectMaster(src) {
  const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const { width: w, height: h } = info
  let opaque = 0, soft = 0, edge = 0, spilled = 0
  let x0 = w, y0 = h, x1 = 0, y1 = 0
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = (y * w + x) * 4
      const a = data[i + 3]
      if (a > 250) opaque++
      else if (a > 10) soft++
      if (a <= 10) continue
      if (x < x0) x0 = x; if (x > x1) x1 = x
      if (y < y0) y0 = y; if (y > y1) y1 = y
      let isEdge = false
      for (let dy = -1; dy <= 1 && !isEdge; dy++)
        for (let dx = -1; dx <= 1; dx++) if (data[((y + dy) * w + (x + dx)) * 4 + 3] <= 10) { isEdge = true; break }
      if (!isEdge) continue
      edge++
      // reste de fond : rouge ET bleu nettement au-dessus du vert
      if (Math.min(data[i], data[i + 2]) - data[i + 1] > 25) spilled++
    }
  }
  const total = opaque + soft || 1
  return {
    soft: +(100 * soft / total).toFixed(2),      // % de pixels semi-transparents (bord doux)
    edge,                                        // longueur du contour en px
    spill: +(100 * spilled / (edge || 1)).toFixed(1), // % du contour encore teinté par le fond
    coverage: +(100 * total / (w * h)).toFixed(1),
    bbox: [x0, y0, x1, y1],
  }
}
