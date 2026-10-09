// -------------------------------------------------------
// Réviz — 3e géographie, « Les espaces de faible densité et leurs atouts ».
// Carte des densités de population par département (France métropolitaine,
// 5 classes) avec la diagonale des faibles densités et les montagnes peu peuplées.
//
// Chiffres : densité = population municipale au 1er janvier 2022 ÷ superficie.
//  - Population : INSEE, « Populations des départements en 2022 », recensement de
//    la population, paru le 19/12/2024 (https://www.insee.fr/fr/statistiques/8290631).
//  - Superficie (km²) : tableau « List of French departments by population » de
//    Wikipédia (colonne Area km², superficies officielles INSEE/IGN), lu en octobre 2026.
//  Contrôle : France métropolitaine ≈ 120 hab./km² (INSEE 2022 : 120,1).
//
//   node scripts/illustrations/cartes/densites-france-departements.mjs
// -------------------------------------------------------
import { carteFrance } from '../carto.mjs'
import { C, FONT, HALO, anneaux, compact, texte, intitule, titrePartie, ecrireSvg, r1 } from './_commun.mjs'

// code: [population municipale 2022, superficie km²]
const DONNEES = {
  '01': [671289, 5762], '02': [525558, 7369], '03': [334715, 7340], '04': [167179, 6925], '05': [141677, 5549],
  '06': [1114579, 4299], '07': [333229, 5529], '08': [267204, 5229], '09': [155339, 4890], '10': [311076, 6004],
  '11': [377773, 6139], '12': [279736, 8735], '13': [2069811, 5087], '14': [704605, 5548], '15': [144399, 5726],
  '16': [351603, 5956], '17': [668160, 6864], '18': [299496, 7235], '19': [240120, 5857], '21': [537577, 8763],
  '22': [609598, 6878], '23': [115529, 5565], '24': [416325, 9060], '25': [548662, 5234], '26': [521432, 6530],
  '27': [601305, 6040], '28': [432950, 5880], '29': [927912, 6733], '2A': [166045, 4014], '2B': [185231, 4666],
  '30': [764010, 5853], '31': [1456261, 6309], '32': [192649, 6257], '33': [1674980, 10725], '34': [1217331, 6101],
  '35': [1109232, 6775], '36': [216809, 6791], '37': [616326, 6127], '38': [1291380, 7431], '39': [258405, 4999],
  '40': [428427, 9243], '41': [328953, 6343], '42': [772041, 4781], '43': [228161, 4977], '44': [1473156, 6815],
  '45': [687063, 6775], '46': [175620, 5217], '47': [332226, 5361], '48': [76503, 5167], '49': [828151, 7166],
  '50': [496815, 5938], '51': [564107, 8162], '52': [169865, 6211], '53': [305437, 5175], '54': [732898, 5246],
  '55': [180745, 6211], '56': [776103, 6823], '57': [1050721, 6216], '58': [202299, 6817], '59': [2616909, 5743],
  '60': [830725, 5860], '61': [276144, 6103], '62': [1460184, 6671], '63': [664385, 7970], '64': [699473, 7645],
  '65': [231453, 4464], '66': [492964, 4116], '67': [1156963, 4755], '68': [767800, 3525], '69': [1907982, 3249],
  '70': [233920, 5360], '71': [549136, 8575], '72': [566129, 6206], '73': [445288, 6028], '74': [849583, 4388],
  '75': [2113705, 105], '76': [1260205, 6278], '77': [1452399, 5915], '78': [1470778, 2284], '79': [375415, 5999],
  '80': [565540, 6170], '81': [396168, 5758], '82': [264924, 3718], '83': [1108364, 5973], '84': [568702, 3567],
  '85': [706343, 6720], '86': [438688, 6990], '87': [372438, 5520], '88': [358700, 5874], '89': [333896, 7427],
  '90': [140082, 609], '91': [1324546, 1804], '92': [1647435, 176], '93': [1681725, 236], '94': [1419531, 245],
  '95': [1270845, 1246],
}

