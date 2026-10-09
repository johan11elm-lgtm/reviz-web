// Réviz — Trois faisceaux lumineux modélisés par des rayons (droites fléchées) : divergent
// (les rayons s'écartent, ex. ampoule), parallèle (ex. rayons du Soleil), convergent (les rayons
// se rapprochent vers un point). Chapitre 5eme/physique-chimie/lumiere-sources-et-propagation (section 4).
// Sortie : public/programme/illustrations/5eme/physique-chimie/faisceaux-lumineux.svg
import { C, r1, doc, etq, ecrireSvg, pointe } from './_pc.mjs'

const corps = []
const Y = 60, L = 92, ouv = [-1, -0.5, 0, 0.5, 1]
function rayon(a, b) {
  const m = [a[0] + (b[0] - a[0]) * 0.58, a[1] + (b[1] - a[1]) * 0.58]
  const m0 = [a[0] + (b[0] - a[0]) * 0.5, a[1] + (b[1] - a[1]) * 0.5]
  return `<path d="M${r1(a[0])},${r1(a[1])} L${r1(b[0])},${r1(b[1])}" stroke="${C.accent}" stroke-width="1.75"/>` + pointe(m0, m, { long: 7, large: 6, fill: C.accent })
}
// divergent : depuis une source ponctuelle
const x1 = 18
corps.push(`<circle cx="${x1}" cy="${Y}" r="3.6" fill="#FBE9DD" stroke="${C.accent}" stroke-width="2"/>`)
for (const k of ouv) corps.push(rayon([x1 + 3, Y + k * 1.2], [x1 + L, Y + k * 34]))
// parallèle
const x2 = 136
for (const k of ouv) corps.push(rayon([x2, Y + k * 30], [x2 + L, Y + k * 30]))
// convergent : vers un point
const x3 = 254, F = [x3 + L, Y]
for (const k of ouv) corps.push(rayon([x3, Y + k * 34], F))
corps.push(`<circle cx="${F[0]}" cy="${F[1]}" r="2.2" fill="${C.encre}"/>`)
corps.push(etq(x1 + L / 2, Y + 62, 'Divergent', 'middle'))
corps.push(etq(x2 + L / 2, Y + 62, 'Parallèle', 'middle'))
corps.push(etq(x3 + L / 2, Y + 62, 'Convergent', 'middle'))

const svg = doc(Y + 76,
  'Trois faisceaux lumineux représentés par cinq rayons fléchés : divergent (les rayons partent d’une source et s’écartent), parallèle, convergent (les rayons se rapprochent vers un point). Réviz, 5e physique-chimie, la lumière.',
  corps)
ecrireSvg('faisceaux-lumineux', svg, '5eme/physique-chimie')
