// Réviz, 3e maths, géométrie dans l'espace (section 3, exemple).
// Sphère de centre O et de rayon 5 cm coupée par un plan situé à 3 cm du centre :
// la section est le cercle de centre H et de rayon HM = √(5² − 3²) = 4 cm ; triangle OHM rectangle en H.
// Projection orthogonale calculée (vue plongeante de 20°) : la sphère se projette en cercle,
// le cercle de section en ellipse ; parties cachées (arrière du cercle de section
// et de l'équateur) en pointillés, déterminées par le signe du produit scalaire avec la direction de vue.
// node scripts/illustrations/figures/sphere-section-par-un-plan.mjs
import { C, doc, ecrire, trait, point, nomPres, add, sub, mul, unit, perp, etiquette, rappel, angleDroitPts, verifierBoites, chemin, lerp } from './_maths-3e-4e.mjs'

const s = 18 // pixels par cm
const O2 = [160, 112] // projection de O
const phi = (20 * Math.PI) / 180
const V = [0, -Math.cos(phi), Math.sin(phi)] // vers l'observateur (x droite, y profondeur, z haut)
const proj = ([x, y, z]) => [O2[0] + x * s, O2[1] - (z * Math.cos(phi) + y * Math.sin(phi)) * s]
const dot3 = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
const R = 5, d = 3, r = 4

/** Découpe une courbe 3D échantillonnée en morceaux visibles / cachés selon `visible(p)`. */
function morceaux(pts3, visible) {
  const out = []
  let cur = null
  for (const p of pts3) {
    const v = visible(p)
    if (!cur || cur.v !== v) {
      if (cur) cur.pts.push(proj(p))
      cur = { v, pts: cur ? [cur.pts[cur.pts.length - 1]] : [] }
      out.push(cur)
    }
    cur.pts.push(proj(p))
  }
  return out.filter(m => m.pts.length > 1)
}
const cercle3 = (z, rho, N = 120) => Array.from({ length: N + 1 }, (_, i) => {
  const t = (2 * Math.PI * i) / N
  return [rho * Math.cos(t), rho * Math.sin(t), z]
})
const surSphere = p => dot3(p, V) >= 0 // point de la sphère : visible s'il est du côté de l'observateur
const dessiner = (ms, opts = {}) => ms.map(m => trait(m.pts, { ...opts, tirets: m.v ? '' : '4 3', ep: m.v ? opts.ep || 1.75 : 1.2 })).join('')

const O3 = [0, 0, 0], H3 = [0, 0, d]
const t = (-28 * Math.PI) / 180 // M sur l'avant droit du cercle de section
const M3 = [r * Math.cos(t), r * Math.sin(t), d]
const [O, H, M] = [O3, H3, M3].map(proj)
// Codage de l'angle droit en H, calculé en 3D puis projeté.
const e = 0.42
const uHM = M3.map((c, k) => H3[k] + ((c - H3[k]) / r) * e)
const uHO = [0, 0, d - e]
const coinDroit = angleDroitPts(H, proj(uHM), proj(uHO))

const boites = []
const lab = x => { boites.push(x.boite); return x.svg }
const milieu = (P, Q) => mul(add(P, Q), 0.5)
const mOM = milieu(O, M), mOH = milieu(O, H), mHM = milieu(H, M)

const section = cercle3(d, r, 160)
const contenu = [
  // disque de section (aplat) puis contours
  `<path d="${chemin(section.map(proj), true)}" fill="${C.aplat}"/>`,
  `<circle cx="${O2[0]}" cy="${O2[1]}" r="${R * s}" fill="none" stroke="${C.encre}" stroke-width="1.75"/>`,
  dessiner(morceaux(cercle3(0, R, 160), surSphere), { ep: 1, extra: ' opacity="0.5"' }),
  dessiner(morceaux(section, surSphere), { couleur: C.accent, ep: 2.25 }),
  trait([O, H], { tirets: '' }),
  trait([O, M]),
  trait([H, M], { couleur: C.accent, ep: 2.25 }),
  coinDroit,
  point(O), point(H), point(M),
  nomPres(O, 'O', [-1, 0.5], 11),
  nomPres(H, 'H', [-1, -0.6], 11),
  nomPres(M, 'M', [0.6, 0.9], 11),
  lab(etiquette(O[0] - 7, lerp(O, H, 0.3)[1] + 4, '3 cm', { ancre: 'end' })),
  lab(etiquette(lerp(O, M, 0.55)[0] + 6, lerp(O, M, 0.55)[1] + 15, '5 cm')),
  lab(etiquette(mHM[0] + 2, mHM[1] - 7, '4 cm', { ancre: 'middle' })),
]
// Légende dans la marge droite : la section (cercle de centre H).
const pSec = proj([r * Math.cos(0.12), r * Math.sin(0.12), d])
const eSec = etiquette(296, 32, 'section', { ancre: 'start' })
contenu.push(lab(eSec), rappel([eSec.boite[0], eSec.boite[1] + 7.5], pSec))
verifierBoites(boites, 'sphere')

const svg = doc(216,
  "Sphère de centre O et de rayon 5 cm coupée par un plan à 3 cm du centre : la section est un cercle de centre H ; triangle OHM rectangle en H, OM = 5 cm, OH = 3 cm, HM = 4 cm. Réviz, 3e maths, géométrie dans l'espace.",
  contenu)
ecrire('3eme/maths', 'sphere-section-par-un-plan', svg)
