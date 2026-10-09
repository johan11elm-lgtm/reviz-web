// -------------------------------------------------------
// Réviz — 4e géographie, « Centres et périphéries des villes ».
// Croquis corrigé (modèle) de l'organisation d'une grande ville, demandé par la
// méthode du chapitre : auréoles du centre (centre-ville, CBD) vers les
// banlieues puis l'espace périurbain (lotissements et villages au milieu des
// champs), couleurs du plus foncé au plus clair, axes de transport qui partent
// du centre, symboles du CBD et de l'aéroport. Légende en trois parties
// (centre, périphéries, axes).
// La photo d'origine prévue (vue aérienne d'une grande ville) n'a pas pu être
// obtenue : c'est un modèle théorique, sans lieu réel.
//
//   node scripts/illustrations/cartes/croquis-ville-centre-peripheries.mjs
// -------------------------------------------------------
import { C, FONT, intitule, titrePartie, ecrireSvg, r1 } from './_commun.mjs'

const W = 360
const CX = 180
const CY = 122

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

// Du plus foncé (centre dense) au plus clair (périurbain).
const T = { centre: '#6F67A6', banlieue: '#BDB7DA', periurbain: '#F1EFF7', lotissement: '#D3CEE6' }
const periurbain = tache(156, [[0.05, 3, 0.4], [0.04, 5, 1.3]], 36, CX, CY, 0.7)
const banlieue = tache(70, [[0.12, 3, 1.1], [0.07, 5, 0.2]], 28, CX, CY, 0.82)
const centre = tache(25, [[0.08, 3, 0.7]], 16, CX, CY, 0.9)

// Lotissements et villages périurbains, au milieu des champs.
const LOTS = [
  [58, 92, 9], [90, 176, 8], [276, 66, 9], [304, 146, 9], [258, 196, 8], [118, 46, 8],
  [210, 30, 7], [148, 206, 7], [40, 134, 7], [322, 102, 7],
]
const lots = LOTS.map(([x, y, r], i) => tache(r + 2.5, [[0.15, 3, i]], 10, x, y, 0.8)).join('')

// Axes : autoroutes (trait épais) qui partent du centre, voie ferrée (traverses).
const AUTOROUTES = [[[CX, CY], [24, 104]], [[CX, CY], [342, 70]], [[CX, CY], [268, 236]], [[CX, CY], [76, 228]]]
const FERREE = [[CX, CY], [214, 6]]
const ligne = ([a, b]) => `M${a.join(',')}L${b.join(',')}`
function traverses([a, b], pas = 8, l = 3.5, debut = 30) {
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  const L = Math.hypot(dx, dy)
  const ux = dx / L
  const uy = dy / L
  let d = ''
  for (let s = debut; s < L - 4; s += pas) {
    const x = a[0] + ux * s
    const y = a[1] + uy * s
    d += `M${r1(x - uy * l)},${r1(y + ux * l)}l${r1(2 * uy * l)},${r1(-2 * ux * l)}`
  }
  return d
}

// Symboles : CBD (trois tours), aéroport (avion stylisé dans un rond).
const tours = (x, y) => `<path d="M${x - 7},${y + 7}V${y - 3}h4v10M${x - 2},${y + 7}V${y - 9}h4v16M${x + 3},${y + 7}V${y - 5}h4v12" fill="${C.encre}" stroke="#FFFFFF" stroke-width="0.8"/>`
const avion = (x, y) => `<circle cx="${x}" cy="${y}" r="8.5" fill="#FFFFFF" stroke="${C.encre}" stroke-width="1.5"/>` +
  `<path d="M${x},${y - 6}l1.2,3.2l4.8,2.6v1.4l-4.8,-1.2l-.3,3.4l1.6,1.4v1l-2.5,-.7l-2.5,.7v-1l1.6,-1.4l-.3,-3.4l-4.8,1.2v-1.4l4.8,-2.6z" fill="${C.encre}"/>`
const AERO = [246, 182]
const CBD = [CX + 1, CY + 1]

// ---- Légende en trois parties
const yL = 262
const X2 = 180
const L = []
L.push(titrePartie(12, yL, 'Le centre'))
const a = [yL + 22, yL + 43]
L.push(`<rect x="14" y="${a[0] - 11}" width="26" height="14" fill="${T.centre}" stroke="${C.encre}" stroke-width="0.75"/>`)
L.push(tours(27, a[1] - 5))
L.push(titrePartie(X2, yL, 'Les axes de transport'))
L.push(`<path d="M${X2 + 2},${a[0] - 4}H${X2 + 28}" stroke="${C.encre}" stroke-width="3" stroke-linecap="round"/>`)
L.push(`<path d="M${X2 + 2},${a[1] - 4}H${X2 + 28}" stroke="${C.encre}" stroke-width="1.25"/><path d="${traverses([[X2 - 26, a[1] - 4], [X2 + 30, a[1] - 4]], 7)}" stroke="${C.encre}" stroke-width="1.25"/>`)
const yP = a[1] + 30
L.push(titrePartie(12, yP, 'Les périphéries'))
const b = [yP + 22, yP + 43, yP + 77]
L.push(`<rect x="14" y="${b[0] - 11}" width="26" height="14" fill="${T.banlieue}" stroke="${C.encre}" stroke-width="0.75"/>`)
L.push(`<rect x="14" y="${b[1] - 11}" width="26" height="14" fill="${T.periurbain}" stroke="${C.encre}" stroke-width="0.75" stroke-dasharray="3 2"/>`)
L.push(`<ellipse cx="24" cy="${b[1] - 4}" rx="4.5" ry="3.5" fill="${T.lotissement}"/><ellipse cx="33" cy="${b[1] - 6}" rx="3" ry="2.5" fill="${T.lotissement}"/>`)
L.push(avion(27, b[2] - 5))
const TX = [
  intitule(50, a[0], 'Centre-ville'),
  intitule(50, a[1], 'CBD (affaires)'),
  intitule(X2 + 36, a[0], 'Autoroute'),
  intitule(X2 + 36, a[1], 'Voie ferrée'),
  intitule(50, b[0], 'Banlieues'),
  intitule(50, b[1], ['Espace périurbain', '(lotissements, villages, champs)']),
  intitule(50, b[2], 'Aéroport'),
]
const H = b[2] + 12

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" font-family="${FONT}">
<!-- Croquis corrigé (modèle théorique) d'une grande ville : centre-ville et CBD, banlieues, espace périurbain, autoroutes, voie ferrée, aéroport. Réviz, 4e géographie, centres et périphéries des villes. Généré par scripts/illustrations/cartes/croquis-ville-centre-peripheries.mjs -->
<path d="${periurbain}" fill="${T.periurbain}" stroke="${C.encre}" stroke-width="1" stroke-dasharray="4 3"/>
<path d="${lots}" fill="${T.lotissement}"/>
<path d="${banlieue}" fill="${T.banlieue}"/>
<path d="${ligne(FERREE)}" stroke="${C.encre}" stroke-width="1.25"/>
<path d="${traverses(FERREE)}" stroke="${C.encre}" stroke-width="1.25"/>
<path d="${AUTOROUTES.map(ligne).join('')}" stroke="${C.encre}" stroke-width="3" stroke-linecap="round"/>
<path d="${centre}" fill="${T.centre}" stroke="${C.encre}" stroke-width="1"/>
${tours(...CBD)}
${avion(...AERO)}
<g font-size="11.5" font-weight="600" fill="${C.encre}">
${L.join('\n')}
${TX.join('\n')}
</g>
</svg>
`
ecrireSvg('croquis-ville-centre-peripheries', svg, '4eme/geographie')
