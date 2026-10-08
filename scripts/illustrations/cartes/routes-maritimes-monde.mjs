// -------------------------------------------------------
// Réviz — 4e géographie, « Mers et océans : un monde maritimisé ».
// Planisphère des routes maritimes (méthode et section 3 du chapitre) :
// trois axes majeurs (Asie de l'Est-Europe, Asie-Amérique du Nord, Atlantique
// Nord), routes secondaires (Panama, cap de Bonne-Espérance, Amérique du Sud,
// golfe Persique) ; passages stratégiques numérotés : détroits (Pas-de-Calais,
// Gibraltar, Bab el-Mandeb, Ormuz, Malacca) et canaux (Suez, Panama) ; grands
// ports à conteneurs (Shanghai, Singapour, Ningbo, Shenzhen, Busan, Rotterdam)
// et la Northern Range.
// Carte schématique : tracés des routes simplifiés ; l'épaisseur distingue
// axes majeurs et secondaires sans mesurer le trafic, et les ports ne sont pas
// proportionnels à leur trafic (données de la CNUCED non consultables depuis
// la session). Fond : Natural Earth (domaine public).
//
//   node scripts/illustrations/cartes/routes-maritimes-monde.mjs
// -------------------------------------------------------
import { C, FONT, intitule, titrePartie, ecrireSvg, r1 } from './_commun.mjs'
import { fondMonde, lisse, rondNumero } from './_geographie-3e-4e.mjs'

const W = 360
const MY = 6
const f = fondMonde({ x: 4, y: MY, largeur: 352 }, { sud: -50, nord: 72 })
const xy = f.m.xy
const route = pts => lisse(pts.map(([lo, la]) => xy(lo, la)))

// Axes majeurs (lon, lat).
const MAJEURS = [
  // Asie de l'Est → Europe (Malacca, Bab el-Mandeb, Suez, Gibraltar, Pas-de-Calais)
  [[129, 34.5], [122.5, 30.5], [120.5, 24], [114, 16], [106, 5], [103.9, 1.2], [99, 4.2], [94, 6], [80, 5.2], [62, 12.5], [50, 12.4],
    [43.4, 12.6], [38.5, 20.5], [33.6, 27.5], [32.5, 30.5], [28, 33.4], [15, 36.2], [5, 37.6], [-5.6, 35.9], [-10, 37.5], [-10.5, 44], [-5.5, 48.8], [1.5, 50.6], [3.6, 51.9]],
  // Atlantique Nord
  [[-5.5, 48.8], [-30, 46.5], [-55, 42], [-73.6, 40.3]],
  // Pacifique (coupé par le bord du planisphère)
  [[122.5, 30.5], [140, 34], [160, 38], [180, 41]],
  [[-180, 41], [-155, 41], [-132, 37], [-118.4, 33.6]],
]
// Routes secondaires.
const SECONDAIRES = [
  // Panama : côte est des États-Unis → canal → Pacifique vers l'Asie
  [[-73.6, 40.3], [-74, 30], [-77, 20], [-79.6, 9.3], [-90, 7], [-120, 14], [-155, 22], [-180, 27]],
  [[180, 27], [155, 27], [135, 29], [122.5, 30.5]],
  // Cap de Bonne-Espérance
  [[80, 5.2], [65, -10], [40, -32], [20, -36.5], [5, -25], [-12, 0], [-20, 18], [-12, 33], [-5.6, 35.9]],
  // Europe → Amérique du Sud
  [[-10.5, 39], [-28, 15], [-34, -5], [-45, -25]],
  // Golfe Persique (Ormuz)
  [[50.5, 26.8], [56.4, 26.4], [59, 22.5], [62, 12.5]],
]

// Passages stratégiques : [n°, nom, lon, lat, canal ?, décalage du repère]
const PASSAGES = [
  [1, 'Pas-de-Calais', 1.5, 51, false, [-17, 1]],
  [2, 'Gibraltar', -5.6, 35.9, false, [-14, 5]],
  [3, 'Bab el-Mandeb', 43.4, 12.6, false, [-11, 6]],
  [4, 'Ormuz', 56.4, 26.4, false, [9, -8]],
  [5, 'Malacca', 99, 4.2, false, [-13, -8]],
  [6, 'Suez', 32.5, 30.5, true, [-4, -13]],
  [7, 'Panama', -79.6, 9.3, true, [-12, -2]],
]
let liens = ''
let reperes = ''
for (const [n, , lo, la, canal, [dx, dy]] of PASSAGES) {
  const [x, y] = xy(lo, la)
  liens += `M${x},${y}L${r1(x + dx)},${r1(y + dy)}`
  reperes += `<circle cx="${x}" cy="${y}" r="1.6" fill="${C.encre}"/>` + rondNumero(x + dx, y + dy, n, { forme: canal ? 'carre' : 'rond' })
}

