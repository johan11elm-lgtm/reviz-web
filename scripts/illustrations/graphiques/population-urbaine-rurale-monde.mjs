// -------------------------------------------------------
// Réviz — 4e géographie, « La croissance urbaine dans le monde ».
// Courbes de la population urbaine et de la population rurale mondiales,
// 1950-2050, avec le croisement des deux courbes (fin des années 2000).
//
// Source des valeurs (lues dans les fichiers téléchargés, pas de mémoire) :
// Nations unies, DESA, Division de la population, World Urbanization Prospects:
// The 2018 Revision, fichiers POP/DB/WUP/Rev.2018/1/F03 (Urban Population at
// Mid-Year, 1950-2050, thousands) et F04 (Rural Population at Mid-Year), ligne
// WORLD. Licence CC BY 3.0 IGO. Copie des classeurs originaux : dépôt GitHub
// mailbox4655/TheGreatGameGlobe, data/cities/ (Git LFS).
// Valeurs en milliers d'habitants, tous les 5 ans ; à partir de 2020 ce sont
// des projections (tracées en tirets).
//
//   node scripts/illustrations/graphiques/population-urbaine-rurale-monde.mjs
// -------------------------------------------------------
import { C, FONT, ecrireSvg, r1, intitule } from '../cartes/_commun.mjs'

const ANNEES = [1950, 1955, 1960, 1965, 1970, 1975, 1980, 1985, 1990, 1995, 2000, 2005, 2010, 2015, 2020, 2025, 2030, 2035, 2040, 2045, 2050]
const URBAINE = [750903, 877009, 1023846, 1188469, 1354215, 1538625, 1754201, 2007939, 2290228, 2575505, 2868308, 3215906, 3594868, 3981498, 4378994, 4774646, 5167258, 5555833, 5938249, 6312545, 6679756]
const RURALE = [1785372, 1895234, 2009367, 2151123, 2346362, 2540462, 2704211, 2865843, 3040715, 3175969, 3276699, 3326254, 3363301, 3401511, 3416488, 3410967, 3383941, 3336868, 3272088, 3191665, 3092067]
const DERNIERE_ESTIMATION = 2015 // après : projections

const W = 360
const X0 = 46
const X1 = 340
const Y0 = 22
const Y1 = 214
const YMAX = 7 // milliards
const sx = a => r1(X0 + ((a - 1950) / 100) * (X1 - X0))
const sy = v => r1(Y1 - (v / 1e6 / YMAX) * (Y1 - Y0))

function courbe(vals) {
  const pts = ANNEES.map((a, i) => [sx(a), sy(vals[i])])
  const k = ANNEES.indexOf(DERNIERE_ESTIMATION)
  const plein = 'M' + pts.slice(0, k + 1).map(p => p.join(',')).join('L')
  const tirets = 'M' + pts.slice(k).map(p => p.join(',')).join('L')
  return { plein, tirets, pts }
}
const U = courbe(URBAINE)
const R = courbe(RURALE)

// Croisement : interpolation linéaire entre les deux dates qui l'encadrent.
let croix = null
for (let i = 0; i + 1 < ANNEES.length; i++) {
  const d0 = URBAINE[i] - RURALE[i]
  const d1 = URBAINE[i + 1] - RURALE[i + 1]
  if (d0 < 0 && d1 >= 0) {
    const t = -d0 / (d1 - d0)
    const a = ANNEES[i] + t * 5
    const v = URBAINE[i] + t * (URBAINE[i + 1] - URBAINE[i])
    croix = { a, v, x: sx(a), y: sy(v) }
  }
}
console.log('croisement interpolé :', croix.a.toFixed(1), (croix.v / 1e6).toFixed(2), 'milliards')

// Grille et axes
let grille = ''
let ytxt = ''
for (let m = 0; m <= YMAX; m++) {
  if (m > 0) grille += `M${X0},${sy(m * 1e6)}H${X1}`
  ytxt += `<text x="${X0 - 6}" y="${sy(m * 1e6) + 4}" text-anchor="end">${m}</text>`
}
let xtxt = ''
let ticks = ''
for (const a of [1950, 1975, 2000, 2025, 2050]) {
  xtxt += `<text x="${sx(a)}" y="${Y1 + 17}" text-anchor="middle">${a}</text>`
  ticks += `M${sx(a)},${Y1}v4`
}

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} 244" font-family="${FONT}">
<!-- Graphique : population urbaine et population rurale mondiales, 1950-2050 (milliards), croisement vers 2007. Source : ONU, World Urbanization Prospects 2018 (F03, F04). Réviz, 4e géographie, la croissance urbaine dans le monde. Généré par scripts/illustrations/graphiques/population-urbaine-rurale-monde.mjs -->
<rect x="${sx(DERNIERE_ESTIMATION)}" y="${Y0}" width="${r1(X1 - sx(DERNIERE_ESTIMATION))}" height="${Y1 - Y0}" fill="#F4F2F8"/>
<path d="${grille}" stroke="${C.violet}" stroke-width="1"/>
<path d="M${X0},${Y0 - 6}V${Y1}H${X1 + 4}${ticks}" fill="none" stroke="${C.encre}" stroke-width="1.75"/>
<path d="${R.plein}" fill="none" stroke="${C.encre}" stroke-width="2.25" stroke-linejoin="round"/>
<path d="${R.tirets}" fill="none" stroke="${C.encre}" stroke-width="2.25" stroke-dasharray="5 4"/>
<path d="${U.plein}" fill="none" stroke="${C.accent}" stroke-width="2.25" stroke-linejoin="round"/>
<path d="${U.tirets}" fill="none" stroke="${C.accent}" stroke-width="2.25" stroke-dasharray="5 4"/>
<circle cx="${croix.x}" cy="${croix.y}" r="5" fill="none" stroke="${C.encre}" stroke-width="1.75"/>
<path d="M${croix.x},${r1(croix.y + 5)}V${Y1}" stroke="${C.encre}" stroke-width="1" stroke-dasharray="2 2" opacity="0.6"/>
<g font-size="11" font-weight="600" fill="${C.gris}">
${ytxt}
${xtxt}
<text x="${X0 - 30}" y="${Y0 - 10}">milliards d'habitants</text>
<text x="${r1((sx(DERNIERE_ESTIMATION) + X1) / 2)}" y="${Y1 - 8}" text-anchor="middle">projections</text>
</g>
<g font-size="11.5" font-weight="600" fill="${C.encre}">
${intitule(sx(1952), sy(3.5e6), 'Population rurale')}
${intitule(sx(2003), sy(6.4e6), ['Population', 'urbaine'])}
${intitule(sx(1971), sy(4.9e6), ['Croisement', 'en 2007-2008'])}
<path d="M${r1(sx(1998))},${r1(sy(4.9e6) + 17)}L${r1(croix.x - 3.5)},${r1(croix.y - 3.5)}" stroke="${C.encre}" stroke-width="1" opacity="0.6"/>
<circle cx="${r1(croix.x - 3.5)}" cy="${r1(croix.y - 3.5)}" r="1.8" fill="${C.encre}" opacity="0.6"/>
</g>
</svg>
`
ecrireSvg('population-urbaine-rurale-monde', svg, '4eme/geographie')
