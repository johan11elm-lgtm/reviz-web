#!/usr/bin/env node
// -------------------------------------------------------
// Réviz — Génération de « Mon programme »
//
//   node scripts/programme/generer.mjs catalogue [--classe 3ème] [--matieres Maths,Français]
//   node scripts/programme/generer.mjs contenu   [--classe 3ème] [--matieres …] [--concurrence 3] [--limite N] [--force]
//   node scripts/programme/generer.mjs index     [--classe 3ème]
//   node scripts/programme/generer.mjs tout      (les trois, dans l'ordre)
//
// Phase « catalogue » : un appel par matière → src/data/programme/<classe>/<matiere>.json
//   (chapitres du programme officiel : titre, notions, mots-clés, contenu de référence).
//   Premier jet à RELIRE par un humain avant mise en ligne (champ `relu`).
// Phase « contenu »  : un appel par chapitre → public/programme/<classe>/<matiere>/<id>.json
//   (les quatre formats, validés par la même règle que le scan).
// Phase « index »    : public/programme/<classe>/index.json (sans les textes de référence),
//   lu par l'app. Idempotent : un contenu déjà présent n'est pas régénéré sans --force.
//
// Clé : ANTHROPIC_API_KEY lue dans .env.local (jamais affichée).
// -------------------------------------------------------
import fs from 'node:fs/promises'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import Anthropic from '@anthropic-ai/sdk'
import { buildProgrammeSystemPrompt, buildChapterUserMessage } from '../../src/utils/aiPrompts.js'
import { parseLessonJson } from '../../src/utils/lessonSchema.js'
import { MATIERES_3E, classeSlug, matiereSlug, slugify } from '../../src/utils/programme.js'

const here = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(here, '../..')
const MODEL = 'claude-opus-5-5'

// ── Arguments ──
const [phase = 'tout', ...rest] = process.argv.slice(2)
const opt = (name, def) => { const i = rest.indexOf(`--${name}`); return i >= 0 ? rest[i + 1] : def }
const flag = name => rest.includes(`--${name}`)
const CLASSE = opt('classe', '3ème')
// Sans --matieres : celles dont un catalogue existe déjà pour la classe (sinon la liste de 3e).
const MATIERES_OPT = opt('matieres', '')
let MATIERES = (MATIERES_OPT || MATIERES_3E.join(',')).split(',').map(s => s.trim()).filter(Boolean)
const CONCURRENCE = Math.max(1, Number(opt('concurrence', 3)) || 3)
const LIMITE = Number(opt('limite', 0)) || 0
const FORCE = flag('force')
const LEVEL = { cycle: ['2nde', '1ère', 'Terminale'].includes(CLASSE) ? 'lycee' : 'college', classe: CLASSE }

const DATA_DIR = path.join(ROOT, 'src/data/programme', classeSlug(CLASSE))
if (!MATIERES_OPT && existsSync(DATA_DIR)) {
  const { readdirSync } = await import('node:fs')
  const found = readdirSync(DATA_DIR).filter(f => f.endsWith('.json')).map(f => JSON.parse(readFileSync(path.join(DATA_DIR, f), 'utf8')).matiere)
  if (found.length) MATIERES = [...MATIERES.filter(m => found.includes(m)), ...found.filter(m => !MATIERES.includes(m))]
}
const PUBLIC_DIR = path.join(ROOT, 'public/programme', classeSlug(CLASSE))

