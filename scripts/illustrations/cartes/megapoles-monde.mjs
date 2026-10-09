// -------------------------------------------------------
// Réviz — 4e géographie, « La croissance urbaine dans le monde ».
// Planisphère des mégapoles (agglomérations de plus de 10 millions
// d'habitants) en cercles proportionnels à leur population en 2020.
//
// Source des valeurs (lues dans le fichier téléchargé, pas de mémoire) :
// Nations unies, DESA, Division de la population, World Urbanization Prospects:
// The 2018 Revision, fichier POP/DB/WUP/Rev.2018/1/F12 (Population of Urban
// Agglomerations with 300,000 Inhabitants or More in 2018, 1950-2035,
// thousands), colonne 2020 (estimation-projection de la révision 2018), avec
// les coordonnées du même fichier. Licence CC BY 3.0 IGO. Copie du classeur
// original : dépôt GitHub mailbox4655/TheGreatGameGlobe, data/cities/ (Git LFS,
// empreinte SHA-256 2c411782…5aac vérifiée). 34 agglomérations dépassent
// 10 millions d'habitants en 2020.
// Fond : Natural Earth (domaine public).
//
//   node scripts/illustrations/cartes/megapoles-monde.mjs
// -------------------------------------------------------
import { C, FONT, HALO, titrePartie, ecrireSvg, r1 } from './_commun.mjs'
import { fondMonde, rayon } from './_geographie-3e-4e.mjs'

// [nom ONU, pays, longitude, latitude, population 2020 en milliers]
const AGGLOS = [
  ['Tokyo', 'Japan', 139.69, 35.69, 37393],
  ['Delhi', 'India', 77.22, 28.67, 30291],
  ['Shanghai', 'China', 121.46, 31.22, 27058],
  ['São Paulo', 'Brazil', -46.64, -23.55, 22043],
  ['Ciudad de México (Mexico City)', 'Mexico', -99.14, 19.43, 21782],
  ['Dhaka', 'Bangladesh', 90.41, 23.71, 21006],
  ['Al-Qahirah (Cairo)', 'Egypt', 31.24, 30.04, 20901],
  ['Beijing', 'China', 116.4, 39.91, 20463],
  ['Mumbai (Bombay)', 'India', 72.88, 19.07, 20411],
  ['Kinki M.M.A. (Osaka)', 'Japan', 135.55, 34.68, 19165],
  ['New York-Newark', 'United States of America', -74.0, 40.72, 18804],
  ['Karachi', 'Pakistan', 67.08, 24.91, 16094],
  ['Chongqing', 'China', 106.55, 29.56, 15872],
  ['Istanbul', 'Turkey', 28.95, 41.01, 15190],
  ['Buenos Aires', 'Argentina', -58.4, -34.61, 15154],
  ['Kolkata (Calcutta)', 'India', 88.36, 22.53, 14850],
  ['Lagos', 'Nigeria', 3.4, 6.45, 14368],
  ['Kinshasa', 'Democratic Republic of the Congo', 15.31, -4.33, 14342],
  ['Manila', 'Philippines', 120.98, 14.6, 13923],
  ['Tianjin', 'China', 117.19, 39.11, 13589],
  ['Rio de Janeiro', 'Brazil', -43.21, -22.9, 13458],
  ['Guangzhou, Guangdong', 'China', 113.26, 23.13, 13302],
  ['Lahore', 'Pakistan', 74.34, 31.55, 12642],
  ['Moskva (Moscow)', 'Russian Federation', 37.62, 55.75, 12538],
  ['Los Angeles-Long Beach-Santa Ana', 'United States of America', -118.24, 34.03, 12447],
  ['Shenzhen', 'China', 114.06, 22.54, 12357],
  ['Bangalore', 'India', 77.59, 12.97, 12327],
  ['Paris', 'France', 2.35, 48.85, 11017],
  ['Bogotá', 'Colombia', -74.08, 4.61, 10978],
  ['Chennai (Madras)', 'India', 80.25, 13.05, 10971],
  ['Jakarta', 'Indonesia', 106.84, -6.21, 10770],
  ['Lima', 'Peru', -77.03, -12.04, 10719],
  ['Krung Thep (Bangkok)', 'Thailand', 100.53, 13.72, 10539],
  ['Hyderabad', 'India', 78.47, 17.38, 10004],
]

