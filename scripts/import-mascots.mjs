// -------------------------------------------------------
// Réviz — Import d'une fournée de mascottes générées (ChatGPT, fond magenta)
//
// Chaîne complète : brut ChatGPT → détourage → master 1024 → variantes
// @256/@512 (PNG+WebP) → (option) copie vers la landing → rapport QA.
//
// 1. Déposer les PNG bruts dans assets-src/mascot/_bruts/, nommés d'après la
//    pose : `hello.png`, `pose-9-hello.png` ou `hello (2).png` — tous
//    équivalents. Les noms connus sont ceux de MASCOT_POSES
//    (src/components/Mascot.jsx), repris dans POSES ci-dessous.
// 2. `node scripts/import-mascots.mjs` — les anciens masters remplacés sont
//    sauvegardés dans assets-src/mascot/_old/ (horodatés), rien n'est perdu.
// 3. Vérifier le rapport, regarder les planches (`node scripts/qa-mascots.mjs`),
//    puis `--landing` pour pousser les @512 vers reviz-landing.
//
// Options :
//   --dir=<chemin>   dossier des bruts (défaut assets-src/mascot/_bruts)
//   --landing        copie aussi les @512 PNG dans ../reviz-landing/public/mascots
//   --bg=r,g,b       couleur de fond à retirer (défaut 244,4,240)
//   --dry            n'écrit rien, affiche seulement ce qui serait fait
// -------------------------------------------------------
import sharp from 'sharp'
import { readdirSync, mkdirSync, existsSync, copyFileSync, renameSync } from 'node:fs'
import { writeFile } from 'node:fs/promises'
import path from 'node:path'
import { keyMascot, inspectMaster, DEFAULT_BG } from './lib/key.mjs'

// Doit rester aligné avec MASCOT_POSES (src/components/Mascot.jsx).
// nom de pose → [numéro de fichier, nom du même visuel côté reviz-landing]
const POSES = {
  reading: [1, 'reading'], flashcard: [2, 'flashcard'], celebration: [3, 'celebration'],
  sleeping: [4, 'sleeping'], thinking: [5, 'thinking'], writing: [6, 'writing'],
  trophy: [7, 'trophy'], confused: [8, 'confused'], hello: [9, 'hello'],
  scan: [11, 'scan'], fire: [12, 'fire'], graduation: [13, 'graduation'],
  sad: [14, 'sad'], search: [15, 'search'], pointing: [16, 'pointing'],
  maths: ['m1', 'maths'], francais: ['m2', 'francais'], svt: ['m3', 'svt'],
  physique: ['m4', 'physique'], histgeo: ['m5', 'histgeo'], langues: ['m6', 'langues'],
  technonsi: ['m7', 'techno'], philo: ['m8', 'philo'], arts: ['m9', 'arts'],
  quiz: ['s1', 'quiz'], coach: ['s2', 'coach'], levelup: ['s3', 'levelup'],
  retour: ['s4', 'welcome'], soir: ['s5', 'night'], examen: ['s6', 'exam'],
  scanphone: ['s7', 'scanphone'], muscu: ['s8', 'muscu'],
}

const arg = (name, fallback) => {
  const found = process.argv.find(a => a.startsWith(`--${name}=`))
  return found ? found.split('=').slice(1).join('=') : fallback
}
const FLAG = n => process.argv.includes(`--${n}`)

const SRC_DIR = path.resolve(arg('dir', 'assets-src/mascot/_bruts'))
const MASTER_DIR = path.resolve('assets-src/mascot')
const OUT_DIR = path.resolve('public/mascot')
const OLD_DIR = path.join(MASTER_DIR, '_old')
const LANDING_DIR = path.resolve('../reviz-landing/public/mascots')
const BG = arg('bg') ? arg('bg').split(',').map(Number) : DEFAULT_BG
const DRY = FLAG('dry')
const SIZES = [256, 512]

if (!existsSync(SRC_DIR)) {
  console.error(`Dossier de bruts introuvable : ${SRC_DIR}`)
  console.error('Créez-le et déposez-y les PNG générés (un par pose).')
  process.exit(1)
}

// « pose-9-hello.png », « hello (2).png », « Hello.PNG » → 'hello'
function resolvePose(file) {
  const base = path.basename(file).replace(/\.png$/i, '')
    .replace(/^pose-[ms]?\d+-/i, '').replace(/\s*\(\d+\)$/, '').trim().toLowerCase()
  return POSES[base] ? base : null
}

// Un brut valide : fond très majoritairement magenta sur le pourtour de l'image.
async function checkRaw(file) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const { width: w, height: h } = info
  let border = 0, magenta = 0
  const step = Math.max(1, Math.floor(Math.min(w, h) / 200))
  for (let x = 0; x < w; x += step) {
    for (const y of [0, 1, h - 2, h - 1]) {
      const i = (y * w + x) * 4
      border++
      if (Math.hypot(data[i] - BG[0], data[i + 1] - BG[1], data[i + 2] - BG[2]) < 70) magenta++
    }
  }
  return { w, h, bgPct: +(100 * magenta / (border || 1)).toFixed(1) }
}

