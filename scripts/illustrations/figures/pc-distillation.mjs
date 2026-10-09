// Réviz — Montage de distillation au trait : chauffe-ballon, ballon contenant le mélange,
// thermomètre en haut de la colonne, tube incliné passant dans le réfrigérant (manchon d'eau froide,
// entrée d'eau en bas, sortie d'eau en haut : circulation à contre-courant), distillat recueilli
// dans un erlenmeyer. Géométrie calculée le long de l'axe incliné du réfrigérant.
// Chapitre 5eme/physique-chimie/separer-les-constituants-d-un-melange (section 4).
// Sortie : public/programme/illustrations/5eme/physique-chimie/distillation.svg
import { C, r1, doc, etq, rappel, ecrireSvg, poly, flecheDroite } from './_pc.mjs'

const corps = []
const T = `stroke="${C.encre}" stroke-width="1.75" stroke-linejoin="round" fill="none"`
// ballon
const F = [92, 190], RB = 30, col = 6
const yCol = F[1] - Math.sqrt(RB * RB - col * col)
const yHaut = 82
const yLiq = 192
{
  const dx = Math.sqrt(RB * RB - (yLiq - F[1]) ** 2)
  corps.push(`<path d="M${r1(F[0] - dx)},${yLiq} A${RB},${RB} 0 1 0 ${r1(F[0] + dx)},${yLiq} Z" fill="${C.bleuClair}"/>`)
  corps.push(`<path d="M${r1(F[0] - dx)},${yLiq} H${r1(F[0] + dx)}" stroke="${C.bleu}" stroke-width="1.5"/>`)
}
// axe du réfrigérant
const th = 21 * Math.PI / 180, u = [Math.cos(th), Math.sin(th)], n = [-Math.sin(th), Math.cos(th)]
const O = [F[0] + col, 102], LONG = 196
const P = (s, d = 0) => [O[0] + u[0] * s + n[0] * d, O[1] + u[1] * s + n[1] * d]
// contour ballon + col (ouvert au départ du tube latéral)
const yJ0 = O[1] - 3.2, yJ1 = O[1] + 3.2 / Math.cos(th) + 1
corps.push(`<path d="M${F[0] - col},${yHaut} V${r1(yCol)} A${RB},${RB} 0 1 0 ${F[0] + col},${r1(yCol)} V${r1(yJ1)} M${F[0] + col},${r1(yJ0)} V${yHaut}" ${T}/>`)
// manchon du réfrigérant (eau froide)
const s0 = 52, s1 = 166, W = 11
const manchon = [P(s0, -W), P(s1, -W), P(s1, W), P(s0, W)]
// tubulures : sortie en haut (côté s0, au-dessus), entrée en bas (côté s1, en dessous)
const sortieA = P(s0 + 14, -W), sortieB = P(s0 + 14, -W - 15)
const entreeA = P(s1 - 14, W), entreeB = P(s1 - 14, W + 15)
const tub = (a, b, sg) => { const t = [b[0] - a[0], b[1] - a[1]], l = Math.hypot(...t), q = [-t[1] / l * 3.5, t[0] / l * 3.5]; return `M${r1(a[0] + q[0])},${r1(a[1] + q[1])} L${r1(b[0] + q[0])},${r1(b[1] + q[1])} M${r1(a[0] - q[0])},${r1(a[1] - q[1])} L${r1(b[0] - q[0])},${r1(b[1] - q[1])}` }
corps.push(`<path d="${poly(manchon, true)}" fill="${C.bleuClair}" stroke="${C.encre}" stroke-width="1.75" stroke-linejoin="round"/>`)
corps.push(`<path d="${tub(sortieA, sortieB)} ${tub(entreeA, entreeB)}" ${T}/>`)
// flèches de l'eau
corps.push(flecheDroite(P(s0 + 14, -W - 17), P(s0 + 14, -W - 33), { couleur: C.bleu, epaisseur: 1.75, long: 7, large: 6 }))
corps.push(flecheDroite(P(s1 - 14, W + 33), P(s1 - 14, W + 17), { couleur: C.bleu, epaisseur: 1.75, long: 7, large: 6 }))
// tube intérieur (vapeur puis liquide), par-dessus le manchon
corps.push(`<path d="M${r1(P(0, -3.2)[0])},${r1(P(0, -3.2)[1])} L${r1(P(LONG, -3.2)[0])},${r1(P(LONG, -3.2)[1])} M${r1(P(0, 3.2)[0] - 0.4)},${r1(P(0, 3.2)[1] + 0.2)} L${r1(P(LONG, 3.2)[0])},${r1(P(LONG, 3.2)[1])}" stroke="${C.encre}" stroke-width="1.5" fill="none"/>`)
// thermomètre et bouchon
corps.push(`<rect x="${F[0] - 8}" y="${yHaut - 10}" width="16" height="12" rx="2" fill="#FFFFFF" stroke="${C.encre}" stroke-width="1.75"/>`)
corps.push(`<rect x="${F[0] - 2}" y="46" width="4" height="${O[1] - 46 - 2}" rx="2" fill="#FFFFFF" stroke="${C.encre}" stroke-width="1.25"/><circle cx="${F[0]}" cy="${O[1] + 1}" r="3.4" fill="${C.rouge}" stroke="${C.encre}" stroke-width="1.25"/>`)
// chauffe-ballon (devant le bas du ballon)
const yC = 204
corps.push(`<path d="M${F[0] - 44},${yC} H${F[0] + 44} V${yC + 30} q0,12 -12,12 H${F[0] - 32} q-12,0 -12,-12 Z" fill="${C.ocre}" stroke="${C.encre}" stroke-width="1.75" stroke-linejoin="round"/>`)
// distillat : gouttes et erlenmeyer
const fin = P(LONG, 0)
corps.push(`<g fill="${C.bleu}"><ellipse cx="${r1(fin[0] + 2)}" cy="${r1(fin[1] + 12)}" rx="2" ry="3"/></g>`)
const ex = r1(fin[0] + 2), ey0 = r1(fin[1] + 24), ey1 = 246
const erl = [[ex - 8, ey0], [ex - 8, ey0 + 12], [ex - 28, ey1], [ex + 28, ey1], [ex + 8, ey0 + 12], [ex + 8, ey0]]
corps.push(`<path d="M${ex - 22},${ey1 - 14} H${ex + 22} L${ex + 27},${ey1 - 1} H${ex - 27} Z" fill="${C.bleuClair}"/>`)
corps.push(`<path d="${poly(erl)}" ${T}/>`)
// étiquettes
corps.push(etq(14, 30, "Thermomètre"))
corps.push(rappel([62, 34], [F[0] - 3, 62]))
corps.push(etq(14, 150, 'Ballon'))
corps.push(rappel([44, 154], [F[0] - RB + 4, 175]))
corps.push(etq(14, 268, 'Chauffe-ballon'))
corps.push(rappel([60, 257], [F[0] - 30, 232]))
const so = P(s0 + 14, -W - 33), en = P(s1 - 14, W + 33)
corps.push(etq(r1(so[0] + 10), r1(so[1] + 6), 'Sortie d’eau'))
corps.push(etq(r1(en[0] - 10), r1(en[1] + 2), 'Entrée d’eau', 'end'))
const rf = P(s1 - 30, -W)
corps.push(etq(262, 112, 'Réfrigérant'))
corps.push(rappel([280, 116], [rf[0] + 2, rf[1] + 2]))
corps.push(etq(ex, 268, 'Distillat', 'middle'))
corps.push(rappel([ex, 256], [ex, ey1 - 6]))

const svg = doc(280,
  'Montage de distillation : ballon chauffé par un chauffe-ballon, thermomètre en haut du col, tube incliné entouré du réfrigérant (entrée d’eau froide en bas, sortie en haut), distillat recueilli dans un erlenmeyer. Réviz, 5e physique-chimie, séparer les constituants d’un mélange.',
  corps)
ecrireSvg('distillation', svg, '5eme/physique-chimie')
