// Réviz, 3e maths, géométrie dans l'espace (section 4 « Se repérer sur la Terre »).
// Globe en projection orthogonale (observateur au-dessus du point 20° N, 55° O, pour voir
// de trois quarts le plan du méridien de Paris où se mesure la latitude) :
// équateur, méridien de Greenwich, parallèle 49° N, un méridien (100° O), Paris (≈ 49° N, 2° E)
// et l'angle de latitude 49° mesuré au centre depuis le plan de l'équateur.
// Points visibles : produit scalaire positif avec la direction de l'observateur ; parties
// cachées de l'équateur et du parallèle en pointillés.
// node scripts/illustrations/figures/globe-latitude-longitude.mjs
import { C, doc, ecrire, trait, point, etiquette, rappel, verifierBoites, chemin, n } from './_maths-3e-4e.mjs'

const O = [170, 128], R = 92
const rad = d => (d * Math.PI) / 180
const lat0 = rad(20), lon0 = rad(-55)
const sph = (lat, lon) => [Math.cos(rad(lat)) * Math.cos(rad(lon)), Math.cos(rad(lat)) * Math.sin(rad(lon)), Math.sin(rad(lat))]
const V = [Math.cos(lat0) * Math.cos(lon0), Math.cos(lat0) * Math.sin(lon0), Math.sin(lat0)]
const E = [-Math.sin(lon0), Math.cos(lon0), 0]
const N = [-Math.sin(lat0) * Math.cos(lon0), -Math.sin(lat0) * Math.sin(lon0), Math.cos(lat0)]
const d3 = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
const proj = (p, k = 1) => [O[0] + R * k * d3(p, E), O[1] - R * k * d3(p, N)]
const vu = p => d3(p, V) >= 0

function courbe(pts3, { cache = true, ...opts } = {}) {
  const out = []
  let cur = null
  for (const p of pts3) {
    const v = vu(p)
    if (!cur || cur.v !== v) { const prev = cur && cur.pts[cur.pts.length - 1]; cur = { v, pts: prev ? [prev] : [] }; out.push(cur) }
    cur.pts.push(proj(p))
  }
  return out.filter(m => m.pts.length > 1 && (m.v || cache)).map(m => trait(m.pts, m.v ? opts : { ...opts, ep: 1, tirets: '3 3', extra: ' opacity="0.55"' })).join('')
}
const parallele = lat => Array.from({ length: 181 }, (_, i) => sph(lat, -180 + 2 * i))
const meridien = lon => Array.from({ length: 91 }, (_, i) => sph(-90 + 2 * i, lon))

const boites = []
const lab = e => { boites.push(e.boite); return e.svg }

const paris = sph(49, 2), e0 = sph(0, 2)
const P = proj(paris)
// Angle de latitude : secteur dans le plan du méridien de Paris, de 0° à 49°, rayon 0,4 R.
const arc3 = Array.from({ length: 25 }, (_, i) => sph((49 * i) / 24, 2))
const arc = arc3.map(p => proj(p, 0.4))
const secteur = `<path d="${chemin([O, ...arc], true)}" fill="${C.aplat}"/>`

const pN = sph(90, 0), pS = sph(-90, 0)
const contenu = [
  secteur,
  `<circle cx="${O[0]}" cy="${O[1]}" r="${R}" fill="none" stroke="${C.encre}" stroke-width="1.75"/>`,
  // axe des pôles (dépasse un peu du globe)
  trait([proj(pS, 1.12), proj(pN, 1.12)], { ep: 1, extra: ' opacity="0.6"' }),
  courbe(meridien(-100), { ep: 1.2, cache: false }),
  courbe(parallele(49), { ep: 1.75 }),
  courbe(parallele(0), { ep: 1.75 }),
  courbe(meridien(0), { ep: 1.75, cache: false }),
  // rayons vers l'équateur et vers Paris, arc de l'angle de latitude
  trait([O, proj(e0)], { ep: 1.2 }),
  trait([O, P], { ep: 1.2 }),
  trait(arc, { couleur: C.accent, ep: 2.25 }),
  point(O), point(P, C.accent), point(proj(pN)),
]
const mArc = proj(sph(24.5, 2), 0.4)
contenu.push(lab(etiquette(mArc[0] + 6, mArc[1] + 6, '49°', { ancre: 'start' })))
// Étiquettes et traits de rappel
function legende(x, y, texte, cible, ancre = 'start') {
  const e = etiquette(x, y, texte, { ancre })
  const L = [].concat(texte).length
  const yb = e.boite[1] + 7.5 + (L - 1) * 6.5
  // le trait part du bord de la case tourné vers la cible
  const bord = cible[0] > e.boite[2] ? [e.boite[2], yb] : [e.boite[0], yb]
  contenu.push(lab(e), rappel(bord, cible))
}
legende(30, 20, 'pôle Nord', proj(pN), 'start')
legende(62, 168, 'équateur', proj(sph(0, -110)), 'end')
legende(68, 92, 'parallèle', proj(sph(49, -105)), 'end')
legende(62, 222, 'méridien', proj(sph(-40, -100)), 'end')
legende(296, 40, 'Paris', P, 'start')
legende(284, 200, ['méridien de', 'Greenwich'], proj(sph(-30, 0)), 'start')
verifierBoites(boites, 'globe')

const svg = doc(236,
  "Globe terrestre : équateur, méridien de Greenwich, parallèle 49° N, un méridien ; Paris (environ 49° N, 2° E) et sa latitude, angle de 49° mesuré au centre de la Terre à partir de l'équateur. Réviz, 3e maths, géométrie dans l'espace.",
  contenu)
ecrire('3eme/maths', 'globe-latitude-longitude', svg)
