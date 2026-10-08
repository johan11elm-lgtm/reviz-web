// -------------------------------------------------------
// Réviz — 5e géographie, « Le changement global et climatique ».
// Courbe de l'écart de la température moyenne mondiale par rapport à la
// moyenne 1850-1900, de 1850 à 2024 (valeurs annuelles), record en 2024.
// Données : Met Office Hadley Centre / CRU, HadCRUT5 (5.1.0.0), recopiées et
// recalées sur 1850-1900 dans ./donnees-climat.mjs (sources détaillées en tête de ce fichier).
//
//   node scripts/illustrations/graphiques/temperature-mondiale-1850-2024.mjs
// -------------------------------------------------------
import { C, FONT, ecrireSvg } from '../cartes/_commun.mjs'
import { repere, point, etiquette, rappel } from './_geographie-5e-6e.mjs'
import { TEMPERATURE } from './donnees-climat.mjs'

const W = 360
const H = 252
const R = repere({ x0: 44, x1: 336, y0: 32, y1: 214 }, [1850, 2025], [-0.5, 1.75])
const { X, Y } = R
const fmt = v => (v > 0 ? '+' : v < 0 ? '−' : '') + String(Math.abs(v)).replace('.', ',')

const zero = `<path d="M${R.x0},${Y(0)}H${R.x1}" stroke="${C.encre}" stroke-width="1.25" stroke-dasharray="4 3" fill="none"/>`
const courbe = `<path d="${R.ligne(TEMPERATURE)}" fill="none" stroke="${C.accent}" stroke-width="1.75" stroke-linejoin="round"/>`
const record = TEMPERATURE.find(([a]) => a === 2024)

const eZero = etiquette(X(1952), Y(0) + 23, 'Moyenne 1850-1900')
const eRec = etiquette(X(2024) - 14, Y(record[1]) + 2, ['2024 : record,', '+1,5 °C'], { ancre: 'end' })

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" font-family="${FONT}">
<!-- Écart de la température moyenne mondiale à la moyenne 1850-1900, valeurs annuelles 1850-2024 (HadCRUT5, Met Office) : autour de 0 jusqu'en 1910, hausse ensuite, très rapide depuis 1980, record de +1,5 °C en 2024. Réviz, 5e géographie, le changement global et climatique. Généré par scripts/illustrations/graphiques/temperature-mondiale-1850-2024.mjs -->
${R.grille([1900, 1950, 2000], [-0.5, 0.5, 1, 1.5])}
${R.axes()}
${R.gradX([1850, 1900, 1950, 2000])}
${R.gradY([-0.5, 0, 0.5, 1, 1.5], fmt)}
<text x="${R.x0 + 10}" y="${R.y0 - 14}" font-size="11.5" font-weight="600" fill="${C.encre}">Écart de température (°C)</text>
${zero}
${courbe}
${point(X(2024), Y(record[1]), C.encre)}
<g font-size="11.5" font-weight="600" fill="${C.encre}">
${rappel([eZero.boite[0], eZero.boite[1] + 7], [X(1935), Y(0)])}
${eZero.svg}
${eRec.svg}
</g>
</svg>
`
ecrireSvg('temperature-mondiale-1850-2024', svg, '5eme/geographie')
