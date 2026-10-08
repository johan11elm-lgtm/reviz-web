// Réviz, 3e maths, transformations et homothéties.
// Triangle ABC, centre O, droites (OA), (OB), (OC) ; image A'B'C' par l'homothétie
// de centre O et de rapport 2, image A''B''C'' par celle de rapport −0,5.
// Les images sont calculées : P' = O + k·(P − O), d'où (B'C') // (BC) // (B''C'') exactement.
// node scripts/illustrations/figures/homothetie-rapports-2-et-moins-0-5.mjs
import { C, doc, ecrire, trait, aplat, point, nomPres, chevron, add, sub, mul, unit, perp, dot, etiquette, mention, verifierBoites } from './_maths-3e-4e.mjs'

const O = [118, 188]
// Sommets donnés en coordonnées polaires autour de O (distance, angle en degrés) : 
// leurs distances à O restent dans un rapport < 2, pour que ABC et A'B'C' ne se recouvrent pas.
const polaire = (r, a) => [r * Math.cos(a * Math.PI / 180), -r * Math.sin(a * Math.PI / 180)]
const v = { A: polaire(74, 74), B: polaire(70, 20), C: polaire(104, 44) }
const k1 = 2, k2 = -0.5
const P = {}
for (const [s, w] of Object.entries(v)) {
  P[s] = add(O, w)
  P[s + "'"] = add(O, mul(w, k1))
  P[s + "''"] = add(O, mul(w, k2))
}
const tri = suf => ['A', 'B', 'C'].map(s => P[s + suf])
const G = suf => mul(tri(suf).reduce(add), 1 / 3)

// Droites (OA), (OB), (OC) : de -0,85·v à 2,25·v.
const droites = Object.values(v).map(w => trait([add(O, mul(w, -0.85)), add(O, mul(w, 2.22))], { ep: 1, extra: ' opacity="0.45"' }))

// Nom de point : perpendiculaire à la droite (OP), du côté opposé au centre de gravité du triangle.
function nomDe(s, suf, d = 11) {
  const p = P[s + suf]
  const w = unit(v[s])
  let nrm = perp(w)
  if (dot(nrm, sub(p, G(suf))) < 0) nrm = mul(nrm, -1)
  const dir = add(nrm, mul(w, 0.35 * Math.sign(dot(w, sub(p, G(suf))) || 1)))
  return nomPres(p, s + suf.replace("''", '″').replace("'", '′'), dir, d)
}

const boites = []
const eti = (...a) => { const e = mention(...a); boites.push(e.boite); return e.svg }

const contenu = [
  ...droites,
  aplat(tri('')),
  trait(tri(''), { ferme: true }),
  trait(tri("'"), { ferme: true }),
  trait(tri("''"), { ferme: true }),
  // Côtés [BC], [B'C'], [B''C''] en accent, avec chevrons de parallélisme.
  trait([P.B, P.C], { couleur: C.accent, ep: 2.25 }),
  trait([P["B'"], P["C'"]], { couleur: C.accent, ep: 2.25 }),
  trait([P["B''"], P["C''"]], { couleur: C.accent, ep: 2.25 }),
  chevron(P.B, P.C), chevron(P["B'"], P["C'"]),
  point(O),
  ...Object.keys(P).map(s => point(P[s])),
  nomPres(O, 'O', [0.73, 0.68], 12),
  ...['A', 'B', 'C'].flatMap(s => [nomDe(s, ''), nomDe(s, "'"), nomDe(s, "''", 12)]),
  eti(288, 98, 'rapport 2'),
  eti(14, 242, 'rapport −0,5'),
]
verifierBoites(boites, 'homothetie')
const svg = doc(250,
  "Triangle ABC et ses images par les homothéties de centre O de rapport 2 (A′B′C′, du même côté que ABC) et de rapport −0,5 (A″B″C″, de l'autre côté de O, réduit) ; droites (OA), (OB), (OC) ; [BC], [B′C′] et [B″C″] parallèles. Réviz, 3e maths, transformations et homothéties.",
  contenu)
ecrire('3eme/maths', 'homothetie-rapports-2-et-moins-0-5', svg)
