// -------------------------------------------------------
// Réviz — 5e géographie, « Nourrir l'humanité ».
// Graphique en indices (base 100 en 1961) : population mondiale et production
// agricole mondiale, 1961-2022. En 2022 : population 262, production 390.
//
// Sources (fichiers téléchargés depuis GitHub le 8 octobre 2026, valeurs recopiées ci-dessous) :
// - Population : ONU, World Population Prospects 2024, population mondiale au 1er juillet
//   (milliards), dépôt open-numbers/ddf--unpop--world_population_prospects,
//   population/ddf--datapoints--population--by--world--time.csv.
// - Production agricole : FAO, FAOSTAT, indices de production (domaine QI), « Agriculture,
//   indice de production brute (2014-2016 = 100) », Monde (code 5000), dépôt
//   open-numbers/ddf--unfao--faostat (version de juillet 2025),
//   datapoints/QI/ddf--datapoints--qi_agriculture_gross_production_index_number_2014_2016_100--by--geo--year.csv.
// Les deux séries sont ramenées à 100 en 1961 (valeur ÷ valeur de 1961 × 100).
//
//   node scripts/illustrations/graphiques/population-et-production-agricole-1961-2022.mjs
// -------------------------------------------------------
import { C, FONT, ecrireSvg, r1 } from '../cartes/_commun.mjs'
import { repere, point, etiquette, rappel } from './_geographie-5e-6e.mjs'

// ONU WPP 2024, milliards d'habitants
const POPULATION = [[1961, 3.065], [1962, 3.123], [1963, 3.193], [1964, 3.264], [1965, 3.335], [1966, 3.404], [1967, 3.473], [1968, 3.545], [1969, 3.619], [1970, 3.695], [1971, 3.77], [1972, 3.845], [1973, 3.921], [1974, 3.996], [1975, 4.071], [1976, 4.144], [1977, 4.218], [1978, 4.292], [1979, 4.369], [1980, 4.448], [1981, 4.529], [1982, 4.613], [1983, 4.697], [1984, 4.782], [1985, 4.869], [1986, 4.958], [1987, 5.05], [1988, 5.142], [1989, 5.234], [1990, 5.328], [1991, 5.419], [1992, 5.506], [1993, 5.592], [1994, 5.676], [1995, 5.759], [1996, 5.842], [1997, 5.925], [1998, 6.007], [1999, 6.089], [2000, 6.172], [2001, 6.255], [2002, 6.338], [2003, 6.42], [2004, 6.503], [2005, 6.587], [2006, 6.671], [2007, 6.757], [2008, 6.844], [2009, 6.933], [2010, 7.022], [2011, 7.111], [2012, 7.201], [2013, 7.292], [2014, 7.382], [2015, 7.47], [2016, 7.559], [2017, 7.646], [2018, 7.73], [2019, 7.811], [2020, 7.887], [2021, 7.954], [2022, 8.021]]
// FAOSTAT, indice de production agricole brute, 2014-2016 = 100
const AGRICULTURE = [[1961, 28.75], [1962, 29.69], [1963, 30.46], [1964, 31.48], [1965, 32.13], [1966, 33.28], [1967, 34.5], [1968, 35.5], [1969, 35.67], [1970, 36.8], [1971, 37.7], [1972, 37.51], [1973, 39.66], [1974, 39.97], [1975, 40.7], [1976, 41.68], [1977, 42.7], [1978, 44.62], [1979, 45.15], [1980, 45.18], [1981, 46.68], [1982, 48.17], [1983, 48.37], [1984, 50.8], [1985, 51.72], [1986, 52.58], [1987, 53.18], [1988, 53.73], [1989, 55.58], [1990, 56.98], [1991, 56.63], [1992, 55.82], [1993, 56.67], [1994, 60.19], [1995, 61.35], [1996, 63.86], [1997, 65.25], [1998, 66.48], [1999, 68.63], [2000, 69.97], [2001, 71.01], [2002, 71.97], [2003, 73.75], [2004, 77.18], [2005, 78.64], [2006, 80.23], [2007, 82.43], [2008, 85.49], [2009, 86.21], [2010, 88.65], [2011, 91.98], [2012, 92.98], [2013, 96.61], [2014, 98.73], [2015, 99.94], [2016, 101.34], [2017, 104.05], [2018, 105.23], [2019, 106.36], [2020, 108.09], [2021, 110.84], [2022, 112.04]]

const indice = s => s.map(([a, v]) => [a, (v / s[0][1]) * 100])
const POP = indice(POPULATION)
const AGR = indice(AGRICULTURE)
const fin = s => s[s.length - 1]

const W = 360
const H = 256
const R = repere({ x0: 44, x1: 336, y0: 30, y1: 218 }, [1960, 2025], [0, 420])
const { X, Y } = R

const cP = `<path d="${R.ligne(POP)}" fill="none" stroke="${C.encre}" stroke-width="2.25" stroke-linejoin="round"/>`
const cA = `<path d="${R.ligne(AGR)}" fill="none" stroke="${C.accent}" stroke-width="2.25" stroke-linejoin="round"/>`
const base = `<path d="M${R.x0},${Y(100)}H${R.x1}" stroke="${C.encre}" stroke-width="1.25" stroke-dasharray="4 3" fill="none"/>`

const pA = fin(AGR)
const pP = fin(POP)
const eA = etiquette(X(1996), Y(330), ['Production', 'agricole'], { ancre: 'end' })
const eP = etiquette(X(2007), Y(140), 'Population')
const eAv = etiquette(X(2022) - 8, Y(pA[1]) - 12, '390', { ancre: 'end' })
const ePv = etiquette(X(2022) - 8, Y(pP[1]) - 11, '262', { ancre: 'end' })
const eB = etiquette(X(1964), Y(100) + 24, ['Base 100', 'en 1961'])

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" font-family="${FONT}">
<!-- Indices base 100 en 1961 de la population mondiale (ONU, WPP 2024) et de la production agricole mondiale (FAOSTAT, indice de production brute) de 1961 à 2022 : la production atteint 390, la population 262. Réviz, 5e géographie, nourrir l'humanité. Généré par scripts/illustrations/graphiques/population-et-production-agricole-1961-2022.mjs -->
${R.grille([1970, 1980, 1990, 2000, 2010, 2020], [100, 200, 300, 400])}
${R.axes()}
${R.gradX([1960, 1980, 2000, 2020])}
${R.gradY([0, 100, 200, 300, 400])}
<text x="${R.x0 + 10}" y="${R.y0 - 12}" font-size="11.5" font-weight="600" fill="${C.encre}">Indice (base 100 en 1961)</text>
${base}
${cP}
${cA}
${point(X(pA[0]), Y(pA[1]), C.accent)}${point(X(pP[0]), Y(pP[1]), C.encre)}
<g font-size="11.5" font-weight="600" fill="${C.encre}">
${rappel([eA.boite[0] + eA.boite[2], eA.boite[1] + 20], [X(2003), Y(AGR.find(p => p[0] === 2003)[1])])}
${eA.svg}
${rappel([eP.boite[0] + 30, eP.boite[1]], [X(2011), Y(POP.find(p => p[0] === 2011)[1])])}
${eP.svg}
${eAv.svg}
${ePv.svg}
${rappel([eB.boite[0] + 8, eB.boite[1]], [X(1961), Y(100)])}
${eB.svg}
</g>
</svg>
`
ecrireSvg('population-et-production-agricole-1961-2022', svg, '5eme/geographie')
console.log('2022 :', r1(pA[1]), r1(pP[1]))
