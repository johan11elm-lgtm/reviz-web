// Réviz — Modèles moléculaires (4e) : l'air, mélange de 8 molécules de diazote N₂ (bleu) et
// 2 molécules de dioxygène O₂ (rouge), code couleur des modèles moléculaires ; et une
// vaporisation : 8 molécules à l'état liquide (serrées, en désordre) puis les 8 mêmes
// molécules à l'état gazeux (dispersées). Chapitre 4eme/physique-chimie/modele-moleculaire-de-la-matiere
// (section 5 : « par exemple 8 N₂ et 2 O₂ sur 10 molécules » ; méthode, étape 4 : même nombre).
// Sortie : public/programme/illustrations/4eme/physique-chimie/modele-air-changement-etat.svg
import { C, r1, doc, etq, mention, ecrireSvg, flecheDroite } from './_pc.mjs'

const Y0 = 56, H = 96, fond = Y0 + H
const corps = []
// molécule diatomique : deux sphères accolées, angle en degrés
function diat(x, y, ang, trait, aplat) {
  const a = ang * Math.PI / 180, d = 3.4
  const p1 = [x - d * Math.cos(a), y - d * Math.sin(a)], p2 = [x + d * Math.cos(a), y + d * Math.sin(a)]
  return `<g fill="${aplat}" stroke="${trait}" stroke-width="1.5"><circle cx="${r1(p1[0])}" cy="${r1(p1[1])}" r="5"/><circle cx="${r1(p2[0])}" cy="${r1(p2[1])}" r="5"/></g>`
}
const N2 = (x, y, a) => diat(x, y, a, C.bleu, C.bleuClair)
const O2 = (x, y, a) => diat(x, y, a, C.rouge, C.rougeClair)

// 1. L'air (récipient fermé)
const XA = 14, WA = 104
corps.push(`<rect x="${XA}" y="${Y0}" width="${WA}" height="${H}" fill="none" stroke="${C.encre}" stroke-width="1.75"/>`)
const n2 = [[16, 16, 20], [52, 12, -30], [86, 20, 60], [30, 44, 80], [70, 40, 10], [14, 74, -50], [56, 80, 35], [88, 70, -10]]
const o2 = [[42, 62, -15], [76, 82, 75]]
for (const [dx, dy, a] of n2) corps.push(N2(XA + dx, Y0 + dy, a))
for (const [dx, dy, a] of o2) corps.push(O2(XA + dx, Y0 + dy, a))
// clé : une molécule de chaque sorte au-dessus du récipient
corps.push(N2(XA + 12, Y0 - 20, 0))
corps.push(etq(XA + 24, Y0 - 16, 'N₂'))
corps.push(O2(XA + 64, Y0 - 20, 0))
corps.push(etq(XA + 76, Y0 - 16, 'O₂'))
corps.push(etq(XA + WA / 2, fond + 22, 'Air', 'middle'))

// 2. Vaporisation : 8 molécules avant, 8 après
const R = 6.2, D = 2 * R + 0.3
const part = pts => `<g fill="#FBE9DD" stroke="${C.accent}" stroke-width="1.5">` + pts.map(([x, y]) => `<circle cx="${r1(x)}" cy="${r1(y)}" r="${R}"/>`).join('') + '</g>'
const XL = 150, WL = 74, XG = 272, WG = 74
corps.push(`<path d="M${XL},${Y0} V${fond} H${XL + WL} V${Y0}" fill="none" stroke="${C.encre}" stroke-width="1.75"/>`)
corps.push(`<rect x="${XG}" y="${Y0}" width="${WG}" height="${H}" fill="none" stroke="${C.encre}" stroke-width="1.75"/>`)
// liquide : 5 au fond (écarts irréguliers), 3 posées dans les creux
const xl0 = XL + 1 + R
const liq = []
for (const dx of [0, 13.6, 27.2, 41.4, 54.6, 6.8, 34.3, 48]) {
  const x = xl0 + dx
  let y = fond - 1 - R
  for (const [px, py] of liq) { const e = Math.abs(px - x); if (e < D) y = Math.min(y, py - Math.sqrt(D * D - e * e)) }
  liq.push([x, y])
}
corps.push(part(liq))
const gaz = [[14, 14], [52, 18], [34, 38], [62, 50], [12, 56], [40, 70], [20, 86], [60, 84]].map(([dx, dy]) => [XG + dx, Y0 + dy])
corps.push(part(gaz))
corps.push(flecheDroite([XL + WL / 2 + 20, Y0 - 12], [XG + WG / 2 - 20, Y0 - 12], { epaisseur: 1.75 }))
corps.push(etq((XL + WL + XG) / 2, Y0 - 24, 'Vaporisation', 'middle'))
corps.push(etq(XL + WL / 2, fond + 22, 'Liquide', 'middle'))
corps.push(etq(XG + WG / 2, fond + 22, 'Gaz', 'middle'))
corps.push(mention(XL + WL / 2, fond + 38, '8 molécules', 'middle'))
corps.push(mention(XG + WG / 2, fond + 38, '8 molécules', 'middle'))

const svg = doc(fond + 50,
  'Modèle de l’air : 8 molécules de diazote N₂ et 2 de dioxygène O₂, dispersées dans un récipient fermé ; vaporisation : 8 molécules serrées en désordre à l’état liquide, puis les 8 mêmes molécules dispersées à l’état gazeux. Réviz, 4e physique-chimie, modèle moléculaire.',
  corps)
ecrireSvg('modele-air-changement-etat', svg, '4eme/physique-chimie')
