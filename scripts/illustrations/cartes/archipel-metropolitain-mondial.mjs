// -------------------------------------------------------
// Réviz — 4e géographie, « Des villes inégalement connectées ».
// Planisphère de l'archipel métropolitain mondial (AMM) : villes mondiales
// (New York, Londres, Paris, Tokyo), métropoles émergentes (Shanghai,
// Singapour, Dubaï, São Paulo, Mumbai), grands hubs (Dubaï, Londres, Atlanta,
// Singapour), les trois pôles (Amérique du Nord, Europe de l'Ouest, Asie de
// l'Est) reliés par les liaisons majeures, liaisons secondaires vers les
// métropoles émergentes, et l'Afrique subsaharienne en marge (Lagos, mégapole
// peu connectée). Villes et hiérarchie reprises du chapitre (sections 2 à 6) ;
// carte schématique : les liaisons ne sont pas des flux mesurés.
// Fond : Natural Earth (domaine public).
//
//   node scripts/illustrations/cartes/archipel-metropolitain-mondial.mjs
// -------------------------------------------------------
import { C, FONT, HALO, anneaux, hachures, fleche, intitule, titrePartie, ecrireSvg, r1 } from './_commun.mjs'
import { fondMonde } from './_geographie-3e-4e.mjs'

const W = 360
const MY = 6
const f = fondMonde({ x: 4, y: MY, largeur: 352 }, { sud: -56, nord: 78 })
const xy = f.m.xy
const CLAIR = '#FBE9DD'

// Marges : Afrique subsaharienne (pays du continent africain hors Afrique du Nord et îles européennes).
const NORD = ['EGY', 'LBY', 'TUN', 'DZA', 'MAR', 'SAH', 'FRA', 'PRT']
const afrique = f.pays.filter(p => p.continent === 'Africa' && !NORD.includes(p.iso)).flatMap(p => p.rings)
const hach = hachures(afrique, { angle: 45, pas: 3.2 })

// Pôles : ellipses (aplat clair) autour des trois grands foyers.
function ellipse([lo, la], rx, ry, rot) {
  const [x, y] = xy(lo, la)
  return `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" transform="rotate(${rot} ${x} ${y})"/>`
}
const poles = [ellipse([-82, 39], 30, 15, -12), ellipse([4, 49], 18, 12, 0), ellipse([124, 32], 30, 16, -15)].join('')

const V = {
  'New York': [-74.0, 40.7], Londres: [-0.1, 51.5], Paris: [2.35, 48.85], Tokyo: [139.7, 35.7],
  Shanghai: [121.5, 31.2], Singapour: [103.8, 1.35], 'Dubaï': [55.3, 25.2], 'São Paulo': [-46.6, -23.5], Mumbai: [72.9, 19.1],
  Atlanta: [-84.4, 33.7], Lagos: [3.4, 6.45],
}
const P = n => xy(...V[n])

// Liaisons majeures entre les trois pôles (accent), secondaires vers les émergentes (encre fine).
const FM = { couleur: C.accent, epaisseur: 2.25, long: 0.1, large: 0.1 }
const courbe = (a, b, h) => {
  const m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2 - h]
  return `M${a.join(',')}Q${r1(m[0])},${r1(m[1])} ${b.join(',')}`
}
const [xNY, yNY] = P('New York')
const [xLo, yLo] = P('Londres')
const [xTo, yTo] = P('Tokyo')
const majeures = [
  courbe([xNY + 4, yNY - 2], [xLo - 4, yLo], 14),
  courbe([xLo + 6, yLo], [xTo - 8, yTo - 4], 22),
  // Pacifique : de Tokyo vers le bord droit, du bord gauche vers New York (via la côte ouest).
  `M${xTo + 6},${yTo}Q${xTo + 18},${yTo - 6} ${r1(f.m.xy(178, 38)[0])},${r1(f.m.xy(178, 38)[1])}`,
  `M${r1(f.m.xy(-178, 38)[0])},${r1(f.m.xy(-178, 38)[1])}Q${r1(f.m.xy(-120, 52)[0])},${r1(f.m.xy(-120, 52)[1])} ${xNY - 4},${yNY - 2}`,
].join('')
const secondaires = [
  ['São Paulo', 'New York', 10], ['São Paulo', 'Londres', -12], ['Dubaï', 'Londres', 8], ['Dubaï', 'Singapour', -6],
  ['Mumbai', 'Dubaï', 4], ['Singapour', 'Shanghai', -8], ['Shanghai', 'Tokyo', 3],
].map(([a, b, h]) => courbe(P(a), P(b), h)).join('')

// Symboles des villes.
const carre = ([x, y], s) => `<rect x="${r1(x - s)}" y="${r1(y - s)}" width="${2 * s}" height="${2 * s}"/>`
const mondiales = ['New York', 'Londres', 'Paris', 'Tokyo'].map(n => carre(P(n), 4.6)).join('')
const emergentes = ['Shanghai', 'Singapour', 'Dubaï', 'São Paulo', 'Mumbai'].map(n => { const [x, y] = P(n); return `<circle cx="${x}" cy="${y}" r="3.8"/>` }).join('')
const hubs = ['Dubaï', 'Londres', 'Atlanta', 'Singapour'].map(n => { const [x, y] = P(n); return `<circle cx="${x}" cy="${y}" r="${n === 'Londres' ? 9 : 7.2}"/>` }).join('')
const [xLa, yLa] = P('Lagos')

