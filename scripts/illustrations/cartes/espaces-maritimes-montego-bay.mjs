// -------------------------------------------------------
// Réviz — 4e géographie, « Les espaces maritimes : ressources et tensions ».
// Schéma du découpage des espaces maritimes défini par la convention de
// Montego Bay (1982) : trait de côte, eaux territoriales (12 milles marins,
// environ 22 km), ZEE (200 milles, environ 370 km), haute mer, et ce que
// l'État côtier peut faire dans chaque zone (section 3 du chapitre).
// Schéma théorique, échelle non respectée (la bande des 12 milles est élargie).
//
//   node scripts/illustrations/cartes/espaces-maritimes-montego-bay.mjs
// -------------------------------------------------------
import { C, FONT, intitule, ecrireSvg, r1, pointe } from './_commun.mjs'

const W = 360
const X0 = 12 // bord gauche (terre)
const XC = 74 // trait de côte
const X12 = 104 // limite des 12 milles (élargie)
const X200 = 262 // limite des 200 milles
const X1 = 348
const Y0 = 70
const Y1 = 182
const FILL = { terre: C.ocre, et: '#AFC3F0', zee: C.bleuClair, hm: '#F5F8FD' }

// Trait de côte légèrement découpé (calculé, régulier).
const cote = []
for (let i = 0; i <= 14; i++) {
  const y = Y0 + ((Y1 - Y0) * i) / 14
  cote.push([r1(XC + 3 * Math.sin(i * 1.3) + 2 * Math.sin(i * 0.55)), r1(y)])
}
const coteD = 'M' + cote.map(p => p.join(',')).join('L')
const terreD = `M${X0},${Y0}` + cote.map(p => `L${p.join(',')}`).join('') + `L${X0},${Y1}Z`

// Cotes (lignes de mesure) au-dessus du schéma : depuis la côte.
function cotation(xa, xb, y, texteLignes) {
  const t = [].concat(texteLignes)
  return `<path d="M${xa},${y}H${xb}" stroke="${C.encre}" stroke-width="1.25"/>` +
    pointe([xb, y], [xa, y], { long: 6, large: 5 }) + pointe([xa, y], [xb, y], { long: 6, large: 5 }) +
    `<path d="M${xb},${y - 5}V${Y0}" stroke="${C.encre}" stroke-width="1" stroke-dasharray="2 2" opacity="0.6"/>`
}
const yC1 = 52
const yC2 = 26
const COTES = [
  cotation(XC, X12, yC1),
  cotation(XC, X200, yC2),
  `<path d="M${XC},${yC2 - 5}V${Y0}" stroke="${C.encre}" stroke-width="1" stroke-dasharray="2 2" opacity="0.6"/>`,
].join('')

// Légende sous le schéma : une ligne par zone (nom + droits de l'État).
const yL = Y1 + 34
const ligne = (y, fill, nom, droit) => [
  `<rect x="14" y="${y - 11}" width="26" height="14" fill="${fill}" stroke="${C.encre}" stroke-width="0.75"/>`,
  `<text x="50" y="${y}">${nom}</text>`,
  intitule(50, y + 15, droit, { taille: 11 }).replace('<text ', `<text font-size="11" fill="${C.gris}" `),
].join('')
const L = [
  ligne(yL, FILL.et, 'Eaux territoriales', "l'État est souverain, comme sur sa terre"),
  ligne(yL + 40, FILL.zee, 'Zone économique exclusive (ZEE)', "l'État exploite seul les ressources"),
  ligne(yL + 80, FILL.hm, 'Haute mer', "n'appartient à aucun État"),
]
const H = yL + 80 + 15 + 12

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" font-family="${FONT}">
<!-- Schéma du découpage des espaces maritimes (convention de Montego Bay, 1982) : terre, trait de côte, eaux territoriales (12 milles), ZEE (200 milles), haute mer, droits de l'État dans chaque zone. Échelle non respectée. Réviz, 4e géographie, les espaces maritimes. Généré par scripts/illustrations/cartes/espaces-maritimes-montego-bay.mjs -->
<rect x="${XC - 6}" y="${Y0}" width="${X12 - XC + 6}" height="${Y1 - Y0}" fill="${FILL.et}"/>
<rect x="${X12}" y="${Y0}" width="${X200 - X12}" height="${Y1 - Y0}" fill="${FILL.zee}"/>
<rect x="${X200}" y="${Y0}" width="${X1 - X200}" height="${Y1 - Y0}" fill="${FILL.hm}"/>
<path d="${terreD}" fill="${FILL.terre}"/>
<path d="${coteD}" fill="none" stroke="${C.encre}" stroke-width="2.25" stroke-linejoin="round"/>
<path d="M${X12},${Y0}V${Y1}M${X200},${Y0}V${Y1}" stroke="${C.encre}" stroke-width="1.75" stroke-dasharray="5 3"/>
<rect x="${X0}" y="${Y0}" width="${X1 - X0}" height="${Y1 - Y0}" fill="none" stroke="${C.encre}" stroke-width="1" opacity="0.5"/>
${COTES}
<g font-size="11" font-weight="600" fill="${C.gris}">
<text x="${X1 - 3}" y="${Y1 + 14}" text-anchor="end">échelle non respectée</text>
</g>
<g font-size="11.5" font-weight="600" fill="${C.encre}">
<text x="${(X0 + XC) / 2 - 3}" y="${(Y0 + Y1) / 2 + 4}" text-anchor="middle">État</text>
<text x="${(X0 + XC) / 2 - 3}" y="${(Y0 + Y1) / 2 + 17}" text-anchor="middle">côtier</text>
<text x="${X12 + 6}" y="${yC1 + 4}">12 milles ≈ 22 km</text>
<text x="${XC + 5}" y="${yC2 - 6}">200 milles marins ≈ 370 km</text>
<g class="ill-legende"><rect class="ill-fond" x="${(X12 + X200) / 2 - 22}" y="${(Y0 + Y1) / 2 - 11}" width="44" height="15" rx="4" fill="${FILL.zee}"/><text x="${(X12 + X200) / 2}" y="${(Y0 + Y1) / 2}" text-anchor="middle">ZEE</text></g>
<g class="ill-legende"><rect class="ill-fond" x="${(X200 + X1) / 2 - 31}" y="${(Y0 + Y1) / 2 - 11}" width="62" height="15" rx="4" fill="${FILL.hm}"/><text x="${(X200 + X1) / 2}" y="${(Y0 + Y1) / 2}" text-anchor="middle">Haute mer</text></g>
<g class="ill-legende"><rect class="ill-fond" x="${(XC + X12) / 2 - 8}" y="${Y0 + 8}" width="16" height="${Y1 - Y0 - 16}" rx="4" fill="${FILL.et}"/><text transform="translate(${(XC + X12) / 2 + 4},${(Y0 + Y1) / 2}) rotate(-90)" text-anchor="middle">Eaux territoriales</text></g>
${L.join('\n')}
</g>
</svg>
`
ecrireSvg('espaces-maritimes-montego-bay', svg, '4eme/geographie')
