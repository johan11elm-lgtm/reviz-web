// -------------------------------------------------------
// Réviz — 6e histoire, « Conquêtes, paix romaine et romanisation ».
// Plan type (schématique) d'une ville romaine : rues en damier, cardo et
// decumanus qui se croisent au centre, forum et temple, thermes, théâtre,
// amphithéâtre, arrivée de l'aqueduc. Inspiré des plans de villes de Gaule
// (Nîmes, Arles), sans reproduire une ville précise.
//
//   node scripts/illustrations/plan-ville-romaine.mjs
// -------------------------------------------------------
import { C, doc, etiq, rappel } from './cartes/_histoire.mjs'
import { ecrireSvg } from './cartes/_commun.mjs'

const W = 360
const X0 = 96
const Y0 = 40
const PAS = 21
const N = 8
const X1 = X0 + PAS * N
const Y1 = Y0 + PAS * N
const CX = X0 + PAS * 4
const CY = Y0 + PAS * 4
const OCRE = '#F4EBDD'

// Îlots (insulae)
let ilots = ''
for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) ilots += `M${X0 + i * PAS + 2},${Y0 + j * PAS + 2}h${PAS - 4}v${PAS - 4}h-${PAS - 4}z`

const fond = (x, y, w, h) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#FFFFFF"/>`

// Bâtiments
const forum = [CX + 2, CY - 2 * PAS + 2, 2 * PAS - 4, 2 * PAS - 4]
const temple = [CX + 13, CY - 2 * PAS + 6, 16, 12]
const thermes = [X0 + PAS + 2, CY + PAS + 2, 2 * PAS - 4, 2 * PAS - 4]
const th = [X0 + 2 * PAS, CY - PAS - 3] // centre du théâtre (demi-cercle ouvert vers le bas)
const amphi = [X0 + 6 * PAS, CY + 2 * PAS + 1]

// Aqueduc : arrive par le nord-ouest jusqu'au château d'eau sur le rempart.
const aqX = X0 + PAS
let arches = ''
for (let y = 12; y < Y0 - 4; y += 6) arches += `M${aqX - 4},${y}h8`

const svg = doc(W, Y1 + 18,
  "Plan type d'une ville romaine : rues en damier, cardo et decumanus, forum et temple au centre, thermes, théâtre, amphithéâtre, aqueduc. Réviz, 6e histoire, conquêtes, paix romaine et romanisation. Généré par scripts/illustrations/plan-ville-romaine.mjs",
  `<rect x="${X0}" y="${Y0}" width="${X1 - X0}" height="${Y1 - Y0}" fill="#FFFFFF"/>
<path d="${ilots}" fill="${OCRE}"/>
<path d="M${CX},${Y0 - 8}V${Y1 + 8}M${X0 - 8},${CY}H${X1 + 8}" stroke="${C.grisClair}" stroke-width="8"/>
<path d="M${X0},${CY - 4}V${Y0}H${CX - 4.5}M${CX + 4.5},${Y0}H${X1}V${CY - 4.5}M${X1},${CY + 4.5}V${Y1}H${CX + 4.5}M${CX - 4.5},${Y1}H${X0}V${CY + 4.5}" fill="none" stroke="${C.encre}" stroke-width="3"/>
${fond(...forum)}
<rect x="${forum[0]}" y="${forum[1]}" width="${forum[2]}" height="${forum[3]}" fill="#FBE9DD" stroke="${C.accent}" stroke-width="2.25"/>
<rect x="${temple[0]}" y="${temple[1]}" width="${temple[2]}" height="${temple[3]}" fill="#FFFFFF" stroke="${C.encre}" stroke-width="1.5"/>
<path d="M${temple[0] + 3},${temple[1] + 9}v-6M${temple[0] + 8},${temple[1] + 9}v-6M${temple[0] + 13},${temple[1] + 9}v-6" stroke="${C.encre}" stroke-width="1.2"/>
${fond(...thermes)}
<rect x="${thermes[0]}" y="${thermes[1]}" width="${thermes[2]}" height="${thermes[3]}" fill="#FFFFFF" stroke="${C.encre}" stroke-width="1.75"/>
<rect x="${thermes[0] + 6}" y="${thermes[1] + 6}" width="12" height="10" rx="2" fill="${C.bleuClair}" stroke="${C.bleu}" stroke-width="1.2"/>
<circle cx="${thermes[0] + 27}" cy="${thermes[1] + 25}" r="7" fill="${C.bleuClair}" stroke="${C.bleu}" stroke-width="1.2"/>
${fond(th[0] - 20, th[1] - 20, 40, 24)}
<path d="M${th[0] - 18},${th[1]}A18,18 0 0 1 ${th[0] + 18},${th[1]}Z" fill="#FFFFFF" stroke="${C.encre}" stroke-width="1.75"/>
<path d="M${th[0] - 11},${th[1]}A11,11 0 0 1 ${th[0] + 11},${th[1]}M${th[0] - 5},${th[1]}A5,5 0 0 1 ${th[0] + 5},${th[1]}" fill="none" stroke="${C.encre}" stroke-width="1"/>
${fond(amphi[0] - 21, amphi[1] - 19, 42, 38)}
<ellipse cx="${amphi[0]}" cy="${amphi[1]}" rx="20" ry="15" fill="#FFFFFF" stroke="${C.encre}" stroke-width="1.75"/>
<ellipse cx="${amphi[0]}" cy="${amphi[1]}" rx="10" ry="6.5" fill="${OCRE}" stroke="${C.encre}" stroke-width="1"/>
<path d="M${aqX},10V${Y0 - 3}" stroke="${C.bleu}" stroke-width="3"/>
<path d="${arches}" stroke="${C.bleu}" stroke-width="1.5"/>
<rect x="${aqX - 4}" y="${Y0 - 4}" width="8" height="8" fill="${C.bleu}"/>
<g font-size="11.5" font-weight="600" fill="${C.encre}">
${etiq(14, 22, 'Aqueduc')}${rappel(66, 18, aqX - 4, 20)}
${etiq(14, 78, 'Théâtre')}${rappel(64, 74, th[0] - 14, th[1] - 8)}
${etiq(14, CY - 14, 'Decumanus')}${rappel(48, CY - 10, X0 - 4, CY)}
${etiq(14, 186, 'Thermes')}${rappel(66, 182, thermes[0] + 4, thermes[1] + 30)}
${etiq(346, 22, 'Cardo', { ancre: 'end' })}${rappel(309, 18, CX + 4, Y0 - 4)}
${etiq(346, 58, 'Temple', { ancre: 'end' })}${rappel(301, 54, temple[0] + temple[2], temple[1] + 4)}
${etiq(346, 112, 'Forum', { ancre: 'end' })}${rappel(306, 108, forum[0] + forum[2] - 3, forum[1] + forum[3] - 8)}
${etiq(346, 222, 'Amphithéâtre', { ancre: 'end' })}${rappel(300, 211, amphi[0] + 8, amphi[1] + 12)}
</g>`)

ecrireSvg('plan-ville-romaine', svg, '6eme/histoire')