// Classes : seuils en hab./km² (120 = moyenne de la métropole), du plus clair au plus foncé.
const SEUILS = [30, 60, 120, 300]
const TEINTES = ['#F6F4F9', '#DCD8EA', '#B2ABD0', '#7D74AE', '#46407D']
const ETIQUETTES = ['< 30', '30 à 60', '60 à 120', '120 à 300', '> 300']
const classe = dens => SEUILS.filter(s => dens >= s).length

const W = 360
const MY = 12 // haut de la carte (pas de titre dans le dessin : il est dans le JSON)
const f = carteFrance({ x: 12, y: MY, largeur: 336 })
const H_CARTE = f.hauteur

const deps = f.departements(0.8).map(d => {
  const [pop, sup] = DONNEES[d.code]
  return { ...d, dens: pop / sup, rings: anneaux(d.d) }
})
const totPop = Object.values(DONNEES).reduce((s, v) => s + v[0], 0)
const totSup = Object.values(DONNEES).reduce((s, v) => s + v[1], 0)
console.log('densité métropole', (totPop / totSup).toFixed(1), 'hab./km²')

const tous = compact(deps.flatMap(d => d.rings), { prec: 1 })
const parClasse = TEINTES.map((_, i) => compact(deps.filter(d => classe(d.dens) === i).flatMap(d => d.rings), { prec: 1 }))
for (const i of [0, 1, 2, 3, 4]) console.log(ETIQUETTES[i], deps.filter(d => classe(d.dens) === i).map(d => d.code).join(' '))
// Diagonale des faibles densités : bande lissée autour d'un axe Ardennes → Landes.
function bande(axe, demi) {
  const P = axe.map(([lo, la]) => f.xy(lo, la))
  const gauche = []
  const droite = []
  P.forEach((p, i) => {
    const a = P[Math.max(0, i - 1)]
    const b = P[Math.min(P.length - 1, i + 1)]
    const dx = b[0] - a[0]
    const dy = b[1] - a[1]
    const l = Math.hypot(dx, dy)
    const w = demi[i]
    gauche.push([p[0] - (dy / l) * w, p[1] + (dx / l) * w])
    droite.push([p[0] + (dy / l) * w, p[1] - (dx / l) * w])
  })
  const pts = [...gauche, ...droite.reverse()]
  // Lissage : courbes quadratiques passant par les milieux.
  const m = (p, q) => [r1((p[0] + q[0]) / 2), r1((p[1] + q[1]) / 2)]
  let d = `M${m(pts[pts.length - 1], pts[0]).join(',')}`
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i]
    const q = pts[(i + 1) % pts.length]
    d += `Q${r1(p[0])},${r1(p[1])} ${m(p, q).join(',')}`
  }
  return d + 'Z'
}
const diagonale = bande(
  [[4.75, 49.75], [5.2, 48.75], [4.1, 47.35], [2.4, 46.2], [2.9, 44.9], [1.0, 44.15], [-0.95, 44.0]],
  [10, 14, 15, 16, 19, 15, 11],
)

// Montagnes peu peuplées : petits chevrons.
const chevron = ([lo, la]) => {
  const [x, y] = f.xy(lo, la)
  return `M${r1(x - 5)},${r1(y + 3)}L${r1(x)},${r1(y - 3)}L${r1(x + 5)},${r1(y + 3)}`
}
const MONTAGNES = [[6.35, 44.35], [6.75, 45.15], [0.2, 42.95], [1.5, 42.7], [9.05, 42.05]]

// Grandes métropoles (densément peuplées) et noms de lieux.
const VILLES = [
  // [nom, lon, lat, dx, dy, ancre]
  ['Paris', 2.35, 48.86, 6, -3, 'start'],
  ['Lille', 3.06, 50.63, 6, 4, 'start'],
  ['Lyon', 4.83, 45.76, 6, 4, 'start'],
  ['Marseille', 5.37, 43.3, 0, 15, 'middle'],
]
const LIEUX = [
  // Régions : mentions secondaires. [nom, lon, lat, ancre]
  ['Ardennes', 5.15, 50.05, 'start'],
  ['Massif central', 2.7, 45.45, 'middle'],
  ['Landes', -1.75, 44.05, 'end'],
  ['Alpes', 7.15, 44.8, 'start'],
  ['Pyrénées', 0.9, 42.4, 'middle'],
]

