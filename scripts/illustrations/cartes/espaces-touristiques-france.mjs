// -------------------------------------------------------
// Réviz — 3e géographie, « Les espaces productifs de services et du tourisme ».
// Croquis corrigé des espaces touristiques français (méthode du chapitre) :
// littoraux (Côte d'Azur, Languedoc, littoral atlantique), Alpes et stations de
// ski, Paris, châteaux de la Loire, Disneyland Paris, flux de touristes venus
// des pays voisins et des grandes villes françaises. Légende en trois parties.
// Lieux repris de la section 5 du chapitre.
//
//   node scripts/illustrations/cartes/espaces-touristiques-france.mjs
// -------------------------------------------------------
import { carteFrance } from '../carto.mjs'
import { C, FONT, HALO, compact, fleche, texte, intitule, titrePartie, ecrireSvg, r1, fondDepartements } from './_commun.mjs'

const W = 360
const MY = 12
const f = carteFrance({ x: 12, y: MY, largeur: 336 })
const fond = fondDepartements(f, { tol: 1, prec: 1 })
const CLAIR = '#FBE9DD'

// Littoraux touristiques : trait épais lissé qui longe la côte (figuré linéaire de
// croquis), tracé par quelques points du trait de côte.
function lisse(pts) {
  const P = pts.map(([lo, la]) => f.xy(lo, la))
  const m = (p, q) => [r1((p[0] + q[0]) / 2), r1((p[1] + q[1]) / 2)]
  let d = `M${P[0].join(',')}`
  for (let i = 1; i < P.length - 1; i++) d += `Q${P[i].join(',')} ${m(P[i], P[i + 1]).join(',')}`
  return d + `L${P[P.length - 1].join(',')}`
}
const LITTORAUX = [
  lisse([[6.6, 43.16], [6.95, 43.42], [7.25, 43.66], [7.5, 43.78]]), // Côte d'Azur
  lisse([[3.06, 42.55], [3.07, 43.0], [3.45, 43.29], [3.9, 43.52], [4.25, 43.47]]), // Languedoc
  lisse([[-2.0, 46.8], [-1.6, 46.3], [-1.28, 45.75], [-1.2, 45.1], [-1.24, 44.5], [-1.38, 43.9], [-1.52, 43.5]]), // Atlantique
]

// Montagne touristique : les Alpes (Savoie, Haute-Savoie, Hautes-Alpes).
const rAlpes = fond.rings(['73', '74', '05'])
const STATIONS = [[6.65, 45.45], [6.55, 46.05], [6.4, 44.85]]
const tri = ([lo, la], s = 5) => { const [x, y] = f.xy(lo, la); return `M${r1(x)},${r1(y - s)}L${r1(x + s)},${r1(y + s * 0.8)}L${r1(x - s)},${r1(y + s * 0.8)}Z` }
const losange = (x, y, s = 5) => `M${r1(x)},${r1(y - s)}L${r1(x + s)},${r1(y)}L${r1(x)},${r1(y + s)}L${r1(x - s)},${r1(y)}Z`

const PARIS = f.xy(2.35, 48.86)
const DISNEY = f.xy(2.78, 48.87)
const LOIRE = f.xy(1.35, 47.45)

// Flux : pays voisins (trait plein) et grandes villes françaises (tirets).
const F = { couleur: C.encre, epaisseur: 2, long: 7, large: 7 }
const P = (lo, la) => f.xy(lo, la)
const fluxVoisins = [
  fleche(P(0.7, 51.0), P(1.45, 50.2), P(2.0, 49.35), F), // Royaume-Uni
  fleche(P(4.4, 50.85), P(3.85, 50.0), P(3.0, 49.3), F), // Belgique, Pays-Bas
  fleche(P(9.0, 47.6), P(7.9, 46.7), P(6.95, 45.9), F), // Allemagne, Suisse
].join('')
const T2 = { ...F, epaisseur: 1.5, tirets: '4 3' }
const fluxVilles = [
  fleche(P(2.0, 48.55), P(-0.2, 47.6), P(-1.2, 46.2), T2), // Paris → Atlantique
  fleche(P(2.6, 48.45), P(3.2, 45.8), P(3.7, 43.95), T2), // Paris → Méditerranée
  fleche(P(3.0, 48.6), P(5.3, 47.4), P(5.95, 45.75), T2), // Paris → Alpes
].join('')

