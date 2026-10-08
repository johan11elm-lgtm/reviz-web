// -------------------------------------------------------
// Réviz — Coupe du globe à l'échelle (rayons proportionnels : surface 6 370 km, limite manteau-noyau
// à 2 900 km de profondeur → rayon 3 470 km, limite noyau externe-graine à 5 150 km → rayon 1 220 km ;
// soit 12,7 / 6,9 / 2,4 cm à l'échelle 1 cm pour 500 km), croûte signalée par une flèche, puis zoom
// (non à l'échelle) sur la lithosphère, l'asthénosphère et les croûtes continentale et océanique.
// 4e SVT, structure interne de la Terre.
//   node scripts/illustrations/svt/structure-globe.mjs
// -------------------------------------------------------
import { C, r1, document, ecrire, etiquette, rappel, mention, fleche } from './_svt.mjs'

const CX = 116, CY = 112, R = 96
const r = km => R * km / 6370
let s = '', leg = ''
s += `<circle cx="${CX}" cy="${CY}" r="${R}" fill="${C.ocreRose}" stroke="${C.encre}" stroke-width="2.25"/>`
s += `<circle cx="${CX}" cy="${CY}" r="${r1(r(3470))}" fill="${C.accentClair}" stroke="${C.accent}" stroke-width="2.25"/>`
s += `<circle cx="${CX}" cy="${CY}" r="${r1(r(1220))}" fill="#E2DFEE" stroke="${C.encre}" stroke-width="1.75"/>`
// Profondeurs : indiquées sous le nom de chaque enveloppe (hors du disque, sans chevauchement)
// Étiquettes du globe (à droite)
const L = (x, y, t, o, from, to) => { const e = etiquette(x, y, t, o); leg += e.svg; if (to) s += rappel(...from(e.boite), ...to); return e }
// Croûte : flèche
const ang = -50 * Math.PI / 180
const px = CX + R * Math.cos(ang), py = CY + R * Math.sin(ang)
s += fleche(238, 22, px + 3, py - 3, { ep: 1.75, taille: 7 })
L(244, 26, 'Croûte', {})
L(244, 64, 'Manteau', {}, b => [b.x, b.y + 7.5], [CX + 70, 70])
s += mention(244, 77, 'solide,') + mention(244, 90, "jusqu'à 2 900 km")
L(244, 112, 'Noyau externe', {}, b => [b.x, b.y + 7.5], [CX + 44, 104])
s += mention(244, 125, 'liquide,') + mention(244, 138, 'de 2 900 à 5 150 km')
L(244, 160, 'Graine', {}, b => [b.x, b.y + 7.5], [CX + 10, 118])
s += mention(244, 173, 'solide,') + mention(244, 186, 'dès 5 150 km')
// Zoom (non à l'échelle) sous le globe
const ZX0 = 96, ZX1 = 254, ZY = 252
s += `<rect x="${CX - 8}" y="${CY + R - 6}" width="16" height="12" fill="none" stroke="${C.encre}" stroke-width="1.2" stroke-dasharray="3 2"/>`
s += `<path d="M${CX - 8},${CY + R + 6} L${ZX0},${ZY - 10} M${CX + 8},${CY + R + 6} L${ZX1},${ZY - 10}" stroke="${C.encre}" stroke-width="1" stroke-dasharray="3 2" opacity="0.6"/>`
const XT = 160 // transition océan / continent
// asthénosphère, manteau lithosphérique
s += `<rect x="${ZX0}" y="${ZY + 84}" width="${ZX1 - ZX0}" height="40" fill="#FBF1EE" stroke="none"/>`
s += `<rect x="${ZX0}" y="${ZY}" width="${ZX1 - ZX0}" height="84" fill="${C.ocreRose}" stroke="none"/>`
// océan
s += `<rect x="${ZX0}" y="${ZY - 8}" width="${XT + 12 - ZX0}" height="16" fill="${C.bleuClair}"/>`
// croûte océanique (fine) et continentale (épaisse)
s += `<path d="M${ZX0},${ZY + 8} H${XT} L${XT + 18},${ZY - 10} H${ZX1} V${ZY + 40} H${XT + 30} Q${XT + 12},${ZY + 20} ${XT},${ZY + 15} H${ZX0} Z" fill="#E2DCCB" stroke="${C.encre}" stroke-width="1.75" stroke-linejoin="round"/>`
// base de la lithosphère
s += `<path d="M${ZX0},${ZY + 84} H${ZX1}" stroke="${C.encre}" stroke-width="1.75" stroke-dasharray="6 3"/>`
s += `<path d="M${ZX0},${ZY - 10} V${ZY + 124} M${ZX1},${ZY - 10} V${ZY + 124}" stroke="${C.encre}" stroke-width="1" opacity="0.5"/>`
// accolade lithosphère
s += `<path d="M${ZX1 + 6},${ZY - 10} q5,0 5,6 V${ZY + 31} q0,6 5,6 q-5,0 -5,6 V${ZY + 78} q0,6 -5,6" fill="none" stroke="${C.encre}" stroke-width="1.5"/>`
L(354, ZY + 41, 'Lithosphère', { ancre: 'end' })
L(354, ZY + 108, 'Asthénosphère', { ancre: 'end' }, b => [b.x, b.y + 7.5], [ZX1 - 8, ZY + 104])
L(6, ZY + 2, ['Croûte', 'océanique'], {}, b => [b.x + b.w, b.y + 8], [ZX0 + 24, ZY + 11.5])
L(6, ZY + 52, ['Croûte', 'continentale'], {}, b => [b.x + b.w, b.y + 14], [XT + 50, ZY + 22])
s += mention(ZX0 + 4, ZY + 70, 'manteau')
s += mention((ZX0 + ZX1) / 2, ZY + 142, 'zoom, non à l\'échelle', 'middle')
s += `<g font-size="11.5" font-weight="600" fill="${C.encre}">${leg}</g>`

ecrire('4eme/svt/structure-globe.svg', document(ZY + 152,
  'Coupe du globe à l\'échelle (croûte signalée par une flèche) et zoom sur la lithosphère et l\'asthénosphère. Réviz, 4e SVT, structure interne de la Terre.', s))
