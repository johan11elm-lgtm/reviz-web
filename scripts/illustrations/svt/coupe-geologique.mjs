// -------------------------------------------------------
// Réviz — Coupe géologique simple pour la datation relative : couches A, B, C empilées, une faille
// qui coupe A, B et C (bloc de droite abaissé), une intrusion qui traverse A, B et C, et une couche D
// horizontale qui recouvre la faille et l'intrusion sans être coupée. 5e SVT, histoire de la Terre.
//   node scripts/illustrations/svt/coupe-geologique.mjs
// -------------------------------------------------------
import { C, r1, document, ecrire, etiquette, rappel } from './_svt.mjs'

const XG = 40, XD = 320, YD = 36, YE = 78, YB = 232 // D de YD à YE (surface d'érosion), bas en YB
const F0 = [178, YE], F1 = [214, YB] // faille
const fx = y => F0[0] + (F1[0] - F0[0]) * (y - YE) / (YB - YE)
const REJ = 22
const limG = { CB: 122, BA: 172 }, limD = { CB: 122 + REJ, BA: 172 + REJ }
const COUL = { D: '#EFE9DC', C: C.ocre, B: '#EADBC4', A: C.ocreRose }
const poly = (pts, fill) => `<path d="M${pts.map(([x, y]) => `${r1(x)},${r1(y)}`).join(' L')} Z" fill="${fill}"/>`
let s = ''
// Bloc gauche
s += poly([[XG, YE], [F0[0], YE], [fx(limG.CB), limG.CB], [XG, limG.CB]], COUL.C)
s += poly([[XG, limG.CB], [fx(limG.CB), limG.CB], [fx(limG.BA), limG.BA], [XG, limG.BA]], COUL.B)
s += poly([[XG, limG.BA], [fx(limG.BA), limG.BA], [F1[0], YB], [XG, YB]], COUL.A)
// Bloc droit (abaissé)
s += poly([[F0[0], YE], [XD, YE], [XD, limD.CB], [fx(limD.CB), limD.CB]], COUL.C)
s += poly([[fx(limD.CB), limD.CB], [XD, limD.CB], [XD, limD.BA], [fx(limD.BA), limD.BA]], COUL.B)
s += poly([[fx(limD.BA), limD.BA], [XD, limD.BA], [XD, YB], [F1[0], YB]], COUL.A)
// Couche D
s += `<rect x="${XG}" y="${YD}" width="${XD - XG}" height="${YE - YD}" fill="${COUL.D}"/>`
// Limites de couches
s += `<path d="M${XG},${limG.CB} H${r1(fx(limG.CB))} M${XG},${limG.BA} H${r1(fx(limG.BA))} M${r1(fx(limD.CB))},${limD.CB} H${XD} M${r1(fx(limD.BA))},${limD.BA} H${XD} M${XG},${YE} H${XD}" stroke="${C.encre}" stroke-width="1.2" fill="none"/>`
// Intrusion (filon qui traverse A, B et C)
s += `<path d="M96,${YB} L104,200 L98,168 L110,136 L104,104 L114,${YE} L126,${YE} L118,106 L124,138 L112,170 L118,200 L114,${YB} Z" fill="${C.accentClair}" stroke="${C.accent}" stroke-width="2.25" stroke-linejoin="round"/>`
// Faille
s += `<path d="M${F0[0]},${YE} L${F1[0]},${YB}" stroke="${C.encre}" stroke-width="2.25"/>`
// Cadre
s += `<rect x="${XG}" y="${YD}" width="${XD - XG}" height="${YB - YD}" fill="none" stroke="${C.encre}" stroke-width="1.75"/>`
// Lettres des couches (restent visibles)
const L = (x, y, t) => `<text x="${x}" y="${y}" text-anchor="middle" font-size="12.5" font-weight="700" fill="${C.encre}">${t}</text>`
s += L(180, 62, 'D')
s += L(64, 105, 'C') + L(64, 152, 'B') + L(64, 206, 'A')
s += L(280, 115, 'C') + L(280, 168, 'B') + L(280, 218, 'A')
// Étiquettes
const eF = etiquette(354, 24, 'Faille', { ancre: 'end' })
const eI = etiquette(6, 24, 'Intrusion')
s += `<g font-size="11.5" font-weight="600" fill="${C.encre}">${eF.svg}${eI.svg}</g>`
s += rappel(eF.boite.x + 10, eF.boite.y + eF.boite.h, fx(150), 150)
s += rappel(eI.boite.x + 30, eI.boite.y + eI.boite.h, 106, 120)

ecrire('5eme/svt/coupe-geologique.svg', document(YB + 10,
  'Coupe géologique : couches A, B, C, faille, intrusion, couche D qui recouvre le tout. Réviz, 5e SVT, histoire de la Terre.', s))
