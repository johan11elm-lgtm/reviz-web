// -------------------------------------------------------
// Réviz — Un chromosome à une chromatide et le même après duplication (deux chromatides
// reliées par le centromère, forme en X). 3e SVT : information génétique, mitose.
//   node scripts/illustrations/svt/chromosome-chromatides.mjs
// -------------------------------------------------------
import { C, document, ecrire, etiquette, rappel, mention, fleche } from './_svt.mjs'
import { chromatide } from './_chromatide.mjs'

const HAUT = 28, YC = 78, BAS = 168, HW = 7.5
const style = `fill="${C.violet}" stroke="${C.encre}" stroke-width="1.75" stroke-linejoin="round"`
let s = ''
// À gauche : une chromatide
const XG = 100
s += `<path d="${chromatide(XG, HAUT, YC, BAS, HW)}" ${style}/>`
s += `<circle cx="${XG}" cy="${YC}" r="2.6" fill="${C.encre}"/>`
// Flèche de la duplication
s += fleche(142, 100, 204, 100, { ep: 1.75 })
// À droite : deux chromatides identiques, écartées aux extrémités
const XD = 268
const off = y => HW * 0.55 + HW * 0.55 * (1 - Math.exp(-(((y - YC) / 7) ** 2))) + 6 * ((y - YC) / (BAS - YC)) ** 2 * (y > YC ? 1 : 1.6)
const ec = s2 => y => s2 * off(y)
s += `<path d="${chromatide(XD, HAUT, YC, BAS, HW, { ecart: ec(-1) })}" ${style}/>`
s += `<path d="${chromatide(XD, HAUT, YC, BAS, HW, { ecart: ec(1) })}" ${style}/>`
s += `<circle cx="${XD}" cy="${YC}" r="3.6" fill="${C.accent}"/>`
// Mentions sous chaque dessin
s += mention(XG, 192, 'un chromosome', 'middle') + mention(XG, 205, 'à une chromatide', 'middle')
s += mention(XD, 192, 'un chromosome', 'middle') + mention(XD, 205, 'à deux chromatides', 'middle')
// Étiquettes
const e1 = etiquette(173, 88, 'Duplication', { ancre: 'middle' })
const e2 = etiquette(354, 44, 'Chromatide', { ancre: 'end' })
const e3 = etiquette(354, 82, 'Centromère', { ancre: 'end' })
const e4 = etiquette(6, 82, 'Centromère')
s += rappel(e2.boite.x, 40, XD + off(40), 40)
s += rappel(e3.boite.x, 78, XD + 4.5, YC)
s += rappel(e4.boite.x + e4.boite.w, 78, XG - 4.5, YC)
s += `<g font-size="11.5" font-weight="600" fill="${C.encre}">${e1.svg}${e2.svg}${e3.svg}${e4.svg}</g>`

ecrire('3eme/svt/chromosome-chromatides.svg', document(214,
  'Un chromosome à une chromatide, puis le même chromosome dupliqué : deux chromatides identiques reliées par le centromère. Réviz, 3e SVT, information génétique et mitose.', s))
