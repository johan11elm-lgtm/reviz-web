// -------------------------------------------------------
// Banc d'essai : note les réponses d'un relevé (grille.md)
//
// Pour chaque demande, le correcteur (Claude Sonnet 5.5) reçoit toutes
// les réponses à l'aveugle, sous les lettres A, B… dans un ordre qui
// alterne d'une demande à l'autre (pas d'avantage à passer en premier).
// Écrit notes.json, bilan.md et relire.md (10 réponses pour Johan).
//
//   node --env-file=.env.local scripts/banc-ia/noter.mjs AAAA-MM-JJ
// -------------------------------------------------------
import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import Anthropic from '@anthropic-ai/sdk'
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod'
import { z } from 'zod'
import { banc, message, dossierReleve, DOSSIER } from './commun.mjs'

const CORRECTEUR = 'claude-sonnet-5-5'
const CRITERES = ['juste', 'niveau', 'travail', 'utile', 'ton']
const jour = process.argv[2]
if (!jour) throw new Error('Donne le jour du relevé : AAAA-MM-JJ')
const dossier = dossierReleve(jour)

// Réponses du relevé : fichiers .json (tableau) ou .jsonl (une ligne par réponse).
const reponses = []
for (const f of readdirSync(dossier)) {
  const texte = readFileSync(join(dossier, f), 'utf8')
  if (f.endsWith('.jsonl')) texte.split('\n').filter(Boolean).forEach(l => reponses.push(JSON.parse(l)))
  else if (f.endsWith('.json') && !['notes.json'].includes(f)) reponses.push(...JSON.parse(texte))
}
// Une demande que l'IA n'a pas pu traiter (relevé bloqué, « connectez-vous ») n'est pas notée :
// elle est signalée à part dans le bilan.
const nonNotees = reponses.filter(r => !r.reponse && r.erreur)
reponses.splice(0, reponses.length, ...reponses.filter(r => !nonNotees.includes(r)))
const systemes = [...new Set(reponses.map(r => r.systeme))].sort()
// Si une demande a été relevée deux fois, la dernière ligne compte.
const reponse = (id, s) => reponses.filter(r => r.id === id && r.systeme === s).at(-1)

const Note = z.object({
  notes: z.array(z.object({
    lettre: z.string(),
    juste: z.number().int(),
    niveau: z.number().int(),
    travail: z.number().int(),
    utile: z.number().int(),
    ton: z.number().int(),
    commentaire: z.string(),
  })),
})

const grille = readFileSync(join(DOSSIER, 'grille.md'), 'utf8')
const SYSTEME = `Tu corriges les réponses d'assistants de révision à des collégiens français (11-15 ans). Tu es exigeant, juste et constant d'une demande à l'autre. Tu ne sais pas quel assistant a écrit quelle réponse, et tu ne cherches pas à le deviner.

${grille}

Pour chaque réponse, donne une note entière de 0 à 2 par critère (juste, niveau, travail = « Fait travailler », utile = « Utile tout de suite », ton = « Ton et forme ») et un commentaire d'une ou deux phrases qui justifie les points perdus. Une réponse vide ou absente vaut 0 partout.`

const client = new Anthropic()
let lus = 0, ecrits = 0

// Une note manquante dans la sortie du correcteur : on réessaie, jamais de 0 par défaut.
async function noter(d, essai = 1) {
  const notes = await noterUneFois(d)
  if (notes.every(n => n.complete)) return notes
  if (essai < 3) return noter(d, essai + 1)
  throw new Error('notes incomplètes après 3 essais')
}

async function noterUneFois(d) {
  const presents = systemes.filter(s => reponse(d.id, s))
  // Ordre alterné : la demande paire inverse l'ordre.
  const ordre = d.id % 2 ? presents : [...presents].reverse()
  const lettres = ordre.map((_, i) => String.fromCharCode(65 + i))
  const blocs = ordre.map((s, i) => {
    const r = reponse(d.id, s)
    const img = r.image ? '\n[Une image était affichée avec cette réponse ; elle n\'a pas été relevée.]' : ''
    return `<reponse lettre="${lettres[i]}">\n${r.reponse ?? '(aucune réponse)'}${img}\n</reponse>`
  }).join('\n\n')
  const r = await client.messages.parse({
    model: CORRECTEUR,
    max_tokens: 8000,
    system: SYSTEME,
    messages: [{ role: 'user', content: `Classe de l'élève : ${d.classe}. Catégorie : ${banc.categories[d.categorie]}.\n\nMessage envoyé par l'élève :\n<message>\n${message(d)}\n</message>\n\nCe qu'une bonne réponse fait (indicatif) : ${d.attendu}\n\n${blocs}` }],
    output_config: { format: zodOutputFormat(Note) },
  })
  lus += r.usage.input_tokens; ecrits += r.usage.output_tokens
  const notes = r.parsed_output?.notes ?? []
  return ordre.map((s, i) => {
    const n = notes.find(x => x.lettre.trim().toUpperCase() === lettres[i])
    const crit = Object.fromEntries(CRITERES.map(c => [c, Math.max(0, Math.min(2, n?.[c] ?? 0))]))
    return { id: d.id, categorie: d.categorie, systeme: s, ...crit, total: CRITERES.reduce((t, c) => t + crit[c], 0), commentaire: n?.commentaire ?? '', complete: !!n }
  })
}