// Noms : [nom, dx, dy, ancre]
const NOMS = [
  ['New York', 6, 14, 'start'], ['Londres', -8, -6, 'end'], ['Paris', -8, 13, 'end'], ['Tokyo', 8, 15, 'start'],
  ['Shanghai', -4, -9, 'middle'], ['Singapour', 4, 16, 'middle'], ['Dubaï', -9, 13, 'end'], ['São Paulo', 8, 9, 'start'],
  ['Mumbai', 0, 16, 'middle'], ['Atlanta', -10, 5, 'end'], ['Lagos', -7, 4, 'end'],
]
const noms = NOMS.map(([n, dx, dy, a]) => { const [x, y] = P(n); return `<text x="${r1(x + dx)}" y="${r1(y + dy)}"${a !== 'start' ? ` text-anchor="${a}"` : ''}>${n}</text>` }).join('')

// ---- Légende : trois parties
const yL = MY + f.hauteur + 22
const X2 = 196
const L = []
const T = []
L.push(titrePartie(12, yL, 'Les métropoles'))
const a = [yL + 22, yL + 43, yL + 64, yL + 85]
L.push(`<rect x="22" y="${a[0] - 9}" width="9.2" height="9.2" fill="${C.encre}" stroke="#FFFFFF" stroke-width="0.8"/>`)
L.push(`<circle cx="26.6" cy="${a[1] - 4.4}" r="3.8" fill="${C.encre}"/>`)
L.push(`<circle cx="26.6" cy="${a[2] - 4.4}" r="7.2" fill="none" stroke="${C.encre}" stroke-width="1.5"/><circle cx="26.6" cy="${a[2] - 4.4}" r="1.6" fill="${C.encre}"/>`)
L.push(`<circle cx="26.6" cy="${a[3] - 4.4}" r="3.4" fill="#FFFFFF" stroke="${C.encre}" stroke-width="1.5"/>`)
T.push(intitule(44, a[0], 'Ville mondiale'), intitule(44, a[1], 'Métropole émergente'), intitule(44, a[2], 'Grand hub'), intitule(44, a[3], 'Mégapole peu connectée'))
L.push(titrePartie(X2, yL, 'Pôles et liaisons'))
const b = [yL + 22, yL + 43, yL + 64]
L.push(`<ellipse cx="${X2 + 13}" cy="${b[0] - 4}" rx="13" ry="7" fill="${CLAIR}"/>`)
L.push(`<path d="M${X2},${b[1] - 4}H${X2 + 26}" stroke="${C.accent}" stroke-width="2.25" stroke-linecap="round"/>`)
L.push(`<path d="M${X2},${b[2] - 4}H${X2 + 26}" stroke="${C.encre}" stroke-width="1.25" stroke-linecap="round"/>`)
T.push(intitule(X2 + 34, b[0], 'Pôle majeur'), intitule(X2 + 34, b[1], 'Liaison majeure'), intitule(X2 + 34, b[2], 'Liaison secondaire'))
L.push(titrePartie(X2, b[2] + 30, 'Les marges'))
const c1 = b[2] + 52
L.push(`<rect x="${X2}" y="${c1 - 11}" width="26" height="14" fill="#FFFFFF" stroke="${C.encre}" stroke-width="0.75"/>`)
L.push(`<path d="${hachures([[[X2, c1 - 11], [X2 + 26, c1 - 11], [X2 + 26, c1 + 3], [X2, c1 + 3]]], { angle: 45, pas: 3.2 })}" stroke="${C.encre}" stroke-width="0.7"/>`)
T.push(intitule(X2 + 34, c1, 'Espace en marge'))
const H = Math.max(a[3], c1) + 12

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" font-family="${FONT}">
<!-- Planisphère de l'archipel métropolitain mondial : villes mondiales, métropoles émergentes, hubs, trois pôles, liaisons majeures et secondaires, Afrique en marge. Carte schématique. Réviz, 4e géographie, des villes inégalement connectées. Généré par scripts/illustrations/cartes/archipel-metropolitain-mondial.mjs -->
${f.svg}
<path d="${hach}" stroke="${C.encre}" stroke-width="0.7" opacity="0.7"/>
<g fill="${CLAIR}" fill-opacity="0.9">${poles}</g>
<path d="${secondaires}" fill="none" stroke="${C.encre}" stroke-width="1.25" stroke-linecap="round"/>
<path d="${majeures}" fill="none" stroke="${C.accent}" stroke-width="2.25" stroke-linecap="round"/>
<g fill="none" stroke="${C.encre}" stroke-width="1.5">${hubs}</g>
<g fill="${C.encre}" stroke="#FFFFFF" stroke-width="0.8">${mondiales}${emergentes}</g>
${(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.6" fill="${C.encre}"/>`)(P('Atlanta'))}
<circle cx="${xLa}" cy="${yLa}" r="3.4" fill="#FFFFFF" stroke="${C.encre}" stroke-width="1.5"/>
<g font-size="11.5" font-weight="600" fill="${C.encre}">
<g ${HALO}>${noms}</g>
${L.join('\n')}
${T.join('\n')}
</g>
</svg>
`
ecrireSvg('archipel-metropolitain-mondial', svg, '4eme/geographie')
