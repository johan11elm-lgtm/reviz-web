// Réviz — 5e maths, « Nombres relatifs et repérage » : en haut, droite graduée de −6 à 4
// avec les nombres du rangement du chapitre (−5 < −1,5 < 0 < 2 < 3,7) et deux opposés,
// −2,5 et 2,5, à la même distance de l'origine ; en bas, repère du plan avec A(−3 ; 2),
// B(4 ; 0), C(0 ; −2) et, pour A, le trajet « 3 unités à gauche puis 2 en haut ». Calculée.
import { C, P, seg, pointe, codeLongueur, noms, etiquette, ecrire, f } from './_m56.mjs'

const corps = []
const trait = (d, c = C.encre, w = 1.75, extra = '') => corps.push(`<path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"${extra}/>`)
const nombre = v => (v < 0 ? '−' : '') + String(Math.abs(v)).replace('.', ',')
const grad = (x, y, t, a = 'middle') => `<text x="${f(x)}" y="${f(y)}" text-anchor="${a}">${t}</text>`
const graduations = []
const points = [], pointsAccent = []

// --- Droite graduée ---
const u = 30, x0 = 30, yL = 44 // abscisse −6 en x0
const X = v => x0 + (v + 6) * u
trait(`M${f(X(-6) - 10)},${yL} H${f(X(4) + 18)}`)
corps.push(`<path d="${pointe(P(X(4), yL), P(X(4) + 24, yL), 7, 3.2)}" fill="${C.encre}"/>`)
const ticks = []
for (let v = -6; v <= 4; v++) { ticks.push(`M${f(X(v))},${yL - 4} V${yL + 4}`); graduations.push(grad(X(v), yL + 17, nombre(v))) }
trait(ticks.join(' '), C.encre, 1.4)
const ranges = [-5, -1.5, 0, 2, 3.7]
ranges.forEach(v => points.push(P(X(v), yL)))
const etiqHaut = ranges.map(v => etiquette(X(v), yL - 11, nombre(v), { a: 'middle' }))
// opposés −2,5 et 2,5 : même distance à zéro (crochets codés sous la droite)
const yB = yL + 30
for (const v of [-2.5, 2.5]) pointsAccent.push(P(X(v), yL))
trait(`M${f(X(-2.5))},${yL + 4} V${yB + 4} M${f(X(2.5))},${yL + 4} V${yB + 4} M${f(X(0))},${yL + 22} V${yB + 4}`, C.accent, 1.2, ' opacity="0.7"')
trait(`M${f(X(-2.5))},${yB} H${f(X(2.5))}`, C.accent, 1.75)
trait(codeLongueur(P(X(-2.5), yB), P(X(0), yB), 1) + ' ' + codeLongueur(P(X(0), yB), P(X(2.5), yB), 1), C.accent, 1.4)
const etiqBas = [-2.5, 2.5].map(v => etiquette(X(v), yB + 18, nombre(v), { a: 'middle' }))

// --- Repère ---
const q = 24, O = P(176, 200) // origine
const R = (x, y) => P(O.x + x * q, O.y - y * q)
const grille = []
for (let i = -5; i <= 5; i++) grille.push(`M${f(R(i, -3).x)},${f(R(i, -3).y)} V${f(R(i, 3).y)}`)
for (let j = -3; j <= 3; j++) grille.push(`M${f(R(-5, j).x)},${f(R(-5, j).y)} H${f(R(5, j).x)}`)
corps.push(`<path d="${grille.join(' ')}" stroke="${C.grille}" stroke-width="1"/>`)
trait(`M${f(R(-5, 0).x)},${f(O.y)} H${f(R(5, 0).x + 14)} M${f(O.x)},${f(R(0, -3).y)} V${f(R(0, 3).y - 14)}`, C.encre, 1.4)
corps.push(`<path d="${pointe(R(5, 0), P(R(5, 0).x + 18, O.y), 7, 3.2)} ${pointe(R(0, 3), P(O.x, R(0, 3).y - 18), 7, 3.2)}" fill="${C.encre}"/>`)
const tk = []
for (let i = -5; i <= 5; i++) if (i) { tk.push(`M${f(R(i, 0).x)},${f(O.y - 3)} V${f(O.y + 3)}`); graduations.push(grad(R(i, 0).x, O.y + 14, nombre(i))) }
for (let j = -3; j <= 3; j++) if (j) { tk.push(`M${f(O.x - 3)},${f(R(0, j).y)} H${f(O.x + 3)}`); graduations.push(grad(O.x - 6, R(0, j).y + 3.7, nombre(j), 'end')) }
trait(tk.join(' '), C.encre, 1.4)
// trajet de A : 3 unités à gauche, puis 2 en haut
const A = R(-3, 2), Bp = R(4, 0), Cp = R(0, -2), K = R(-3, 0)
trait(`M${f(O.x - 3)},${f(O.y)} H${f(K.x + 6)}`, C.accent, 2.25)
corps.push(`<path d="${pointe(O, P(K.x, O.y), 7, 3.4)}" fill="${C.accent}"/>`)
trait(`M${f(K.x)},${f(K.y - 3)} V${f(A.y + 7)}`, C.accent, 2.25)
corps.push(`<path d="${pointe(K, P(A.x, A.y + 1), 7, 3.4)}" fill="${C.accent}"/>`)
points.push(A, Bp, Cp, O)

ecrire('5eme/maths/relatifs-droite-graduee-repere.svg', 284,
  "En haut, droite graduée de −6 à 4 où sont placés −5, −1,5, 0, 2 et 3,7, ainsi que les opposés −2,5 et 2,5, à la même distance de zéro. En bas, repère du plan avec A(−3 ; 2), B(4 ; 0) sur l'axe des abscisses, C(0 ; −2) sur l'axe des ordonnées, et le trajet de l'origine à A : 3 unités à gauche puis 2 en haut. Réviz, 5e maths, nombres relatifs et repérage.",
  [
    ...corps,
    `<g font-size="10.5" font-weight="400" stroke="#FFFFFF" stroke-width="3" stroke-linejoin="round" paint-order="stroke">${graduations.join('')}</g>`,
    `<g>${points.map(p => `<circle cx="${f(p.x)}" cy="${f(p.y)}" r="2.6"/>`).join('')}</g>`,
    `<g fill="${C.accent}">${pointsAccent.map(p => `<circle cx="${f(p.x)}" cy="${f(p.y)}" r="2.8"/>`).join('')}</g>`,
    ...etiqHaut, ...etiqBas,
    noms([[A.x - 9, A.y - 7, 'A'], [Bp.x + 2, Bp.y - 8, 'B'], [Cp.x + 10, Cp.y + 4, 'C'], [O.x - 8, O.y + 14, 'O']]),
  ])
