// -------------------------------------------------------
// Réviz — Échelle des temps géologiques (dates du chapitre) : Terre 4,6 Ga, premières traces de vie
// 3,5 Ga, puis zoom sur les 540 derniers millions d'années : Paléozoïque (540-252 Ma), Mésozoïque
// (252-66 Ma), Cénozoïque (66 Ma à aujourd'hui), crises biologiques de 252 et 66 Ma, Homo sapiens
// vers 300 000 ans. Positions calculées à l'échelle sur chaque frise. 5e SVT, histoire de la Terre.
//   node scripts/illustrations/svt/temps-geologiques.mjs
// -------------------------------------------------------
import { C, r1, document, ecrire, etiquette, mention, rappel } from './_svt.mjs'

const X0 = 20, X1 = 340
const xg = ma => X0 + (X1 - X0) * (4600 - ma) / 4600 // frise complète
const xz = ma => X0 + (X1 - X0) * (540 - ma) / 540 // zoom
let s = '', leg = ''
// Frise complète
const T0 = 40, T1 = 58
s += `<rect x="${X0}" y="${T0}" width="${X1 - X0}" height="${T1 - T0}" fill="${C.violet}" stroke="${C.encre}" stroke-width="1.75"/>`
s += `<rect x="${r1(xg(540))}" y="${T0}" width="${r1(X1 - xg(540))}" height="${T1 - T0}" fill="${C.accentClair}" stroke="${C.accent}" stroke-width="2.25"/>`
for (const [ma, t] of [[4600, '4,6 Ga'], [3500, '3,5 Ga']]) {
  s += `<path d="M${r1(xg(ma))},${T0 - 5} V${T1 + 5}" stroke="${C.encre}" stroke-width="1.5"/>`
  s += mention(xg(ma), T0 - 10, t, ma === 4600 ? 'start' : 'middle')
}
s += mention(X1, T0 - 10, '540 Ma', 'end')
leg += etiquette(X0, T1 + 20, ['Formation', 'de la Terre']).svg
leg += etiquette(xg(3500) - 3, T1 + 20, ['Premières', 'traces de vie']).svg
// Lignes du zoom
const Z0 = 118, Z1 = 140
s += `<path d="M${r1(xg(540))},${T1 + 2} L${X0},${Z0 - 2} M${X1},${T1 + 2} L${X1},${Z0 - 2}" stroke="${C.accent}" stroke-width="1" stroke-dasharray="4 3" fill="none"/>`
// Ères
const ERES = [[540, 252, 'Paléozoïque', C.ocre], [252, 66, 'Mésozoïque', C.ocreRose], [66, 0, 'Cénozoïque', C.vertClair]]
for (const [a, b, , f] of ERES) s += `<rect x="${r1(xz(a))}" y="${Z0}" width="${r1(xz(b) - xz(a))}" height="${Z1 - Z0}" fill="${f}" stroke="${C.encre}" stroke-width="1.75"/>`
leg += etiquette((xz(540) + xz(252)) / 2, Z0 + 15, 'Paléozoïque', { ancre: 'middle', fond: C.ocre }).svg
leg += etiquette((xz(252) + xz(66)) / 2, Z0 + 15, 'Mésozoïque', { ancre: 'middle', fond: C.ocreRose }).svg
const eC = etiquette(X1 - 16, Z1 + 40, 'Cénozoïque', { ancre: 'end' })
leg += eC.svg
s += rappel(eC.boite.x + eC.boite.w - 6, eC.boite.y, eC.boite.x + eC.boite.w - 6, Z1 - 4)
// Crises biologiques
for (const ma of [252, 66]) {
  s += `<path d="M${r1(xz(ma))},${Z0 - 14} V${Z1 + 4}" stroke="${C.accent}" stroke-width="2.25"/>`
  s += mention(xz(ma), Z0 - 18, 'crise', 'middle')
}
// Dates sous le zoom
for (const [ma, t, an] of [[540, '540 Ma', 'start'], [252, '252 Ma', 'middle'], [66, '66 Ma', 'middle']]) s += mention(xz(ma), Z1 + 16, t, an)
// Homo sapiens
const eH = etiquette(X1, Z1 + 76, 'Homo sapiens', { ancre: 'end' })
leg += eH.svg
s += mention(X1, Z1 + 90, 'vers 300 000 ans', 'end')
s += rappel(X1 - 4, eH.boite.y, X1 - 0.5, Z1 + 2)
s += `<g font-size="11.5" font-weight="600" fill="${C.encre}">${leg}</g>`

ecrire('5eme/svt/temps-geologiques.svg', document(Z1 + 98,
  'Échelle des temps géologiques : frise de 4,6 Ga à aujourd\'hui, puis zoom sur les 540 derniers Ma (ères, crises, Homo sapiens). Réviz, 5e SVT, histoire de la Terre.', s))