const W = 360
const f = fondMonde({ x: 4, y: 6, largeur: 352 }, { sud: -56, nord: 78 })
const xy = f.m.xy
const REF = 37393
const RREF = 11.5
const r = v => rayon(v, REF, RREF)

const cercles = AGGLOS.slice().sort((a, b) => b[4] - a[4])
  .map(([, , lo, la, v]) => { const [x, y] = xy(lo, la); return `<circle cx="${x}" cy="${y}" r="${r(v)}"/>` }).join('')

// Noms (ceux du chapitre, plus quelques repères) : [nom affiché, nom ONU, dx, dy, ancre]
const NOMS = [
  ['Tokyo', 'Tokyo', 13, 4, 'start'],
  ['Delhi', 'Delhi', -2, -12, 'middle'],
  ['Shanghai', 'Shanghai', 10, 12, 'start'],
  ['Mumbai', 'Mumbai (Bombay)', -9, 9, 'end'],
  ['São Paulo', 'São Paulo', 10, 4, 'start'],
  ['Mexico', 'Ciudad de México (Mexico City)', -10, 8, 'end'],
  ['Le Caire', 'Al-Qahirah (Cairo)', -9, 12, 'end'],
  ['Lagos', 'Lagos', -7, 12, 'end'],
  ['New York', 'New York-Newark', -2, -12, 'middle'],
  ['Paris', 'Paris', -8, -3, 'end'],
]
const noms = NOMS.map(([n, onu, dx, dy, a]) => {
  const c = AGGLOS.find(g => g[0] === onu)
  const [x, y] = xy(c[2], c[3])
  return `<text x="${r1(x + dx)}" y="${r1(y + dy)}"${a !== 'start' ? ` text-anchor="${a}"` : ''}>${n}</text>`
}).join('')

// ---- Légende : cercles emboîtés (10, 20, 35 millions)
const yL = 6 + f.hauteur + 22
const L = [titrePartie(12, yL, 'Population des mégapoles en 2020')]
const base = yL + 40
const VALS = [10000, 20000, 35000]
VALS.forEach((v, i) => {
  const cx = 22 + i * 42
  const rr = r(v)
  L.push(`<circle cx="${cx}" cy="${r1(base - 10 - rr)}" r="${rr}" fill="${C.accent}" fill-opacity="0.75" stroke="#FFFFFF" stroke-width="0.8"/>`)
  L.push(`<text x="${cx}" y="${base + 4}" text-anchor="middle">${v / 1000}</text>`)
})
L.push(`<text x="${22 + 2 * 42 + 18}" y="${base + 4}" font-size="11" fill="${C.gris}">millions d'hab.</text>`)

const H = base + 12

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" font-family="${FONT}">
<!-- Planisphère des 34 mégapoles (plus de 10 millions d'habitants) en 2020, cercles proportionnels à la population. Source : ONU, World Urbanization Prospects 2018 (F12). Réviz, 4e géographie, la croissance urbaine dans le monde. Généré par scripts/illustrations/cartes/megapoles-monde.mjs -->
${f.svg}
<g fill="${C.accent}" fill-opacity="0.75" stroke="#FFFFFF" stroke-width="0.8">${cercles}</g>
<g font-size="11.5" font-weight="600" fill="${C.encre}">
<g ${HALO}>${noms}</g>
${L.join('\n')}
</g>
</svg>
`
ecrireSvg('megapoles-monde', svg, '4eme/geographie')
