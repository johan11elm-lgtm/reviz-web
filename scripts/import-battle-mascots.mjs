// -------------------------------------------------------
// Réviz — Import des mascottes de la Battle (série b, une couleur par joueur)
//
// Ces mascottes sont réservées à la feature Battle : masters dans
// assets-src/mascot/battle/, variantes dans public/mascot/battle/, composant
// src/components/BattleMascot.jsx. Jamais déclarées dans MASCOT_POSES ni
// copiées vers la landing.
//
// Bruts (fond magenta) dans assets-src/mascot/_bruts/battle/ :
//   pose-b1-garde.png          bandeau encre (généré, cf. BRIEF-MASCOTTES.md)
//   pose-b1-garde-rouge.png    bandeau rouge : python3 scripts/recolor-bandeau.py
//                              <brut encre> <sortie> C8283A
// Les poses trop larges reçoivent une marge de fond magenta avant détourage,
// la même pour toutes les images d'une pose : les deux images du 6-7 et les
// deux couleurs restent superposables.
//
// Usage : node scripts/import-battle-mascots.mjs [--dry]
// -------------------------------------------------------
import sharp from 'sharp'
import { existsSync, mkdirSync } from 'node:fs'
import { writeFile } from 'node:fs/promises'
import path from 'node:path'
import { keyMascot, inspectMaster, DEFAULT_BG } from './lib/key.mjs'

// Doit rester aligné avec BATTLE_POSES (src/components/BattleMascot.jsx).
// pose → images (une seule, ou les deux images alternées du 6-7)
const POSES = {
  garde: ['b1-garde'],
  aura: ['b2-aura'],
  moinsaura: ['b3-moinsaura'],
  champion: ['b4-champion'],
  gg: ['b5-gg'],
  sixseven: ['b6-sixseven-a', 'b6-sixseven-b'],
}
const COULEURS = { encre: '', rouge: '-rouge' }

const SRC_DIR = path.resolve('assets-src/mascot/_bruts/battle')
const MASTER_DIR = path.resolve('assets-src/mascot/battle')
const OUT_DIR = path.resolve('public/mascot/battle')
const SIZES = [256, 512]
// Largeur ou hauteur maximale du sujet dans le cadre : au-delà, on ajoute du
// fond (les mascottes de la série principale occupent ~0,80-0,90 du cadre).
const MAX_RATIO = 0.9
const TARGET_RATIO = 0.86
const DRY = process.argv.includes('--dry')

// Boîte englobante du sujet sur un brut : tout ce qui s'éloigne du fond magenta.
async function rawBox(file) {
  const { data, info } = await sharp(file).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  const { width: w, height: h } = info
  const bg = [data[0], data[1], data[2]]
  let x0 = w, y0 = h, x1 = 0, y1 = 0
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 3
    if (Math.hypot(data[i] - bg[0], data[i + 1] - bg[1], data[i + 2] - bg[2]) < 70) continue
    if (x < x0) x0 = x; if (x > x1) x1 = x
    if (y < y0) y0 = y; if (y > y1) y1 = y
  }
  return { w, h, bg, ratio: Math.max((x1 - x0) / w, (y1 - y0) / h) }
}

if (!existsSync(SRC_DIR)) {
  console.error(`Dossier de bruts introuvable : ${SRC_DIR}`)
  process.exit(1)
}
if (!DRY) { mkdirSync(MASTER_DIR, { recursive: true }); mkdirSync(OUT_DIR, { recursive: true }) }

const report = []
for (const [pose, images] of Object.entries(POSES)) {
  const sources = images.flatMap(img => Object.entries(COULEURS).map(([couleur, suffix]) => ({
    img, couleur, file: path.join(SRC_DIR, `pose-${img}${suffix}.png`),
  })))
  const missing = sources.filter(s => !existsSync(s.file))
  if (missing.length) {
    for (const s of missing) report.push({ name: `${s.img}-${s.couleur}`, ok: false, note: `brut manquant : ${path.basename(s.file)}` })
    continue
  }

  // Une seule marge pour toute la pose, calculée sur l'image la plus large.
  const boxes = await Promise.all(sources.map(s => rawBox(s.file)))
  const worst = Math.max(...boxes.map(b => b.ratio))
  const side = boxes[0].w
  const pad = worst > MAX_RATIO ? Math.ceil((side * worst / TARGET_RATIO - side) / 2) : 0

  for (const [k, s] of sources.entries()) {
    const [r, g, b] = boxes[k].bg
    const input = pad
      ? await sharp(s.file).removeAlpha().extend({ top: pad, bottom: pad, left: pad, right: pad, background: { r, g, b } }).png().toBuffer()
      : s.file
    const keyed = await keyMascot(input, DEFAULT_BG)
    const qa = await inspectMaster(keyed)
    const warn = []
    if (qa.soft < 0.3) warn.push('bord dur')
    if (qa.spill > 3) warn.push(`${qa.spill} % du contour encore teinté`)
    const [x0, y0, x1, y1] = qa.bbox
    if (x0 < 4 || y0 < 4 || x1 > 1019 || y1 > 1019) warn.push('sujet coupé par le bord')

    const base = `pose-${s.img}-${s.couleur}`
    if (!DRY) {
      await writeFile(path.join(MASTER_DIR, `${base}.png`), keyed)
      const m = sharp(keyed)
      for (const size of SIZES) {
        const resized = m.clone().resize(size, size, { fit: 'inside', withoutEnlargement: true })
        await resized.clone().png({ compressionLevel: 9 }).toFile(path.join(OUT_DIR, `${base}@${size}.png`))
        await resized.clone().webp({ quality: 82, alphaQuality: 90 }).toFile(path.join(OUT_DIR, `${base}@${size}.webp`))
      }
    }
    report.push({
      name: base.replace(/^pose-/, ''), ok: true, qa, pad,
      ratio: +(((x1 - x0) / 1024)).toFixed(2), note: warn.join(' ; ') || 'OK',
    })
  }
}

console.log(`\n${DRY ? '[dry-run] ' : ''}Import mascottes Battle — ${path.relative(process.cwd(), SRC_DIR)}\n`)
console.log('image'.padEnd(26), 'marge'.padStart(6), 'largeur'.padStart(8), 'bord doux'.padStart(10), 'reste fond'.padStart(11), '  statut')
for (const r of report) {
  if (!r.ok) { console.log(r.name.padEnd(26), `  ✗ ${r.note}`); continue }
  console.log(
    r.name.padEnd(26), `${r.pad}`.padStart(6), `${r.ratio}`.padStart(8),
    `${r.qa.soft} %`.padStart(10), `${r.qa.spill} %`.padStart(11),
    `  ${r.note === 'OK' ? '✔ OK' : '⚠ ' + r.note}`,
  )
}
const ko = report.filter(r => !r.ok).length
console.log(`\n${report.length - ko} image(s) importée(s)${ko ? `, ${ko} en échec` : ''}.`)
if (ko) process.exit(1)
