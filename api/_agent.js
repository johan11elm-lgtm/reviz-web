// -------------------------------------------------------
// Réviz IA en agent, côté serveur : d'où viennent les données (Firestore, le
// programme embarqué avec la fonction, vercel.json) et la boucle d'outils.
// Les outils, le prompt et les cartes sont dans src/utils/agent.js.
// -------------------------------------------------------
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { creerOutils, LIBELLES_OUTILS, AGENT_MAX_TOURS } from '../src/utils/agent.js'
import { CHAT_MESSAGE_REFUS } from '../src/utils/chatPrompts.js'

// Les id viennent du modèle : jamais de « / » ni de « .. » dans un chemin ou un document.
const sur = s => typeof s === 'string' && /^[\w-]+$/.test(s)

async function lireProgramme(...parties) {
  if (!parties.every(sur)) return null
  try {
    return JSON.parse(await readFile(path.join(process.cwd(), 'public', 'programme', ...parties.slice(0, -1), `${parties.at(-1)}.json`), 'utf8'))
  } catch {
    return null
  }
}

/** Les sources de l'agent pour un élève (voir l'en-tête de src/utils/agent.js). */
export function sourcesFirestore({ db, uid, userData, erreurs }) {
  const user = db.collection('users').doc(uid)
  return {
    agenda: async () => userData?.agenda ?? { controles: [] },
    revisions: async () => (await user.collection('revisions').orderBy('revisedAt', 'desc').limit(10).get()).docs.map(d => d.data()),
    // Sans le contenu des leçons (aiData) : seulement de quoi les retrouver.
    lecons: async () => (await user.collection('lessons').orderBy('scannedAt', 'desc').select('metadata', 'source').limit(40).get())
      .docs.map(d => ({ id: d.id, titre: d.get('metadata')?.title ?? 'Leçon', matiere: d.get('metadata')?.subject ?? null, source: d.get('source') ?? null })),
    lecon: async id => {
      if (!sur(id)) return null
      const s = await user.collection('lessons').doc(id).get()
      return s.exists ? s.data() : null
    },
    catalogue: classe => lireProgramme(classe, 'index'),
    chapitre: (classe, matiere, id) => lireProgramme(classe, matiere, id),
    erreurs,
  }
}

const texte = (v, max) => (typeof v === 'string' ? v.slice(0, max) : '')

/**
 * Les questions ratées que l'appli joint à la demande (elles ne vivent que sur l'appareil,
 * services/erreursService.js). Bornées : 12 chapitres, 10 questions chacun, 30 en tout.
 */
export function sanitizeErreurs(erreurs) {
  if (!Array.isArray(erreurs)) return []
  let reste = 30
  const out = []
  for (const e of erreurs.slice(0, 12)) {
    if (!e || !sur(e.lessonId) || e.lessonId.length > 80 || !Array.isArray(e.questions)) continue
    const questions = e.questions.filter(q => typeof q === 'string' && q.trim()).slice(0, Math.min(10, reste)).map(q => q.slice(0, 300))
    if (!questions.length) continue
    reste -= questions.length
    out.push({ lessonId: e.lessonId, titre: texte(e.titre, 120), matiere: texte(e.matiere, 40), questions, ...(Number.isFinite(e.at) ? { at: e.at } : {}) })
    if (!reste) break
  }
  return out
}

/**
 * Lit un flux de l'API : relaie le texte au fil de l'eau (`surTexte`) et reconstruit les
 * blocs de la réponse (réflexion avec sa signature, texte, appels d'outils) pour les renvoyer
 * tels quels au tour suivant. Une entrée d'outil illisible (flux coupé) est marquée invalide.
 */
export async function lireFlux(flux, surTexte) {
  const blocs = []
  const json = new Map()
  const invalides = new Set()
  let stop = null
  for await (const e of flux) {
    if (e.type === 'content_block_start') {
      blocs[e.index] = { ...e.content_block }
      if (e.content_block.type === 'tool_use') json.set(e.index, '')
    } else if (e.type === 'content_block_delta') {
      const b = blocs[e.index]
      if (!b) continue
      if (e.delta.type === 'text_delta') { b.text = (b.text ?? '') + e.delta.text; surTexte(e.delta.text) }
      else if (e.delta.type === 'thinking_delta') b.thinking = (b.thinking ?? '') + e.delta.thinking
      else if (e.delta.type === 'signature_delta') b.signature = e.delta.signature
      else if (e.delta.type === 'input_json_delta') json.set(e.index, json.get(e.index) + e.delta.partial_json)
    } else if (e.type === 'content_block_stop' && json.has(e.index)) {
      try { blocs[e.index].input = JSON.parse(json.get(e.index) || '{}') } catch { blocs[e.index].input = {}; invalides.add(blocs[e.index].id) }
    } else if (e.type === 'message_delta') {
      stop = e.delta?.stop_reason ?? stop
    }
  }
  return { blocs: blocs.filter(Boolean), stop, invalides }
}

/**
 * La boucle d'outils d'une demande. `flux` : le premier flux, déjà ouvert (ses erreurs HTTP
 * sont traitées par l'appelant, avant l'envoi des en-têtes) ; `relancer(conv, tour)` ouvre les
 * suivants. `ecrire(evenement)` part vers l'appli : { text }, { outil } (ce qu'il regarde),
 * { carte } (à valider par l'élève).
 */
export async function boucleAgent({ flux, conversation, relancer, sources, level, aujourdhui, ecrire }) {
  const outils = creerOutils({ sources, level, aujourdhui })
  let conv = conversation
  let fin = '' // dernier caractère écrit : un tour qui reprend après des outils repart à la ligne
  for (let tour = 0; ; tour++) {
    let premier = true
    const { blocs, stop, invalides } = await lireFlux(flux, t => {
      if (premier && fin && fin !== '\n') ecrire({ text: '\n\n' })
      premier = false
      fin = t.at(-1)
      ecrire({ text: t })
    })
    if (stop === 'refusal') { ecrire({ text: `\n\n${CHAT_MESSAGE_REFUS}` }); return }
    const appels = blocs.filter(b => b.type === 'tool_use')
    if (stop !== 'tool_use' || !appels.length || tour >= AGENT_MAX_TOURS) return
    const resultats = []
    for (const a of appels) {
      ecrire({ outil: LIBELLES_OUTILS[a.name] ?? 'Je regarde…' })
      const r = invalides.has(a.id)
        ? { contenu: 'Entrée incomplète : refais cet appel.', erreur: true }
        : await outils.executer(a.name, a.input)
      if (r.carte) ecrire({ carte: r.carte })
      resultats.push({ type: 'tool_result', tool_use_id: a.id, content: r.contenu, ...(r.erreur ? { is_error: true } : {}) })
    }
    conv = [...conv, { role: 'assistant', content: blocs }, { role: 'user', content: resultats }]
    flux = await relancer(conv, tour + 1)
  }
}
