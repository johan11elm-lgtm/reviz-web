// Réviz, 4e maths, pyramides et cônes (sections 1 et 2, piège n° 2, quiz 6).
// Pyramide régulière SABCD à base carrée en perspective cavalière (fuyantes à 45°, coefficient 0,5) :
// arêtes cachées en pointillés (déduites de l'orientation des faces), diagonales de la base
// pour placer H, centre du carré ; hauteur [SH] en accent avec angle droit codé ; apothème [SI],
// I milieu de [AB], perpendiculaire à [AB] ; une arête latérale [SC] légendée.
// node scripts/illustrations/figures/pyramide-reguliere-hauteur-apotheme.mjs
import { C, doc, ecrire, trait, point, nomPres, etiquette, rappel, angleDroitPts, verifierBoites, lerp } from './_maths-3e-4e.mjs'
import { v3, cavaliere, aretes } from './_espace.mjs'

const c = 116, h = 124
const cav = cavaliere({ o: [92, 180] })
const P3 = { A: [0, 0, 0], B: [c, 0, 0], C: [c, c, 0], D: [0, c, 0], S: [c / 2, c / 2, h] }
P3.H = [c / 2, c / 2, 0]
P3.I = [c / 2, 0, 0]
const faces = [['A', 'B', 'C', 'D'], ['A', 'B', 'S'], ['B', 'C', 'S'], ['C', 'D', 'S'], ['D', 'A', 'S']]
const { aretes: ar } = aretes(P3, faces, cav.vers)
const P = Object.fromEntries(Object.entries(P3).map(([k, p]) => [k, cav.proj(p)]))

const CACHE = '4 3'
const out = []
// diagonales de la base (cachées : à l'intérieur du solide)
out.push(trait([P.A, P.C], { ep: 1, tirets: CACHE, extra: ' opacity="0.6"' }), trait([P.B, P.D], { ep: 1, tirets: CACHE, extra: ' opacity="0.6"' }))
for (const e of ar.sort((a, b) => a.vue - b.vue)) out.push(trait([P[e.a], P[e.b]], e.vue ? {} : { tirets: CACHE, ep: 1.2 }))
// apothème [SI] (sur la face avant SAB, visible) et son angle droit en I, calculé en 3D
out.push(trait([P.S, P.I]))
const t = 9
const versS = v3.mul(v3.sub(P3.S, P3.I), t / Math.hypot(...v3.sub(P3.S, P3.I)))
out.push(angleDroitPts(P.I, cav.proj(v3.add(P3.I, [t, 0, 0])), cav.proj(v3.add(P3.I, versS))))
// hauteur [SH] : intérieure, donc en pointillés, en accent ; angle droit en H avec la diagonale (HC)
out.push(trait([P.S, P.H], { couleur: C.accent, ep: 2.25, tirets: '5 3' }))
const uHC = v3.mul(v3.sub(P3.C, P3.H), t / Math.hypot(...v3.sub(P3.C, P3.H)))
out.push(angleDroitPts(P.H, cav.proj(v3.add(P3.H, [0, 0, t])), cav.proj(v3.add(P3.H, uHC)), C.accent))
for (const k of ['S', 'A', 'B', 'C', 'D', 'H', 'I']) out.push(point(P[k], k === 'H' ? C.accent : C.encre))
out.push(
  nomPres(P.S, 'S', [0, -1], 14),
  nomPres(P.A, 'A', [-0.8, 0.6], 11),
  nomPres(P.B, 'B', [0.8, 0.6], 11),
  nomPres(P.C, 'C', [1, 0.1], 11),
  nomPres(P.D, 'D', [-0.6, -0.8], 11),
  nomPres(P.H, 'H', [0.3, 1], 12),
  nomPres(P.I, 'I', [0, 1], 11),
)

const boites = []
function legende(x, y, texte, cible, ancre = 'start') {
  const e = etiquette(x, y, texte, { ancre })
  boites.push(e.boite)
  const L = [].concat(texte).length
  const yb = e.boite[1] + 7.5 + (L - 1) * 6.5
  const bord = cible[0] > e.boite[2] ? [e.boite[2], yb] : [e.boite[0], yb]
  out.push(e.svg, rappel(bord, cible))
}
legende(16, 64, 'hauteur', lerp(P.S, P.H, 0.35), 'start')
legende(16, 126, 'apothème', lerp(P.S, P.I, 0.62), 'start')
legende(266, 58, ['arête', 'latérale'], lerp(P.S, P.C, 0.4), 'start')
verifierBoites(boites, 'pyramide')

const svg = doc(206,
  "Pyramide régulière SABCD à base carrée en perspective cavalière : arêtes cachées en pointillés, H centre du carré ABCD, hauteur [SH] perpendiculaire à la base, apothème [SI] avec I milieu de [AB], arête latérale [SC]. Réviz, 4e maths, pyramides et cônes.",
  out)
ecrire('4eme/maths', 'pyramide-reguliere-hauteur-apotheme', svg)
