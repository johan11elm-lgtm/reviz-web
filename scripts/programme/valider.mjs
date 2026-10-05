#!/usr/bin/env node
// Valide (et normalise) les contenus générés : même règle que le scan.
//   node scripts/programme/valider.mjs [classe] [matiere]
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseLessonJson } from '../../src/utils/lessonSchema.js'
import { classeSlug, matiereSlug } from '../../src/utils/programme.js'
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const [classe = '3ème', seule] = process.argv.slice(2)
const dataDir = path.join(ROOT, 'src/data/programme', classeSlug(classe))
const pubDir = path.join(ROOT, 'public/programme', classeSlug(classe))
const { readdirSync } = await import('node:fs')
let ok = 0, ko = 0, manquants = 0
for (const f of readdirSync(dataDir).filter(f => f.endsWith('.json'))) {
  const cat = JSON.parse(readFileSync(path.join(dataDir, f), 'utf8'))
  if (seule && matiereSlug(seule) !== matiereSlug(cat.matiere)) continue
  for (const ch of cat.chapitres) {
    const file = path.join(pubDir, matiereSlug(cat.matiere), `${ch.id}.json`)
    if (!existsSync(file)) { manquants++; console.log(`  ∅ ${cat.matiere} / ${ch.id}`); continue }
    try {
      const data = parseLessonJson(readFileSync(file, 'utf8'))
      const nb = { f: data.flashcards.length, q: data.quiz.length, b: data.mindmap.branches.length }
      if (nb.f < 6 || nb.q < 5 || nb.b < 4) throw new Error(`quantités ${JSON.stringify(nb)}`)
      data.metadata = { ...(data.metadata ?? {}), title: ch.titre, subject: cat.matiere }
      data.programme = { classe, matiere: cat.matiere, chapitreId: ch.id, modele: 'claude-opus-5-5 (abonnement)', genereLe: new Date().toISOString().slice(0, 10) }
      writeFileSync(file, JSON.stringify(data) + '\n')
      ok++
    } catch (e) { ko++; console.log(`  ✗ ${cat.matiere} / ${ch.id} : ${e.message}`) }
  }
}
console.log(`valides ${ok} · invalides ${ko} · manquants ${manquants}`)
process.exit(ko ? 1 : 0)