// BANC_LIMITE=2 : essai sur les premières demandes seulement.
// BANC_IDS=13,24 : recorrige ces demandes et garde les autres notes de notes.json.
// BANC_BILAN=1 : ne corrige rien, refait seulement bilan.md et relire.md depuis notes.json.
const ids = process.env.BANC_BILAN ? [] : process.env.BANC_IDS?.split(',').map(Number)
const notes = ids ? JSON.parse(readFileSync(join(dossier, 'notes.json'), 'utf8')).filter(n => !ids.includes(n.id)) : []
const file = ids ? banc.demandes.filter(d => ids.includes(d.id)) : banc.demandes.slice(0, Number(process.env.BANC_LIMITE) || undefined)
await Promise.all(Array.from({ length: 4 }, async () => {
  while (file.length) {
    const d = file.shift()
    try { notes.push(...(await noter(d)).map(({ complete, ...n }) => n)); process.stdout.write('.') }
    catch (e) { console.error(`\nDemande ${d.id} : ${e?.message ?? e}`) }
  }
}))
notes.sort((a, b) => a.id - b.id || a.systeme.localeCompare(b.systeme))
writeFileSync(join(dossier, 'notes.json'), JSON.stringify(notes, null, 2))

// Bilan : moyenne sur 10 par système, par catégorie et par critère.
const moy = l => l.length ? (l.reduce((s, x) => s + x, 0) / l.length) : NaN
const f1 = x => Number.isNaN(x) ? '–' : x.toFixed(1).replace('.', ',')
const de = (s, filtre = () => true) => notes.filter(n => n.systeme === s && filtre(n))
let md = `# Banc d'essai Réviz IA — relevé du ${jour}\n\nCorrecteur : ${CORRECTEUR}, à l'aveugle, grille \`grille.md\`. Notes sur 10 (moyennes).\n\n`
md += `| Catégorie | ${systemes.join(' | ')} |\n|---|${systemes.map(() => '---').join('|')}|\n`
// Une IA relevée sur une partie des demandes seulement (Nomad'IA : 1 essai par mois) : effectif entre parenthèses.
md += `| **Ensemble** | ${systemes.map(s => `**${f1(moy(de(s).map(n => n.total)))}** (${de(s).length} rép.)`).join(' | ')} |\n`
for (const [c, nom] of Object.entries(banc.categories)) {
  md += `| ${nom} | ${systemes.map(s => f1(moy(de(s, n => n.categorie === c).map(n => n.total)))).join(' | ')} |\n`
}
md += `\n| Critère (sur 2) | ${systemes.join(' | ')} |\n|---|${systemes.map(() => '---').join('|')}|\n`
for (const c of CRITERES) md += `| ${c} | ${systemes.map(s => f1(moy(de(s).map(n => n[c])))).join(' | ')} |\n`
// Face à face sur les mêmes demandes : la comparaison juste quand un relevé est incomplet.
const REF = 'reviz-actuelle'
if (systemes.includes(REF)) {
  md += `\n| Face à face (mêmes demandes) | Demandes | ${REF} | autre | ${REF} gagne | égalité | ${REF} perd |\n|---|---|---|---|---|---|---|\n`
  for (const s of systemes.filter(x => x !== REF)) {
    const ids = de(s).map(n => n.id)
    const paires = ids.map(id => [notes.find(n => n.id === id && n.systeme === REF), notes.find(n => n.id === id && n.systeme === s)]).filter(([a, b]) => a && b)
    const g = paires.filter(([a, b]) => a.total > b.total).length, e = paires.filter(([a, b]) => a.total === b.total).length
    md += `| ${s} | ${paires.length} | ${f1(moy(paires.map(p => p[0].total)))} | ${f1(moy(paires.map(p => p[1].total)))} | ${g} | ${e} | ${paires.length - g - e} |\n`
  }
}
if (nonNotees.length) md += `\nNon notées : ${nonNotees.map(r => `demande ${r.id} (${r.systeme}) : ${r.erreur}`).join(' ; ')}\n`
if (lus) md += `\nCoût de la correction : ${lus} tokens lus, ${ecrits} écrits, ≈ ${(lus / 1e6 * 2 + ecrits / 1e6 * 10).toFixed(2)} $.\n`
writeFileSync(join(dossier, 'bilan.md'), md)

// 10 réponses à relire par Johan : pour Réviz IA et pour l'IA la plus complète à côté,
// une réponse par catégorie, tant qu'il en reste, jusqu'à 5 chacune.
const tirage = []
const cats = Object.keys(banc.categories)
const autre = systemes.filter(s => s !== REF).sort((a, b) => de(b).length - de(a).length)[0]
for (const s of [REF, autre].filter(Boolean)) {
  let pris = 0
  for (const [i, c] of cats.entries()) {
    const n = notes.filter(x => x.systeme === s && x.categorie === c)
    if (n.length && pris < 5) { tirage.push(n[(i * 7) % n.length]); pris++ }
  }
}
let relire = `# À relire par Johan — relevé du ${jour}\n\nPour chaque réponse : es-tu d'accord avec la note du correcteur ? Écris « d'accord » ou ta note sur 10.\n\n`
for (const n of tirage) {
  const d = banc.demandes.find(x => x.id === n.id)
  relire += `---\n\n## Demande ${n.id} (${banc.categories[n.categorie]}, ${d.classe}) — ${n.systeme}\n\n**Message :** ${d.texte}\n\n**Réponse :**\n\n${reponse(n.id, n.systeme)?.reponse ?? '(aucune)'}\n\n**Note du correcteur : ${n.total}/10** (juste ${n.juste}, niveau ${n.niveau}, fait travailler ${n.travail}, utile ${n.utile}, ton ${n.ton}). ${n.commentaire}\n\n**Ton avis :** \n\n`
}
writeFileSync(join(dossier, 'relire.md'), relire)
console.log(`\n${notes.length} notes, ${systemes.join(' / ')} → ${dossier}`)
