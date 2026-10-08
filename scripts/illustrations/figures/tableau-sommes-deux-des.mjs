// Réviz, 3e maths, probabilités (section 5, exemple ; piège n° 2).
// Tableau à double entrée des sommes de deux dés équilibrés : 36 issues équiprobables,
// les 6 cases de somme 7 (diagonale) en accent : P(« somme égale à 7 ») = 6/36 = 1/6.
// node scripts/illustrations/figures/tableau-sommes-deux-des.mjs
import { C, doc, ecrire, mention } from './_maths-3e-4e.mjs'

const c = 33 // côté d'une case
const x0 = 68, y0 = 30 // coin haut gauche du tableau (case « + »)
const out = []
const cx = j => x0 + c * j + c / 2
const cy = i => y0 + c * i + c / 2 + 4.5
// cases de somme 7
for (let i = 1; i <= 6; i++) {
  const j = 7 - i
  out.push(`<rect x="${x0 + c * j}" y="${y0 + c * i}" width="${c}" height="${c}" fill="${C.aplat}"/>`)
}
// quadrillage
let d = ''
for (let k = 0; k <= 7; k++) {
  if (k === 0 || k === 7) continue
  d += `M${x0 + c * k},${y0}V${y0 + 7 * c}M${x0},${y0 + c * k}H${x0 + 7 * c}`
}
out.push(`<path d="${d}" stroke="${C.encre}" stroke-width="1" opacity="0.35"/>`)
out.push(`<path d="M${x0 + c},${y0}V${y0 + 7 * c}M${x0},${y0 + c}H${x0 + 7 * c}" stroke="${C.encre}" stroke-width="1.75"/>`)
out.push(`<rect x="${x0}" y="${y0}" width="${7 * c}" height="${7 * c}" fill="none" stroke="${C.encre}" stroke-width="1.75" rx="2"/>`)
// en-têtes et sommes
let t = `<text x="${cx(0)}" y="${cy(0)}">+</text>`
for (let k = 1; k <= 6; k++) t += `<text x="${cx(k)}" y="${cy(0)}">${k}</text><text x="${cx(0)}" y="${cy(k)}">${k}</text>`
out.push(`<g font-size="12.5" font-weight="700" fill="${C.encre}" text-anchor="middle">${t}</g>`)
let s = '', s7 = ''
for (let i = 1; i <= 6; i++) for (let j = 1; j <= 6; j++) {
  const txt = `<text x="${cx(j)}" y="${cy(i)}">${i + j}</text>`
  if (i + j === 7) s7 += txt; else s += txt
}
out.push(`<g font-size="12" font-weight="500" fill="${C.encre}" text-anchor="middle">${s}</g>`)
out.push(`<g font-size="12.5" font-weight="700" fill="${C.accent}" text-anchor="middle">${s7}</g>`)
out.push(mention(x0 + 3.5 * c + c / 2, y0 - 10, '2e dé', { ancre: 'middle', masquable: false }).svg)
out.push(mention(x0 - 10, cy(3.5) - 4, '1er dé', { ancre: 'end', masquable: false }).svg)

const svg = doc(270,
  "Tableau à double entrée des sommes de deux dés : 1er dé en ligne, 2e dé en colonne, 36 cases ; les 6 cases de somme 7 sont surlignées (diagonale). Réviz, 3e maths, probabilités.",
  out)
ecrire('3eme/maths', 'tableau-sommes-deux-des', svg)