// Grands ports à conteneurs, repérés par une lettre (classement du chapitre : Shanghai,
// Singapour, Ningbo, Shenzhen, Busan ; Rotterdam, premier port d'Europe).
// [lettre, nom, lon, lat, position du repère [x, y] absolue ou décalage]
const PORTS = [
  ['A', 'Shanghai', 121.8, 31.2, { abs: [318, 52] }],
  ['B', 'Singapour', 103.8, 1.3, { dec: [9, 12] }],
  ['C', 'Ningbo', 121.9, 29.9, { abs: [318, 67] }],
  ['D', 'Shenzhen', 114.1, 22.5, { abs: [318, 82] }],
  ['E', 'Busan', 129.0, 35.1, { abs: [318, 37] }],
  ['F', 'Rotterdam', 4.1, 51.95, { dec: [9, -10] }],
]
const lettre = (x, y, l) => `<circle cx="${r1(x)}" cy="${r1(y)}" r="7" fill="#FFFFFF" stroke="${C.encre}" stroke-width="1.5"/>` +
  `<text x="${r1(x)}" y="${r1(y + 3.6)}" text-anchor="middle" font-size="10" font-weight="700" fill="${C.encre}">${l}</text>`
let ports = ''
let rappels = ''
let lettres = ''
for (const [l, , lo, la, p] of PORTS) {
  const [x, y] = xy(lo, la)
  const [mx, my] = p.abs ?? [x + p.dec[0], y + p.dec[1]]
  ports += `<circle cx="${x}" cy="${y}" r="2.8"/>`
  rappels += `M${x},${y}L${r1(mx)},${r1(my)}`
  lettres += lettre(mx, my, l)
}

// Northern Range : trait épais le long de la côte, du Havre à Hambourg.
const NR = route([[0.1, 49.5], [1.6, 50.9], [3.2, 51.3], [4.3, 52.2], [4.8, 52.9], [6.9, 53.4], [8.3, 53.7], [9.9, 53.6]])

// ---- Légende
const yL = MY + f.hauteur + 22
const X2 = 200
const L = []
const T = []
L.push(titrePartie(12, yL, 'Les routes maritimes'))
const a = [yL + 22, yL + 43]
L.push(`<path d="M14,${a[0] - 4}H40" stroke="${C.accent}" stroke-width="4" stroke-linecap="round"/>`)
L.push(`<path d="M14,${a[1] - 4}H40" stroke="${C.accent}" stroke-width="1.5" stroke-linecap="round"/>`)
T.push(intitule(48, a[0], 'Axe majeur'), intitule(48, a[1], 'Route secondaire'))
const yP = a[1] + 30
L.push(titrePartie(12, yP, 'Les grands ports à conteneurs'))
PORTS.forEach(([l, nom], i) => {
  const y = yP + 22 + i * 19
  L.push(lettre(21, y - 4, l))
  T.push(intitule(34, y, nom))
})
const yF = yP + 22 + 5 * 19 + 21
L.push(`<path d="M12,${yF - 4}H30" stroke="${C.encre}" stroke-width="4" stroke-linecap="round"/>`)
T.push(intitule(38, yF, ['Façade maritime', '(Northern Range)']))
L.push(titrePartie(X2, yL, 'Les détroits'))
const det = PASSAGES.filter(q => !q[4])
const can = PASSAGES.filter(q => q[4])
det.forEach(([n, nom], i) => {
  const y = yL + 22 + i * 19
  L.push(rondNumero(X2 + 7, y - 4, n))
  T.push(intitule(X2 + 20, y, nom))
})
const yC = yL + 22 + (det.length - 1) * 19 + 30
L.push(titrePartie(X2, yC, 'Les canaux'))
can.forEach(([n, nom], i) => {
  const y = yC + 22 + i * 19
  L.push(rondNumero(X2 + 7, y - 4, n, { forme: 'carre' }))
  T.push(intitule(X2 + 20, y, nom))
})
const H = Math.max(yC + 22 + 19, yF + 13) + 12

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" font-family="${FONT}">
<!-- Planisphère des routes maritimes : axes majeurs Asie de l'Est-Europe, Asie-Amérique du Nord, Atlantique Nord ; routes secondaires ; détroits et canaux numérotés ; grands ports à conteneurs ; Northern Range. Carte schématique. Réviz, 4e géographie, mers et océans. Généré par scripts/illustrations/cartes/routes-maritimes-monde.mjs -->
${f.svg}
<path d="${SECONDAIRES.map(route).join('')}" fill="none" stroke="${C.accent}" stroke-width="1.5" stroke-linecap="round"/>
<path d="${MAJEURS.map(route).join('')}" fill="none" stroke="${C.accent}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
<path d="${NR}" fill="none" stroke="${C.encre}" stroke-width="4" stroke-linecap="round"/>
<g fill="${C.encre}" stroke="#FFFFFF" stroke-width="0.8">${ports}</g>
<path d="${liens}${rappels}" stroke="${C.encre}" stroke-width="1" opacity="0.7"/>
${reperes}
${lettres}
<g font-size="11.5" font-weight="600" fill="${C.encre}">
${L.join('\n')}
${T.join('\n')}
</g>
</svg>
`
ecrireSvg('routes-maritimes-monde', svg, '4eme/geographie')
