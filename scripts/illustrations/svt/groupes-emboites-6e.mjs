// -------------------------------------------------------
// Réviz — Groupes emboîtés en boîtes : squelette interne ⊃ quatre membres ⊃ poils, avec truite,
// grenouille, chat, chauve-souris ; un animal à six pattes (criquet) reste hors des boîtes.
// 6e sciences et technologie, classer les êtres vivants (version simplifiée de la figure de 3e).
//   node scripts/illustrations/svt/groupes-emboites-6e.mjs
// -------------------------------------------------------
import { C, document, ecrire, etiquette, mention } from './_svt.mjs'

const FONDS = ['#F6F5FA', '#ECEAF4', C.accentClair]
const BOITES = [
  { x: 12, y: 12, x2: 272, y2: 214, nom: 'Squelette interne' },
  { x: 80, y: 50, x2: 264, y2: 206, nom: 'Quatre membres' },
  { x: 156, y: 88, x2: 258, y2: 198, nom: 'Poils' },
]
let s = '', leg = ''
BOITES.forEach((b, i) => {
  const der = i === BOITES.length - 1
  s += `<rect x="${b.x}" y="${b.y}" width="${b.x2 - b.x}" height="${b.y2 - b.y}" rx="10" fill="${FONDS[i]}" stroke="${der ? C.accent : C.encre}" stroke-width="${der ? 2.25 : 1.75}"/>`
  leg += etiquette(b.x + 9, b.y + 18, b.nom, { fond: FONDS[i] }).svg
})
const esp = [['Truite', 46, 186], ['Grenouille', 116, 186], ['Chat', 207, 158], ['Chauve-souris', 207, 182], ['Criquet', 314, 110]]
s += `<g font-size="11.5" font-weight="600" fill="${C.encre}" text-anchor="middle">` +
  esp.map(([n, x, y]) => `<text x="${x}" y="${y}">${n}</text>`).join('') + '</g>'
s += mention(314, 126, 'six pattes', 'middle') + mention(314, 139, 'articulées', 'middle')
s += `<g font-size="11.5" font-weight="600" fill="${C.encre}">${leg}</g>`

ecrire('6eme/sciences-et-technologie/groupes-emboites-vertebres.svg', document(226,
  'Groupes emboîtés : squelette interne, quatre membres, poils ; truite, grenouille, chat, chauve-souris ; le criquet hors des boîtes. Réviz, 6e sciences, classer les êtres vivants.', s))
