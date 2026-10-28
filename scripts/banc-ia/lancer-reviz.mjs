// -------------------------------------------------------
// Banc d'essai : fait répondre Réviz IA
//
// Rejoue ce que fait api/chat.js : même prompt système, même modèle,
// mêmes réglages (buildChatRequest de src/utils/chatPrompts.js quand la
// version testée l'a), avec pour leçon le chapitre du programme de la
// demande (le cas de l'élève qui pose sa question depuis la fiche du
// chapitre, le meilleur cas pour le coach). Le jour est celui de l'élève
// fictif (questions.json), pour que les demandes datées gardent leur sens.
//
// Par défaut, le code est lu sur origin/main (la prod), pas dans l'arbre de
// travail : d'autres sessions y ont des modifications en cours.
//
// --agent : Réviz IA sans leçon (étape 2), avec la vraie boucle du serveur
// (api/_agent.js) branchée sur l'élève fictif (questions.json, eleve.sources) au
// lieu de Firestore. Les demandes « avec contexte » partent alors sans le
// contexte tapé : l'agent doit le retrouver avec ses outils. Ses cartes sont
// recopiées sous la réponse pour le correcteur. Demande --arbre.
//
//   node --env-file=.env.local scripts/banc-ia/lancer-reviz.mjs AAAA-MM-JJ
//     [--ref <branche ou commit> | --arbre <dossier>] [--nom <système>] [--effort low|medium|high] [--agent]
// -------------------------------------------------------
import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { parseArgs } from 'node:util'
import Anthropic from '@anthropic-ai/sdk'
import { banc, message, dossierReleve, DOSSIER } from './commun.mjs'

const { values: opt, positionals } = parseArgs({
  allowPositionals: true,
  options: { ref: { type: 'string', default: 'origin/main' }, arbre: { type: 'string' }, nom: { type: 'string' }, effort: { type: 'string' }, agent: { type: 'boolean' } },
})
if (opt.agent && !opt.arbre) throw new Error('--agent demande --arbre <dossier> (le code de l’agent est importé tel quel).')
const git = (...args) => execFileSync('git', args, { encoding: 'utf8', maxBuffer: 1 << 26 })
// Un fichier de la version testée : un dossier (code pas encore commité) ou une référence git.
const lire = chemin => (opt.arbre ? readFileSync(join(opt.arbre, chemin), 'utf8') : git('show', `${opt.ref}:${chemin}`))
const version = opt.arbre ? `arbre ${opt.arbre.split('/').pop()}` : git('rev-parse', '--short', opt.ref).trim()

// Les prompts du coach, copiés dans un cache local pour être importés.
const cache = join(DOSSIER, '.cache', version.replace(/\W+/g, '-'))
mkdirSync(cache, { recursive: true })
for (const f of ['chatPrompts.js', 'aiPrompts.js']) writeFileSync(join(cache, f), lire(`src/utils/${f}`))
const prompts = await import(join(cache, `chatPrompts.js?v=${Date.now()}`))

// La requête : celle du code testé (buildChatRequest), sinon celle de l'ancien api/chat.js.
function requete(level, lessonContext, messages) {
  if (prompts.buildChatRequest) {
    return prompts.buildChatRequest({ level, lessonContext, messages, aujourdhui: banc.eleve.aujourdhui, ...(opt.effort ? { effort: opt.effort } : {}) })
  }
  return { model: prompts.MODEL, max_tokens: prompts.CHAT_MAX_OUTPUT_TOKENS, system: prompts.buildChatSystemPrompt(level, lessonContext), messages }
}

const catalogues = {}
function chapitre(chemin) {
  const [classe, matiere, id] = chemin.split('/')
  catalogues[classe] ??= JSON.parse(lire(`public/programme/${classe}/index.json`))
  const m = catalogues[classe].matieres.find(x => x.slug === matiere)
  const ch = m.chapitres.find(x => x.id === id)
  const contenu = JSON.parse(lire(`public/programme/${chemin}.json`))
  // Même forme que programmeService.openChapter : metadata réécrite, aiData = le contenu.
  const { programme, ...aiData } = contenu
  return { metadata: { ...(aiData.metadata ?? {}), title: ch.titre, subject: m.matiere }, aiData }
}

const client = new Anthropic()
const nom = opt.nom ?? (opt.agent ? 'reviz-agent' : 'reviz-actuelle')
const sortie = join(dossierReleve(positionals[0]), `${nom}.json`)

// L'élève fictif vu par l'agent ; une demande sans contexte part d'un élève sans agenda ni erreur.
function sourcesBanc(d) {
  const s = d.contexte ? banc.eleve.sources : { agenda: { controles: [] }, revisions: [], lecons: [], erreurs: [] }
  const [classe] = d.chapitre.split('/')
  return {
    agenda: async () => s.agenda,
    revisions: async () => s.revisions,
    lecons: async () => s.lecons,
    lecon: async () => null,
    catalogue: async cl => JSON.parse(lire(`public/programme/${cl}/index.json`)),
    chapitre: async (cl, m, id) => { try { return JSON.parse(lire(`public/programme/${cl}/${m}/${id}.json`)) } catch { return null } },
    erreurs: s.erreurs,
    classe,
  }
}

