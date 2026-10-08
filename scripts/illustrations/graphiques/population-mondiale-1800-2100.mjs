// -------------------------------------------------------
// Réviz — Courbe de la population mondiale de 1800 à 2100, partie projetée
// en pointillés. Figure commune à 5e géographie « La croissance de la
// population mondiale » et 6e géographie « Les dynamiques de la population mondiale ».
//
// Sources (fichiers téléchargés depuis GitHub le 8 octobre 2026, valeurs recopiées ci-dessous) :
// - 1800-1940 : Our World in Data, d'après HYDE 3.3 (2023) et Gapminder (2022),
//   colonne `population` de `World` dans owid/co2-data (owid-co2-data.csv).
// - 1950-2100 : ONU, World Population Prospects 2024 (variante moyenne à partir de 2024),
//   population au 1er juillet, fichier population/ddf--datapoints--population--by--world--time.csv
//   du dépôt open-numbers/ddf--unpop--world_population_prospects (reprise du WPP 2024 par Gapminder).
// Valeurs en milliards, arrondies au millième.
//
//   node scripts/illustrations/graphiques/population-mondiale-1800-2100.mjs
// -------------------------------------------------------
import { C, FONT, ecrireSvg, r1 } from '../cartes/_commun.mjs'
import { repere, point, etiquette, rappel } from './_geographie-5e-6e.mjs'

// OWID (HYDE 3.3, Gapminder)
const AVANT_1950 = [
  [1800, 0.983], [1810, 1.02], [1820, 1.09], [1830, 1.162], [1840, 1.22], [1850, 1.276], [1860, 1.298],
  [1870, 1.34], [1880, 1.415], [1890, 1.521], [1900, 1.627], [1910, 1.767], [1920, 1.895], [1930, 2.072], [1940, 2.292],
]
// ONU, WPP 2024 : estimations 1950-2023
const ESTIMATIONS = [
  [1950, 2.493], [1955, 2.74], [1960, 3.015], [1965, 3.335], [1970, 3.695], [1975, 4.071], [1980, 4.448],
  [1985, 4.869], [1990, 5.328], [1995, 5.759], [2000, 6.172], [2005, 6.587], [2010, 7.022], [2015, 7.47],
  [2020, 7.887], [2022, 8.021], [2023, 8.092],
]
// ONU, WPP 2024 : projections, variante moyenne (maximum 10,289 milliards en 2084)
const PROJECTIONS = [
  [2023, 8.092], [2025, 8.232], [2030, 8.569], [2035, 8.885], [2040, 9.177], [2045, 9.44], [2050, 9.664],
  [2055, 9.846], [2060, 9.989], [2065, 10.102], [2070, 10.189], [2075, 10.25], [2080, 10.283], [2084, 10.289],
  [2090, 10.272], [2095, 10.235], [2100, 10.18],
]

const W = 360
const H = 262
const R = repere({ x0: 40, x1: 334, y0: 34, y1: 224 }, [1800, 2100], [0, 11])
const { X, Y } = R

// Zone des projections (de 2023 à 2100), aplat très clair
const zone = `<rect x="${X(2023)}" y="${R.y0}" width="${r1(R.x1 - X(2023))}" height="${r1(R.y1 - R.y0)}" fill="#F4EBDD" opacity="0.7"/>`

const courbe = `<path d="${R.ligne([...AVANT_1950, ...ESTIMATIONS])}" fill="none" stroke="${C.accent}" stroke-width="2.25" stroke-linejoin="round" stroke-linecap="round"/>`
const projection = `<path d="${R.ligne(PROJECTIONS)}" fill="none" stroke="${C.accent}" stroke-width="2.25" stroke-dasharray="5 4" stroke-linejoin="round"/>`

// Repères du chapitre : 1 milliard vers 1800, 2,5 en 1950, 8 en 2022, environ 9,7 en 2050
const P = [[1800, 0.983], [1950, 2.493], [2022, 8.021], [2050, 9.664]]
const pts = P.map(([a, b]) => point(X(a), Y(b), C.encre)).join('')

const e1 = etiquette(X(1800) + 8, Y(3.9), ['1 milliard', '(1800)'])
const e2 = etiquette(X(1950) - 8, Y(2.493) - 14, ['2,5 milliards', '(1950)'], { ancre: 'end' })
const e3 = etiquette(X(2022) - 12, Y(8.75), ['8 milliards', '(2022)'], { ancre: 'end' })
const e4 = etiquette(X(2050) - 10, Y(9.664) - 9, '9,7 milliards (2050)', { ancre: 'end' })
const e5 = etiquette(X(2062), Y(4.6), ['Projection', 'de l’ONU'], { ancre: 'middle' })

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" font-family="${FONT}">
<!-- Courbe de la population mondiale de 1800 à 2100 (milliards d'habitants) : lente jusqu'en 1900, très raide après 1950, projections de l'ONU (WPP 2024, variante moyenne) en pointillés après 2023. Réviz, 5e géographie (croissance de la population mondiale) et 6e géographie (dynamiques de la population mondiale). Généré par scripts/illustrations/graphiques/population-mondiale-1800-2100.mjs -->
${zone}
${R.grille([1850, 1900, 1950, 2000, 2050, 2100], [2, 4, 6, 8, 10])}
${R.axes()}
${R.gradX([1800, 1850, 1900, 1950, 2000, 2050, 2100])}
${R.gradY([0, 2, 4, 6, 8, 10])}
<text x="${R.x0 + 10}" y="${R.y0 - 14}" font-size="11.5" font-weight="600" fill="${C.encre}">Habitants (milliards)</text>
${courbe}
${projection}
${pts}
<g font-size="11.5" font-weight="600" fill="${C.encre}">
${rappel([X(1800) + 12, e1.boite[1] + e1.boite[3]], [X(1800) + 2, Y(0.983) - 3])}
${e1.svg}
${e2.svg}
${e3.svg}
${e4.svg}
${e5.svg}
</g>
</svg>
`
ecrireSvg('population-mondiale-1800-2100', svg, 'communs')
