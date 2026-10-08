// Réviz, 3e maths, géométrie dans l'espace (section 3 « Sections planes »).
// Six sections planes, section en aplat clair bordé d'accent :
//  pavé droit coupé parallèlement à une face (rectangle de mêmes dimensions que la face)
//  et parallèlement à une arête (rectangle) ; cylindre coupé parallèlement à la base (disque
//  de même rayon) et à l'axe (rectangle) ; pyramide et cône coupés parallèlement à la base
//  (réduction de la base).
// Pavé et pyramide : perspective cavalière (fuyantes à 45°, coefficient 0,5), arêtes cachées
// calculées par l'orientation des faces. Cylindre et cône : vue plongeante orthogonale (bases
// en ovales), contours apparents et parties cachées calculés.
// node scripts/illustrations/figures/sections-planes-solides.mjs
import { C, doc, ecrire, trait, etiquette, mention, verifierBoites, chemin } from './_maths-3e-4e.mjs'
import { v3, cavaliere, plongeante, aretes, cercleH, morceaux } from './_espace.mjs'

const boites = []
const lab = e => { boites.push(e.boite); return e.svg }
const CACHE = '4 3'
const dessinerMorceaux = (ms, opts = {}) => ms.map(m => trait(m.pts, { ...opts, tirets: m.v ? '' : CACHE, ep: m.v ? (opts.ep || 1.75) : 1.2 })).join('')
const sectionSvg = pts2 => `<path d="${chemin(pts2, true)}" fill="${C.aplat}" stroke="${C.accent}" stroke-width="2.25" stroke-linejoin="round"/>`

function polyedre(sommets, faces, { proj, vers }) {
  const { aretes: ar } = aretes(sommets, faces, vers)
  return ar.sort((a, b) => a.vue - b.vue).map(e => trait([proj(sommets[e.a]), proj(sommets[e.b])], e.vue ? {} : { tirets: CACHE, ep: 1.2 })).join('')
}

/** Bloc de texte à droite du dessin : mention (2 lignes) puis nom de la section (masquable). */
function texte(x, y, plan, forme) {
  const L = [].concat(forme)
  return [
    lab(mention(x, y, plan, { masquable: false })),
    lab(etiquette(x, y + 34, L)),
  ].join('')
}

const out = []
const colX = [10, 186]
const rowY = [96, 202, 314] // lignes de base des solides

// --- Pavé droit ---
function pave(ox, oy, coupe) {
  const L = 58, P = 52, H = 52
  const cav = cavaliere({ o: [ox, oy] })
  const S = {
    A: [0, 0, 0], B: [L, 0, 0], C: [L, P, 0], D: [0, P, 0],
    E: [0, 0, H], F: [L, 0, H], G: [L, P, H], K: [0, P, H],
  }
  const faces = [['A', 'B', 'C', 'D'], ['E', 'F', 'G', 'K'], ['A', 'B', 'F', 'E'], ['D', 'C', 'G', 'K'], ['A', 'D', 'K', 'E'], ['B', 'C', 'G', 'F']]
  let sec
  if (coupe === 'face') {
    const x = 0.6 * L // plan parallèle à la face de droite BCGF
    sec = [[x, 0, 0], [x, P, 0], [x, P, H], [x, 0, H]]
  } else {
    // plan vertical, parallèle aux arêtes verticales, passant par (0,4 L ; 0) et (L ; 0,75 P)
    const a = [0.4 * L, 0, 0], b = [L, 0.75 * P, 0]
    sec = [a, b, v3.add(b, [0, 0, H]), v3.add(a, [0, 0, H])]
  }
  return sectionSvg(sec.map(cav.proj)) + polyedre(S, faces, cav)
}

// --- Pyramide régulière à base carrée ---
function pyramide(ox, oy) {
  const c = 70, h = 70, t = 0.5 // plan à mi-hauteur
  const cav = cavaliere({ o: [ox, oy] })
  const S = { A: [0, 0, 0], B: [c, 0, 0], C: [c, c, 0], D: [0, c, 0], S: [c / 2, c / 2, h] }
  const faces = [['A', 'B', 'C', 'D'], ['A', 'B', 'S'], ['B', 'C', 'S'], ['C', 'D', 'S'], ['D', 'A', 'S']]
  const sec = ['A', 'B', 'C', 'D'].map(nm => v3.lerp(S[nm], S.S, t))
  return sectionSvg(sec.map(cav.proj)) + polyedre(S, faces, cav)
}

