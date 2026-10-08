// -------------------------------------------------------
// Réviz — 6e histoire, « Les débuts de l'humanité ».
// Frise de la Préhistoire à l'échelle, en trois bandes : 7 millions d'années
// → aujourd'hui, puis zoom sur les 500 000 et les 50 000 dernières années.
// Dates (celles du chapitre) : Toumaï 7 Ma, Lucy 3,2 Ma, premiers outils 2,5 Ma,
// Homo erectus hors d'Afrique 2 Ma, feu vers 400 000 ans, Homo sapiens 300 000 ans,
// Chauvet 36 000 ans, Lascaux 18 000 ans, écriture vers 3300 av. J.-C. (≈ 5 300 ans).
// Positions calculées (linéaires dans chaque bande).
//
//   node scripts/illustrations/frise-prehistoire.mjs
// -------------------------------------------------------
import { C, doc, etiq, mention, rappel } from './cartes/_histoire.mjs'
import { ecrireSvg, r1 } from './cartes/_commun.mjs'

const W = 360
const X0 = 24
const X1 = 336
const H = 10 // épaisseur de la bande

function bande(y, duree, { debut, events, zoom }) {
  const x = age => r1(X0 + (X1 - X0) * (1 - age / duree))
  const out = []
  out.push(`<rect x="${X0}" y="${y}" width="${X1 - X0}" height="${H}" fill="${C.violet}" stroke="${C.encre}" stroke-width="1.75"/>`)
  if (zoom) out.push(`<rect x="${x(zoom)}" y="${y}" width="${r1(X1 - x(zoom))}" height="${H}" fill="#FBE9DD" stroke="${C.accent}" stroke-width="2.25"/>`)
  if (debut) out.push(mention(X0, y - 6, debut, { halo: false }))
  out.push(mention(X1, y - 6, "aujourd'hui", { ancre: 'end', halo: false }))
  for (const e of events) {
    const xe = x(e.age)
    const yl = e.ly
    const haut = yl < y
    // Ligne de base de la dernière ligne de texte → bord de la case.
    const bordY = haut ? yl + 13 * (e.lignes.length - 1) + 4 : yl - 11
    const lx = e.lx ?? xe
    out.push(etiq(lx, yl, e.lignes, { ancre: e.ancre ?? 'middle' }))
    out.push(rappel(e.rx ?? xe, bordY, xe, haut ? y - 1 : y + H + 1))
    out.push(`<circle cx="${xe}" cy="${y + H / 2}" r="2.6" fill="${C.encre}"/>`)
  }
  return { svg: out.join('\n'), x }
}

const Y1 = 84
const b1 = bande(Y1, 7e6, {
  debut: null,
  zoom: 5e5,
  events: [
    { age: 7e6, lignes: ['Toumaï', '7 millions'], ly: 36, ancre: 'start', lx: X0 + 3, rx: X0 + 1 },
    { age: 3.2e6, lignes: ['Lucy', '3,2 millions'], ly: 49, ancre: 'end', lx: 194, rx: 193 },
    { age: 2.5e6, lignes: ['Premiers outils', '2,5 millions'], ly: 19, ancre: 'end', lx: 227, rx: 224.6 },
    { age: 2e6, lignes: ['Homo erectus', "hors d'Afrique", '2 millions'], ly: 23, ancre: 'start', lx: 249, rx: 249 },
  ],
})

const Y2 = 150
const b2 = bande(Y2, 5e5, {
  debut: 'il y a 500 000 ans',
  zoom: 5e4,
  events: [
    { age: 4e5, lignes: ['Maîtrise du feu', 'vers 400 000 ans'], ly: Y2 + 34, ancre: 'middle' },
    { age: 3e5, lignes: ['Homo sapiens', '300 000 ans'], ly: Y2 + 34, ancre: 'start', lx: 152, rx: 152 },
  ],
})

const Y3 = 270
const b3 = bande(Y3, 5e4, {
  debut: 'il y a 50 000 ans',
  events: [
    { age: 36000, lignes: ['Chauvet', '36 000 ans'], ly: Y3 + 34, ancre: 'middle' },
    { age: 18000, lignes: ['Lascaux', '18 000 ans'], ly: Y3 + 34, ancre: 'middle' },
    { age: 5300, lignes: ['Écriture', 'vers 3300 av. J.-C.'], ly: Y3 + 74, ancre: 'end', lx: 336, rx: 307 },
  ],
})

// Zooms : l'extrémité d'une bande agrandie dans la bande suivante.
const zoom = (xa, ya, ym, yb) => `<path d="M${xa},${ya}V${ym}L${X0},${yb}H${X1}V${ya}Z" fill="${C.accent}" fill-opacity="0.07" stroke="${C.accent}" stroke-width="1" stroke-dasharray="3 3" stroke-opacity="0.7"/>`

const svg = doc(W, Y3 + 92,
  "Frise de la Préhistoire à l'échelle, en trois bandes (7 millions d'années, 500 000 ans, 50 000 ans jusqu'à aujourd'hui) : Toumaï, Lucy, premiers outils, Homo erectus, feu, Homo sapiens, Chauvet, Lascaux, écriture. Réviz, 6e histoire, les débuts de l'humanité. Généré par scripts/illustrations/frise-prehistoire.mjs",
  `${zoom(b1.x(5e5), Y1 + H + 2, Y1 + H + 12, Y2 - 20)}
${zoom(b2.x(5e4), Y2 + H + 2, Y2 + 70, Y3 - 20)}
<g font-size="11.5" font-weight="600" fill="${C.encre}">
${b1.svg}
${b2.svg}
${b3.svg}
</g>`)

ecrireSvg('frise-prehistoire', svg, '6eme/histoire')
