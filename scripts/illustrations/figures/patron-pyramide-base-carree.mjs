// Réviz, 4e maths, pyramides et cônes (section 3, exemple).
// Patron d'une pyramide régulière à base carrée : un carré (la base) et 4 triangles isocèles
// superposables, un sur chaque côté du carré. Dimensions de l'exemple de la section 4 :
// côté 6, hauteur 5, d'où un apothème √(5² + 3²) = √34 ≈ 5,83 (hauteur de chaque triangle)
// et des arêtes latérales √(34 + 9) = √43 ≈ 6,56, toutes égales (codées d'un trait).
// node scripts/illustrations/figures/patron-pyramide-base-carree.mjs
import { C, doc, ecrire, trait, aplat, add, sub, mul, unit, perp, lerp, etiquette, rappel, verifierBoites } from './_maths-3e-4e.mjs'

const s = 12
const cote = 6 * s, ap = Math.sqrt(34) * s
const Ce = [176, 124]
const q = cote / 2
const K = [[Ce[0] - q, Ce[1] - q], [Ce[0] + q, Ce[1] - q], [Ce[0] + q, Ce[1] + q], [Ce[0] - q, Ce[1] + q]]
const out = [aplat(K)]
const triangles = []
for (let i = 0; i < 4; i++) {
  const a = K[i], b = K[(i + 1) % 4]
  const m = lerp(a, b, 0.5)
  const ext = unit(sub(m, Ce))
  const S = add(m, mul(ext, ap))
  triangles.push([a, S, b])
  out.push(trait([a, S, b]))
}
out.push(trait(K, { ferme: true }))
// codage : un petit trait au milieu de chaque arête latérale (8 longueurs égales)
for (const [a, S, b] of triangles) {
  for (const [p, r] of [[a, S], [S, b]]) {
    const m = lerp(p, r, 0.5), nrm = perp(unit(sub(r, p)))
    out.push(trait([add(m, mul(nrm, 4)), sub(m, mul(nrm, 4))], { ep: 1.3 }))
  }
}
const boites = []
const eB = etiquette(Ce[0], Ce[1] + 4, 'base', { ancre: 'middle' })
boites.push(eB.boite); out.push(eB.svg)
const tri = triangles[1] // triangle de droite
const cible = lerp(lerp(tri[0], tri[2], 0.5), tri[1], 0.45)
const eL = etiquette(300, 176, ['face', 'latérale'])
boites.push(eL.boite)
out.push(eL.svg, rappel([eL.boite[0], eL.boite[1] + 7.5], cible))
verifierBoites(boites, 'patron-pyramide')

const svg = doc(250,
  "Patron d'une pyramide régulière à base carrée : un carré (la base) et quatre triangles isocèles superposables, un sur chaque côté du carré ; toutes les arêtes latérales ont la même longueur. Réviz, 4e maths, pyramides et cônes.",
  out)
ecrire('4eme/maths', 'patron-pyramide-base-carree', svg)
