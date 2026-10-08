// -------------------------------------------------------
// Réviz — 4e géographie, « Les États-Unis, puissance de la mondialisation ».
// Carte de localisation (méthode du chapitre) : océans Atlantique et
// Pacifique, golfe du Mexique, Grands Lacs ; les trois façades maritimes
// (atlantique, golfe du Mexique, pacifique) ; New York, Washington (capitale
// fédérale), Chicago, Houston, Los Angeles, San Francisco et la Silicon Valley.
// États-Unis contigus (sans l'Alaska ni Hawaï). Fond : Natural Earth
// (domaine public). Façades : traits lissés passant par des points du trait
// de côte (figuré linéaire de croquis).
//
//   node scripts/illustrations/cartes/etats-unis-localisation.mjs
// -------------------------------------------------------
import { C, FONT, HALO, compact, intitule, titrePartie, ecrireSvg, r1 } from './_commun.mjs'
import { fondEtatsUnis, lisse, MER, TERRE, TERRE_TRAIT, FACADES_ETATS_UNIS } from './_geographie-3e-4e.mjs'

const W = 360
const MY = 12
const f = fondEtatsUnis({ x: 12, y: MY, largeur: 336 })
const xy = f.xy
const [x0, y0, x1, y1] = f.R
const ligne = pts => lisse(pts.map(([lo, la]) => xy(lo, la)))

const FACADES = FACADES_ETATS_UNIS

const VILLES = {
  'New York': [-74.0, 40.7], Washington: [-77.04, 38.9], Chicago: [-87.63, 41.88], Houston: [-95.37, 29.76],
  'Los Angeles': [-118.24, 34.05], 'San Francisco': [-122.42, 37.77], 'Silicon Valley': [-121.9, 37.34],
}
const P = n => xy(...VILLES[n])
const villes = ['New York', 'Chicago', 'Houston', 'Los Angeles', 'San Francisco'].map(n => { const [x, y] = P(n); return `<circle cx="${x}" cy="${y}" r="3.8"/>` }).join('')
const etoile = ([x, y], R = 6.2, r = 2.6) => {
  let d = ''
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5
    const rr = i % 2 ? r : R
    d += (i ? 'L' : 'M') + r1(x + rr * Math.cos(a)) + ',' + r1(y + rr * Math.sin(a))
  }
  return d + 'Z'
}
const tri = ([x, y], s = 5) => `M${r1(x)},${r1(y - s)}L${r1(x + s)},${r1(y + s * 0.8)}L${r1(x - s)},${r1(y + s * 0.8)}Z`
const [xSV, ySV] = P('Silicon Valley')

// Noms des villes : [nom, dx, dy, ancre]
const NOMS = [
  ['New York', 7, -5, 'start'], ['Washington', -7, 13, 'end'], ['Chicago', -1, -8, 'middle'], ['Houston', -6, 12, 'middle'],
  ['Los Angeles', 6, 4, 'start'], ['San Francisco', -2, -9, 'start'],
]
const noms = NOMS.map(([n, dx, dy, a]) => { const [x, y] = P(n); return `<text x="${r1(x + dx)}" y="${r1(y + dy)}"${a !== 'start' ? ` text-anchor="${a}"` : ''}>${n}</text>` }).join('')

// Mers et lacs (mentions secondaires).
const MERS = [
  ['Océan', 'Pacifique', -123.5, 31],
  ['Océan', 'Atlantique', -71, 30.5],
  ['Golfe du', 'Mexique', -89.5, 25.3],
]
const mers = MERS.map(([a, b, lo, la]) => { const [x, y] = xy(lo, la); return `<text x="${x}" y="${y}" text-anchor="middle">${a}<tspan x="${x}" dy="12">${b}</tspan></text>` }).join('')
const [xGL, yGL] = xy(-84.5, 47.6)

// ---- Légende
const yL = y1 + 24
const X2 = 186
const L = []
const T = []
L.push(titrePartie(12, yL, 'Les villes'))
const a = [yL + 22, yL + 43, yL + 64]
L.push(`<path d="${etoile([27, a[0] - 4])}" fill="${C.encre}"/>`)
L.push(`<circle cx="27" cy="${a[1] - 4}" r="3.8" fill="${C.encre}"/>`)
L.push(`<path d="${tri([27, a[2] - 5])}" fill="${C.accent}"/>`)
T.push(intitule(44, a[0], 'Capitale fédérale'), intitule(44, a[1], 'Grande ville'), intitule(44, a[2], ['Technopôle', '(Silicon Valley)']))
L.push(titrePartie(X2, yL, 'Les littoraux'))
L.push(`<path d="M${X2 + 2},${a[0] - 4}H${X2 + 28}" stroke="${C.bleu}" stroke-width="4.5" stroke-linecap="round"/>`)
T.push(intitule(X2 + 36, a[0], 'Façade maritime'))
const H = a[2] + 13 + 12

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" font-family="${FONT}">
<!-- Carte de localisation des États-Unis : océans, golfe du Mexique, Grands Lacs, trois façades maritimes, New York, Washington, Chicago, Houston, Los Angeles, San Francisco, Silicon Valley. Réviz, 4e géographie, les États-Unis puissance de la mondialisation. Généré par scripts/illustrations/cartes/etats-unis-localisation.mjs -->
<rect x="${x0}" y="${y0}" width="${r1(x1 - x0)}" height="${r1(y1 - y0)}" fill="${MER}"/>
${f.couche(p => p.iso !== 'USA', `fill="${TERRE}" stroke="${TERRE_TRAIT}" stroke-width="0.6" stroke-linejoin="round"`)}
${f.couche(p => p.iso === 'USA', `fill="#FFFFFF" stroke="${C.encre}" stroke-width="1.2" stroke-linejoin="round"`)}
<path d="${f.lacs}" fill="${MER}" stroke="${C.bleu}" stroke-width="0.7"/>
<path d="${FACADES.map(ligne).join('')}" fill="none" stroke="${C.bleu}" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round" opacity="0.85"/>
<rect x="${x0}" y="${y0}" width="${r1(x1 - x0)}" height="${r1(y1 - y0)}" fill="none" stroke="${C.encre}" stroke-width="1" opacity="0.5"/>
<g font-size="11" font-weight="600" fill="${C.gris}" ${HALO}>
${mers}
<text x="${xGL}" y="${yGL}" text-anchor="middle">Grands Lacs</text>
<text x="${r1(xy(-104, 56)[0])}" y="${r1(Math.max(y0 + 14, xy(-104, 51.5)[1]))}" text-anchor="middle">Canada</text>
<text x="${r1(xy(-104, 25.5)[0])}" y="${r1(xy(-104, 25.5)[1])}" text-anchor="middle">Mexique</text>
</g>
<g fill="${C.encre}" stroke="#FFFFFF" stroke-width="0.8">${villes}<path d="${etoile(P('Washington'))}"/></g>
<path d="${tri([xSV + 7, ySV + 4])}" fill="${C.accent}" stroke="#FFFFFF" stroke-width="0.8"/>
<g font-size="11.5" font-weight="600" fill="${C.encre}">
<g ${HALO}>${noms}</g>
${L.join('\n')}
${T.join('\n')}
</g>
</svg>
`
ecrireSvg('etats-unis-localisation', svg, '4eme/geographie')
