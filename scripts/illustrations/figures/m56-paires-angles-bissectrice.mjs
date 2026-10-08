// Réviz — 6e maths, « Angles », sections 5 et 6 : deux angles adjacents (même sommet,
// côté commun en accent, de part et d'autre) ; deux droites sécantes formant 70° et
// 110° (angles opposés par le sommet égaux) ; bissectrice d'un angle de 80° construite
// au compas (arc de centre le sommet, puis deux arcs de même rayon). Figure calculée.
import { C, P, pol, seg, arc, secteur, dist, noms, etiquette, ecrire, f } from './_m56.mjs'

const corps = [], points = []
const trait = (d, c = C.encre, w = 1.75, extra = '') => corps.push(`<path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"${extra}/>`)
const texte = (p, t) => `<text x="${f(p.x)}" y="${f(p.y + 4)}" text-anchor="middle">${t}</text>`
const yT = 196

// --- 1. Angles adjacents ---
const O1 = P(26, 156), L = 84
corps.push(`<path d="${secteur(O1, 24, 0, 45)} ${secteur(O1, 24, 45, 100)}" fill="${C.aplat}"/>`)
trait(`${seg(O1, pol(O1, L, 0))} ${seg(O1, pol(O1, L, 100))}`)
trait(seg(O1, pol(O1, L, 45)), C.accent, 2.25)
trait(`${arc(O1, 24, 0, 45)} ${arc(O1, 20, 45, 100)} ${arc(O1, 24, 45, 100)}`, C.encre, 1.3)
points.push(O1)
corps.push(etiquette(62, yT, 'Adjacents', { a: 'middle' }))

// --- 2. Droites sécantes : 70° et 110° ---
const O2 = P(182, 108), d1 = -15, d2 = 55 // angle de 70° entre les deux droites
trait(`${seg(pol(O2, 52, d1), pol(O2, 52, d1 + 180))} ${seg(pol(O2, 62, d2), pol(O2, 62, d2 + 180))}`)
trait(`${arc(O2, 18, d1, d2)} ${arc(O2, 18, d1 + 180, d2 + 180)}`, C.accent, 2.25)
trait(`${arc(O2, 14, d2, d1 + 180)} ${arc(O2, 14, d2 + 180, d1 + 360)}`, C.encre, 1.3)
points.push(O2)
const lab = (a, b, r) => pol(O2, r, (a + b) / 2)
corps.push(texte(lab(d1, d2, 34), '70°'))
corps.push(etiquette(lab(d1 + 180, d2 + 180, 34).x, lab(d1 + 180, d2 + 180, 34).y + 4, '70°', { a: 'middle' }))
corps.push(etiquette(lab(d2, d1 + 180, 34).x, lab(d2, d1 + 180, 34).y + 4, '110°', { a: 'middle' }))
corps.push(etiquette(lab(d2 + 180, d1 + 360, 34).x, lab(d2 + 180, d1 + 360, 34).y + 4, '110°', { a: 'middle' }))
corps.push(etiquette(182, yT - 6.5, ['Opposés par', 'le sommet'], { a: 'middle' }))

// --- 3. Bissectrice au compas (angle de 80°) ---
const O3 = P(258, 156), A3 = 80, r1 = 50, r2 = 40
const P1 = pol(O3, r1, 0), P2 = pol(O3, r1, A3)
// K sur la bissectrice tel que P1K = P2K = r2 : t² − 2·r1·cos40°·t + r1² − r2² = 0
const c40 = Math.cos((A3 / 2) * Math.PI / 180)
const t = r1 * c40 + Math.sqrt((r1 * c40) ** 2 - (r1 * r1 - r2 * r2))
const K = pol(O3, t, A3 / 2)
console.log('P1K =', dist(P1, K).toFixed(3), 'P2K =', dist(P2, K).toFixed(3))
const dirDe = (a, b) => (Math.atan2(-(b.y - a.y), b.x - a.x) * 180) / Math.PI
const k1 = dirDe(P1, K), k2 = dirDe(P2, K)
trait(`${arc(O3, r1, -10, A3 + 10)} ${arc(P1, r2, k1 - 16, k1 + 16)} ${arc(P2, r2, k2 - 16, k2 + 16)}`, C.encre, 1.1, ' opacity="0.65"')
trait(`${seg(O3, pol(O3, 86, 0))} ${seg(O3, pol(O3, 86, A3))}`)
trait(seg(O3, pol(O3, 92, A3 / 2)), C.accent, 2.25)
trait(`${arc(O3, 22, 0, A3 / 2)} ${arc(O3, 22, A3 / 2, A3)} ${seg(pol(O3, 18, A3 / 4), pol(O3, 26, A3 / 4))} ${seg(pol(O3, 18, 3 * A3 / 4), pol(O3, 26, 3 * A3 / 4))}`, C.encre, 1.3)
points.push(O3, P1, P2, K)
corps.push(etiquette(298, yT, 'Bissectrice', { a: 'middle' }))

ecrire('6eme/maths/paires-angles-bissectrice.svg', 214,
  "Trois figures : deux angles adjacents (même sommet, un côté commun, de part et d'autre de ce côté) ; deux droites sécantes qui forment deux angles opposés par le sommet de 70° et deux de 110° ; la bissectrice d'un angle de 80° construite au compas, avec l'arc centré sur le sommet et les deux arcs de même rayon qui se coupent sur la bissectrice. Réviz, 6e maths, angles.",
  [
    `<path d="M122,20 V178 M234,20 V178" stroke="${C.separateur}" stroke-width="1"/>`,
    ...corps,
    `<g>${points.map(p => `<circle cx="${f(p.x)}" cy="${f(p.y)}" r="2.2"/>`).join('')}</g>`,
  ])