// --- Cylindre (vue plongeante) ---
function cylindre(ox, oy, coupe) {
  const r = 28, h = 62
  const vue = plongeante({ o: [ox + r, oy - r * Math.sin(22 * Math.PI / 180)], phi: 22 })
  const lateralVu = p => v3.dot([p[0], p[1], 0], vue.vers) > 0
  const bas = cercleH([0, 0, 0], r), haut = cercleH([0, 0, h], r)
  // Contours apparents : génératrices où la normale est perpendiculaire à la direction de vue.
  const ta = Math.atan2(-vue.vers[0], vue.vers[1]) // (cos t, sin t)·vers = 0
  const gen = [ta, ta + Math.PI].map(t => trait([vue.proj([r * Math.cos(t), r * Math.sin(t), 0]), vue.proj([r * Math.cos(t), r * Math.sin(t), h])]))
  let sec
  if (coupe === 'base') {
    sec = sectionSvg(cercleH([0, 0, h * 0.5], r).map(vue.proj))
  } else {
    // plan vertical parallèle à l'axe, à 0,45 r de l'axe, de direction horizontale (cos 60°, sin 60°)
    const u = [Math.cos(Math.PI / 3), Math.sin(Math.PI / 3), 0], nrm = [u[1], -u[0], 0]
    const d = 0.45 * r, w = Math.sqrt(r * r - d * d)
    const m = v3.mul(nrm, d)
    const a = v3.add(m, v3.mul(u, -w)), b = v3.add(m, v3.mul(u, w))
    sec = sectionSvg([a, b, v3.add(b, [0, 0, h]), v3.add(a, [0, 0, h])].map(vue.proj))
  }
  return sec + dessinerMorceaux(morceaux(bas, lateralVu, vue.proj)) + trait(haut.map(vue.proj)) + gen.join('')
}

// --- Cône (vue plongeante) ---
function cone(ox, oy) {
  const r = 34, h = 74, t = 0.5
  const phi = 22
  const vue = plongeante({ o: [ox + r, oy - r * Math.sin(phi * Math.PI / 180)], phi })
  const nrmLat = p => [h * p[0] / r, h * p[1] / r, r] // normale sortante de la surface latérale au pied p
  const lateralVu = p => v3.dot(nrmLat(p), vue.vers) > 0
  const bas = cercleH([0, 0, 0], r, 240)
  // Points de contour apparent : changement de visibilité le long de la base.
  const S = [0, 0, h]
  const tangents = []
  for (let i = 0; i < bas.length - 1; i++) if (lateralVu(bas[i]) !== lateralVu(bas[i + 1])) tangents.push(v3.lerp(bas[i], bas[i + 1], 0.5))
  const sec = sectionSvg(cercleH([0, 0, h * t], r * (1 - t)).map(vue.proj))
  return sec + dessinerMorceaux(morceaux(bas, lateralVu, vue.proj)) + tangents.map(p => trait([vue.proj(p), vue.proj(S)])).join('')
}

const tx = 100 // décalage du texte dans la cellule
out.push(pave(colX[0] + 4, rowY[0], 'face'), texte(colX[0] + tx, rowY[0] - 48, ['parallèle', 'à une face'], 'rectangle'))
out.push(pave(colX[1] + 4, rowY[0], 'arete'), texte(colX[1] + tx, rowY[0] - 48, ['parallèle', 'à une arête'], 'rectangle'))
out.push(cylindre(colX[0] + 14, rowY[1], 'base'), texte(colX[0] + tx, rowY[1] - 48, ['parallèle', 'à la base'], 'disque'))
out.push(cylindre(colX[1] + 14, rowY[1], 'axe'), texte(colX[1] + tx, rowY[1] - 48, ['parallèle', 'à l\'axe'], 'rectangle'))
out.push(pyramide(colX[0] + 4, rowY[2]), texte(colX[0] + tx, rowY[2] - 52, ['parallèle', 'à la base'], ['réduction', 'de la base']))
out.push(cone(colX[1] + 8, rowY[2]), texte(colX[1] + tx, rowY[2] - 52, ['parallèle', 'à la base'], ['réduction', 'de la base']))
out.push(`<path d="M180,14 V${rowY[2] + 4}" stroke="${C.separateur}" stroke-width="1"/>`)
verifierBoites(boites, 'sections')

const svg = doc(326,
  "Sections planes : pavé droit coupé parallèlement à une face et parallèlement à une arête (rectangles), cylindre coupé parallèlement à la base (disque) et à l'axe (rectangle), pyramide et cône coupés parallèlement à la base (réduction de la base). Réviz, 3e maths, géométrie dans l'espace.",
  out)
ecrire('3eme/maths', 'sections-planes-solides', svg)
