// -------------------------------------------------------
// Réviz — Arbre de parenté de la truite, de la grenouille, du chat, du chimpanzé et de l'Homme,
// avec l'attribut apparu à chaque nœud. 3e SVT, parenté et classification.
//   node scripts/illustrations/svt/arbre-parente-vertebres.mjs
// -------------------------------------------------------
import { C, r1, document, ecrire, etiquette, rappel } from './_svt.mjs'

const YT = 44 // bout des branches
const ESP = [['Truite', 30], ['Grenouille', 90], ['Chat', 150], ['Chimpanzé', 210], ['Homme', 270]]
const XH = 270, K = XH + YT // tige : x + y = K
const noeud = xi => [(K + xi - YT) / 2, (K - xi + YT) / 2]
const ATTR = ['Colonne vertébrale', 'Quatre membres', 'Poils et mamelles', 'Pouce opposable']

let s = ''
const [rx, ry] = noeud(30)
const racine = [rx - 24, ry + 24]
s += `<g stroke="${C.encre}" stroke-width="2.25" stroke-linecap="round" fill="none">`
s += `<path d="M${r1(racine[0])},${r1(racine[1])} L${XH},${YT}"/>`
ESP.slice(0, 4).forEach(([, xi]) => { const [nx, ny] = noeud(xi); s += `<path d="M${r1(nx)},${r1(ny)} L${xi},${YT}"/>` })
s += '</g>'
let leg = ''
ESP.slice(0, 4).forEach(([, xi], i) => {
  const [nx, ny] = noeud(xi)
  s += `<circle cx="${r1(nx)}" cy="${r1(ny)}" r="4" fill="${C.accent}"/>`
  const e = etiquette(354, ny + 4, ATTR[i], { ancre: 'end' })
  leg += e.svg
  s += `<path d="M${r1(nx + 6)},${r1(ny)} H${r1(e.boite.x)}" stroke="#2D2B57" stroke-width="1" opacity="0.6"/>`
})
// Noms des espèces (restent visibles)
s += `<g font-size="11.5" font-weight="600" fill="${C.encre}" text-anchor="middle">` +
  ESP.map(([n, x]) => `<text x="${x}" y="${YT - 10}">${n}</text>`).join('') + '</g>'
s += `<g font-size="11.5" font-weight="600" fill="${C.encre}">${leg}</g>`

ecrire('3eme/svt/arbre-parente-vertebres.svg', document(r1(racine[1] + 12),
  'Arbre de parenté : truite, grenouille, chat, chimpanzé, Homme ; à chaque nœud (ancêtre commun), l\'attribut apparu. Réviz, 3e SVT, parenté et classification.', s))