const anc = a => (a !== 'start' ? `text-anchor="${a}"` : '')
const yL = MY + H_CARTE + 22 // début de la légende
const L = []
L.push(titrePartie(12, yL, 'Densité de population en 2022 (hab./km²)'))
const yb = yL + 9
TEINTES.forEach((t, i) => {
  const x = 12 + i * 68
  L.push(`<rect x="${x}" y="${yb}" width="64" height="12" fill="${t}" stroke="${C.encre}" stroke-width="0.75"/>`)
  L.push(texte(x + 32, yb + 27, ETIQUETTES[i], 'text-anchor="middle"'))
})
const y2 = yb + 56
L.push(titrePartie(12, y2, 'Des espaces denses et des espaces peu peuplés'))
const i1 = y2 + 22
const i2 = i1 + 21
const i3 = i2 + 21
const sym = []
sym.push(`<rect x="14" y="${i1 - 10}" width="26" height="12" rx="6" fill="none" stroke="${C.accent}" stroke-width="2.25" stroke-dasharray="4 2.5"/>`)
sym.push(`<path d="M22,${i2 + 1}L27,${i2 - 5}L32,${i2 + 1}" fill="none" stroke="${C.encre}" stroke-width="1.75" stroke-linejoin="round" stroke-linecap="round"/>`)
sym.push(`<circle cx="27" cy="${i3 - 4}" r="2.6" fill="${C.encre}" stroke="#FFFFFF" stroke-width="1"/>`)
L.push(...sym)
L.push(intitule(50, i1, 'Diagonale des faibles densités'))
L.push(intitule(50, i2, 'Montagne peu peuplée'))
L.push(intitule(50, i3, 'Grande métropole'))
const H = i3 + 12

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" font-family="${FONT}">
<!-- Densités de population par département en 2022 (INSEE), diagonale des faibles densités. Réviz, 3e géographie, espaces de faible densité. Généré par scripts/illustrations/cartes/densites-france-departements.mjs -->
<path d="${tous}" fill="#FFFFFF" stroke="${C.encre}" stroke-width="2.4" stroke-linejoin="round"/>
${parClasse.map((d, i) => `<path d="${d}" fill="${TEINTES[i]}" stroke="#FFFFFF" stroke-width="0.5" stroke-linejoin="round"/>`).join('\n')}
<path d="${diagonale}" fill="none" stroke="${C.accent}" stroke-width="2.25" stroke-dasharray="5 3"/>
<path d="${MONTAGNES.map(chevron).join('')}" fill="none" stroke="${C.encre}" stroke-width="1.75" stroke-linejoin="round" stroke-linecap="round"/>
<g fill="${C.encre}" stroke="#FFFFFF" stroke-width="1">${VILLES.map(([, lo, la]) => { const [x, y] = f.xy(lo, la); return `<circle cx="${x}" cy="${y}" r="2.6"/>` }).join('')}</g>
<g font-size="11" font-weight="600" fill="${C.gris}" ${HALO}>
${LIEUX.map(([n, lo, la, a]) => { const [x, y] = f.xy(lo, la); return texte(x, y, n, anc(a)) }).join('')}
</g>
<g font-size="11.5" font-weight="600" fill="${C.encre}">
<g ${HALO}>
${VILLES.map(([n, lo, la, dx, dy, a]) => { const [x, y] = f.xy(lo, la); return texte(x + dx, y + dy, n, anc(a)) }).join('')}
</g>
${L.join('\n')}
</g>
</svg>
`
ecrireSvg('densites-france-departements', svg)
