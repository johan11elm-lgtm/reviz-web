// -------------------------------------------------------
// Réviz — Classification en ensembles emboîtés : vertébrés ⊃ tétrapodes ⊃ mammifères ⊃ primates,
// avec truite, grenouille, chat, chimpanzé et Homme. 3e SVT, parenté et classification.
//   node scripts/illustrations/svt/ensembles-emboites-vertebres.mjs
// -------------------------------------------------------
import { C, document, ecrire, etiquette, mention } from './_svt.mjs'

const BOITES = [
  { x: 12, y: 12, x2: 348, y2: 252, nom: 'Vertébrés', attr: 'colonne vertébrale' },
  { x: 86, y: 54, x2: 340, y2: 244, nom: 'Tétrapodes', attr: 'quatre membres' },
  { x: 162, y: 96, x2: 332, y2: 236, nom: 'Mammifères', attr: 'poils et mamelles' },
  { x: 220, y: 138, x2: 324, y2: 228, nom: 'Primates', attr: 'pouce opposable' },
]
let s = '', leg = ''
const FONDS = ['#F6F5FA', '#ECEAF4', '#E2DFEE', C.accentClair]
BOITES.forEach((b, i) => {
  const der = i === BOITES.length - 1
  s += `<rect x="${b.x}" y="${b.y}" width="${b.x2 - b.x}" height="${b.y2 - b.y}" rx="10" fill="${FONDS[i]}" stroke="${der ? C.accent : C.encre}" stroke-width="${der ? 2.25 : 1.75}"/>`
  leg += etiquette(b.x + 9, b.y + 18, b.nom, { fond: FONDS[i] }).svg
  s += mention(b.x + 9, b.y + 32, b.attr)
})
const esp = [['Truite', 49, 214], ['Grenouille', 124, 214], ['Chat', 191, 214], ['Chimpanzé', 272, 196], ['Homme', 272, 214]]
s += `<g font-size="11.5" font-weight="600" fill="${C.encre}" text-anchor="middle">` +
  esp.map(([n, x, y]) => `<text x="${x}" y="${y}">${n}</text>`).join('') + '</g>'
s += `<g font-size="11.5" font-weight="600" fill="${C.encre}">${leg}</g>`

ecrire('3eme/svt/ensembles-emboites-vertebres.svg', document(264,
  'Ensembles emboîtés : vertébrés, tétrapodes, mammifères, primates, avec truite, grenouille, chat, chimpanzé et Homme. Réviz, 3e SVT, parenté et classification.', s))