const LIEUX = [
  // Espaces : mentions secondaires. [nom, lon, lat, ancre]
  ["Côte d'Azur", 6.55, 42.75, 'middle'],
  ['Languedoc', 2.95, 43.05, 'end'],
  ['Littoral', -2.05, 45.1, 'end'],
  ['atlantique', -2.05, 44.82, 'end'],
  ['Alpes', 7.3, 44.95, 'start'],
]
const anc = a => (a !== 'start' ? `text-anchor="${a}"` : '')

// ---- Légende : trois parties
const yL = MY + f.hauteur + 22
const L = []
const X2 = 190
L.push(titrePartie(12, yL, 'Les espaces touristiques'))
const a1 = yL + 22
L.push(`<path d="M14,${a1 - 4}H40" stroke="${C.accent}" stroke-width="4" stroke-linecap="round"/>`)
L.push(`<rect x="${X2 + 2}" y="${a1 - 11}" width="26" height="14" fill="${CLAIR}" stroke="${C.encre}" stroke-width="0.75"/>`)
const y2 = a1 + 30
L.push(titrePartie(12, y2, 'Les grands foyers'))
const b1 = y2 + 22
const b2 = b1 + 21
L.push(`<circle cx="27" cy="${b1 - 4}" r="5.5" fill="${C.encre}"/>`)
L.push(`<rect x="${X2 + 11}" y="${b1 - 8.5}" width="8" height="8" fill="${C.encre}"/>`)
L.push(`<path d="${losange(27, b2 - 4)}" fill="${C.encre}"/>`)
L.push(`<path d="M${X2 + 15},${b2 - 9}L${X2 + 20},${b2}L${X2 + 10},${b2}Z" fill="${C.encre}"/>`)
const y3 = b2 + 30
L.push(titrePartie(12, y3, 'Les flux de touristes'))
const c1 = y3 + 22
const c2 = c1 + 21
L.push(fleche([14, c1 - 4], [27, c1 - 4], [42, c1 - 4], F))
L.push(fleche([14, c2 - 4], [27, c2 - 4], [42, c2 - 4], T2))
const T = [
  intitule(50, a1, 'Littoral touristique'),
  intitule(X2 + 36, a1, 'Montagne touristique'),
  intitule(50, b1, 'Grande ville'),
  intitule(X2 + 36, b1, 'Parc de loisirs'),
  intitule(50, b2, 'Patrimoine (châteaux)'),
  intitule(X2 + 36, b2, 'Station de ski'),
  intitule(50, c1, 'Touristes venus des pays voisins'),
  intitule(50, c2, 'Touristes venus des grandes villes françaises'),
]
const H = c2 + 12

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" font-family="${FONT}">
<!-- Croquis des espaces touristiques de la France métropolitaine (corrigé de la méthode). Réviz, 3e géographie, espaces productifs de services et du tourisme. Généré par scripts/illustrations/cartes/espaces-touristiques-france.mjs -->
${fond.contour}
${fond.blanc}
<path d="${compact(rAlpes, { prec: 1 })}" fill="${CLAIR}" stroke="${CLAIR}" stroke-width="1" stroke-linejoin="round"/>
<path d="${LITTORAUX.join('')}" fill="none" stroke="${C.accent}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
${fluxVilles}
${fluxVoisins}
<g fill="${C.encre}" stroke="#FFFFFF" stroke-width="1">
<path d="${STATIONS.map(s => tri(s)).join('')}"/>
<circle cx="${PARIS[0]}" cy="${PARIS[1]}" r="5.5"/>
<rect x="${r1(DISNEY[0] - 4)}" y="${r1(DISNEY[1] - 4)}" width="8" height="8"/>
<path d="${losange(...LOIRE)}"/>
</g>
<g font-size="11" font-weight="600" fill="${C.gris}" ${HALO}>
${LIEUX.map(([n, lo, la, a]) => { const [x, y] = f.xy(lo, la); return texte(x, y, n, anc(a)) }).join('')}
</g>
<g font-size="11.5" font-weight="600" fill="${C.encre}">
<g ${HALO}>
${texte(PARIS[0] - 8, PARIS[1] + 4, 'Paris', 'text-anchor="end"')}
${texte(DISNEY[0] + 7, DISNEY[1] + 4, 'Disneyland Paris')}
<text x="${r1(LOIRE[0])}" y="${r1(LOIRE[1] + 18)}" text-anchor="middle">Châteaux<tspan x="${r1(LOIRE[0])}" dy="13">de la Loire</tspan></text>
</g>
${L.join('\n')}
${T.join('\n')}
</g>
</svg>
`
ecrireSvg('espaces-touristiques-france', svg)
