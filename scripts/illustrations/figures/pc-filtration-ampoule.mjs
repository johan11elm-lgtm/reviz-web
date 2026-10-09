// Réviz — Deux montages de séparation, au trait : filtration (entonnoir, papier filtre plié en
// cône, mélange boueux au-dessus, filtrat limpide recueilli dans un bécher) et ampoule à décanter
// (huile au-dessus, eau plus dense en dessous, robinet). Chapitre
// 5eme/physique-chimie/separer-les-constituants-d-un-melange (sections 1 et 2).
// Sortie : public/programme/illustrations/5eme/physique-chimie/filtration-ampoule-a-decanter.svg
import { C, r1, doc, etq, mention, rappel, ecrireSvg, poly } from './_pc.mjs'

const corps = []
const T = `stroke="${C.encre}" stroke-width="1.75" stroke-linejoin="round" fill="none"`
const HUILE = '#F6E7B8', BOUE = '#E9DCC8'

// ---------- filtration ----------
const xc = 92, yH = 56, demi = 46, yP = 128 // haut de l'entonnoir, demi-largeur, pointe du cône
const yQ = 148                               // bas de la tige
// mélange boueux dans le filtre (jusqu'à y = 82)
const niv = 82, k = (niv - yH) / (yP - yH)
const xa = xc - demi + 6 + (demi - 6) * k, xb = xc + demi - 6 - (demi - 6) * k
corps.push(`<path d="M${r1(xa)},${niv} L${xc},${yP - 6} L${r1(xb)},${niv} Z" fill="${BOUE}"/>`)
let pts = ''
for (const [dx, dy] of [[-12, 6], [-4, 12], [6, 8], [14, 4], [0, 22], [-6, 30], [5, 34], [-16, 2], [18, 10]]) pts += `<circle cx="${xc + dx}" cy="${niv + dy}" r="1.4"/>`
corps.push(`<g fill="${C.encre}" opacity="0.55">${pts}</g>`)
// papier filtre (accent)
corps.push(`<path d="M${xc - demi + 6},${yH + 4} L${xc},${yP - 4} L${xc + demi - 6},${yH + 4}" stroke="${C.accent}" stroke-width="2.25" fill="none" stroke-linejoin="round"/>`)
// entonnoir
corps.push(`<path d="M${xc - demi},${yH} L${xc - 4},${yP} V${yQ} M${xc + demi},${yH} L${xc + 4},${yP} V${yQ}" ${T}/>`)
// gouttes et bécher avec filtrat
corps.push(`<g fill="${C.bleu}"><ellipse cx="${xc}" cy="${yQ + 9}" rx="2" ry="3"/><ellipse cx="${xc}" cy="${yQ + 22}" rx="2" ry="3"/></g>`)
const bx0 = xc - 34, bx1 = xc + 34, by0 = 166, by1 = 236
corps.push(`<path d="M${bx0 + 2},${by1 - 30} H${bx1 - 2} V${by1 - 2} H${bx0 + 2} Z" fill="${C.bleuClair}"/>`)
corps.push(`<path d="M${bx0 - 4},${by0} q4,0 4,4 V${by1} H${bx1} V${by0 + 4} q0,-4 4,-4" ${T}/>`)
corps.push(`<path d="M${bx0 + 2},${by1 - 30} H${bx1 - 2}" stroke="${C.bleu}" stroke-width="1.5"/>`)
// étiquettes filtration
corps.push(etq(14, 30, 'Entonnoir'))
corps.push(rappel([40, 34], [xc - demi + 1.5, yH + 2]))
corps.push(etq(150, 92, ['Papier', 'filtre']))
corps.push(rappel([147, 94], [xc + 22, yH + 30]))
corps.push(etq(150, 218, 'Filtrat'))
corps.push(rappel([147, 214], [bx1 - 8, by1 - 18]))
corps.push(mention(xc, 262, 'filtration', 'middle'))

// ---------- ampoule à décanter ----------
const ax = 270
// profil de l'ampoule (poire) : col en haut, panse, cône vers le robinet
const prof = [[6, 20], [6, 34], [30, 70], [36, 96], [30, 120], [6, 150], [3, 158]]
const gauche = prof.map(([dx, y]) => [ax - dx, y]), droite = prof.map(([dx, y]) => [ax + dx, y]).reverse()
const contour = [...gauche, ...droite]
// remplissage : huile de y = 64 à 104, eau de 104 à 156 (on découpe le profil)
const largeur = y => { for (let i = 0; i < prof.length - 1; i++) { const [d0, y0] = prof[i], [d1, y1] = prof[i + 1]; if (y >= y0 && y <= y1) return d0 + (d1 - d0) * (y - y0) / (y1 - y0) } return 0 }
const bande = (ya, yb) => { const ys = [ya, ...prof.map(p => p[1]).filter(y => y > ya && y < yb), yb]; const g = ys.map(y => [ax - largeur(y) + 1.2, y]); const d = ys.map(y => [ax + largeur(y) - 1.2, y]).reverse(); return poly([...g, ...d], true) }
corps.push(`<path d="${bande(66, 104)}" fill="${HUILE}"/>`)
corps.push(`<path d="${bande(104, 156)}" fill="${C.bleuClair}"/>`)
corps.push(`<path d="M${r1(ax - largeur(104) + 1)},104 H${r1(ax + largeur(104) - 1)}" stroke="${C.encre}" stroke-width="1" opacity="0.6"/>`)
corps.push(`<path d="${poly(contour)}" ${T}/>`)
// bouchon
corps.push(`<rect x="${ax - 8}" y="10" width="16" height="10" rx="2" fill="#FFFFFF" stroke="${C.encre}" stroke-width="1.75"/>`)
// robinet et tube de sortie
corps.push(`<path d="M${ax - 3},158 V184 M${ax + 3},158 V184" ${T}/>`)
corps.push(`<rect x="${ax - 7}" y="164" width="14" height="10" rx="2" fill="#FFFFFF" stroke="${C.encre}" stroke-width="1.75"/><path d="M${ax + 7},169 H${ax + 20}" stroke="${C.encre}" stroke-width="3" stroke-linecap="round"/>`)
// bécher dessous
const cx0 = ax - 30, cx1 = ax + 30, cy0 = 196, cy1 = 236
corps.push(`<path d="M${cx0 + 2},${cy1 - 10} H${cx1 - 2} V${cy1 - 2} H${cx0 + 2} Z" fill="${C.bleuClair}"/>`)
corps.push(`<path d="M${cx0 - 4},${cy0} q4,0 4,4 V${cy1} H${cx1} V${cy0 + 4} q0,-4 4,-4" ${T}/>`)
// étiquettes ampoule
corps.push(etq(214, 62, 'Huile', 'end'))
corps.push(rappel([214, 58], [ax - 22, 84]))
corps.push(etq(214, 136, 'Eau', 'end'))
corps.push(rappel([214, 132], [ax - 18, 128]))
corps.push(etq(346, 150, 'Robinet', 'end'))
corps.push(rappel([320, 154], [ax + 16, 169]))
corps.push(mention(ax, 262, 'ampoule à décanter', 'middle'))

const svg = doc(274,
  'À gauche, filtration : entonnoir garni d’un papier filtre contenant un mélange boueux ; le filtrat limpide coule dans un bécher. À droite, ampoule à décanter : huile au-dessus, eau en dessous, robinet en bas. Réviz, 5e physique-chimie, séparer les constituants d’un mélange.',
  corps)
ecrireSvg('filtration-ampoule-a-decanter', svg, '5eme/physique-chimie')
