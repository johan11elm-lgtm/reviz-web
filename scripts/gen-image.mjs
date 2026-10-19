// -------------------------------------------------------
// Réviz — Génération d'images par Codex (ChatGPT Plus), sans navigateur
//
// Codex CLI est connecté au compte ChatGPT de Johan : son outil de génération
// d'images remplace le pilotage de chatgpt.com dans Chrome. Par défaut, la
// référence pose-9-hello.png est jointe et le prompt maître de
// BRIEF-MASCOTTES.md est préfixé : on ne donne que la scène.
//
// Usage :
//   node scripts/gen-image.mjs <sortie.png> "<scène>" [--libre] [--ref img.png]...
//   node scripts/gen-image.mjs --lot lot.json [--parallele 3]
//
//   --libre   prompt envoyé tel quel, sans référence ni prompt maître
//             (décors, illustrations, vignettes…)
//   --ref     image jointe en plus (style, pose de départ…), répétable
//   lot.json  [{ "sortie": "...png", "scene": "...", "libre": false, "refs": [] }]
//
// Ensuite, pour une mascotte : node scripts/key-mascot.mjs <brut> <master>
// ~1 min par image ; 3 en parallèle tiennent.
// -------------------------------------------------------
import { spawn } from 'node:child_process'
import { mkdtemp, readFile, copyFile, stat, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const REF = path.join(ROOT, 'assets-src/mascot/pose-9-hello.png')
const MODELE = 'gpt-6.1-sol'

const PROMPT_MAITRE = `Reprends EXACTEMENT le personnage de l'image jointe : mascotte 3D d'un \
cerveau kawaii crème/beige, gros yeux marron brillants avec reflets blancs, sourcils marron \
expressifs, petit sourire doux, fins vaisseaux corail sur les lobes, petits bras fins couleur \
peau, rendu 3D doux façon Pixar/Blender, éclairage studio chaleureux. MÊME personnage, mêmes \
proportions, même matière, même palette. Teinte crème pâle, texture lisse, PAS de jambes. \
Nouvelle scène : {SCENE}. Fond uni magenta pur (#FF00FF) sans dégradé ni ombre portée sur le \
fond. Aucun texte, aucun watermark, aucun logo. Image carrée, personnage centré (~70 % du cadre), \
accessoires 3D dans le même style.`

function parseArgs(argv) {
  const o = { refs: [], libre: false, parallele: 3, pos: [] }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--libre') o.libre = true
    else if (a === '--ref') o.refs.push(path.resolve(argv[++i]))
    else if (a === '--lot') o.lot = path.resolve(argv[++i])
    else if (a === '--parallele') o.parallele = Number(argv[++i]) || 3
    else o.pos.push(a)
  }
  return o
}

function lancer(args, cwd) {
  return new Promise((resolve) => {
    const p = spawn('codex', args, { cwd, stdio: ['ignore', 'pipe', 'pipe'] })
    let log = ''
    p.stdout.on('data', (d) => (log += d))
    p.stderr.on('data', (d) => (log += d))
    p.on('close', (code) => resolve({ code, log }))
  })
}

async function generer({ sortie, scene, libre = false, refs = [] }) {
  const dir = await mkdtemp(path.join(tmpdir(), 'reviz-gen-'))
  const images = libre ? refs : [REF, ...refs]
  const prompt = libre ? scene : PROMPT_MAITRE.replace('{SCENE}', scene)
  const consigne = `Génère UNE image avec ton outil de génération d'images, puis copie-la dans \
le dossier courant sous le nom image.png. Ne fais rien d'autre. Prompt : ${prompt}`
  // Le prompt doit précéder -i : sinon -i le prend pour une image de plus.
  const args = ['exec', '-m', MODELE, '--sandbox', 'workspace-write', '--skip-git-repo-check',
    '-C', dir, consigne]
  if (images.length) args.push('-i', ...images)

  for (let essai = 1; essai <= 2; essai++) {
    const t0 = Date.now()
    const { code, log } = await lancer(args, dir)
    const brut = path.join(dir, 'image.png')
    if (code === 0 && existsSync(brut) && (await stat(brut)).size > 10_000) {
      await mkdir(path.dirname(path.resolve(sortie)), { recursive: true })
      await copyFile(brut, sortie)
      console.log(`✔ ${sortie} (${Math.round((Date.now() - t0) / 1000)} s)`)
      return true
    }
    console.error(`✖ ${sortie} — essai ${essai} raté (code ${code})\n${log.split('\n').slice(-6).join('\n')}`)
  }
  return false
}

const o = parseArgs(process.argv.slice(2))
let travaux
if (o.lot) {
  travaux = JSON.parse(await readFile(o.lot, 'utf8'))
} else if (o.pos.length === 2) {
  travaux = [{ sortie: o.pos[0], scene: o.pos[1], libre: o.libre, refs: o.refs }]
} else {
  console.error('Usage : node scripts/gen-image.mjs <sortie.png> "<scène>" [--libre] [--ref img]…\n' +
    '        node scripts/gen-image.mjs --lot lot.json [--parallele 3]')
  process.exit(1)
}

const file = [...travaux]
let ok = 0
await Promise.all(Array.from({ length: Math.min(o.parallele, file.length) }, async () => {
  while (file.length) if (await generer(file.shift())) ok++
}))
console.log(`${ok}/${travaux.length} image(s) générée(s)`)
process.exit(ok === travaux.length ? 0 : 1)