// Les cartes, telles que l'élève les voit sous la réponse.
const carteEnTexte = c => (c.type === 'controle'
  ? `[Carte affichée sous la réponse : contrôle de ${c.matiere}, ${c.jour}, « ${c.titre} », boutons Ajouter et Modifier]`
  : `[Carte affichée sous la réponse : ${c.titre}, ${c.sous}, bouton Commencer]`)

async function repondreEnAgent(d) {
  const { buildAgentRequest, AGENT_MAX_TOURS } = await import(join(opt.arbre, 'src/utils/agent.js'))
  const { boucleAgent } = await import(join(opt.arbre, 'api/_agent.js'))
  const level = { cycle: 'college', classe: d.classe }
  const aujourdhui = banc.eleve.aujourdhui
  const requete = (conv, tour) => ({ ...buildAgentRequest({ level, messages: conv, aujourdhui, dernierTour: tour >= AGENT_MAX_TOURS, ...(opt.effort ? { effort: opt.effort } : {}) }), stream: true })
  const conversation = [{ role: 'user', content: d.contexte ? d.texte : message(d) }]
  let texte = ''
  const cartes = [], outils = []
  const usage = { input_tokens: 0, output_tokens: 0, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 }
  // Compte les tokens de chaque tour au passage (message_start, puis message_delta).
  async function* compter(flux) {
    for await (const e of flux) {
      const u = e.type === 'message_start' ? e.message?.usage : e.type === 'message_delta' ? e.usage : null
      for (const k of Object.keys(usage)) if (Number.isFinite(u?.[k])) usage[k] += u[k]
      yield e
    }
  }
  const ouvrir = async conv => compter(await client.messages.create(conv))
  const debut = Date.now()
  let tours = 0
  await boucleAgent({
    flux: await ouvrir(requete(conversation, 0)),
    conversation,
    relancer: (conv, tour) => { tours = tour; return ouvrir(requete(conv, tour)) },
    sources: sourcesBanc(d),
    level,
    aujourdhui,
    ecrire: e => { if (e.text) texte += e.text; if (e.carte) cartes.push(e.carte); if (e.outil) outils.push(e.outil) },
  })
  const reponse = [texte.trim(), ...cartes.map(carteEnTexte)].filter(Boolean).join('\n\n')
  return { id: d.id, systeme: nom, modele: buildAgentRequest({ messages: [], aujourdhui }).model, version, effort: opt.effort ?? 'low', reponse, cartes, outils, tours: tours + 1, ms: Date.now() - debut, usage }
}

async function repondre(d) {
  if (opt.agent) return repondreEnAgent(d)
  const params = requete({ cycle: 'college', classe: d.classe }, prompts.buildChatLessonContext(chapitre(d.chapitre)), [{ role: 'user', content: message(d) }])
  const debut = Date.now()
  const r = await client.messages.create(params)
  const reponse = r.content.filter(b => b.type === 'text').map(b => b.text).join('')
  return { id: d.id, systeme: nom, modele: r.model, version, effort: params.output_config?.effort ?? null, reponse, stop: r.stop_reason, ms: Date.now() - debut, usage: r.usage }
}

// 4 à la fois : assez rapide, sans taper les limites de débit.
const resultats = []
const file = [...banc.demandes]
await Promise.all(Array.from({ length: 4 }, async () => {
  while (file.length) {
    const d = file.shift()
    try {
      resultats.push(await repondre(d))
      process.stdout.write('.')
    } catch (e) {
      resultats.push({ id: d.id, systeme: nom, reponse: null, erreur: String(e?.message ?? e) })
      process.stdout.write('x')
    }
  }
}))
resultats.sort((a, b) => a.id - b.id)
writeFileSync(sortie, JSON.stringify(resultats, null, 2))

// Prix par million de tokens (entrée / sortie), réflexion comprise dans la sortie.
const PRIX = { 'claude-haiku-4-5': [1, 5], 'claude-haiku-5-5': [0.1, 0.5] }
const somme = k => resultats.reduce((s, r) => s + (r.usage?.[k] ?? 0), 0)
const modele = resultats.find(r => r.modele)?.modele ?? '?'
const [pe, ps] = Object.entries(PRIX).find(([m]) => modele.startsWith(m))?.[1] ?? [NaN, NaN]
const lus = somme('input_tokens') + somme('cache_read_input_tokens') + somme('cache_creation_input_tokens')
const cout = lus / 1e6 * pe + somme('output_tokens') / 1e6 * ps
const ms = resultats.filter(r => r.ms).map(r => r.ms).sort((a, b) => a - b)
console.log(`\n${resultats.filter(r => r.reponse).length}/${resultats.length} réponses (${modele}, ${version}${opt.effort ? `, effort ${opt.effort}` : ''}) : ${lus} tokens lus, ${somme('output_tokens')} écrits, ≈ ${cout.toFixed(3)} $, temps médian ${(ms[ms.length >> 1] / 1000).toFixed(1)} s → ${sortie}`)
