// Réviz, 4e maths, translations et rotations (section 1, piège n° 2).
// Translation qui transforme A en B : flèche de A vers B ; M' image de M, donc MM' = AB
// (même direction, même sens, même longueur) et ABM'M est un parallélogramme (côtés [AM] et [BM']
// en pointillés) ; un triangle et son image par la même translation.
// Toutes les images sont calculées : P' = P + (B − A).
// node scripts/illustrations/figures/translation-parallelogramme.mjs
import { C, doc, ecrire, trait, aplat, point, nomPres, add, sub, pointe, etiquette, verifierBoites } from './_maths-3e-4e.mjs'

const A = [34, 172], B = [118, 134]
const u = sub(B, A)
const M = [70, 74], Mp = add(M, u)
const T = [[192, 178], [244, 168], [204, 128]]
const Tp = T.map(p => add(p, u))
const boites = []

const fleche = (p, q) => trait([p, sub(q, [u[0] * 0.08, u[1] * 0.08])], { couleur: C.accent, ep: 2.25 }) + pointe(p, q, { couleur: C.accent, long: 9, large: 8 })
const out = [
  // parallélogramme ABM'M : côtés [AM] et [BM'] en pointillés
  trait([A, M], { tirets: '4 3', ep: 1.2 }), trait([B, Mp], { tirets: '4 3', ep: 1.2 }),
  fleche(A, B), fleche(M, Mp),
  // chaque sommet du triangle glisse du même vecteur que A vers B (traits fins pointillés)
  ...T.map((p, i) => trait([p, Tp[i]], { ep: 1, tirets: '2 3', extra: ' opacity="0.5"' })),
  aplat(T), trait(T, { ferme: true }), trait(Tp, { ferme: true }),
  point(A), point(B), point(M), point(Mp),
  nomPres(A, 'A', [-0.6, 0.8], 11),
  nomPres(B, 'B', [0.5, 0.9], 12),
  nomPres(M, 'M', [-0.8, -0.5], 11),
  nomPres(Mp, 'M′', [0.5, -0.9], 12),
]
const eI = etiquette(Tp[1][0] - 2, Tp[1][1] + 26, 'image', { ancre: 'middle' })
boites.push(eI.boite); out.push(eI.svg)
verifierBoites(boites, 'translation')

const svg = doc(200,
  "Translation qui transforme A en B : flèche de A vers B ; M′ image de M : la flèche de M vers M′ a même direction, même sens et même longueur, et ABM′M est un parallélogramme ; un triangle et son image par la même translation. Réviz, 4e maths, translations et rotations.",
  out)
ecrire('4eme/maths', 'translation-parallelogramme', svg)
