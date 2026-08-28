// -------------------------------------------------------
// Réviz — Détourage des mascottes générées (fond magenta)
//
// Entrée  : PNG brut généré (fond magenta uni, ~#F404F0, toute taille)
// Sortie  : master 1024×1024 à alpha doux, prêt pour assets-src/mascot/
//
// Clé par distance colorimétrique au fond (rampe douce 70→150) : les
// couleurs du personnage (crème, corail, or, rose/violet des accessoires)
// restent à distance > 150 du magenta — aucune ne peut être mangée.
// Puis despill des bords, érosion 1 px du alpha (anneau contaminé) et
// réduction Lanczos depuis la résolution native (anti-aliasing).
//
// Usage : node scripts/key-mascot.mjs <brut.png> <sortie.png> [rrr,ggg,bbb]
//         (couleur de fond optionnelle, défaut 244,4,240)
// -------------------------------------------------------
import sharp from 'sharp'

const [src, out, bgArg] = process.argv.slice(2)
if (!src || !out) {
  console.error('Usage : node scripts/key-mascot.mjs <brut.png> <sortie.png> [r,g,b]')
  process.exit(1)
}
const BG = bgArg ? bgArg.split(',').map(Number) : [244, 4, 240]

const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
const { width: w, height: h } = info

const A = new Float32Array(w * h)
for (let i = 0; i < w * h; i++) {
  const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2]
  const d = Math.hypot(r - BG[0], g - BG[1], b - BG[2])
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

await sharp(data, { raw: { width: w, height: h, channels: 4 } })
  .resize(1024, 1024, { kernel: 'lanczos3' }).png().toFile(out)
console.log(`✔ ${out} (1024×1024, alpha doux)`)
