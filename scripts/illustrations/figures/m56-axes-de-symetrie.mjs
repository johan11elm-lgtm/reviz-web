// Réviz — 6e maths, « Symétrie axiale », section 1 : axes de symétrie tracés.
// Carré : 4 ; rectangle non carré : 2 (une diagonale, qui n'est pas un axe, est barrée) ;
// cercle : une infinité (quelques diamètres tracés) ; triangle équilatéral : 3 ;
// triangle isocèle non équilatéral : 1. Figure calculée.
import { C, P, add, sub, mul, seg, poly, pol, mil, norm, mention, etiquette, ecrire, f } from './_m56.mjs'

const corps = []
const formes = [], axes = [], barres = [], gris = []
const ext = (a, b, e = 9) => { const u = norm(sub(b, a)); return seg(sub(a, mul(u, e)), add(b, mul(u, e))) }
const cellule = (cx, yM, nom, compte, yE) => { corps.push(mention(cx, yM, nom)); corps.push(etiquette(cx, yE, compte, { a: 'middle' })) }

// --- Rangée 1 ---
const y1 = 74
{ // carré
  const c = P(60, y1), h = 34
  const [a, b, cc, d] = [P(-h, -h), P(h, -h), P(h, h), P(-h, h)].map(v => add(c, v))
  formes.push(poly([a, b, cc, d]))
  axes.push(ext(a, cc), ext(b, d), ext(mil(a, b), mil(d, cc)), ext(mil(a, d), mil(b, cc)))
  cellule(c.x, 22, 'carré', '4 axes', 134)
}
{ // rectangle
  const c = P(180, y1), w = 50, h = 29
  const [a, b, cc, d] = [P(-w, -h), P(w, -h), P(w, h), P(-w, h)].map(v => add(c, v))
  formes.push(poly([a, b, cc, d]))
  axes.push(ext(mil(a, b), mil(d, cc)), ext(mil(a, d), mil(b, cc)))
  gris.push(seg(a, cc))
  const m = add(a, mul(sub(cc, a), 0.27)) // croix sur la diagonale
  barres.push(seg(add(m, P(-6, -6)), add(m, P(6, 6))) + ' ' + seg(add(m, P(-6, 6)), add(m, P(6, -6))))
  cellule(c.x, 22, 'rectangle', '2 axes', 134)
}
{ // cercle
  const c = P(300, y1), r = 36
  corps.push(`<circle cx="${f(c.x)}" cy="${f(c.y)}" r="${r}" fill="none" stroke="${C.encre}" stroke-width="1.75"/>`)
  for (const d of [0, 45, 90, 135]) axes.push(ext(pol(c, r, d), pol(c, r, d + 180), 7))
  corps.push(`<circle cx="${f(c.x)}" cy="${f(c.y)}" r="2.2"/>`)
  cellule(c.x, 22, 'cercle', 'Une infinité', 134)
}

// --- Rangée 2 ---
const y2 = 220
{ // triangle équilatéral, côté 84, centré sur son centre de gravité
  const g = P(120, y2), R = 84 / Math.sqrt(3)
  const [a, b, c] = [90, 210, 330].map(d => pol(g, R, d))
  formes.push(poly([a, b, c]))
  axes.push(ext(a, mil(b, c)), ext(b, mil(a, c)), ext(c, mil(a, b)))
  cellule(g.x, 154, 'triangle équilatéral', '3 axes', 282)
}
{ // triangle isocèle : base 52, hauteur 84
  const s = P(240, y2 - 48), b = P(214, y2 + 36), c = P(266, y2 + 36)
  formes.push(poly([s, b, c]))
  axes.push(ext(s, mil(b, c)))
  cellule(240, 154, 'triangle isocèle', '1 axe', 282)
}

ecrire('6eme/maths/axes-de-symetrie-figures.svg', 296,
  "Axes de symétrie tracés en pointillés : le carré en a 4 (2 diagonales et 2 médianes), le rectangle non carré 2 (sa diagonale, barrée, n'en est pas un), le cercle une infinité (quelques diamètres tracés), le triangle équilatéral 3 et le triangle isocèle 1. Réviz, 6e maths, symétrie axiale.",
  [
    `<path d="${formes.join(' ')}" fill="none" stroke="${C.encre}" stroke-width="1.75" stroke-linejoin="round"/>`,
    `<path d="${gris.join(' ')}" fill="none" stroke="${C.gris}" stroke-width="1.4" stroke-dasharray="4 3"/>`,
    `<path d="${barres.join(' ')}" fill="none" stroke="${C.encre}" stroke-width="2" stroke-linecap="round"/>`,
    `<path d="${axes.join(' ')}" fill="none" stroke="${C.accent}" stroke-width="1.75" stroke-dasharray="7 3 1.5 3" stroke-linecap="round"/>`,
    ...corps,
  ])
