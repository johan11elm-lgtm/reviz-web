// -------------------------------------------------------
// Réviz — Terre éclairée par des rayons solaires parallèles : deux faisceaux de même largeur,
// l'un arrive presque perpendiculairement à l'équateur (petite surface), l'autre rasant près
// du pôle (grande surface). 3e SVT, météo et climat.
//   node scripts/illustrations/svt/energie-solaire-latitude.mjs
// -------------------------------------------------------
import { C, r1, pt, document, ecrire, etiquette, rappel, mention, pointe } from './_svt.mjs'

const CX = 222, CY = 140, R = 92, LARG = 22
const xSurf = y => CX - Math.sqrt(R * R - (y - CY) ** 2)
let s = ''
s += `<circle cx="${CX}" cy="${CY}" r="${R}" fill="#FFFFFF" stroke="${C.encre}" stroke-width="1.75"/>`
// Équateur et axe
s += `<path d="M${CX - R},${CY} H${CX + R}" stroke="${C.encre}" stroke-width="1" stroke-dasharray="4 3" opacity="0.6"/>`
s += `<path d="M${CX},${CY - R - 8} V${CY + R + 8}" stroke="${C.encre}" stroke-width="1" opacity="0.6"/>`
// Deux faisceaux de même largeur
function faisceau(yc) {
  const y1 = yc - LARG / 2, y2 = yc + LARG / 2
  const pts = []
  for (let i = 0; i <= 12; i++) { const y = y1 + (y2 - y1) * i / 12; pts.push([xSurf(y), y]) }
  let d = `M14,${r1(y1)} L${pts.map(([a, b]) => pt(a, b)).join(' L')} L14,${r1(y2)} Z`
  let out = `<path d="${d}" fill="${C.accentClair}"/>`
  // rayons
  for (const y of [y1, yc, y2]) {
    out += `<path d="M14,${r1(y)} H${r1(xSurf(y) - 6)}" stroke="${C.accent}" stroke-width="1.2"/>` + pointe(xSurf(y), y, 1, 0, { couleur: C.accent, taille: 5 })
  }
  // surface éclairée
  const a1 = Math.atan2(y1 - CY, -Math.sqrt(R * R - (y1 - CY) ** 2)), a2 = Math.atan2(y2 - CY, -Math.sqrt(R * R - (y2 - CY) ** 2))
  out += `<path d="M${pt(xSurf(y1), y1)} A${R},${R} 0 0 0 ${pt(xSurf(y2), y2)}" fill="none" stroke="${C.accent}" stroke-width="4.5" stroke-linecap="round"/>`
  return out
}
const yEq = CY, yHaut = CY - R * Math.sin(57 * Math.PI / 180)
s += faisceau(yEq) + faisceau(yHaut)
// Étiquettes
s += `<g font-size="11.5" font-weight="600" fill="${C.encre}">`
const eMin = etiquette(158, 104, ['Énergie', 'minimale'])
const eMax = etiquette(150, 172, ['Énergie', 'maximale'])
const ePole = etiquette(CX, CY - R - 13, 'Pôle Nord', { ancre: 'middle' })
const eEq = etiquette(306, CY - 6, 'Équateur', { ancre: 'end' })
s += eMin.svg + eMax.svg + ePole.svg + eEq.svg + '</g>'
const yHm = yHaut + 6
s += rappel(eMin.boite.x + 4, eMin.boite.y, xSurf(yHm) + 3, yHm)
s += rappel(eMax.boite.x, eMax.boite.y + 8, xSurf(CY + 4) + 3, CY + 4)
s += mention(14, yHaut - LARG / 2 - 8, 'rayons du Soleil')

ecrire('3eme/svt/energie-solaire-latitude.svg', document(248,
  'Deux faisceaux parallèles de même largeur éclairent la Terre : petite surface à l\'équateur, grande surface près du pôle. Réviz, 3e SVT, météo et climat.', s))
