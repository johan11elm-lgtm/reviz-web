// Réviz — Construction de l'ombre d'une balle opaque éclairée par une source ponctuelle.
// Dimensions de la fiche de la ressource : balle de 4 cm de diamètre à 20 cm de la source,
// écran à 60 cm → ombre portée de 4 × 60 ÷ 20 = 12 cm ; variante : balle rapprochée à 15 cm →
// ombre de 16 cm. Échelle du dessin : 1 cm = 4,4 unités. Les rayons limites sont les vraies
// tangentes à la balle issues de la source (calculées). Chapitre
// 5eme/physique-chimie/lumiere-sources-et-propagation (méthode, section 5, quiz 5).
// Sortie : public/programme/illustrations/5eme/physique-chimie/ombre-construction.svg
import { C, r1, doc, etq, mention, rappel, ecrireSvg, pointe, poly } from './_pc.mjs'

const K = 4.4, XS = 34, XE = XS + 60 * K, R = 2 * K
const corps = []

// découpe d'un segment par un polygone convexe (sens quelconque)
function couper(p, q, P) {
  let t0 = 0, t1 = 1
  const n = P.length
  let aire = 0
  for (let i = 0; i < n; i++) { const a = P[i], b = P[(i + 1) % n]; aire += a[0] * b[1] - b[0] * a[1] }
  const s = Math.sign(aire)
  for (let i = 0; i < n; i++) {
    const a = P[i], b = P[(i + 1) % n]
    const nx = -(b[1] - a[1]) * s, ny = (b[0] - a[0]) * s // normale intérieure
    const f = (x, y) => (x - a[0]) * nx + (y - a[1]) * ny
    const fp = f(...p), fq = f(...q)
    if (fp < 0 && fq < 0) return null
    if (fp < 0 || fq < 0) { const t = fp / (fp - fq); if (fp < 0) t0 = Math.max(t0, t); else t1 = Math.min(t1, t) }
  }
  if (t0 >= t1) return null
  return [[p[0] + (q[0] - p[0]) * t0, p[1] + (q[1] - p[1]) * t0], [p[0] + (q[0] - p[0]) * t1, p[1] + (q[1] - p[1]) * t1]]
}

function configuration(y, dcm, principal) {
  const xo = XS + dcm * K, d = xo - XS
  const al = Math.asin(R / d), tg = Math.tan(al)
  // points de tangence et d'arrivée sur l'écran
  const lt = Math.sqrt(d * d - R * R)
  const T1 = [XS + lt * Math.cos(al), y - lt * Math.sin(al)], T2 = [T1[0], y + lt * Math.sin(al)]
  const h = (XE - XS) * tg
  const E1 = [XE, y - h], E2 = [XE, y + h]
  const out = []
  // cône d'ombre hachuré (entre la balle et l'écran)
  const P = [T1, E1, E2, T2]
  let hs = ''
  for (let c = -400; c < 400; c += 5) {
    const seg = couper([c + y, 0 + y - y - 200 + y], [c + y + 400, y + 200], P)
    if (seg) hs += `M${r1(seg[0][0])},${r1(seg[0][1])}L${r1(seg[1][0])},${r1(seg[1][1])}`
  }
  out.push(`<path d="${hs}" stroke="${C.encre}" stroke-width="0.9" opacity="0.45"/>`)
  // rayons limites (accent) avec flèche de sens
  out.push(`<path d="M${XS},${y} L${r1(E1[0])},${r1(E1[1])} M${XS},${y} L${r1(E2[0])},${r1(E2[1])}" stroke="${C.accent}" stroke-width="2"/>`)
  for (const E of [E1, E2]) {
    const m = [XS + (xo - XS) * 0.55, y + (E[1] - y) * ((xo - XS) * 0.55) / (XE - XS)]
    const m0 = [m[0] - 1, y + (E[1] - y) * ((m[0] - 1 - XS) / (XE - XS))]
    out.push(pointe(m0, m, { long: 8, large: 7, fill: C.accent }))
  }
  // balle : face éclairée blanche, ombre propre (côté opposé à la source) en encre
  out.push(`<circle cx="${r1(xo)}" cy="${y}" r="${R}" fill="#FFFFFF" stroke="${C.encre}" stroke-width="1.75"/>`)
  out.push(`<path d="M${r1(T1[0])},${r1(T1[1])} A${R},${R} 0 1 1 ${r1(T2[0])},${r1(T2[1])} Z" fill="${C.encre}" opacity="0.75"/>`)
  // écran et ombre portée
  out.push(`<path d="M${XE},${r1(y - 44)} V${r1(y + 44)}" stroke="${C.encre}" stroke-width="1.75"/>`)
  out.push(`<path d="M${XE + 2.5},${r1(E1[1])} V${r1(E2[1])}" stroke="${C.encre}" stroke-width="5"/>`)
  // source ponctuelle
  out.push(`<circle cx="${XS}" cy="${y}" r="4" fill="#FBE9DD" stroke="${C.accent}" stroke-width="2"/>`)
  out.push(mention(XE + 10, y + 4, `${Math.round(2 * (XE - XS) * tg / K)} cm`))
  return { out, xo, T1, T2, E1, E2 }
}

// configuration 1 : balle à 20 cm
const y1 = 74, a = configuration(y1, 20, true)
corps.push(mention(14, 20, 'balle à 20 cm de la source'))
corps.push(...a.out)
corps.push(etq(14, y1 + 30, 'Source'))
corps.push(rappel([26, y1 + 19], [XS - 2, y1 + 5]))
corps.push(etq(a.xo - 30, y1 - 32, ['Ombre', 'propre'], 'middle'))
corps.push(rappel([a.xo - 22, y1 - 6], [a.xo + 4, y1 - 3]))
corps.push(etq(200, y1 - 34, 'Cône d’ombre', 'middle'))
corps.push(rappel([200, y1 - 30], [200, y1 - 6]))
corps.push(etq(XE - 6, y1 + 54, 'Ombre portée', 'end'))
corps.push(rappel([XE - 6, y1 + 46], [XE + 1, y1 + 20]))
corps.push(etq(XE, y1 - 52, 'Écran', 'middle'))

// configuration 2 : balle rapprochée à 15 cm
const y2 = 210, b = configuration(y2, 15, false)
corps.push(mention(14, y2 - 52, 'balle rapprochée : à 15 cm'))
corps.push(...b.out)

const svg = doc(y2 + 58,
  'Construction de l’ombre : source ponctuelle, balle opaque de 4 cm à 20 cm, écran à 60 cm ; rayons limites tangents à la balle, cône d’ombre hachuré, ombre propre et ombre portée (12 cm). Variante : balle rapprochée à 15 cm, ombre portée plus grande (16 cm). Réviz, 5e physique-chimie, la lumière.',
  corps)
ecrireSvg('ombre-construction', svg, '5eme/physique-chimie')
