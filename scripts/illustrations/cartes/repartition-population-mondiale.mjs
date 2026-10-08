// -------------------------------------------------------
// Réviz — 6e géographie, « La répartition de la population mondiale ».
// Planisphère des densités de population par pays en 2024 avec les trois grands
// foyers de peuplement (Asie de l'Est, Asie du Sud, Europe), les foyers secondaires
// du chapitre (Nord-Est des États-Unis, golfe de Guinée, vallée du Nil, Sud-Est du
// Brésil, Java) et les vides humains (Sahara, Grand Nord, Amazonie, Antarctique,
// hautes montagnes).
// Données : ONU, World Population Prospects 2024 (densités par pays, voir
// scripts/illustrations/extraire-densites-wpp.mjs). Foyers et vides : figurés de
// croquis placés d'après le chapitre (localisation schématique, pas un calcul).
// Fond : Natural Earth 1:50m (domaine public), via carto.mjs.
//
//   node scripts/illustrations/cartes/repartition-population-mondiale.mjs
// -------------------------------------------------------
import { C, FONT, ecrireSvg, r1, intitule, titrePartie } from './_commun.mjs'
import { fondMonde, nomMasquable, couchesDensites, legendeDensites } from './_geographie-5e-6e.mjs'

const W = 360
const SUD = -90
const NORD = 84
const f = fondMonde({ x: 12, y: 12, largeur: 336 }, { sud: SUD, nord: NORD, tol: 1.1, aireMin: 2.5 })
const { m } = f
const xy = m.xy
const yCarte = r1(12 + m.hauteur)
const fond = couchesDensites(f, SUD, NORD)

const ellipse = (lo, la, rx, ry, rot, grand) => {
  const [x, y] = xy(lo, la)
  return `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" transform="rotate(${rot} ${x} ${y})" fill="none" stroke="${C.accent}" stroke-width="${grand ? 2.25 : 1.5}"${grand ? '' : ' stroke-dasharray="3 2"'}/>`
}
// [lon, lat, rx, ry, rotation]
const GRANDS = [[114, 31, 13, 10, -20], [79, 22, 10, 9, 0], [10, 49, 13, 7, -10]]
const SECONDAIRES = [[-77, 40, 6, 4, -30], [4, 8, 7, 3.5, 0], [31.5, 28, 3, 6, -15], [-45, -21, 5, 3.5, -20], [110, -7.2, 6, 2.6, 0]]
const foyers = [...GRANDS.map(e => ellipse(...e, true)), ...SECONDAIRES.map(e => ellipse(...e, false))].join('')

// Montagnes peu peuplées : chevrons
const chevron = (lo, la) => { const [x, y] = xy(lo, la); return `M${r1(x - 4)},${r1(y + 2.5)}l4-5 4,5` }
const montagnes = [[86, 33.5], [94, 32.5], [-69, -18], [-70, -32]].map(([lo, la]) => chevron(lo, la)).join('')

// Noms des grands foyers (avec trait de rappel) et des vides humains (italique)
const NOMS_FOYERS = [
  [157, 45, ['Asie', 'de l’Est'], 128, 38],
  [76, -2, ['Asie', 'du Sud'], null],
  [-30, 44, 'Europe', -4, 49],
]
const NOMS_VIDES = [
  [0, 21, 'Sahara'],
  [-102, 63, 'Grand Nord'],
  [-62, -6, 'Amazonie'],
  [20, -80, 'Antarctique'],
]
// Numéros des foyers secondaires (liste dans la légende)
const NUMEROS = [[-63, 40.5], [3, -1.5], [40, 30], [-33, -25], [110, -16]]
const rappels = []
const noms = NOMS_FOYERS.map(([lo, la, s, lo2, la2]) => {
  const [x, y] = xy(lo, la)
  if (lo2 != null) {
    const [x2, y2] = xy(lo2, la2)
    const dx = x2 > x ? 22 : -22
    rappels.push(`M${r1(x + dx)},${r1(y - 4)}L${r1(x2)},${r1(y2)}`)
  }
  return nomMasquable(x, y, s)
}).join('\n') + '\n' + NOMS_VIDES.map(([lo, la, s]) => { const [x, y] = xy(lo, la); return nomMasquable(x, y, s, { italique: true }) }).join('\n')
const numeros = NUMEROS.map(([lo, la], i) => { const [x, y] = xy(lo, la); return `<text x="${x}" y="${r1(y + 4)}" text-anchor="middle" stroke="#FFFFFF" stroke-width="3" stroke-linejoin="round" paint-order="stroke">${i + 1}</text>` }).join('')

// ---- Légende : densités, puis foyers et vides, puis liste des foyers secondaires
const yL = yCarte + 26
const y2 = yL + 54
const L1 = [y2 + 22, y2 + 42, y2 + 62, y2 + 82]
const L2 = [y2 + 106, y2 + 126, y2 + 146]
const X2 = 214
const SEC = ['Nord-Est des États-Unis', 'Golfe de Guinée', 'Vallée du Nil', 'Sud-Est du Brésil', 'Java (Indonésie)']
const posSec = [[34, L2[0]], [X2, L2[0]], [34, L2[1]], [X2, L2[1]], [34, L2[2]]]
const legende = `${legendeDensites(yL)}
${titrePartie(12, y2, 'Foyers et vides')}
<ellipse cx="27" cy="${L1[0] - 4}" rx="12" ry="6" fill="none" stroke="${C.accent}" stroke-width="2.25"/>
<ellipse cx="27" cy="${L1[1] - 4}" rx="9" ry="5" fill="none" stroke="${C.accent}" stroke-width="1.5" stroke-dasharray="3 2"/>
<path d="M23,${L1[2] - 1.5}l4-5 4,5" fill="none" stroke="${C.encre}" stroke-width="1.5" stroke-linejoin="round"/>
<g font-size="11.5" font-weight="600" fill="${C.encre}">
${intitule(46, L1[0], 'Grand foyer de peuplement')}
${intitule(46, L1[1], 'Foyer secondaire (numéroté, liste ci-dessous)')}
${intitule(46, L1[2], 'Montagne peu peuplée')}
<text x="14" y="${L1[3]}" font-style="italic">Nom</text>
${intitule(46, L1[3], 'Vide humain (nom en italique)')}
${SEC.map((n, i) => `<text x="${posSec[i][0]}" y="${posSec[i][1]}" text-anchor="end">${i + 1}</text>` + intitule(posSec[i][0] + 8, posSec[i][1], n)).join('\n')}
</g>`
const H = L2[2] + 12

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" font-family="${FONT}">
<!-- Planisphère de la répartition de la population : densités par pays en 2024 (ONU, WPP 2024), trois grands foyers de peuplement (ellipses pleines), cinq foyers secondaires (ellipses en tirets), vides humains nommés en italique et montagnes peu peuplées (chevrons). Réviz, 6e géographie, la répartition de la population mondiale. Fond Natural Earth (domaine public). Généré par scripts/illustrations/cartes/repartition-population-mondiale.mjs -->
${fond.dessous}
<path d="${montagnes}" fill="none" stroke="${C.encre}" stroke-width="1.5" stroke-linejoin="round"/>
${foyers}
${fond.dessus}
<path d="${rappels.join('')}" stroke="${C.encre}" stroke-width="1" opacity="0.6" fill="none"/>
<g font-size="11.5" font-weight="600" fill="${C.encre}">
${noms}
${numeros}
</g>
${legende}
</svg>
`
ecrireSvg('repartition-population-mondiale', svg, '6eme/geographie')
