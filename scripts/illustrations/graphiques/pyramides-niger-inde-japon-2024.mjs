// -------------------------------------------------------
// Réviz — 5e géographie, « La transition démographique ».
// Trois pyramides des âges comparées, même année (2024), même échelle :
// Niger, Inde, Japon. Part de chaque groupe d'âges quinquennal dans la population
// totale du pays (%), hommes à gauche, femmes à droite.
//
// Source : ONU, World Population Prospects 2024, population au 1er juillet 2024 par
// groupe d'âges de 5 ans et par sexe (variante moyenne), fichiers
// population_age5/ddf--datapoints--population--by--country_area--time--age_group_5year-<âge>--sex.csv
// du dépôt GitHub open-numbers/ddf--unpop--world_population_prospects (téléchargés le
// 8 octobre 2026). Codes pays : Niger 562, Inde 356, Japon 392. Parts calculées ici
// puis recopiées (arrondies au centième). Totaux 2024 : Niger 27,0 millions (46,6 % de
// moins de 15 ans, 2,6 % de 65 ans ou plus) ; Inde 1 450,9 millions (24,6 % ; 7,1 %) ;
// Japon 123,8 millions (11,4 % ; 29,8 %).
//
//   node scripts/illustrations/graphiques/pyramides-niger-inde-japon-2024.mjs
// -------------------------------------------------------
import { C, FONT, ecrireSvg, r1 } from '../cartes/_commun.mjs'
import { etiquette } from './_geographie-5e-6e.mjs'

// Groupes 0-4, 5-9, …, 95-99, 100 et plus (21 groupes), en % de la population totale.
const PAYS = [
  {
    nom: 'Niger',
    h: [8.98, 7.83, 6.87, 5.77, 4.67, 3.69, 2.88, 2.32, 1.94, 1.57, 1.25, 1.01, 0.78, 0.56, 0.37, 0.18, 0.07, 0.02, 0, 0, 0],
    f: [8.71, 7.58, 6.63, 5.57, 4.5, 3.54, 2.76, 2.22, 1.84, 1.49, 1.21, 0.99, 0.8, 0.59, 0.4, 0.24, 0.11, 0.03, 0, 0, 0],
  },
  {
    nom: 'Inde',
    h: [4.06, 4.27, 4.5, 4.6, 4.7, 4.5, 4.26, 4.0, 3.56, 3.06, 2.63, 2.21, 1.83, 1.42, 0.98, 0.54, 0.28, 0.13, 0.04, 0.01, 0],
    f: [3.77, 3.92, 4.1, 4.18, 4.26, 4.08, 3.92, 3.7, 3.31, 2.89, 2.54, 2.17, 1.82, 1.46, 1.05, 0.62, 0.36, 0.18, 0.06, 0.01, 0],
  },
  {
    nom: 'Japon',
    h: [1.66, 1.99, 2.22, 2.35, 2.52, 2.51, 2.51, 2.75, 3.05, 3.61, 4.02, 3.42, 3.08, 2.92, 3.19, 3.04, 2.13, 1.2, 0.5, 0.11, 0.01],
    f: [1.58, 1.89, 2.09, 2.22, 2.4, 2.42, 2.41, 2.66, 2.98, 3.55, 3.95, 3.33, 3.05, 2.99, 3.47, 3.61, 2.9, 2.04, 1.2, 0.4, 0.08],
  },
]

const W = 360
const K = 5 // px par point de %
const HB = 8.4 // hauteur d'une barre (5 ans)
const Y0 = 44 // haut de la pyramide (100 ans)
const NB = 21
const YB = Y0 + NB * HB // bas (0 an)
const CX = [96, 200, 300] // axes centraux des trois pyramides
const H = YB + 60

const yGroupe = i => YB - (i + 1) * HB // haut de la barre du groupe i
const barres = (cx, vals, cote) => vals.map((v, i) => {
  const w = r1(v * K)
  if (w < 0.3) return ''
  const x = cote < 0 ? r1(cx - w) : cx
  return `M${x},${r1(yGroupe(i) + 0.5)}h${w}v${r1(HB - 1)}h${-w}z`
}).join('')

const corps = PAYS.map((p, k) => {
  const cx = CX[k]
  return `<path d="${barres(cx, p.h, -1)}" fill="${C.bleuClair}" stroke="${C.bleu}" stroke-width="0.6"/>` +
    `<path d="${barres(cx, p.f, 1)}" fill="${C.rougeClair}" stroke="${C.rouge}" stroke-width="0.6"/>` +
    `<path d="M${cx},${YB}V${Y0 - 4}" stroke="${C.encre}" stroke-width="1"/>` +
    // échelle horizontale : 5 % de chaque côté
    `<path d="M${cx - 5 * K},${YB}H${cx + 5 * K}M${cx - 5 * K},${YB}v4M${cx},${YB}v4M${cx + 5 * K},${YB}v4" stroke="${C.encre}" stroke-width="1.25"/>` +
    `<g font-size="11" font-weight="600" fill="${C.gris}" text-anchor="middle"><text x="${cx - 5 * K}" y="${YB + 16}">5 %</text><text x="${cx}" y="${YB + 16}">0</text><text x="${cx + 5 * K}" y="${YB + 16}">5 %</text></g>`
}).join('\n')

// Axe des âges, à gauche
const XA = 30
const ages = [0, 20, 40, 60, 80, 100]
const axeAges = `<path d="M${XA},${YB}V${Y0}" stroke="${C.encre}" stroke-width="1.25"/>` +
  `<path d="${ages.map(a => `M${XA},${r1(YB - (a / 5) * HB)}h-4`).join('')}" stroke="${C.encre}" stroke-width="1.25"/>` +
  `<g font-size="11" font-weight="600" fill="${C.gris}" text-anchor="end">${ages.map(a => `<text x="${XA - 7}" y="${r1(YB - (a / 5) * HB + 4)}">${a}</text>`).join('')}</g>` +
  `<text x="${XA - 18}" y="${Y0 - 14}" font-size="11.5" font-weight="600" fill="${C.encre}">Âge (ans)</text>`

const sexes = `<g font-size="11" font-weight="600" fill="${C.gris}"><text x="${CX[1] - 6}" y="${Y0 - 14}" text-anchor="end">hommes</text><text x="${CX[1] + 6}" y="${Y0 - 14}">femmes</text></g>`

const noms = PAYS.map((p, k) => etiquette(CX[k], YB + 40, p.nom, { ancre: 'middle' }).svg).join('\n')

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" font-family="${FONT}">
<!-- Pyramides des âges du Niger, de l'Inde et du Japon en 2024, à la même échelle (part de chaque groupe d'âges de 5 ans dans la population du pays, hommes à gauche en bleu, femmes à droite en rouge) : base très large et sommet pointu au Niger, base plus étroite et forme en ogive en Inde, base étroite et sommet large au Japon. Source : ONU, WPP 2024. Réviz, 5e géographie, la transition démographique. Généré par scripts/illustrations/graphiques/pyramides-niger-inde-japon-2024.mjs -->
${axeAges}
${sexes}
${corps}
<g font-size="12" font-weight="700" fill="${C.encre}">
${noms}
</g>
</svg>
`
ecrireSvg('pyramides-niger-inde-japon-2024', svg, '5eme/geographie')
