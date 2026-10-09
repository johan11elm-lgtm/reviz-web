// -------------------------------------------------------
// Réviz — 3e SVT, « Activités humaines et changement climatique ».
// Deux courbes l'une au-dessus de l'autre, sur le même axe des temps (1850-2024) :
// concentration de l'air en CO₂ (ppm) et écart de la température moyenne
// mondiale à la moyenne 1850-1900 (°C), avec la moyenne 2015-2024.
// Données (recopiées dans ./donnees-climat.mjs, sources détaillées en tête de ce fichier) :
// CO₂ : carotte de glace de Law Dome (1850-1955, Etheridge et al. 1998) puis Mauna Loa
// (NOAA GML / Scripps, 1959-2024) ; température : HadCRUT5 5.1.0.0 (Met Office / CRU).
//
//   node scripts/illustrations/graphiques/co2-et-temperature-1850-2024.mjs
// -------------------------------------------------------
import { C, FONT, ecrireSvg, r1 } from '../cartes/_commun.mjs'
import { repere, point, etiquette, rappel } from './_geographie-5e-6e.mjs'
import { TEMPERATURE, CO2_GLACE, CO2_MAUNA_LOA } from './donnees-climat.mjs'

const W = 360
const H = 352
const DX = [1850, 2025]
const A = repere({ x0: 46, x1: 336, y0: 30, y1: 150 }, DX, [270, 435])
const B = repere({ x0: 46, x1: 336, y0: 198, y1: 314 }, DX, [-0.5, 1.75])
const fmtT = v => (v > 0 ? '+' : v < 0 ? '−' : '') + String(Math.abs(v)).replace('.', ',')

const CO2 = [...CO2_GLACE, ...CO2_MAUNA_LOA]
const co2 = `<path d="${A.ligne(CO2)}" fill="none" stroke="${C.encre}" stroke-width="2.25" stroke-linejoin="round"/>`
const temp = `<path d="${B.ligne(TEMPERATURE)}" fill="none" stroke="${C.accent}" stroke-width="1.75" stroke-linejoin="round"/>`
const zero = `<path d="M${B.x0},${B.Y(0)}H${B.x1}" stroke="${C.encre}" stroke-width="1.25" stroke-dasharray="4 3" fill="none"/>`

// Moyenne 2015-2024 (HadCRUT5, recalée sur 1850-1900) : 1,26 °C
const moy = TEMPERATURE.filter(([a]) => a >= 2015 && a <= 2024).reduce((s, [, v]) => s + v, 0) / 10
const segMoy = `<path d="M${B.X(2015)},${B.Y(moy)}H${B.X(2024)}" stroke="${C.encre}" stroke-width="3" stroke-linecap="round"/>`

const c0 = CO2[0]
const c1 = CO2[CO2.length - 1]
const e1 = etiquette(A.X(1850) + 8, A.Y(c0[1]) - 26, '285 ppm (1850)')
const e2 = etiquette(A.X(2011), A.Y(c1[1]) + 4, ['425 ppm', '(2024)'], { ancre: 'end' })
const eZ = etiquette(B.X(1950), B.Y(0) + 23, 'Moyenne 1850-1900')
const eM = etiquette(B.X(2010) - 2, B.Y(1.62), ['Moyenne 2015-2024 :', '+1,3 °C'], { ancre: 'end' })

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" font-family="${FONT}">
<!-- Deux courbes sur le même axe des temps, 1850-2024 : en haut, la concentration de l'air en CO₂ (de 285 ppm en 1850 à 425 ppm en 2024 ; Law Dome puis Mauna Loa) ; en bas, l'écart de température moyenne mondiale à 1850-1900 (HadCRUT5), qui monte de 0 à environ +1,3 °C en moyenne sur 2015-2024. Réviz, 3e SVT, changement climatique. Généré par scripts/illustrations/graphiques/co2-et-temperature-1850-2024.mjs -->
${A.grille([1900, 1950, 2000], [300, 350, 400])}
${B.grille([1900, 1950, 2000], [-0.5, 0.5, 1, 1.5])}
${A.axes()}
${B.axes()}
${A.gradY([300, 350, 400])}
${B.gradY([-0.5, 0, 0.5, 1, 1.5], fmtT)}
${B.gradX([1850, 1900, 1950, 2000])}
<path d="${[1900, 1950, 2000].map(v => `M${A.X(v)},${A.y1}v4`).join('')}M${A.x0},${A.y1}v4" stroke="${C.encre}" stroke-width="1.5"/>
<g font-size="11.5" font-weight="600" fill="${C.encre}">
<text x="${A.x0 + 10}" y="${A.y0 - 12}">CO₂ dans l’air (ppm)</text>
<text x="${B.x0 + 10}" y="${B.y0 - 12}">Écart de température (°C)</text>
</g>
${zero}
${co2}
${temp}
${segMoy}
${point(A.X(c0[0]), A.Y(c0[1]))}${point(A.X(c1[0]), A.Y(c1[1]))}
<g font-size="11.5" font-weight="600" fill="${C.encre}">
${rappel([e1.boite[0] + 10, e1.boite[1] + e1.boite[3]], [A.X(1850) + 2, A.Y(c0[1]) - 3])}
${e1.svg}
${e2.svg}
${rappel([eZ.boite[0], eZ.boite[1] + 7], [B.X(1935), B.Y(0)])}
${eZ.svg}
${rappel([eM.boite[0] + eM.boite[2], eM.boite[1] + eM.boite[3] - 4], [B.X(2016), r1(B.Y(moy))])}
${eM.svg}
</g>
</svg>
`
ecrireSvg('co2-et-temperature-1850-2024', svg, '3eme/svt')
