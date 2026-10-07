#!/usr/bin/env node
// -------------------------------------------------------
// Réviz — Refaire la partie « résumé » des chapitres du programme
// (octobre 2026 : une section par notion, exemple, méthode, pièges),
// sans toucher aux flashcards, quiz et cartes mentales déjà relus.
//
//   node scripts/programme/resumes.mjs consigne
//   node scripts/programme/resumes.mjs chapitre <classe> <matiere> <id>
//   node scripts/programme/resumes.mjs ecrire   <classe> <matiere> <id> <resume.json>
//   node scripts/programme/resumes.mjs etat     [classe] [matiere]
//
// « chapitre » affiche ce qu'il faut pour écrire le résumé (référence du
// catalogue, résumé actuel relu, questions des flashcards) ; « ecrire »
// valide le nouveau résumé et remplace le champ `resume` du fichier, rien
// d'autre. Prévu pour des sous-agents Claude Code (abonnement), comme la
// génération initiale (voir prompt.mjs).
// -------------------------------------------------------
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { resumeRules } from '../../src/utils/aiPrompts.js'
import { parseLessonJson } from '../../src/utils/lessonSchema.js'
import { PROGRAMME_CLASSES, classeSlug, matiereSlug } from '../../src/utils/programme.js'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const COLLEGE = { cycle: 'college', classe: '4ème' }
// Vrais emojis seulement : ceux qui s'affichent en couleur par défaut, ceux suivis
// du sélecteur U+FE0F, et quelques symboles texte qu'iOS colore quand même
// (⚠ ✔ ❤ ☀ ☑ ☝ ✌ ✍). Les flèches (→ ↔), © ou ™ restent permis.
const EMOJI = /\p{Emoji_Presentation}|\p{Extended_Pictographic}\uFE0F|[\u26A0\u2714\u2764\u2600\u2611\u261D\u270C\u270D]/u

function catalogue(classe, matiere) {
  const file = path.join(ROOT, 'src/data/programme', classeSlug(classe), `${matiereSlug(matiere)}.json`)
  if (!existsSync(file)) throw new Error(`catalogue introuvable : ${classe} / ${matiere}`)
  return JSON.parse(readFileSync(file, 'utf8'))
}
const chapitreFile = (classe, matiere, id) => path.join(ROOT, 'public/programme', classeSlug(classe), matiereSlug(matiere), `${id}.json`)
// « Méthode : … », « Méthode d'analyse : … » en début de ligne (pas « Autres méthodes hormonales : »).
const aMethode = ch => /(^|\n)\s*M[ée]thodes?\b[^:\n]*:/i.test(ch.reference ?? '')

// ── Contrôles du nouveau résumé (en plus de parseLessonJson) ──
function controler(r, ch) {
  const pb = []
  const n = (a, min, max, nom) => { if (a.length < min || a.length > max) pb.push(`${nom} : ${a.length} (attendu ${min} à ${max})`) }
  if (typeof r.intro !== 'string' || !r.intro.trim()) pb.push('intro manquante')
  n(r.keyPoints, 3, 5, 'keyPoints')
  n(r.sections, 4, 6, 'sections')
  n(r.keyTerms, 3, 6, 'keyTerms')
  n(r.pieges, 2, 3, 'pieges')
  r.sections.forEach((s, i) => {
    if (typeof s.title !== 'string' || !s.title.trim() || typeof s.content !== 'string' || !s.content.trim()) pb.push(`sections[${i}] : titre ou contenu manquant`)
    if (s.formula && typeof s.formula !== 'string') pb.push(`sections[${i}].formula n'est pas un texte`)
  })
  if (!r.sections.some(s => s.exemple)) pb.push('aucune section n\'a d\'exemple')
  if (r.methode) n(r.methode.etapes, 2, 5, 'methode.etapes')
  if (aMethode(ch) && !r.methode) pb.push('la référence a une « Méthode attendue » : resume.methode est obligatoire')
  r.keyTerms.forEach((t, i) => { if (typeof t?.term !== 'string' || typeof t?.def !== 'string') pb.push(`keyTerms[${i}] mal formé`) })
  if (EMOJI.test(JSON.stringify(r))) pb.push('emoji interdit')
  return pb
}

const [cmd, ...args] = process.argv.slice(2)