// ── Clé API (depuis .env.local, sans jamais l'afficher) ──
function apiKey() {
  if (process.env.ANTHROPIC_API_KEY) return process.env.ANTHROPIC_API_KEY
  try {
    const env = readFileSync(path.join(ROOT, '.env.local'), 'utf8')
    const m = env.match(/^ANTHROPIC_API_KEY=(.*)$/m)
    if (m) return m[1].trim().replace(/^["']|["']$/g, '')
  } catch { /* pas de .env.local */ }
  throw new Error('ANTHROPIC_API_KEY introuvable (.env.local ou environnement)')
}
// Client créé à la demande : la phase « index » ne demande pas de clé.
let _client = null
const client = { beta: { messages: { stream: (...a) => (_client ??= new Anthropic({ apiKey: apiKey() })).beta.messages.stream(...a) } }, messages: { stream: (...a) => (_client ??= new Anthropic({ apiKey: apiKey() })).messages.stream(...a) } }

const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a)
const usage = { input: 0, output: 0, calls: 0 }

// ── Appel modèle : JSON attendu en sortie, streaming pour les longues réponses ──
async function callJson({ system, user, maxTokens = 20000, label }) {
  const params = {
    model: MODEL,
    max_tokens: maxTokens,
    output_config: { effort: 'high' },
    system,
    messages: [{ role: 'user', content: user }],
  }
  let msg
  try {
    // Repli serveur par défaut en cas de refus de sûreté (rare sur du contenu scolaire).
    const stream = client.beta.messages.stream({ ...params, betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' })
    msg = await stream.finalMessage()
  } catch (err) {
    if (err instanceof Anthropic.BadRequestError && /fallback/i.test(err.message)) {
      const stream = client.messages.stream(params)
      msg = await stream.finalMessage()
    } else {
      throw err
    }
  }
  usage.calls += 1
  usage.input += msg.usage?.input_tokens ?? 0
  usage.output += msg.usage?.output_tokens ?? 0
  if (msg.stop_reason === 'refusal') {
    throw new Error(`REFUS (${msg.stop_details?.category ?? '?'}) pour ${label}`)
  }
  const text = msg.content.filter(b => b.type === 'text').map(b => b.text).join('')
  if (msg.stop_reason === 'max_tokens') {
    if (maxTokens >= 32000) throw new Error(`sortie tronquée pour ${label}`)
    log(`  ↻ ${label} : sortie tronquée, nouvel essai avec plus de place`)
    return callJson({ system, user, maxTokens: 32000, label })
  }
  return text
}

function extractJson(text) {
  const cleaned = String(text).replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim()
  try { return JSON.parse(cleaned) } catch { /* on tente l'objet englobant */ }
  const s = cleaned.indexOf('{'), e = cleaned.lastIndexOf('}')
  if (s === -1 || e === -1) throw new Error('aucun JSON dans la réponse')
  return JSON.parse(cleaned.slice(s, e + 1))
}

async function pool(items, size, worker) {
  const queue = [...items]
  const results = []
  await Promise.all(Array.from({ length: Math.min(size, queue.length) }, async () => {
    while (queue.length) {
      const item = queue.shift()
      try { results.push(await worker(item)) }
      catch (err) { log(`  ✗ ${item.titre ?? item} : ${err.message}`); results.push(null) }
    }
  }))
  return results
}

// ── Phase 1 : catalogue par matière ──
function cataloguePrompt(matiere) {
  const system = `Tu es un professeur certifié de collège et de lycée, formateur, qui connaît parfaitement les programmes officiels français (cycle 4 : Bulletin officiel spécial n°11 du 26 novembre 2015, ajustements du BO n°31 du 30 juillet 2020, repères annuels de progression et attendus de fin d'année de 2019 ; lycée : programmes de 2019) et les manuels conformes. Tu rédiges en français, pour des élèves de ${CLASSE}. Tu réponds UNIQUEMENT par un objet JSON valide, sans texte avant ni après, sans bloc markdown.`
  const user = `Établis le catalogue des chapitres de ${matiere} en classe de ${CLASSE}, dans l'ordre où un manuel conforme au programme les traite sur l'année (en général 10 à 16 chapitres ; pour une langue vivante : des unités qui mêlent grammaire, lexique et culture ; pour la technologie : les thèmes du programme).

Pour chaque chapitre :
- "id" : identifiant court en ascii minuscules et tirets (ex. "theoreme-de-thales"), unique dans la matière
- "titre" : titre court comme dans un manuel (ex. "Le théorème de Thalès")
- "ordre" : rang dans l'année (1, 2, 3…)
- "periode" : "T1", "T2" ou "T3" (trimestre habituel)
- "notions" : 4 à 8 attendus précis du programme officiel pour ce chapitre
- "motsCles" : 6 à 12 mots-clés ou termes à connaître
- "reference" : le contenu de référence du chapitre, en 12 à 25 lignes de texte brut séparées par des retours à la ligne : définitions exactes, propriétés et théorèmes avec leurs conditions, repères et dates, formules en notation Unicode lisible (², √, ×, π…), exemples canoniques, méthodes attendues. Il doit suffire à générer des flashcards, un quiz, un résumé et une carte mentale sans rien inventer.

Reste strictement dans le programme de ${CLASSE} (ni plus avancé, ni plus simple). Pour les matières scientifiques, précise formules et unités ; en histoire, dates et acteurs ; en géographie, notions et exemples de territoires ; en français, notions de grammaire et objets d'étude avec des œuvres types ; en langue vivante, les structures grammaticales et le lexique de chaque unité.

Format exact :
{"classe":"${CLASSE}","matiere":"${matiere}","programme":"intitulé court du programme de référence","chapitres":[{"id":"…","titre":"…","ordre":1,"periode":"T1","notions":["…"],"motsCles":["…"],"reference":"…"}]}`
  return { system, user }
}

async function phaseCatalogue() {
  await fs.mkdir(DATA_DIR, { recursive: true })
  log(`Catalogue ${CLASSE} : ${MATIERES.join(', ')} (modèle ${MODEL})`)
  await pool(MATIERES, Math.min(CONCURRENCE, 4), async matiere => {
    const file = path.join(DATA_DIR, `${matiereSlug(matiere)}.json`)
    if (existsSync(file) && !FORCE) { log(`  = ${matiere} : catalogue déjà présent`); return matiere }
    const { system, user } = cataloguePrompt(matiere)
    const raw = await callJson({ system, user, maxTokens: 24000, label: `catalogue ${matiere}` })
    const data = extractJson(raw)
    if (!Array.isArray(data?.chapitres) || data.chapitres.length < 4) throw new Error(`catalogue ${matiere} trop court`)
    const seen = new Set()
    const chapitres = data.chapitres.map((c, i) => {
      let id = slugify(c.id || c.titre)
      if (!id || seen.has(id)) id = `${id || 'chapitre'}-${i + 1}`
      seen.add(id)
      return {
        id,
        titre: String(c.titre ?? '').trim(),
        ordre: Number(c.ordre) || i + 1,
        periode: ['T1', 'T2', 'T3'].includes(c.periode) ? c.periode : null,
        notions: Array.isArray(c.notions) ? c.notions.map(String) : [],
        motsCles: Array.isArray(c.motsCles) ? c.motsCles.map(String) : [],
        reference: String(c.reference ?? '').trim(),
      }
    }).filter(c => c.titre && c.reference)
    const out = {
      classe: CLASSE,
      matiere,
      programme: String(data.programme ?? ''),
      modele: MODEL,
      genereLe: new Date().toISOString().slice(0, 10),
      relu: false,
      chapitres,
    }
    await fs.writeFile(file, JSON.stringify(out, null, 2) + '\n')
    log(`  ✓ ${matiere} : ${chapitres.length} chapitres → ${path.relative(ROOT, file)}`)
    return matiere
  })
}

// ── Phase 2 : contenu par chapitre ──
async function loadCatalogues() {
  const out = []
  for (const matiere of MATIERES) {
    const file = path.join(DATA_DIR, `${matiereSlug(matiere)}.json`)
    if (!existsSync(file)) { log(`  ! pas de catalogue pour ${matiere} (lance la phase catalogue)`); continue }
    out.push(JSON.parse(await fs.readFile(file, 'utf8')))
  }
  return out
}

async function phaseContenu() {
  const catalogues = await loadCatalogues()
  let jobs = []
  for (const cat of catalogues) {
    for (const ch of cat.chapitres) jobs.push({ ...ch, matiere: cat.matiere, classe: cat.classe })
  }
  const total = jobs.length
  jobs = jobs.filter(j => FORCE || !existsSync(path.join(PUBLIC_DIR, matiereSlug(j.matiere), `${j.id}.json`)))
  if (LIMITE) jobs = jobs.slice(0, LIMITE)
  log(`Contenu ${CLASSE} : ${jobs.length} chapitre(s) à générer sur ${total} (concurrence ${CONCURRENCE})`)
  let done = 0
  await pool(jobs, CONCURRENCE, async ch => {
    const dir = path.join(PUBLIC_DIR, matiereSlug(ch.matiere))
    await fs.mkdir(dir, { recursive: true })
    const system = buildProgrammeSystemPrompt(LEVEL, ch)
    const user = buildChapterUserMessage(ch)
    const raw = await callJson({ system, user, label: `${ch.matiere} / ${ch.titre}` })
    const data = parseLessonJson(raw)
    // Titre et matière imposés par le catalogue (regroupements, mascottes, Progrès en dépendent)
    data.metadata = { ...(data.metadata ?? {}), title: ch.titre, subject: ch.matiere }
    data.programme = { classe: ch.classe, matiere: ch.matiere, chapitreId: ch.id, modele: MODEL, genereLe: new Date().toISOString().slice(0, 10) }
    await fs.writeFile(path.join(dir, `${ch.id}.json`), JSON.stringify(data) + '\n')
    done += 1
    log(`  ✓ [${done}/${jobs.length}] ${ch.matiere} / ${ch.titre} (${data.flashcards.length} cartes, ${data.quiz.length} questions)`)
    return ch.id
  })
}

// ── Phase 3 : index public (sans les textes de référence) ──
async function phaseIndex() {
  const catalogues = await loadCatalogues()
  const matieres = []
  for (const cat of catalogues) {
    const slug = matiereSlug(cat.matiere)
    const chapitres = cat.chapitres.map(ch => {
      const file = path.join(PUBLIC_DIR, slug, `${ch.id}.json`)
      let counts = null
      if (existsSync(file)) {
        try { const d = JSON.parse(readFileSync(file, 'utf8')); counts = { flashcards: d.flashcards.length, quiz: d.quiz.length } } catch { counts = null }
      }
      return {
        id: ch.id, titre: ch.titre, ordre: ch.ordre, periode: ch.periode,
        notions: ch.notions, motsCles: ch.motsCles,
        pret: !!counts, flashcards: counts?.flashcards ?? 0, quiz: counts?.quiz ?? 0,
      }
    })
    matieres.push({ matiere: cat.matiere, slug, programme: cat.programme, relu: !!cat.relu, chapitres })
  }
  await fs.mkdir(PUBLIC_DIR, { recursive: true })
  const index = { classe: CLASSE, genereLe: new Date().toISOString().slice(0, 10), matieres }
  await fs.writeFile(path.join(PUBLIC_DIR, 'index.json'), JSON.stringify(index) + '\n')
  const prets = matieres.reduce((n, m) => n + m.chapitres.filter(c => c.pret).length, 0)
  const tous = matieres.reduce((n, m) => n + m.chapitres.length, 0)
  log(`Index ${CLASSE} : ${matieres.length} matières, ${prets}/${tous} chapitres prêts → ${path.relative(ROOT, path.join(PUBLIC_DIR, 'index.json'))}`)
}

// ── Main ──
const started = Date.now()
try {
  if (phase === 'catalogue' || phase === 'tout') await phaseCatalogue()
  if (phase === 'contenu' || phase === 'tout') await phaseContenu()
  if (phase === 'index' || phase === 'tout') await phaseIndex()
  if (!['catalogue', 'contenu', 'index', 'tout'].includes(phase)) {
    console.error(`Phase inconnue : ${phase} (catalogue | contenu | index | tout)`)
    process.exit(2)
  }
} finally {
  const min = ((Date.now() - started) / 60000).toFixed(1)
  // Opus 5.5 : 4 $/M en entrée, 20 $/M en sortie
  const cout = (usage.input * 4 + usage.output * 20) / 1e6
  log(`Fin : ${usage.calls} appel(s), ${usage.input} tokens entrés, ${usage.output} sortis, ≈ ${cout.toFixed(2)} $, ${min} min`)
}
