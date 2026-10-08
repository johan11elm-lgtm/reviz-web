// Réviz — 6e maths, « Fractions : sens et quotient », section 4 : guide-âne. Réseau de
// droites parallèles équidistantes posé sous le segment [AB] : A sur une droite, B sur la
// 5e droite suivante ; les droites intermédiaires coupent [AB] en 5 parts égales
// (propriété de Thalès : parties proportionnelles aux écarts, tous égaux). Calculée.
import { C, P, add, sub, mul, seg, codeLongueur, noms, ecrire, f } from './_m56.mjs'

const e = 22, y0 = 22, n = 7 // 7 droites, écart 22
const lignes = []
for (let i = 0; i < n; i++) lignes.push(`M24,${f(y0 + i * e)} H336`)
const A = P(104, y0 + 0.5 * e + 0.5 * e), B = P(262, y0 + 5.5 * e + 0.5 * e) // A sur la 2e droite, B sur la 7e
const pts = [], codes = []
for (let k = 0; k <= 5; k++) pts.push(add(A, mul(sub(B, A), k / 5)))
for (let k = 0; k < 5; k++) codes.push(codeLongueur(pts[k], pts[k + 1], 1, { l: 4.5 }))
console.log('y des points :', pts.map(p => p.y))

ecrire('6eme/maths/guide-ane-cinq-parts.svg', y0 + (n - 1) * e + 18,
  "Guide-âne : réseau de droites parallèles équidistantes posé sous le segment [AB] ; A est sur une droite, B sur la cinquième droite suivante, et les quatre droites intermédiaires coupent [AB] en 5 parts égales. Réviz, 6e maths, fractions : sens et quotient.",
  [
    `<path d="${lignes.join(' ')}" stroke="#B9B4CF" stroke-width="1.2"/>`,
    `<path d="${seg(A, B)}" stroke="${C.accent}" stroke-width="2.25" stroke-linecap="round"/>`,
    `<path d="${codes.join(' ')}" fill="none" stroke="${C.encre}" stroke-width="1.3"/>`,
    `<g>${pts.map(p => `<circle cx="${f(p.x)}" cy="${f(p.y)}" r="2.4"/>`).join('')}</g>`,
    noms([[A.x - 10, A.y - 5, 'A'], [B.x + 11, B.y + 4, 'B']]),
  ])
