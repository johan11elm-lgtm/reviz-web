#!/usr/bin/env node
// Affiche le prompt « programme » d'un chapitre (système + utilisateur), pour
// générer le contenu ailleurs qu'avec la clé API (ex. sous-agents Claude Code).
//   node scripts/programme/prompt.mjs <classe> <matiere> <chapitreId>
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildProgrammeSystemPrompt, buildChapterUserMessage } from '../../src/utils/aiPrompts.js'
import { classeSlug, matiereSlug } from '../../src/utils/programme.js'
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const [classe = '3ème', matiere, id] = process.argv.slice(2)
const cat = JSON.parse(readFileSync(path.join(ROOT, 'src/data/programme', classeSlug(classe), `${matiereSlug(matiere)}.json`), 'utf8'))
const ch = cat.chapitres.find(c => c.id === id)
if (!ch) { console.error(`chapitre introuvable : ${id}`); process.exit(1) }
const level = { cycle: ['2nde', '1ère', 'Terminale'].includes(classe) ? 'lycee' : 'college', classe }
const full = { ...ch, matiere: cat.matiere, classe }
console.log('=== SYSTÈME ===\n' + buildProgrammeSystemPrompt(level, full) + '\n\n=== UTILISATEUR ===\n' + buildChapterUserMessage(full))
