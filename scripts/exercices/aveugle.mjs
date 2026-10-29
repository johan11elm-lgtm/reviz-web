// Test à l'aveugle des blocs `exercices` relus : chaque élément devient une question sans sa
// réponse, qu'un agent passe comme un bon élève. Une réponse différente du corrigé, ou une
// hésitation, marque l'élément à réécrire.
//   node scripts/exercices/aveugle.mjs <dossier de sortie> [nombre de lots]   → lot-1.txt…, cle.json
//   node scripts/exercices/aveugle.mjs --bilan <dossier de sortie>            → lit reponses-*.json
// Consignes de l'agent : scripts/exercices/consignes-test.md.
// Format des réponses : [{ "n": 12, "reponse": "B", "verdict": "claire|ambigue|obscure|trop_facile|fausse", "raison": "" }]
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { lireExercices, lirePassage, reponseAcceptee, lireNombre, creerAlea, parRapportA } from '../../src/utils/exercicesChapitre.js'

const racine = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const L = 'ABCD'
const options = l => l.map((c, i) => `${L[i]}) ${c}`).join('   ')

function chapitres() {
  const liste = []
  const parcourir = d => { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) parcourir(p); else if (f.endsWith('.json') && f !== 'index.json') liste.push(p) } }
  parcourir(path.join(racine, 'public/programme'))
  return liste.map(p => ({ rel: path.relative(path.join(racine, 'public/programme'), p).replace(/\.json$/, ''), ai: JSON.parse(fs.readFileSync(p, 'utf8')) }))
    .filter(c => lireExercices(c.ai.exercices))
}

/** Tous les éléments d'un chapitre, chacun avec son corrigé. */
function elements({ rel, ai }) {
  const ex = lireExercices(ai.exercices)
  const alea = creerAlea(rel.length * 7919)
  const contexte = `${ai.metadata?.subject ?? ''} — ${ai.metadata?.title ?? rel}`
  const sortie = []
  const noms = ex.categories.map(c => c.nom)
  ex.categories.forEach((c, k) => c.cartes.forEach((carte, j) => sortie.push({
    chap: rel, contexte, type: 'categorie', ref: `categories[${k}].cartes[${j}]`,
    q: `Dans quelle catégorie ranger la carte « ${carte} » ? ${options(noms)}`, cle: L[k],
  })))
  ex.causes.forEach((c, k) => sortie.push({
    chap: rel, contexte, type: 'cause', ref: `causes[${k}]`,
    q: `Par rapport ${parRapportA(c.fait)}, « ${c.carte} » : CAUSE ou CONSEQUENCE ?`, cle: c.role === 'cause' ? 'CAUSE' : 'CONSEQUENCE',
  }))
  ex.etiquettes.forEach((e, k) => {
    const { avant, passage, apres } = lirePassage(e.texte)
    sortie.push({ chap: rel, contexte, type: 'etiquette', ref: `etiquettes[${k}]`,
      q: `${e.consigne} Texte : « ${avant}⟦${passage}⟧${apres} » (le passage visé est entre ⟦ ⟧). ${options(e.choix)}`, cle: L[e.bonne] })
  })
  ex.devinettes.forEach((d, k) => sortie.push({
    chap: rel, contexte, type: 'devinette', ref: `devinettes[${k}]`, devinette: d,
    q: `Qui suis-je ? Indices : ${d.indices.map((x, i) => `(${i + 1}) ${x}`).join(' ')} Réponds par le nom ou le mot, en toutes lettres.`, cle: d.reponse,
  }))
  ex.calculs.forEach((c, k) => sortie.push({
    chap: rel, contexte, type: 'calcul', ref: `calculs[${k}]`, calcul: c,
    q: `${c.question}${c.unite ? ` (réponds par un nombre, en ${c.unite})` : ' (réponds par un nombre)'}`, cle: String(c.reponse),
  }))
  ex.etapes.forEach((s, k) => {
    const ordre = s.etapes.map((_, i) => i).sort(() => alea() - 0.5)
    sortie.push({ chap: rel, contexte, type: 'etapes', ref: `etapes[${k}]`,
      q: `${s.titre} : remets ces étapes dans l'ordre. ${ordre.map((i, j) => `${j + 1}) ${s.etapes[i]}`).join('   ')} Réponds par la suite des numéros (ex. 3142).`,
      cle: s.etapes.map((_, i) => ordre.indexOf(i) + 1).join('') })
  })
  return sortie
}

