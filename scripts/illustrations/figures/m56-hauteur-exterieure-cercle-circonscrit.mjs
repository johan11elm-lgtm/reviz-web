// Réviz — 5e maths, « Droites remarquables du triangle » : à gauche, triangle ABC obtus
// en B, la hauteur issue de A tombe à l'extérieur, son pied H est sur le prolongement
// de [BC] ; à droite, un triangle, ses trois médiatrices concourantes en O et le cercle
// circonscrit de centre O. Figure calculée (O = centre du cercle circonscrit, exact).
import { C, P, seg, pol, angleDroit, codeLongueur, projete, mil, direction, circonscrit, dist, sub, norm, add, mul, noms, etiquette, ecrire, f } from './_m56.mjs'

const corps = []
const trait = (d, c = C.encre, w = 1.75, extra = '') => corps.push(`<path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"${extra}/>`)
const points = []

// --- Gauche : hauteur extérieure ---
const A = P(30, 58), B = P(74, 186), Cc = P(140, 186)
const H = projete(A, B, Cc)
trait(`M${f(H.x - 8)},${f(H.y)} L${f(B.x)},${f(B.y)}`, C.encre, 1.5, ' stroke-dasharray="4 3"')
trait(`${seg(A, B)} ${seg(B, Cc)} ${seg(Cc, A)}`)
trait(seg(A, H), C.accent, 2.25)
trait(angleDroit(H, 0, 90), C.accent, 1.4)
points.push(A, B, Cc, H)
corps.push(noms([[A.x, A.y - 9, 'A'], [B.x, B.y + 17, 'B'], [Cc.x, Cc.y + 17, 'C'], [H.x, H.y + 17, 'H']]))
corps.push(etiquette(84, 226, 'Hauteur issue de A', { a: 'middle' }))

// --- Droite : médiatrices et cercle circonscrit ---
const O0 = P(264, 116), R = 74
const [D, E, F] = [112, 208, 334].map(a => pol(O0, R, a))
const O = circonscrit(D, E, F)
console.log('O =', O, 'OD OE OF =', dist(O, D).toFixed(3), dist(O, E).toFixed(3), dist(O, F).toFixed(3))
corps.push(`<circle cx="${f(O.x)}" cy="${f(O.y)}" r="${f(R)}" fill="none" stroke="${C.encre}" stroke-width="1.75"/>`)
trait(`${seg(D, E)} ${seg(E, F)} ${seg(F, D)}`)
const med = [], codes = [], ticks = []
;[[D, E, 1], [E, F, 2], [F, D, 3]].forEach(([p, q, n]) => {
  const M = mil(p, q)
  const u = norm(sub(M, O))
  med.push(seg(sub(O, mul(u, 26)), add(O, mul(u, R + 12))))
  const ds = direction(M, q), dm = direction(M, add(M, u))
  codes.push(angleDroit(M, ds, dm, 6))
  ticks.push(codeLongueur(p, M, n, { l: 4, ecart: 2.8 }), codeLongueur(M, q, n, { l: 4, ecart: 2.8 }))
})
trait(ticks.join(' '), C.encre, 1.2)
trait(med.join(' '), C.accent, 2)
trait(codes.join(' '), C.accent, 1.2)
points.push(D, E, F, O)
corps.push(noms([[D.x - 6, D.y - 8, 'A'], [E.x - 10, E.y + 6, 'B'], [F.x + 10, F.y + 6, 'C'], [pol(O, 14, 305).x, pol(O, 14, 305).y + 4.5, 'O']]))
corps.push(etiquette(O.x, 226, 'Cercle circonscrit', { a: 'middle' }))

ecrire('5eme/maths/hauteur-exterieure-cercle-circonscrit.svg', 240,
  "À gauche, triangle ABC obtus en B : la hauteur issue de A coupe le prolongement de [BC] en H, à l'extérieur du triangle. À droite, les trois médiatrices d'un triangle ABC concourent en O, centre du cercle circonscrit. Réviz, 5e maths, droites remarquables du triangle.",
  [
    `<path d="M168,24 V208" stroke="${C.separateur}" stroke-width="1"/>`,
    ...corps,
    `<g>${points.map(p => `<circle cx="${f(p.x)}" cy="${f(p.y)}" r="2.2"/>`).join('')}</g>`,
  ])
