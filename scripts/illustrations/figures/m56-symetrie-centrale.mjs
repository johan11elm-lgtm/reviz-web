// Réviz — 5e maths, « Symétrie centrale » : à gauche, triangle ABC et son symétrique
// A'B'C' par rapport à O (O milieu de [AA'], [BB'], [CC'], longueurs codées ; (A'B') // (AB)).
// À droite, construction sur quadrillage : de M à O, 2 carreaux à droite et 1 en haut ;
// on refait le même déplacement depuis O pour obtenir M'. Figure calculée (M' = 2O − M).
import { C, P, add, sub, mul, seg, poly, pointe, chevron, codeLongueur, direction, mil, noms, ecrire, f } from './_m56.mjs'

const corps = []
const trait = (d, c = C.encre, w = 1.75, extra = '') => corps.push(`<path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"${extra}/>`)
const sym = (o, m) => sub(mul(o, 2), m)

// --- Gauche : triangle et symétrique ---
const O = P(106, 108)
const A = add(O, P(-86, -4)), B = add(O, P(-24, -84)), Cc = add(O, P(-38, -30))
const [A2, B2, C2] = [A, B, Cc].map(m => sym(O, m))
corps.push(`<path d="${poly([A2, B2, C2])}" fill="${C.aplat}"/>`)
trait([[A, A2], [B, B2], [Cc, C2]].map(([p, q]) => seg(p, q)).join(' '), C.encre, 1.1, ' opacity="0.55"')
trait([[A, A2, 1], [B, B2, 2], [Cc, C2, 3]].map(([p, q, n]) => codeLongueur(p, O, n, { l: 3.6, ecart: 2.6 }) + ' ' + codeLongueur(O, q, n, { l: 3.6, ecart: 2.6 })).join(' '), C.encre, 1.2)
trait(poly([A, B, Cc]))
trait(poly([A2, B2, C2]), C.accent, 2.25)
const dAB = direction(A, B)
trait(chevron(mil(A, B), dAB) + ' ' + chevron(mil(A2, B2), dAB + 180), C.encre, 1.5)
const pts = [A, B, Cc, A2, B2, C2, O]
corps.push(noms([
  [A.x - 9, A.y + 4, 'A'], [B.x - 9, B.y - 4, 'B'], [Cc.x + 1, Cc.y + 17, 'C'],
  [A2.x + 11, A2.y + 4, "A'"], [B2.x + 11, B2.y + 8, "B'"], [C2.x - 1, C2.y - 8, "C'"],
  [O.x - 12, O.y + 14, 'O'],
]))

// --- Droite : quadrillage ---
const q = 17, g0 = P(225, 56), nx = 7, ny = 6
const grille = []
for (let i = 0; i <= nx; i++) grille.push(`M${f(g0.x + i * q)},${f(g0.y)} V${f(g0.y + ny * q)}`)
for (let j = 0; j <= ny; j++) grille.push(`M${f(g0.x)},${f(g0.y + j * q)} H${f(g0.x + nx * q)}`)
corps.unshift(`<path d="${grille.join(' ')}" stroke="${C.grille}" stroke-width="1"/>`)
const c = (i, j) => P(g0.x + i * q, g0.y + j * q)
const M = c(1, 4.5), Og = add(M, P(2 * q, -q)), M2 = sym(Og, M)
// déplacements : 2 à droite puis 1 en haut, deux fois
const depl = (p, col) => {
  const r = add(p, P(2 * q, 0)), h = add(r, P(0, -q))
  const t = add(h, P(0, 3.5))
  trait(`M${f(p.x)},${f(p.y)} H${f(r.x)} V${f(t.y + 5)}`, col, 1.75)
  corps.push(`<path d="${pointe(r, t, 6, 3)}" fill="${col}"/>`)
}
trait(seg(M, M2), C.encre, 1.1, ' opacity="0.55"')
depl(M, C.encre); depl(Og, C.accent)
pts.push(M, Og, M2)
corps.push(noms([[M.x - 9, M.y + 5, 'M'], [Og.x - 2, Og.y - 7, 'O'], [M2.x + 1, M2.y - 8, "M'"]]))

ecrire('5eme/maths/symetrie-centrale-construction.svg', 220,
  "À gauche, triangle ABC et son symétrique A'B'C' par rapport à O : O est le milieu de [AA'], [BB'] et [CC'], et (A'B') est parallèle à (AB). À droite, sur quadrillage, de M à O on avance de 2 carreaux à droite et 1 en haut, puis encore 2 à droite et 1 en haut depuis O jusqu'à M'. Réviz, 5e maths, symétrie centrale.",
  [
    `<path d="M215,20 V200" stroke="${C.separateur}" stroke-width="1"/>`,
    ...corps,
    `<g>${pts.map(p => `<circle cx="${f(p.x)}" cy="${f(p.y)}" r="2.2"/>`).join('')}</g>`,
  ])