if (cmd === 'consigne') {
  console.log(`Tu réécris la partie « résumé » d'un chapitre de Réviz (collège, programme officiel français).
Le résumé est la FICHE DE RÉVISION du chapitre : un élève qui ne lit qu'elle doit pouvoir réviser tout le chapitre.

${resumeRules(COLLEGE)}

RÈGLES PROPRES À CETTE RÉÉCRITURE :
- Pars du résumé actuel : il a été relu et corrigé (dates, chiffres, formulations). Garde ses corrections et ses bonnes formulations ; complète-le, ne le contredis pas.
- resume.sections : une section par notion attendue (4 à 6 ; regroupe deux notions seulement si elles sont très liées). Aucune notion du catalogue ne doit manquer. Titres numérotés « 1. … ». Chaque "content" fait 2 à 4 phrases courtes.
- resume.sections[].exemple : au moins la moitié des sections en ont un ; null sinon. Les exemples viennent de la référence quand elle en donne.
- resume.methode : obligatoire quand la référence contient « Méthode attendue » ; c'est elle que tu détailles. Sinon, seulement si le chapitre enseigne vraiment un savoir-faire.
- resume.pieges : 2 ou 3 erreurs classiques d'élèves de cette classe sur ce chapitre.
- resume.keyPoints : 3 à 5, à savoir par cœur, quelques mots chacun. resume.keyTerms : 3 à 6 (garde les termes actuels sauf raison sérieuse).
- formula / formulaCaption : seulement pour une vraie formule ou règle à encadrer (maths, physique-chimie, parfois grammaire ou conjugaison) ; null sinon.
- Aucun fait, date, chiffre ou citation qui ne soit dans la référence ou absolument sûr. Données qui changent (pays de l'UE, populations, lois récentes) : seulement si la référence les donne. En cas de doute, vérifie en ligne ou retire.
- Pas d'emoji. Typographie française (« … », espaces normales avant : ; ! ?, l'affichage les rend insécables).

FORMAT (JSON seul, rien autour) :
{
  "intro": "1 phrase",
  "keyPoints": ["…"],
  "sections": [{ "title": "1. …", "content": "…", "exemple": "… ou null", "formula": null, "formulaCaption": null }],
  "methode": { "titre": "Comment …", "etapes": ["…", "…"] } ou null,
  "pieges": ["…", "…"],
  "keyTerms": [{ "term": "…", "def": "…" }]
}`)
} else if (cmd === 'chapitre') {
  const [classe, matiere, id] = args
  const cat = catalogue(classe, matiere)
  const ch = cat.chapitres.find(c => c.id === id)
  if (!ch) throw new Error(`chapitre introuvable : ${id}`)
  const data = JSON.parse(readFileSync(chapitreFile(classe, matiere, id), 'utf8'))
  console.log(`=== CHAPITRE ===
Classe : ${classe} · Matière : ${cat.matiere}
Titre : ${ch.titre}
Notions attendues (une section chacune) :
${ch.notions.map((x, i) => `  ${i + 1}. ${x}`).join('\n')}
Mots-clés : ${ch.motsCles.join(' ; ')}
Méthode attendue : ${aMethode(ch) ? 'OUI (resume.methode obligatoire)' : 'non'}
Référence :
${ch.reference}

=== RÉSUMÉ ACTUEL (relu, à garder comme base) ===
${JSON.stringify(data.resume, null, 1)}

=== QUESTIONS DES FLASHCARDS (ce que l'élève doit savoir répondre) ===
${data.flashcards.map(c => `- ${c.front}`).join('\n')}`)
} else if (cmd === 'ecrire') {
  const [classe, matiere, id, source] = args
  const cat = catalogue(classe, matiere)
  const ch = cat.chapitres.find(c => c.id === id)
  if (!ch) throw new Error(`chapitre introuvable : ${id}`)
  const file = chapitreFile(classe, matiere, id)
  const data = JSON.parse(readFileSync(file, 'utf8'))
  let brut = JSON.parse(readFileSync(source, 'utf8'))
  if (brut.resume) brut = brut.resume
  const resume = parseLessonJson(JSON.stringify({ ...data, resume: brut })).resume
  const pb = controler(resume, ch)
  if (pb.length) { console.log(`✗ ${classe} / ${cat.matiere} / ${id}\n  - ${pb.join('\n  - ')}`); process.exit(1) }
  data.resume = resume
  data.programme = { ...data.programme, resumeRefaitLe: new Date().toISOString().slice(0, 10) }
  writeFileSync(file, JSON.stringify(data) + '\n')
  console.log(`✓ ${classe} / ${cat.matiere} / ${id} : ${resume.sections.length} sections, ${resume.methode ? 'méthode, ' : ''}${resume.pieges.length} pièges`)
} else if (cmd === 'etat') {
  const [seuleClasse, seuleMatiere] = args
  let faits = 0, restants = 0
  for (const classe of PROGRAMME_CLASSES) {
    if (seuleClasse && classeSlug(seuleClasse) !== classeSlug(classe)) continue
    const dir = path.join(ROOT, 'src/data/programme', classeSlug(classe))
    if (!existsSync(dir)) continue
    for (const f of readdirSync(dir).filter(f => f.endsWith('.json'))) {
      const cat = JSON.parse(readFileSync(path.join(dir, f), 'utf8'))
      if (seuleMatiere && matiereSlug(seuleMatiere) !== matiereSlug(cat.matiere)) continue
      for (const ch of cat.chapitres) {
        const file = chapitreFile(classe, cat.matiere, ch.id)
        if (!existsSync(file)) continue
        const data = JSON.parse(readFileSync(file, 'utf8'))
        if (data.programme?.resumeRefaitLe) { faits++; continue }
        restants++
        console.log(`  · ${classe} / ${cat.matiere} / ${ch.id}`)
      }
    }
  }
  console.log(`refaits ${faits} · à faire ${restants}`)
} else {
  console.log('usage : consigne | chapitre <classe> <matiere> <id> | ecrire <classe> <matiere> <id> <resume.json> | etat [classe] [matiere]')
  process.exit(1)
}
