// -------------------------------------------------------
// Réviz — 3e géographie, « Les aires urbaines, une nouvelle géographie d'une
// France mondialisée ». Carte des 20 aires d'attraction des villes les plus
// peuplées de France métropolitaine en cercles proportionnels : Paris (ville
// mondiale, macrocéphalie) et les métropoles régionales citées dans le chapitre.
//
// Chiffres : population 2023 des aires d'attraction des villes (zonage INSEE 2020),
// INSEE, comparateur de territoire, repris dans le tableau « Les aires d'attraction
// de 200 000 habitants ou plus » de l'article Wikipédia « Aire d'attraction d'une
// ville », lu en octobre 2026. Lille et Strasbourg : partie française de l'aire.
// Contrôle avec le chapitre : Paris ≈ 13 millions, plus de 5 fois Lyon (13,3 / 2,3).
//
//   node scripts/illustrations/cartes/aires-attraction-villes-france.mjs
// -------------------------------------------------------
import { carteFrance } from '../carto.mjs'
import { C, FONT, HALO, texte, intitule, titrePartie, ecrireSvg, r1, fondDepartements } from './_commun.mjs'

const W = 360
const MY = 12
const f = carteFrance({ x: 12, y: MY, largeur: 336 })
const fond = fondDepartements(f, { tol: 1, prec: 1 })

// [nom affiché ou null, population 2023, lon, lat, dx, dy, ancre]
const AIRES = [
  ['Paris', 13320752, 2.35, 48.86],
  ['Lyon', 2338789, 4.83, 45.76],
  ['Marseille-Aix', 1917728, 5.4, 43.42],
  ['Lille', 1530624, 3.06, 50.63],
  ['Toulouse', 1529112, 1.44, 43.6],
  ['Bordeaux', 1426278, -0.58, 44.84],
  ['Nantes', 1050815, -1.55, 47.22],
  ['Strasbourg', 875163, 7.75, 48.58],
  ['Montpellier', 842923, 3.88, 43.61],
  ['Rennes', 789516, -1.68, 48.11],
  [null, 727380, 5.72, 45.19], // Grenoble
  [null, 715239, 1.1, 49.44], // Rouen
  [null, 641721, 7.26, 43.7], // Nice
  [null, 591135, 5.93, 43.12], // Toulon
  [null, 529468, 0.69, 47.39], // Tours
  [null, 510685, 3.08, 45.78], // Clermont-Ferrand
  [null, 507812, 6.18, 48.69], // Nancy
  [null, 503351, 4.39, 45.44], // Saint-Étienne
  [null, 488705, -0.37, 49.18], // Caen
  [null, 463435, 1.9, 47.9], // Orléans
]
const RMAX = 26
const rayon = p => RMAX * Math.sqrt(p / AIRES[0][1])

// Placement des noms : [dx, dy, ancre] par rapport au bord du cercle.
const NOMS = {
  Paris: [1, -1, 'r'], Lyon: [1, 0, 'r'], 'Marseille-Aix': [0, 1, 'b'], Lille: [1, 0, 'r'],
  Toulouse: [0, 1, 'b'], Bordeaux: [-1, 0, 'l'], Nantes: [-1, 0, 'l'], Strasbourg: [0, -1, 't'],
  Montpellier: [0, -1, 't'], Rennes: [-1, 0, 'l'],
}
const nom = ([n, p, lo, la]) => {
  const [x, y] = f.xy(lo, la)
  const r = rayon(p)
  const [, , k] = NOMS[n]
  if (k === 'r') return texte(x + r + 4, y + 4, n)
  if (k === 'l') return texte(x - r - 4, y + 4 , n, 'text-anchor="end"')
  if (k === 'b') return texte(x, y + r + 13, n, 'text-anchor="middle"')
  return texte(x, y - r - 5, n, 'text-anchor="middle"')
}

const CLAIR = '#EAE8F2'
const cercle = ([, p, lo, la], i) => {
  const [x, y] = f.xy(lo, la)
  return `<circle cx="${x}" cy="${y}" r="${r1(rayon(p))}"${i === 0 ? ` fill="${C.accent}"` : ''}/>`
}

// ---- Légende
const yL = MY + f.hauteur + 22
const L = []
L.push(titrePartie(12, yL, "Population de l'aire d'attraction en 2023"))
// Trois cercles de référence côte à côte, posés sur une même ligne de base.
const base = yL + 12 + 2 * RMAX
const ECH = [[13e6, '13 millions', 42], [2e6, '2 millions', 132], [5e5, '500 000', 210]]
ECH.forEach(([p, t, cx]) => {
  const r = rayon(p)
  L.push(`<circle cx="${cx}" cy="${r1(base - r)}" r="${r1(r)}" fill="none" stroke="${C.encre}" stroke-width="1.25"/>`)
  L.push(texte(cx, base + 16, t, 'text-anchor="middle"'))
})
const y2 = base + 44
L.push(titrePartie(12, y2, 'La hiérarchie urbaine'))
const it = [y2 + 22, y2 + 43, y2 + 64]
L.push(`<circle cx="27" cy="${it[0] - 4}" r="7" fill="${C.accent}"/>`)
L.push(`<circle cx="27" cy="${it[1] - 4}" r="7" fill="${CLAIR}" stroke="${C.encre}" stroke-width="1.25"/>`)
L.push(`<circle cx="27" cy="${it[2] - 4}" r="4.5" fill="${CLAIR}" stroke="${C.encre}" stroke-width="1.25"/>`)
const T = [
  intitule(50, it[0], 'Paris, ville mondiale (macrocéphalie)'),
  intitule(50, it[1], 'Métropole régionale'),
  intitule(50, it[2], "Autre grande aire d'attraction"),
]
const H = it[2] + 12

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" font-family="${FONT}">
<!-- Les 20 aires d'attraction des villes les plus peuplées de France métropolitaine en 2023 (INSEE, zonage 2020), cercles proportionnels. Réviz, 3e géographie, les aires urbaines. Généré par scripts/illustrations/cartes/aires-attraction-villes-france.mjs -->
${fond.contour}
${fond.blanc}
<g fill="${CLAIR}" stroke="${C.encre}" stroke-width="1.25">
${AIRES.map(cercle).join('')}
</g>
<g font-size="11.5" font-weight="600" fill="${C.encre}">
<g ${HALO}>
${AIRES.filter(a => a[0]).map(nom).join('')}
</g>
${L.join('\n')}
${T.join('\n')}
</g>
</svg>
`
ecrireSvg('aires-attraction-villes-france', svg)
