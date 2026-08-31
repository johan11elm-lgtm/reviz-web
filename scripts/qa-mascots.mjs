// -------------------------------------------------------
// Réviz — Contrôle qualité du détourage des mascottes
//
// Deux sorties :
//   • un tableau de mesures par master (bord doux, longueur du contour,
//     reste de fond magenta, surface occupée) ;
//   • des planches de contact PNG (fond sombre + fond clair) et des zooms de
//     contour, pour juger à l'œil ce qu'aucune mesure ne dit.
//
// Repères, calés sur la série d'août détourée avec scripts/key-mascot.mjs :
//   bord doux ≥ 0,3 % (0 % = alpha binaire, contour en escalier — à refaire ;
//     un sujet très compact plafonne bas, un sujet à fines antennes monte haut)
//   reste de fond ≤ 3 % (au-delà : liseré magenta visible sur fond clair)
//
// Usage : node scripts/qa-mascots.mjs [--out=<dossier>] [--filtre=<motif>]
// -------------------------------------------------------
import sharp from 'sharp'
import { readdirSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import { inspectMaster } from './lib/key.mjs'

const arg = (n, d) => (process.argv.find(a => a.startsWith(`--${n}=`)) || `--${n}=${d}`).split('=').slice(1).join('=')
const SRC = path.resolve('assets-src/mascot')
const OUT = path.resolve(arg('out', 'assets-src/mascot/_qa'))
const filtre = arg('filtre', '')

const files = readdirSync(SRC).filter(f => /^pose-[ms]?\d+-[a-z]+\.png$/.test(f) && f.includes(filtre)).sort()
if (!files.length) { console.error('Aucun master à contrôler.'); process.exit(1) }
mkdirSync(OUT, { recursive: true })

const rows = []
for (const f of files) rows.push({ f, ...(await inspectMaster(path.join(SRC, f))) })

console.log('\nmaster'.padEnd(25), 'bord doux'.padStart(10), 'contour'.padStart(9), 'reste fond'.padStart(11), 'surface'.padStart(9), '  verdict')
for (const r of [...rows].sort((a, b) => a.soft - b.soft)) {
  const pb = []
  if (r.soft < 0.3) pb.push('bord dur')
  if (r.spill > 3) pb.push('liseré magenta')
  console.log(
    r.f.padEnd(25), `${r.soft} %`.padStart(10), String(r.edge).padStart(9),
    `${r.spill} %`.padStart(11), `${r.coverage} %`.padStart(9),
    `  ${pb.length ? '⚠ ' + pb.join(' + ') : '✔'}`,
  )
}
const bad = rows.filter(r => r.soft < 0.3 || r.spill > 3)
console.log(`\n${rows.length - bad.length}/${rows.length} masters propres${bad.length ? ` — à refaire : ${bad.map(r => r.f.replace(/^pose-|\.png$/g, '')).join(', ')}` : ''}`)

// --- Planches de contact ---
const CELL = 260, COLS = 6
async function sheet(out, bg) {
  const comps = []
  for (let i = 0; i < files.length; i++) {
    const img = await sharp(path.join(SRC, files[i])).resize(CELL - 20, CELL - 20).png().toBuffer()
    const col = i % COLS, row = Math.floor(i / COLS)
    comps.push({ input: img, left: col * CELL + 10, top: row * CELL + 10 })
    const label = files[i].replace(/^pose-|\.png$/g, '')
    comps.push({
      input: Buffer.from(`<svg width="${CELL}" height="22"><text x="6" y="16" font-family="monospace" font-size="13" fill="#e2483d">${label}</text></svg>`),
      left: col * CELL, top: row * CELL + CELL - 22,
    })
  }
  await sharp({ create: { width: COLS * CELL, height: Math.ceil(files.length / COLS) * CELL, channels: 4, background: bg } })
    .composite(comps).png().toFile(out)
}
await sheet(path.join(OUT, 'planche-sombre.png'), '#1a1030')
await sheet(path.join(OUT, 'planche-claire.png'), '#ffffff')

// --- Zooms de contour (300 px autour du coin haut-gauche du sujet, ×2) ---
const Z = 300, ZC = 600
const zoomFiles = (bad.length ? bad : rows).slice(0, 6)
const zc = []
for (let i = 0; i < zoomFiles.length; i++) {
  const r = zoomFiles[i]
  const left = Math.max(0, Math.min(1024 - Z, r.bbox[0] - 10))
  const top = Math.max(0, Math.min(1024 - Z, r.bbox[1] - 10))
  const crop = await sharp(path.join(SRC, r.f)).extract({ left, top, width: Z, height: Z })
    .resize(ZC, ZC, { kernel: 'nearest' }).png().toBuffer()
  const cell = await sharp({ create: { width: ZC, height: ZC, channels: 4, background: '#1a1030' } })
    .composite([{ input: crop }]).png().toBuffer()
  zc.push({ input: cell, left: (i % 3) * ZC, top: Math.floor(i / 3) * ZC })
  zc.push({
    input: Buffer.from(`<svg width="${ZC}" height="26"><text x="8" y="20" font-family="monospace" font-size="17" fill="#ffd166">${r.f.replace(/^pose-|\.png$/g, '')}</text></svg>`),
    left: (i % 3) * ZC, top: Math.floor(i / 3) * ZC + ZC - 26,
  })
}
await sharp({ create: { width: 3 * ZC, height: Math.ceil(zoomFiles.length / 3) * ZC, channels: 4, background: '#000' } })
  .composite(zc).png().toFile(path.join(OUT, 'zoom-contours.png'))

console.log(`\nPlanches écrites dans ${path.relative(process.cwd(), OUT)}/ : planche-sombre.png, planche-claire.png, zoom-contours.png`)
