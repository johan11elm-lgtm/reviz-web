// Pose les blocs `exercices` relus dans les fichiers des chapitres.
//   node scripts/exercices/integrer.mjs            → tous les brouillons de scripts/exercices/brouillons/
//   node scripts/exercices/integrer.mjs --essai    → vérifie sans rien écrire
// Chaque brouillon est relu par lireExercices (le moteur de l'app) : un élément mal formé est
// signalé et retiré, comme il le serait dans l'app.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { lireExercices } from '../../src/utils/exercicesChapitre.js'

const racine = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const brouillons = path.join(racine, 'scripts/exercices/brouillons')
const essai = process.argv.includes('--essai')

const fichiers = []
const parcourir = d => { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) parcourir(p); else if (f.endsWith('.json')) fichiers.push(p) } }
if (fs.existsSync(brouillons)) parcourir(brouillons)

const CLES = ['categories', 'causes', 'etiquettes', 'devinettes', 'calculs', 'etapes']
let ok = 0
for (const f of fichiers.sort()) {
  const rel = path.relative(brouillons, f)
  const cible = path.join(racine, 'public/programme', rel)
  let brut
  try { brut = JSON.parse(fs.readFileSync(f, 'utf8')) } catch (e) { console.log(`✗ ${rel} : JSON illisible (${e.message})`); continue }
  if (!fs.existsSync(cible)) { console.log(`✗ ${rel} : pas de chapitre à cet endroit`); continue }
  const lu = lireExercices(brut)
  if (!lu) { console.log(`✗ ${rel} : moins de 2 catégories utilisables`); continue }
  const compte = CLES.map(c => {
    const avant = Array.isArray(brut[c]) ? brut[c].length : 0
    const apres = c === 'categories' ? lu.categories.length : lu[c].length
    return `${c} ${apres}${apres < avant ? ` (−${avant - apres})` : ''}`
  })
  const cartes = lu.categories.map(c => c.cartes.length).join('/')
  console.log(`✓ ${rel} : ${compte.join(', ')} · cartes ${cartes}`)
  ok++
  if (essai) continue
  const chapitre = JSON.parse(fs.readFileSync(cible, 'utf8'))
  chapitre.exercices = { version: 1, ...Object.fromEntries(CLES.map(c => [c, brut[c] ?? []])) }
  fs.writeFileSync(cible, `${JSON.stringify(chapitre)}\n`)
}
console.log(`${ok} / ${fichiers.length} brouillons ${essai ? 'valides' : 'posés'}`)
