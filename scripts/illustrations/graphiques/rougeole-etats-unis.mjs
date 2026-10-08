// -------------------------------------------------------
// Réviz — Cas de rougeole déclarés chaque année aux États-Unis, 1950-2000, et introduction
// du vaccin (1963). 3e SVT, vaccination.
// Source : Project Tycho (Université de Pittsburgh), compilation des bulletins hebdomadaires
// de maladies à déclaration obligatoire des États-Unis (CDC, MMWR), licence CC BY 4.0 ; jeu de
// données « us_contagious_diseases » du paquet R dslabs (R. Irizarry), téléchargé le 2026-10-08 depuis
// https://raw.githubusercontent.com/rafalab/dslabs/master/data/us_contagious_diseases.rda
// Valeurs = somme des 50 États + district de Columbia, maladie « Measles », par année. Ces sommes
// des bulletins hebdomadaires sont un peu inférieures aux totaux annuels officiels du CDC
// (semaines manquantes) : l'ordre de grandeur et l'allure sont justes.
//   node scripts/illustrations/graphiques/rougeole-etats-unis.mjs
// -------------------------------------------------------
import { C, r1, document, ecrire, etiquette, mention } from '../svt/_svt.mjs'

const CAS = {
  1950: 301379, 1951: 502859, 1952: 588052, 1953: 433993, 1954: 686492, 1955: 529705, 1956: 616050,
  1957: 460821, 1958: 707368, 1959: 374503, 1960: 432221, 1961: 402551, 1962: 476141, 1963: 332057,
  1964: 431259, 1965: 264303, 1966: 201064, 1967: 59258, 1968: 22879, 1969: 24190, 1970: 45697,
  1971: 71878, 1972: 30121, 1973: 25657, 1974: 21072, 1975: 23845, 1976: 39001, 1977: 49654,
  1978: 26884, 1979: 12781, 1980: 13047, 1981: 2947, 1982: 1709, 1983: 1182, 1984: 2200, 1985: 2415,
  1986: 5725, 1987: 3192, 1988: 2851, 1989: 15227, 1990: 21734, 1991: 8122, 1992: 1840, 1993: 213,
  1994: 689, 1995: 212, 1996: 465, 1997: 533, 1998: 58, 1999: 61, 2000: 56,
}

const X0 = 62, X1 = 348, Y0 = 200, Y1 = 26, VMAX = 800000
const pasX = (X1 - X0) / 51
const x = an => X0 + (an - 1950) * pasX
const y = v => Y0 - (Y0 - Y1) * v / VMAX
let s = ''
for (let v = 0; v <= VMAX; v += 200000) {
  s += `<path d="M${X0},${r1(y(v))} H${X1}" stroke="${v ? C.violet : C.encre}" stroke-width="${v ? 1 : 1.75}"/>`
  s += `<text x="${X0 - 6}" y="${r1(y(v) + 4)}" text-anchor="end" font-size="11" font-weight="600" fill="${C.gris}">${v ? (v / 1000) + ' 000' : '0'}</text>`
}
for (const [an, v] of Object.entries(CAS)) {
  const a = Number(an)
  s += `<rect x="${r1(x(a) + 0.6)}" y="${r1(y(v))}" width="${r1(pasX - 1.2)}" height="${r1(Y0 - y(v))}" fill="${C.encre}"/>`
}
for (let an = 1950; an <= 2000; an += 10) {
  s += `<path d="M${r1(x(an) + pasX / 2)},${Y0} v4" stroke="${C.encre}" stroke-width="1.2"/>`
  s += `<text x="${r1(x(an) + pasX / 2)}" y="${Y0 + 17}" text-anchor="middle" font-size="11" font-weight="600" fill="${C.gris}">${an}</text>`
}
const xv = r1(x(1963))
s += `<path d="M${xv},${Y0} V${Y1 - 6}" stroke="${C.accent}" stroke-width="2.25" stroke-dasharray="5 3"/>`
s += mention(6, 14, 'cas déclarés par an')
const e = etiquette(xv + 6, Y1 + 4, ['Vaccin', '(1963)'])
s += `<g font-size="11.5" font-weight="600" fill="${C.accent}">${e.svg}</g>`

ecrire('3eme/svt/rougeole-etats-unis.svg', document(226,
  'Cas de rougeole déclarés par an aux États-Unis, 1950-2000, et introduction du vaccin en 1963. Données : Project Tycho (bulletins du CDC), via dslabs. Réviz, 3e SVT, vaccination.', s))