function juste(item, reponse) {
  const r = String(reponse ?? '').trim()
  if (item.type === 'devinette') return reponseAcceptee(r, item.devinette)
  if (item.type === 'calcul') { const n = lireNombre(r.replace(/[^\d,.\-−\s]/g, '')); return n !== null && Math.abs(n - item.calcul.reponse) <= item.calcul.tolerance + 1e-9 }
  return r.toUpperCase().replace(/É/g, 'E').replace(/\s/g, '') === item.cle
}

const [, , a, b, c] = process.argv
if (a === '--bilan') {
  const dossier = b
  const cle = JSON.parse(fs.readFileSync(path.join(dossier, 'cle.json'), 'utf8'))
  const reponses = new Map()
  for (const f of fs.readdirSync(dossier).filter(f => /^reponses-.*\.json$/.test(f))) for (const r of JSON.parse(fs.readFileSync(path.join(dossier, f), 'utf8'))) reponses.set(r.n, r)
  const stats = {}
  const ko = []
  for (const item of cle) {
    const r = reponses.get(item.n)
    const s = stats[item.type] ??= { n: 0, ko: 0, faux: 0, ambigue: 0, obscure: 0, fausse: 0, trop_facile: 0, sans: 0 }
    s.n++
    if (!r) { s.sans++; continue }
    const bon = juste(item, r.reponse)
    if (!bon) s.faux++
    if (r.verdict && r.verdict !== 'claire') s[r.verdict] = (s[r.verdict] ?? 0) + 1
    if (!bon || ['ambigue', 'obscure', 'fausse'].includes(r.verdict)) { s.ko++; ko.push({ ...item, reponseEleve: r.reponse, verdict: r.verdict, raison: r.raison }) }
  }
  let n = 0, k = 0
  console.log('format       n   à revoir   (faux ambiguë obscure inexact)  trop facile  sans réponse')
  for (const [t, s] of Object.entries(stats)) {
    n += s.n; k += s.ko
    console.log(`${t.padEnd(11)} ${String(s.n).padStart(3)}   ${String(Math.round(100 * s.ko / s.n)).padStart(3)} %     (${s.faux} ${s.ambigue} ${s.obscure} ${s.fausse})          ${s.trop_facile}            ${s.sans}`)
  }
  console.log(`total : ${k} / ${n} à revoir (${Math.round(100 * k / n)} %)`)
  fs.writeFileSync(path.join(dossier, 'a-revoir.json'), JSON.stringify(ko.map(({ devinette, calcul, ...x }) => x), null, 1))
} else {
  const dossier = a
  const lots = Number(b) || 4
  fs.mkdirSync(dossier, { recursive: true })
  const chaps = chapitres()
  const tous = []
  for (const ch of chaps) tous.push(...elements(ch))
  tous.forEach((x, i) => { x.n = i + 1 })
  fs.writeFileSync(path.join(dossier, 'cle.json'), JSON.stringify(tous, null, 1))
  // Un lot = des chapitres entiers, pour que chaque agent garde le contexte d'un chapitre.
  const parLot = Array.from({ length: lots }, () => [])
  chaps.forEach((ch, i) => parLot[i % lots].push(ch.rel))
  parLot.forEach((rels, i) => {
    // Mélangés : cinq cartes de la même catégorie à la suite souffleraient la réponse.
    const alea = creerAlea(i + 1)
    const items = tous.filter(x => rels.includes(x.chap)).map(x => [alea(), x]).sort((p, q) => p[0] - q[0]).map(([, x]) => x)
    fs.writeFileSync(path.join(dossier, `lot-${i + 1}.txt`), items.map(x => `#${x.n} [${x.contexte}]\n${x.q}`).join('\n\n'))
    console.log(`lot ${i + 1} : ${items.length} éléments, ${rels.length} chapitres`)
  })
  console.log(`${tous.length} éléments, ${chaps.length} chapitres`)
}
