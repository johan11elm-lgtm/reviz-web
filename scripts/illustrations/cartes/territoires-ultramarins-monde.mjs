// -------------------------------------------------------
// Réviz — 3e géographie, « Les territoires ultramarins ».
// Planisphère de localisation des outre-mer français (méthode du chapitre) :
// les cinq DROM (Guadeloupe, Martinique, Guyane, La Réunion, Mayotte) et les
// autres territoires (Saint-Pierre-et-Miquelon, Saint-Martin, Polynésie
// française, Wallis-et-Futuna, Nouvelle-Calédonie, Kerguelen), deux couleurs,
// numéros reportés dans une légende rangée par océan ; ZEE françaises en
// contour ; océans nommés.
// Fond : Natural Earth (domaine public). ZEE : Marine Regions, World EEZ v11
// basse résolution (VLIZ, 2019, CC BY 4.0), extraites par
// scripts/illustrations/extraire-outre-mer.mjs dans donnees/outre-mer.json.
//
//   node scripts/illustrations/cartes/territoires-ultramarins-monde.mjs
// -------------------------------------------------------
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { C, FONT, HALO, compact, intitule, titrePartie, ecrireSvg, r1 } from './_commun.mjs'
import { fondMonde } from './_geographie-3e-4e.mjs'

const ICI = path.dirname(fileURLToPath(import.meta.url))
const OM = JSON.parse(readFileSync(path.join(ICI, '../donnees/outre-mer.json'), 'utf8'))

const W = 360
const MY = 6
const f = fondMonde({ x: 4, y: MY, largeur: 352 }, { sud: -58, nord: 80 })
const xy = f.m.xy

// ZEE : anneaux projetés, contour bleu, aplat très clair.
const zee = compact(OM.zee.flatMap(z => z.anneaux.map(a => a.map(([lo, la]) => xy(lo, la)))), { prec: 0.5, aireMin: 0.2 })
// France métropolitaine en encre.
const metro = f.couche(p => p.unite === 'FXX', `fill="${C.encre}"`)

// Territoires numérotés : [n°, unité, DROM ?, décalage du rond [dx, dy]].
const TER = [
  [1, 'SPM', false, [10, -8]],
  [2, 'MAF', false, [17, -13]],
  [3, 'GLP', true, [19, -1]],
  [4, 'MTQ', true, [17, 11]],
  [5, 'GUF', true, [11, 14]],
  [6, 'MYT', true, [-12, -6]],
  [7, 'REU', true, [12, 4]],
  [8, 'ATF', false, [-12, -8]],
  [9, 'WLF', false, [12, -6]],
  [10, 'NCL', false, [-11, 6]],
  [11, 'PYF', false, [0, 10]],
]
const pos = u => xy(...OM.territoires.find(t => t.unite === u).lonlat)
let liens = ''
let ronds = ''
let numeros = ''
for (const [n, u, drom, [dx, dy]] of TER) {
  const [x, y] = pos(u)
  const cx = r1(x + dx)
  const cy = r1(y + dy)
  liens += `M${x},${y}L${cx},${cy}`
  ronds += `<circle cx="${x}" cy="${y}" r="1.6" fill="${C.encre}"/>`
  numeros += `<circle cx="${cx}" cy="${cy}" r="7" fill="${drom ? C.accent : C.encre}" stroke="#FFFFFF" stroke-width="1"/>` +
    `<text x="${cx}" y="${r1(cy + 3.4)}" text-anchor="middle" fill="#FFFFFF"${n > 9 ? ' font-size="9" letter-spacing="-0.4"' : ''}>${n}</text>`
}

// Océans (mentions secondaires).
const OCEANS = [
  ['Océan', 'Atlantique', -22, -30],
  ['Océan', 'Indien', 86, -12],
  ['Océan', 'Pacifique', -142, 22],
  ['Océan', 'Pacifique', 150, 28],
]
const oceans = OCEANS.map(([a, b, lo, la]) => {
  const [x, y] = xy(lo, la)
  return `<text x="${x}" y="${y}" text-anchor="middle">${a}<tspan x="${x}" dy="12">${b}</tspan></text>`
}).join('')

// ---- Légende : territoires par océan, puis figurés.
const yL = MY + f.hauteur + 22
const X2 = 184
const num = (x, y, n, drom) => `<circle cx="${x}" cy="${y - 4}" r="7" fill="${drom ? C.accent : C.encre}"/><text x="${x}" y="${y - 0.6}" text-anchor="middle" fill="#FFFFFF" font-size="${n > 9 ? 9 : 10}" font-weight="700"${n > 9 ? ' letter-spacing="-0.4"' : ''}>${n}</text>`
const L = []
const T = []
const liste = (x, y0, titre, items) => {
  L.push(titrePartie(x, y0, titre))
  items.forEach(([n, nom, drom], i) => {
    const y = y0 + 20 + i * 19
    L.push(num(x + 7, y, n, drom))
    T.push(intitule(x + 20, y, nom))
  })
  return y0 + 20 + (items.length - 1) * 19
}
const finA = liste(12, yL, 'Océan Atlantique', [[1, 'Saint-Pierre-et-Miquelon', false], [2, 'Saint-Martin', false], [3, 'Guadeloupe', true], [4, 'Martinique', true], [5, 'Guyane', true]])
const finI = liste(X2, yL, 'Océan Indien', [[6, 'Mayotte', true], [7, 'La Réunion', true], [8, 'Kerguelen', false]])
const finP = liste(X2, finI + 26, 'Océan Pacifique', [[9, 'Wallis-et-Futuna', false], [10, 'Nouvelle-Calédonie', false], [11, 'Polynésie française', false]])
const yF = Math.max(finA, finP) + 14
L.push(`<circle cx="19" cy="${yF + 16}" r="7" fill="${C.accent}"/>`)
T.push(intitule(32, yF + 20, 'DROM'))
L.push(`<circle cx="19" cy="${yF + 35}" r="7" fill="${C.encre}"/>`)
T.push(intitule(32, yF + 39, 'Autres territoires (COM, Nouvelle-Calédonie, TAAF)'))
const yZ = yF + 62
L.push(`<rect x="12" y="${yZ - 11}" width="22" height="14" fill="${C.bleuClair}" stroke="${C.bleu}" stroke-width="1"/>`)
L.push(`<text x="42" y="${yZ}">ZEE française</text>`)
L.push(`<rect x="${X2}" y="${yZ - 11}" width="22" height="14" fill="${C.encre}"/>`)
L.push(`<text x="${X2 + 30}" y="${yZ}">France métropolitaine</text>`)
const H = yZ + 12

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" font-family="${FONT}">
<!-- Planisphère des territoires ultramarins français : DROM (accent) et autres territoires (encre), numérotés, ZEE françaises en contour, océans nommés. Réviz, 3e géographie, les territoires ultramarins. Généré par scripts/illustrations/cartes/territoires-ultramarins-monde.mjs -->
${f.svg}
<path d="${zee}" fill="${C.bleuClair}" fill-opacity="0.7" stroke="${C.bleu}" stroke-width="0.9" stroke-linejoin="round"/>
${metro}
<g font-size="11" font-weight="600" fill="${C.gris}" ${HALO}>
${oceans}
</g>
<path d="${liens}" stroke="${C.encre}" stroke-width="1" opacity="0.7"/>
${ronds}
<g font-size="10" font-weight="700">
${numeros}
</g>
<g font-size="11.5" font-weight="600" fill="${C.encre}">
${L.join('\n')}
${T.join('\n')}
</g>
</svg>
`
ecrireSvg('territoires-ultramarins-monde', svg, '3eme/geographie')