const files = readdirSync(SRC_DIR).filter(f => /\.png$/i.test(f) && !f.startsWith('.'))
if (files.length === 0) {
  console.error(`Aucun PNG dans ${SRC_DIR}.`)
  process.exit(1)
}

const unknown = files.filter(f => !resolvePose(f))
if (unknown.length) {
  console.error('Nom de pose non reconnu :')
  for (const f of unknown) console.error(`  ✗ ${f}`)
  console.error(`\nPoses attendues : ${Object.keys(POSES).join(', ')}`)
  process.exit(1)
}
const seen = new Map()
for (const f of files) {
  const pose = resolvePose(f)
  if (seen.has(pose)) {
    console.error(`Deux bruts pour la même pose « ${pose} » : ${seen.get(pose)} et ${f}. Gardez-en un.`)
    process.exit(1)
  }
  seen.set(pose, f)
}

if (!DRY) { mkdirSync(OLD_DIR, { recursive: true }); mkdirSync(OUT_DIR, { recursive: true }) }
const stamp = new Date().toISOString().slice(0, 10)
const report = []

for (const file of files.sort()) {
  const pose = resolvePose(file)
  const [num, landingName] = POSES[pose]
  const base = `pose-${num}-${pose}`
  const src = path.join(SRC_DIR, file)
  const masterPath = path.join(MASTER_DIR, `${base}.png`)

  const raw = await checkRaw(src)
  if (raw.bgPct < 90) {
    report.push({ pose, ok: false, note: `fond magenta sur seulement ${raw.bgPct} % du pourtour — brut rejeté` })
    continue
  }

  const keyed = await keyMascot(src, BG)
  const qa = await inspectMaster(keyed)
  const warn = []
  if (qa.soft < 0.3) warn.push('bord dur (alpha quasi binaire)')
  if (qa.spill > 3) warn.push(`${qa.spill} % du contour encore teinté`)
  if (qa.coverage < 12) warn.push(`personnage petit dans le cadre (${qa.coverage} % de surface)`)
  const [x0, y0, x1, y1] = qa.bbox
  if (x0 < 4 || y0 < 4 || x1 > 1019 || y1 > 1019) warn.push('sujet coupé par le bord du cadre')

  if (!DRY) {
    if (existsSync(masterPath)) copyFileSync(masterPath, path.join(OLD_DIR, `${base}.${stamp}.png`))
    await writeFile(masterPath, keyed)
    const m = sharp(keyed)
    for (const size of SIZES) {
      const resized = m.clone().resize(size, size, { fit: 'inside', withoutEnlargement: true })
      await resized.clone().png({ compressionLevel: 9 }).toFile(path.join(OUT_DIR, `${base}@${size}.png`))
      await resized.clone().webp({ quality: 82, alphaQuality: 90 }).toFile(path.join(OUT_DIR, `${base}@${size}.webp`))
    }
    if (FLAG('landing') && existsSync(LANDING_DIR)) {
      copyFileSync(path.join(OUT_DIR, `${base}@512.png`), path.join(LANDING_DIR, `${landingName}.png`))
    }
  }
  report.push({ pose, ok: true, note: warn.join(' ; ') || 'OK', qa, raw })
}

console.log(`\n${DRY ? '[dry-run] ' : ''}Import mascottes — ${SRC_DIR}\n`)
console.log('pose'.padEnd(14), 'brut'.padEnd(12), 'bord doux'.padStart(10), 'contour'.padStart(8), 'reste fond'.padStart(11), '  statut')
for (const r of report.sort((a, b) => a.pose.localeCompare(b.pose))) {
  if (!r.ok) { console.log(r.pose.padEnd(14), '—'.padEnd(12), ''.padStart(10), ''.padStart(8), ''.padStart(11), `  ✗ ${r.note}`); continue }
  console.log(
    r.pose.padEnd(14), `${r.raw.w}×${r.raw.h}`.padEnd(12),
    `${r.qa.soft} %`.padStart(10), String(r.qa.edge).padStart(8), `${r.qa.spill} %`.padStart(11),
    `  ${r.note === 'OK' ? '✔ OK' : '⚠ ' + r.note}`,
  )
}
const ko = report.filter(r => !r.ok).length
const warned = report.filter(r => r.ok && r.note !== 'OK').length
console.log(`\n${report.length - ko} importée(s)${warned ? `, dont ${warned} à regarder de près` : ''}${ko ? `, ${ko} rejetée(s)` : ''}.`)
if (!DRY) {
  console.log(`Anciens masters sauvegardés dans ${path.relative(process.cwd(), OLD_DIR)}/ (suffixe .${stamp}.png).`)
  console.log('Contrôle visuel : node scripts/qa-mascots.mjs')
  if (!FLAG('landing')) console.log('Landing : relancer avec --landing quand le rendu est validé.')
}
