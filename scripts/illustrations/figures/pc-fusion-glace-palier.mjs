// Réviz — Température de la glace pilée qu'on chauffe, relevée chaque minute : −10, −4, 0,
// 0, 0, 0, 5, 12 °C (relevés types, ceux de la fiche de la ressource) : montée, palier à
// 0 °C tant qu'il reste de la glace (fusion), puis montée. Chapitre
// 6eme/sciences-et-technologie/etats-de-la-matiere (section 4).
// Sortie : public/programme/illustrations/6eme/sciences-et-technologie/fusion-glace-palier.svg
import { C, r1, doc, etq, etqFixe, mention, ecrireSvg, pointe } from './_pc.mjs'

const releves = [-10, -4, 0, 0, 0, 0, 5, 12]
const X = t => 62 + t * 34             // 0 → 8 min
const Y = T => 150 - T * 8             // 15 … −15 °C
const corps = []
let g = ''
for (let t = 1; t <= 8; t++) g += `M${X(t)},${Y(-14)} V${Y(15)} `
for (let T = -10; T <= 15; T += 5) g += `M${X(0)},${Y(T)} H${X(8)} `
corps.push(`<path d="${g.trim()}" stroke="${C.violet}" stroke-width="1" fill="none"/>`)
corps.push(`<path d="M${X(0)},${Y(-14)} H${X(8) + 12} M${X(0)},${Y(-14)} V${Y(15) - 8}" stroke="${C.encre}" stroke-width="1.75" fill="none"/>`)
corps.push(pointe([X(0), Y(-14)], [X(8) + 18, Y(-14)], { long: 9, large: 9 }))
corps.push(pointe([X(0), Y(-14)], [X(0), Y(15) - 14], { long: 9, large: 9 }))
let tic = ''
for (let t = 1; t <= 8; t++) tic += `M${X(t)},${Y(-14)} v4 `
for (let T = -10; T <= 15; T += 5) tic += `M${X(0)},${Y(T)} h-4 `
corps.push(`<path d="${tic.trim()}" stroke="${C.encre}" stroke-width="1.5"/>`)
corps.push(`<g font-size="11" font-weight="600" fill="${C.gris}" text-anchor="middle">` +
  [0, 1, 2, 3, 4, 5, 6, 7, 8].map(t => `<text x="${X(t)}" y="${Y(-14) + 16}">${t}</text>`).join('') + '</g>')
corps.push(`<g font-size="11" font-weight="600" fill="${C.gris}" text-anchor="end">` +
  [-10, -5, 0, 5, 10, 15].map(T => `<text x="${X(0) - 7}" y="${Y(T) + 4}">${String(T).replace('-', '−')}</text>`).join('') + '</g>')
corps.push(etqFixe(X(0) + 10, Y(15) - 4, 'T (°C)'))
corps.push(etqFixe(348, Y(-14) - 8, 't (min)', 'end'))
// courbe : segments entre relevés, palier en accent
const pt = t => `${X(t)},${r1(Y(releves[t]))}`
corps.push(`<path d="M${pt(0)} L${pt(1)} L${pt(2)} M${pt(5)} L${pt(6)} L${pt(7)}" fill="none" stroke="${C.encre}" stroke-width="1.75"/>`)
corps.push(`<path d="M${pt(2)} L${pt(5)}" stroke="${C.accent}" stroke-width="2.25"/>`)
corps.push(`<path d="${releves.map((T, t) => { const x = X(t), y = r1(Y(T)); return `M${x - 4},${y - 4} L${x + 4},${y + 4} M${x - 4},${y + 4} L${x + 4},${y - 4}` }).join(' ')}" stroke="${C.encre}" stroke-width="1.5"/>`)
// mentions des états et palier
corps.push(etq((X(2) + X(5)) / 2, Y(0) - 12, 'Palier', 'middle'))
corps.push(etq((X(2) + X(5)) / 2, Y(0) + 22, ['Glace et', 'eau liquide'], 'middle'))
corps.push(etq(X(1) + 10, Y(-7) + 4, 'Glace'))
corps.push(etq(X(7) - 6, Y(7) + 4, ['Eau', 'liquide']))

const svg = doc(Y(-14) + 28,
  'Température de la glace pilée chauffée, relevée chaque minute (−10, −4, 0, 0, 0, 0, 5, 12 °C) : montée, palier à 0 °C pendant la fusion, puis montée. Réviz, 6e sciences et technologie, états de la matière.',
  corps)
ecrireSvg('fusion-glace-palier', svg, '6eme/sciences-et-technologie')
