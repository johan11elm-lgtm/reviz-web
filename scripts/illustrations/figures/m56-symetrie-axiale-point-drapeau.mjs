// Réviz — 6e maths, « Symétrie axiale » : (1) point A, axe (d) et symétrique A' :
// [AA'] perpendiculaire à (d), angle droit et longueurs égales codés ; (2) un drapeau et
// son symétrique retourné, en face d'un drapeau simplement glissé (même sens), barré ;
// (3) axe oblique sur quadrillage : on compte les carreaux le long de la perpendiculaire
// à l'axe (2 diagonales de carreau de chaque côté). Figure calculée.
import { C, P, add, sub, mul, seg, poly, angleDroit, codeLongueur, mil, noms, ecrire, f } from './_m56.mjs'

const corps = [], points = []
const trait = (d, c = C.encre, w = 1.75, extra = '') => corps.push(`<path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"${extra}/>`)
const sym = (m, a, b) => { // symétrique de m par rapport à la droite (ab)
  const u = sub(b, a), l = Math.hypot(u.x, u.y), n = P(u.x / l, u.y / l)
  const t = (m.x - a.x) * n.x + (m.y - a.y) * n.y
  const h = add(a, mul(n, t))
  return add(h, sub(h, m))
}

// --- 1. Symétrique d'un point ---
const xd = 60, A = P(26, 104), H = P(xd, A.y), A2 = sym(A, P(xd, 0), P(xd, 1))
trait(`M${xd},34 V180`)
trait(seg(A, A2), C.accent, 2.25)
trait(angleDroit(H, 0, 90, 7), C.encre, 1.3)
trait(codeLongueur(A, H, 2) + ' ' + codeLongueur(H, A2, 2), C.encre, 1.3)
points.push(A, A2)
corps.push(noms([[A.x - 2, A.y - 9, 'A'], [A2.x + 2, A2.y - 9, "A'"], [xd, 26, '(d)']]))

// --- 2. Drapeaux ---
const xa = 180
trait(`M${xa},34 V180`)
const drapeau = (pied, sens) => { // mât de 44, fanion triangulaire de 26 × 18 en haut
  const haut = add(pied, P(0, -44))
  return { mat: seg(pied, haut), fanion: poly([haut, add(haut, P(26 * sens, 9)), add(haut, P(0, 18))]) }
}
const d0 = drapeau(P(xa - 34, 94), 1)
const d1 = drapeau(P(xa + 34, 94), -1) // symétrique : retourné
const d2 = drapeau(P(xa - 34, 168), 1)
const d3 = drapeau(P(xa + 8, 168), 1) // simplement glissé : même sens
corps.push(`<path d="${d0.fanion} ${d2.fanion}" fill="#FFFFFF" stroke="${C.encre}" stroke-width="1.5" stroke-linejoin="round"/>`)
corps.push(`<path d="${d1.fanion}" fill="${C.aplat}" stroke="${C.accent}" stroke-width="2" stroke-linejoin="round"/>`)
corps.push(`<path d="${d3.fanion}" fill="#FFFFFF" stroke="${C.gris}" stroke-width="1.5" stroke-linejoin="round"/>`)
trait(`${d0.mat} ${d2.mat}`, C.encre, 1.75)
trait(d1.mat, C.accent, 2.25)
trait(d3.mat, C.gris, 1.75)
trait(`M${xa + 5},118 L${xa + 39},170 M${xa + 39},118 L${xa + 5},170`, C.encre, 1.75)
corps.push(noms([[xa, 26, '(d)']]))

// --- 3. Axe oblique sur quadrillage ---
const q = 16, g0 = P(242, 46), n = 6
const g = (i, j) => P(g0.x + i * q, g0.y + j * q)
const grille = []
for (let i = 0; i <= n; i++) grille.push(`M${f(g(i, 0).x)},${f(g0.y)} V${f(g(0, n).y)}`)
for (let j = 0; j <= n; j++) grille.push(`M${f(g0.x)},${f(g(0, j).y)} H${f(g(n, 0).x)}`)
corps.unshift(`<path d="${grille.join(' ')}" stroke="${C.grille}" stroke-width="1"/>`)
const e1 = g(0, n), e2 = g(n, 0) // axe : diagonale du quadrillage
trait(`${seg(add(e1, P(-5, 5)), add(e2, P(6, -6)))}`)
const B = g(1, 1), B2 = sym(B, e1, e2), K = mil(B, B2)
trait(seg(B, B2), C.accent, 2.25)
trait(angleDroit(K, 45, 135, 6), C.encre, 1.3)
trait(codeLongueur(B, K, 2) + ' ' + codeLongueur(K, B2, 2), C.encre, 1.3)
points.push(B, B2)
corps.push(noms([[B.x - 9, B.y - 4, 'A'], [B2.x + 6, B2.y + 15, "A'"], [e2.x - 4, e2.y - 12, '(d)']]))

ecrire('6eme/maths/symetrie-axiale-point-drapeau.svg', 196,
  "Trois figures : le point A et son symétrique A' par rapport à l'axe (d), avec [AA'] perpendiculaire à (d) et les deux longueurs égales codées ; un drapeau et son symétrique retourné par rapport à (d), puis, en dessous, un drapeau simplement glissé de l'autre côté, sans être retourné, barré ; un axe oblique sur quadrillage, où l'on compte les carreaux le long de la perpendiculaire à l'axe, 2 diagonales de carreau de chaque côté. Réviz, 6e maths, symétrie axiale.",
  [
    `<path d="M120,20 V184 M232,20 V184" stroke="${C.separateur}" stroke-width="1"/>`,
    ...corps,
    `<g>${points.map(p => `<circle cx="${f(p.x)}" cy="${f(p.y)}" r="2.2"/>`).join('')}</g>`,
  ])
