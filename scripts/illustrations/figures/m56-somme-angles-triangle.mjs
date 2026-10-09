// Réviz — 5e maths, « Angles et triangles », section 4 : démonstration de la somme
// des angles. Triangle ABC avec Â = 50°, B̂ = 70°, Ĉ = 60° (exemple du chapitre),
// parallèle à (BC) passant par A (accent) : les angles alternes-internes égaux à B̂ et Ĉ
// se placent de part et d'autre de Â et forment un angle plat. Figure calculée.
import { C, P, pol, seg, arc, secteur, chevron, inter, direction, noms, etiquette, ecrire, f, mil } from './_m56.mjs'

const B = P(80, 246), Cc = P(280, 246)
const A = inter(B, pol(B, 10, 70), Cc, pol(Cc, 10, 120)) // B̂ = 70°, Ĉ = 60°
const dAB = direction(A, B), dAC = direction(A, Cc) // 250° et 300°
const L1 = pol(A, 138, 180), L2 = pol(A, 138, 0)
const r = 24, r2 = 28

const aplat = secteur(A, 37, 180, 360) // l'angle plat en A, reconstitué
const arcs = [
  arc(B, r, 0, 70), arc(A, r, 180, dAB), // B̂ et son alterne-interne : un arc
  arc(Cc, r, 120, 180), arc(Cc, r2, 120, 180), arc(A, r, dAC, 360), arc(A, r2, dAC, 360), // Ĉ : deux arcs
  arc(A, 33, dAB, dAC), // Â
]
const fixe = (s, rr, d, t) => { const q = pol(s, rr, d); return `<text x="${f(q.x)}" y="${f(q.y + 4)}" text-anchor="middle">${t}</text>` }
const v = (s, rr, d, t) => { const q = pol(s, rr, d); return etiquette(q.x, q.y + 4, t, { a: 'middle' }) }

ecrire('5eme/maths/somme-angles-triangle.svg', 268,
  "Triangle ABC (Â = 50°, B̂ = 70°, Ĉ = 60°) et la parallèle à (BC) passant par A : les angles alternes-internes égaux à B̂ et Ĉ entourent Â et forment en A un angle plat de 180°. Réviz, 5e maths, angles et triangles.",
  [
    `<path d="${aplat}" fill="${C.aplat}"/>`,
    `<path d="${seg(B, Cc)} ${seg(Cc, A)} ${seg(A, B)}" fill="none" stroke="${C.encre}" stroke-width="1.75" stroke-linejoin="round"/>`,
    `<path d="${seg(L1, L2)}" fill="none" stroke="${C.accent}" stroke-width="2.25" stroke-linecap="round"/>`,
    `<path d="${chevron(P(L2.x - 22, A.y), 0)} ${chevron(P((B.x + Cc.x) / 2 + 6, B.y), 0)}" fill="none" stroke="${C.encre}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`,
    `<path d="${arcs.join(' ')}" fill="none" stroke="${C.encre}" stroke-width="1.5"/>`,
    `<g>${[A, B, Cc].map(p => `<circle cx="${f(p.x)}" cy="${f(p.y)}" r="2.2"/>`).join('')}</g>`,
    noms([[A.x, A.y - 9, 'A'], [B.x - 10, B.y + 5, 'B'], [Cc.x + 10, Cc.y + 5, 'C']]),
    v(A, 56, (180 + dAB) / 2 - 8, '70°'), v(A, 55, (dAB + dAC) / 2, '50°'), v(A, 56, (dAC + 360) / 2 + 8, '60°'),
    fixe(B, 46, 33, '70°'), fixe(Cc, 46, 150, '60°'),
  ])
console.log('A =', A, 'angle en A', dAC - dAB)
