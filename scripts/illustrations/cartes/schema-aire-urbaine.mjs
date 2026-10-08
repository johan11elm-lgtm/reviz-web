// -------------------------------------------------------
// Réviz — 3e géographie, « Les aires urbaines, une nouvelle géographie d'une
// France mondialisée ». Croquis corrigé (schéma) d'une aire urbaine, comme le
// demande la méthode du chapitre : ville-centre, banlieue et couronne
// périurbaine en auréoles du plus foncé au plus clair, axes de transport qui
// partent du centre, mobilités pendulaires de la couronne vers le pôle.
// Légende en trois parties (espaces, axes, flux). Pas de fond de carte : c'est
// un modèle théorique, sans lieu réel.
//
//   node scripts/illustrations/cartes/schema-aire-urbaine.mjs
// -------------------------------------------------------
import { C, FONT, fleche, intitule, titrePartie, ecrireSvg, r1 } from './_commun.mjs'

const W = 360
const CX = 180
const CY = 128

// Forme irrégulière fermée et lissée : rayon r(θ) = R·(1 + Σ a·sin(kθ + φ)).
function tache(R, ondes, n = 28, cx = CX, cy = CY, ry = 0.88) {
  const pts = []
  for (let i = 0; i < n; i++) {
    const t = (i / n) * 2 * Math.PI
    const k = 1 + ondes.reduce((s, [a, f, p]) => s + a * Math.sin(f * t + p), 0)
    pts.push([cx + R * k * Math.cos(t), cy + R * k * Math.sin(t) * ry])
  }
  const m = (p, q) => `${r1((p[0] + q[0]) / 2)},${r1((p[1] + q[1]) / 2)}`
  let d = `M${m(pts[n - 1], pts[0])}`
  for (let i = 0; i < n; i++) d += `Q${r1(pts[i][0])},${r1(pts[i][1])} ${m(pts[i], pts[(i + 1) % n])}`
  return d + 'Z'
}

const TEINTES = { centre: '#8E86BC', banlieue: '#CFCAE3', couronne: '#F1EFF7', village: '#D7D2E9' }
const couronne = tache(150, [[0.06, 3, 0.4], [0.04, 5, 1.3]], 36, CX, CY, 0.7)
const banlieue = tache(58, [[0.12, 3, 1.1], [0.07, 5, 0.2]], 28, CX, CY, 0.85)
const centre = tache(21, [[0.08, 3, 0.7]], 16, CX, CY, 0.9)

// Communes périurbaines : petits noyaux séparés par des champs.
const VILLAGES = [
  [64, 92, 9], [92, 182, 8], [270, 70, 9], [300, 150, 10], [250, 205, 8], [120, 52, 8],
  [196, 36, 7], [150, 210, 7], [44, 140, 7], [318, 104, 7], [228, 214, 6],
]
const villages = VILLAGES.map(([x, y, r], i) => tache(r + 2.5, [[0.15, 3, i]], 10, x, y, 0.8)).join('')

// Axes : autoroutes (trait épais) et voies ferrées (trait fin à traverses).
const AUTOROUTES = [[[CX, CY], [26, 104]], [[CX, CY], [340, 76]], [[CX, CY], [262, 238]], [[CX, CY], [80, 230]]]
const FERREES = [[[CX, CY], [212, 12]], [[CX, CY], [336, 172]], [[CX, CY], [24, 176]]]
const ligne = ([a, b]) => `M${a.join(',')}L${b.join(',')}`
function traverses([a, b], pas = 8, l = 3.5) {
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  const L = Math.hypot(dx, dy)
  const ux = dx / L
  const uy = dy / L
  let d = ''
  for (let s = 30; s < L - 4; s += pas) {
    const x = a[0] + ux * s
    const y = a[1] + uy * s
    d += `M${r1(x - uy * l)},${r1(y + ux * l)}l${r1(2 * uy * l)},${r1(-2 * ux * l)}`
  }
  return d
}

