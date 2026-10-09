// -------------------------------------------------------
// Réviz — Bloc-diagramme d'un séisme : faille, deux blocs décalés (rejet), foyer en profondeur,
// épicentre en surface à sa verticale, ondes sismiques. 4e SVT, séismes.
// Perspective cavalière ; le bloc de droite a glissé vers le bas le long du plan de faille.
//   node scripts/illustrations/svt/bloc-diagramme-seisme.mjs
// -------------------------------------------------------
import { C, r1, pt, document, ecrire, etiquette, rappel } from './_svt.mjs'

const XG = 60, XD = 268, YH = 132, YB = 272 // face avant
const DX = 36, DY = -22 // profondeur
const F0 = [150, YH], F1 = [196, YB] // trace de la faille sur la face avant
const fx = y => F0[0] + (F1[0] - F0[0]) * (y - YH) / (YB - YH)
const n = Math.hypot(F1[0] - F0[0], F1[1] - F0[1])
const G = 20 // glissement le long de la faille
const SX = (F1[0] - F0[0]) / n * G, SY = (F1[1] - F0[1]) / n * G
const yR = YH + SY // dessus du bloc de droite
const poly = (pts, fill) => `<path d="M${pts.map(p => pt(...p)).join(' L')} Z" fill="${fill}" stroke="${C.encre}" stroke-width="1.75" stroke-linejoin="round"/>`
const AV = C.ocre, DESSUS = '#FBF7EF', COTE = '#EADFC9'

let s = ''
// Bloc de gauche : dessus, puis plan de faille dégagé (escarpement), puis face avant
s += poly([[XG, YH], [F0[0], YH], [F0[0] + DX, YH + DY], [XG + DX, YH + DY]], DESSUS)
s += poly([[F0[0], YH], [F0[0] + DX, YH + DY], [F0[0] + SX + DX, yR + DY], [F0[0] + SX, yR]], '#D9CBB2')
s += poly([[XG, YH], [F0[0], YH], [F1[0], YB], [XG, YB]], AV)
// Bloc de droite (abaissé)
s += poly([[F0[0] + SX, yR], [XD, yR], [XD + DX, yR + DY], [F0[0] + SX + DX, yR + DY]], DESSUS)
s += poly([[XD, yR], [XD + DX, yR + DY], [XD + DX, YB + DY], [XD, YB]], COTE)
s += poly([[F0[0] + SX, yR], [XD, yR], [XD, YB], [F1[0], YB]], AV)
// Couches (décalées de part et d'autre de la faille)
let c = ''
for (const y of [172, 212, 246]) {
  c += `M${XG},${y} H${r1(fx(y))} `
  const y2 = y + SY
  if (y2 < YB) c += `M${r1(fx(y2))},${r1(y2)} H${XD} l${DX},${DY} `
}
s += `<path d="${c}" fill="none" stroke="${C.encre}" stroke-width="1" opacity="0.45"/>`
// Faille (trait appuyé sur la face avant)
s += `<path d="M${pt(...F0)} L${pt(...F1)}" stroke="${C.encre}" stroke-width="2.25"/>`
// Rejet : prolongement du dessus du bloc de gauche et flèche double
const xr = F0[0] + SX + 14
s += `<path d="M${F0[0]},${YH} H${xr + 8}" stroke="${C.encre}" stroke-width="1" stroke-dasharray="3 2"/>`
s += `<path d="M${xr},${YH + 1} V${r1(yR - 1)} M${xr - 3},${YH + 5} L${xr},${YH + 1} L${xr + 3},${YH + 5} M${xr - 3},${r1(yR - 5)} L${xr},${r1(yR - 1)} L${xr + 3},${r1(yR - 5)}" stroke="${C.encre}" stroke-width="1.5" fill="none"/>`
// Foyer, ondes, épicentre
const yF = 222, foyer = [fx(yF), yF], epi = [fx(yF), yR]
for (const r of [14, 26, 38]) s += `<circle cx="${r1(foyer[0])}" cy="${yF}" r="${r}" fill="none" stroke="${C.accent}" stroke-width="1.5" opacity="${r === 14 ? 1 : r === 26 ? 0.75 : 0.5}"/>`
s += `<path d="M${pt(...foyer)} V${r1(yR)}" stroke="${C.accent}" stroke-width="1.5" stroke-dasharray="4 3"/>`
s += `<circle cx="${r1(foyer[0])}" cy="${yF}" r="5" fill="${C.accent}"/>`
s += `<path d="M${r1(epi[0])},${r1(yR - 7)} l6,7 l-6,7 l-6,-7 Z" fill="${C.accent}"/>`
// Étiquettes
let leg = ''
const L = (x, y, t, o, from, to) => { const e = etiquette(x, y, t, o); leg += e.svg; s += rappel(...from(e.boite), ...to) }
L(6, 226, 'Foyer', {}, b => [b.x + b.w, yF], [foyer[0] - 6, yF])
L(r1(epi[0]) + 40, 84, 'Épicentre', { ancre: 'middle' }, b => [b.x + 10, b.y + b.h], [epi[0] + 3, yR - 8])
L(96, 84, 'Faille', { ancre: 'middle' }, b => [b.x + b.w - 4, b.y + b.h], [F0[0] + 16, YH - 6])
L(6, 154, 'Rejet', {}, b => [b.x + b.w, b.y + 7.5], [xr - 2, (YH + yR) / 2 + 1])
L(300, 296, ['Ondes sismiques'], { ancre: 'middle' }, b => [b.x + 20, b.y], [foyer[0] + 30, yF + 24])
s += `<g font-size="11.5" font-weight="600" fill="${C.encre}">${leg}</g>`

ecrire('4eme/svt/bloc-diagramme-seisme.svg', document(262,
  'Bloc-diagramme d\'un séisme : faille, rejet, foyer, épicentre, ondes sismiques. Réviz, 4e SVT, séismes.', `<g transform="translate(0 -44)">${s}</g>`))
