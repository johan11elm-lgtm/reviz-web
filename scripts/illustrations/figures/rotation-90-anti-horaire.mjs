// Réviz, 4e maths, translations et rotations (section 2, méthode, piège n° 1).
// Rotation de centre O, d'angle 90°, sens anti-horaire : M' sur le cercle de centre O passant
// par M (OM' = OM), angle MOM' droit (codé) ; arc de M vers M' en accent avec le sens de rotation ;
// un triangle et son image par la même rotation. Images calculées par rotation exacte de 90°.
// node scripts/illustrations/figures/rotation-90-anti-horaire.mjs
import { C, doc, ecrire, trait, aplat, point, nomPres, add, sub, mul, unit, len, rot, arcPts, pointe, angleDroit, etiquette, verifierBoites } from './_maths-3e-4e.mjs'

const O = [176, 114]
const M = add(O, [88, 22])
const Mp = rot(M, O, 90)
const T = [[-124, 18], [-88, 34], [-110, 70]].map(d => add(O, d)) // hors du cercle de M
const Tp = T.map(p => rot(p, O, 90))
const r = len(sub(M, O))
const aM = Math.atan2(-(M[1] - O[1]), M[0] - O[0]) * 180 / Math.PI
const boites = []

const arc = arcPts(O, r, aM + 3, aM + 84)
const fin = arcPts(O, r, aM + 90, aM + 90)[0]
const out = [
  `<circle cx="${O[0]}" cy="${O[1]}" r="${Math.round(r * 10) / 10}" fill="none" stroke="${C.encre}" stroke-width="1" stroke-dasharray="3 4" opacity="0.5"/>`,
  trait([O, M]), trait([O, Mp]),
  angleDroit(O, sub(M, O), sub(Mp, O), 10),
  trait(arc, { couleur: C.accent, ep: 2.25 }) + pointe(arc[arc.length - 1], fin, { couleur: C.accent, long: 9, large: 8 }),
  aplat(T), trait(T, { ferme: true }), trait(Tp, { ferme: true }),
  point(O), point(M), point(Mp),
  nomPres(O, 'O', [-0.5, 1], 12),
  nomPres(M, 'M', [1, 0.2], 11),
  nomPres(Mp, 'M′', [-0.2, -1], 11),
]
// légendes : sens anti-horaire (près de l'arc), image (près du triangle image)
const pArc = arcPts(O, r + 14, aM + 45, aM + 45)[0]
const eS = etiquette(pArc[0] + 2, pArc[1] - 2, ['sens', 'anti-horaire'])
const cT = mul(Tp.reduce(add), 1 / 3)
const eI = etiquette(cT[0] + 34, cT[1] + 20, 'image')
for (const e of [eS, eI]) { boites.push(e.boite); out.push(e.svg) }
verifierBoites(boites, 'rotation')

const svg = doc(250,
  "Rotation de centre O, d'angle 90°, dans le sens anti-horaire : M′ est sur le cercle de centre O passant par M et l'angle MOM′ est droit ; un triangle et son image par cette rotation. Réviz, 4e maths, translations et rotations.",
  out)
ecrire('4eme/maths', 'rotation-90-anti-horaire', svg)
