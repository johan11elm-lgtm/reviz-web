// -------------------------------------------------------
// Réviz — Cellule animale (joue) et cellule végétale (élodée) côte à côte : membrane, cytoplasme,
// noyau (communs, une étiquette reliée aux deux cellules), paroi et chloroplastes en plus pour la
// cellule végétale. 6e sciences et technologie, la cellule.
//   node scripts/illustrations/svt/cellules-animale-vegetale.mjs
// -------------------------------------------------------
import { C, document, ecrire, etiquette, rappel, mention } from './_svt.mjs'

const CYTO = '#FAF6EE', NOYAU = '#DCD8EC'
let s = '', leg = ''
// Cellule de joue (contour irrégulier)
s += `<path d="M40,84 Q34,58 62,50 Q92,40 112,56 Q134,70 130,98 Q128,126 108,142 Q84,160 58,148 Q32,136 36,112 Q38,98 40,84 Z" fill="${CYTO}" stroke="${C.encre}" stroke-width="1.75"/>`
s += `<circle cx="84" cy="104" r="13" fill="${NOYAU}" stroke="${C.encre}" stroke-width="1.5"/>`
// Cellule d'élodée : paroi, membrane, chloroplastes, noyau
const X0 = 236, X1 = 346, Y0 = 48, Y1 = 160
s += `<rect x="${X0}" y="${Y0}" width="${X1 - X0}" height="${Y1 - Y0}" rx="4" fill="${C.vertClair}" stroke="${C.vert}" stroke-width="1.75"/>`
s += `<rect x="${X0 + 6}" y="${Y0 + 6}" width="${X1 - X0 - 12}" height="${Y1 - Y0 - 12}" rx="3" fill="${CYTO}" stroke="${C.encre}" stroke-width="1.2"/>`
const chl = [[256, 62, 0], [282, 60, 0], [310, 61, 0], [332, 70, 90], [333, 98, 90], [332, 126, 90], [318, 147, 0], [290, 148, 0], [262, 146, 0], [251, 124, 90], [251, 96, 90], [264, 80, 40]]
s += chl.map(([x, y, a]) => `<ellipse cx="${x}" cy="${y}" rx="7.5" ry="4" transform="rotate(${a} ${x} ${y})" fill="#7DBE93" stroke="${C.vert}" stroke-width="1.2"/>`).join('')
s += `<circle cx="300" cy="112" r="12" fill="${NOYAU}" stroke="${C.encre}" stroke-width="1.5"/>`
// Étiquettes communes (au centre, reliées aux deux cellules)
const XC = 183
const eM = etiquette(XC, 70, 'Membrane', { ancre: 'middle' })
const eC = etiquette(XC, 106, 'Cytoplasme', { ancre: 'middle' })
const eN = etiquette(XC, 142, 'Noyau', { ancre: 'middle' })
leg += eM.svg + eC.svg + eN.svg
const g = e => e.boite.x, d = e => e.boite.x + e.boite.w, m = e => e.boite.y + 7.5
s += rappel(g(eM), m(eM), 125, 70) + rappel(d(eM), m(eM), X0 + 6, 66)
s += rappel(g(eC), m(eC), 110, 86) + rappel(d(eC), m(eC), 272, 104)
s += rappel(g(eN), m(eN), 96, 110) + rappel(d(eN), m(eN), 289, 118)
// Propres à la cellule végétale
const eP = etiquette(291, 28, 'Paroi', { ancre: 'middle' })
const eK = etiquette(291, 186, 'Chloroplaste', { ancre: 'middle' })
leg += eP.svg + eK.svg
s += rappel(291, eP.boite.y + eP.boite.h, 296, Y0)
s += rappel(291, eK.boite.y, 290, 152)
s += mention(84, 210, 'cellule de joue', 'middle') + mention(84, 223, '(animale)', 'middle')
s += mention(291, 210, "cellule d'élodée", 'middle') + mention(291, 223, '(végétale)', 'middle')
s += `<g font-size="11.5" font-weight="600" fill="${C.encre}">${leg}</g>`

ecrire('6eme/sciences-et-technologie/cellules-animale-vegetale.svg', document(232,
  'Cellule animale (joue) et cellule végétale (élodée) : membrane, cytoplasme, noyau ; paroi et chloroplastes pour la cellule végétale. Réviz, 6e sciences, la cellule.', s))
