// Retire des brouillons les éléments que le test à l'aveugle a rejetés (a-revoir.json d'un ou
// plusieurs dossiers de test). Un élément est retrouvé par son texte, pas par sa position.
//   node scripts/exercices/retirer.mjs <dossier de test> …
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { normaliser } from '../../src/utils/exercicesChapitre.js'

const racine = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const net = s => normaliser(String(s ?? '').trim().replace(/\s*\.$/, ''))
const CHAMP = { cause: ['causes', 'carte'], etiquette: ['etiquettes', 'texte'], devinette: ['devinettes', 'reponse'], calcul: ['calculs', 'question'], etapes: ['etapes', 'titre'] }
const parChapitre = new Map()
for (const d of process.argv.slice(2)) {
  const f = path.join(d, 'a-revoir.json')
  if (!fs.existsSync(f)) continue
  for (const x of JSON.parse(fs.readFileSync(f, 'utf8'))) parChapitre.set(x.chap, [...(parChapitre.get(x.chap) ?? []), x])
}
let retires = 0, introuvables = 0
for (const [chap, items] of parChapitre) {
  const f = path.join(racine, 'scripts/exercices/brouillons', `${chap}.json`)
  const ex = JSON.parse(fs.readFileSync(f, 'utf8'))
  for (const x of items) {
    let ok = false
    if (x.type === 'categorie') {
      for (const c of ex.categories ?? []) {
        const i = (c.cartes ?? []).findIndex(t => net(t) === net(x.cible))
        if (i >= 0) { c.cartes.splice(i, 1); ok = true; break }
      }
    } else {
      const [cle, champ] = CHAMP[x.type]
      const i = (ex[cle] ?? []).findIndex(e => net(e?.[champ]) === net(x.cible))
      if (i >= 0) { ex[cle].splice(i, 1); ok = true }
    }
    if (ok) retires++
    else { introuvables++; console.log(`? ${chap} ${x.type} introuvable : ${x.cible}`) }
  }
  fs.writeFileSync(f, `${JSON.stringify(ex, null, 2)}\n`)
}
console.log(`${retires} éléments retirés dans ${parChapitre.size} chapitres${introuvables ? `, ${introuvables} introuvables` : ''}`)