// Mobilités pendulaires : des communes de la couronne vers le pôle.
const FL = { couleur: C.accent, epaisseur: 2.25, long: 7, large: 7 }
const pend = [
  fleche([72, 98], [110, 100], [146, 116], FL),
  fleche([292, 146], [258, 148], [222, 140], FL),
  fleche([264, 76], [236, 88], [212, 104], FL),
  fleche([98, 178], [122, 166], [146, 150], FL),
  fleche([244, 200], [222, 178], [204, 160], FL),
].join('')

// ---- Légende
const yL = 262
const X2 = 180
const L = []
L.push(titrePartie(12, yL, 'Les espaces'))
const e = [yL + 22, yL + 43, yL + 64]
L.push(`<rect x="14" y="${e[0] - 11}" width="26" height="14" fill="${TEINTES.centre}" stroke="${C.encre}" stroke-width="0.75"/>`)
L.push(`<rect x="14" y="${e[1] - 11}" width="26" height="14" fill="${TEINTES.banlieue}" stroke="${C.encre}" stroke-width="0.75"/>`)
L.push(`<rect x="14" y="${e[2] - 11}" width="26" height="14" fill="${TEINTES.couronne}" stroke="${C.encre}" stroke-width="0.75" stroke-dasharray="3 2"/>`)
L.push(`<ellipse cx="24" cy="${e[2] - 4}" rx="4.5" ry="3.5" fill="${TEINTES.village}"/><ellipse cx="33" cy="${e[2] - 6}" rx="3" ry="2.5" fill="${TEINTES.village}"/>`)
L.push(titrePartie(X2, yL, 'Les axes de transport'))
L.push(`<path d="M${X2 + 2},${e[0] - 4}H${X2 + 28}" stroke="${C.encre}" stroke-width="3" stroke-linecap="round"/>`)
L.push(`<path d="M${X2 + 2},${e[1] - 4}H${X2 + 28}" stroke="${C.encre}" stroke-width="1.25"/><path d="${traverses([[X2 - 26, e[1] - 4], [X2 + 30, e[1] - 4]], 7)}" stroke="${C.encre}" stroke-width="1.25"/>`)
const y3 = e[1] + 30
L.push(titrePartie(X2, y3, 'Les flux'))
const f1 = y3 + 22
L.push(fleche([X2 + 2, f1 - 4], [X2 + 14, f1 - 4], [X2 + 30, f1 - 4], FL))
const T = [
  intitule(50, e[0], 'Ville-centre'),
  intitule(50, e[1], 'Banlieue'),
  intitule(50, e[2], 'Couronne périurbaine'),
  intitule(X2 + 36, e[0], 'Autoroute'),
  intitule(X2 + 36, e[1], 'Voie ferrée'),
  intitule(X2 + 36, f1, 'Mobilités pendulaires'),
]
const H = Math.max(e[2], f1) + 12

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" font-family="${FONT}">
<!-- Schéma (croquis corrigé) d'une aire urbaine : ville-centre, banlieue, couronne périurbaine, axes de transport, mobilités pendulaires. Réviz, 3e géographie, les aires urbaines. Généré par scripts/illustrations/cartes/schema-aire-urbaine.mjs -->
<path d="${couronne}" fill="${TEINTES.couronne}" stroke="${C.encre}" stroke-width="1" stroke-dasharray="4 3"/>
<path d="${villages}" fill="${TEINTES.village}"/>
<path d="${banlieue}" fill="${TEINTES.banlieue}"/>
<path d="${centre}" fill="${TEINTES.centre}"/>
<path d="${FERREES.map(ligne).join('')}" stroke="${C.encre}" stroke-width="1.25"/>
<path d="${FERREES.map(f => traverses(f)).join('')}" stroke="${C.encre}" stroke-width="1.25"/>
<path d="${AUTOROUTES.map(ligne).join('')}" stroke="${C.encre}" stroke-width="3" stroke-linecap="round"/>
<path d="${centre}" fill="${TEINTES.centre}" stroke="${C.encre}" stroke-width="1"/>
${pend}
<g font-size="11.5" font-weight="600" fill="${C.encre}">
${L.join('\n')}
${T.join('\n')}
</g>
</svg>
`
ecrireSvg('schema-aire-urbaine', svg)
