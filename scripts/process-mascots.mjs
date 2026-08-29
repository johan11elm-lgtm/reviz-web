// -------------------------------------------------------
// Réviz — Retraitement des mascottes
//
// Masters 1024 (sources, non déployés) : assets-src/mascot/
// Variantes servies (générées ici)     : public/mascot/@256 + @512, PNG + WebP
//
// Par défaut : régénère les variantes à partir des masters
// (idempotent, à relancer après ajout d'une pose).
//
// --erode=N : érode en plus le bord des masters de N pixels (min N×N).
// Correction PONCTUELLE du halo : les masters avaient un alpha binaire dont
// les pixels de bord étaient contaminés par le rose du fond d'origine ;
// l'érosion retire cet anneau (fait le 2026-07-02, cumul 4px). NE PAS
// relancer --erode sur des masters déjà corrigés (chaque exécution ronge
// N px de plus).
//
// Usage : node scripts/process-mascots.mjs [--erode=N]
// -------------------------------------------------------

import sharp from 'sharp'
import { readdirSync, renameSync, mkdirSync } from 'node:fs'
import path from 'node:path'

const SRC_DIR = path.resolve(process.cwd(), 'assets-src/mascot')
const OUT_DIR = path.resolve(process.cwd(), 'public/mascot')
const SIZES = [256, 512]

const erodeArg = process.argv.find(a => a.startsWith('--erode='))
const ERODE = erodeArg ? Math.max(0, parseInt(erodeArg.split('=')[1], 10) || 0) : 0

// Érosion morphologique de l'alpha (min sur fenêtre (2r+1)²), séparable
// en deux passes 1D horizontale + verticale pour rester O(n·r).
function erodeAlpha(data, w, h, r) {
  const src = new Uint8Array(w * h)
  for (let i = 0; i < w * h; i++) src[i] = data[i * 4 + 3]
  const tmp = new Uint8Array(w * h)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let m = 255
      for (let dx = -r; dx <= r; dx++) {
        const nx = Math.min(w - 1, Math.max(0, x + dx))
        const a = src[y * w + nx]
        if (a < m) m = a
      }
      tmp[y * w + x] = m
    }
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let m = 255
      for (let dy = -r; dy <= r; dy++) {
        const ny = Math.min(h - 1, Math.max(0, y + dy))
        const a = tmp[ny * w + x]
        if (a < m) m = a
      }
      data[(y * w + x) * 4 + 3] = m
    }
  }
}

// pose-<n>-nom.png (poses historiques) et pose-[ms]<n>-nom.png (matières/situations)
const masters = readdirSync(SRC_DIR).filter(f => /^pose-[ms]?\d+-[a-z]+\.png$/.test(f))
if (masters.length === 0) {
  console.error('Aucun master pose-*.png trouvé dans', SRC_DIR)
  process.exit(1)
}
mkdirSync(OUT_DIR, { recursive: true })

for (const file of masters) {
  const src = path.join(SRC_DIR, file)
  const base = file.replace(/\.png$/, '')

  const { data, info } = await sharp(src).raw().ensureAlpha().toBuffer({ resolveWithObject: true })
  if (ERODE > 0) erodeAlpha(data, info.width, info.height, ERODE)

  const master = sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })

  if (ERODE > 0) {
    await master.clone().png({ compressionLevel: 9 }).toFile(src + '.tmp')
    renameSync(src + '.tmp', src)
  }

  for (const size of SIZES) {
    const resized = master.clone().resize(size, size, { fit: 'inside', withoutEnlargement: true })
    await resized.clone().png({ compressionLevel: 9 }).toFile(path.join(OUT_DIR, `${base}@${size}.png`))
    await resized.clone().webp({ quality: 82, alphaQuality: 90 }).toFile(path.join(OUT_DIR, `${base}@${size}.webp`))
  }
  console.log(`${file}${ERODE ? ` — bord érodé de ${ERODE}px` : ''} — variantes @${SIZES.join('/@')} PNG+WebP OK`)
}
console.log('Terminé.')
