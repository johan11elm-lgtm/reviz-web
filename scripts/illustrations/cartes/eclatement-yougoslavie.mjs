// -------------------------------------------------------
// Réviz — 3e histoire, « Le monde après 1989 » (les guerres en ex-Yougoslavie).
// Carte de l'éclatement de la Yougoslavie (1991-1999) : États issus de la
// Yougoslavie avec leur date d'indépendance (Slovénie et Croatie 1991,
// Macédoine 1991, Bosnie-Herzégovine 1992, Monténégro 2006, Kosovo 2008),
// Serbie ; Sarajevo et Srebrenica ; principales zones de combats (Croatie
// 1991-1995, Bosnie 1992-1995, Kosovo 1998-1999).
//
// APPROXIMATIONS : fond Natural Earth 1:50m (domaine public), frontières actuelles ;
// les zones de combats sont des polygones SCHÉMATIQUES (Krajina et Slavonie en
// Croatie, toute la Bosnie-Herzégovine, tout le Kosovo).
//
//   node scripts/illustrations/cartes/eclatement-yougoslavie.mjs
// -------------------------------------------------------
import { carteZone } from '../carto.mjs'
import { C, doc, etiq, txt, mention, dc, ville, masque, rappel } from './_histoire.mjs'
import { ecrireSvg, couperRect, anneaux, hachures } from './_commun.mjs'

const W = 360
const z = carteZone({ x: 12, y: 12, largeur: 336 }, [[13.2, 46.9], [23.2, 46.9], [13.2, 40.7], [23.2, 40.7]], [18.2, 43.8])
const cadre = [12, 12, 348, 12 + z.hauteur]
const pays = z.pays(0.4).map(p => ({ ...p, rings: couperRect(anneaux(p.d), cadre) })).filter(p => p.rings.length)
const R = liste => pays.filter(p => liste.includes(p.unite)).flatMap(p => p.rings)
const P = z.xy

const EX = { SVN: ['SVN'], HRV: ['HRV'], BIH: ['BHF', 'BIS'], SRB: ['SRS', 'SRV'], MNE: ['MNE'], KOS: ['KOS'], MKD: ['MKD'] }
const exYougo = Object.values(EX).flat()
const YOU_F = C.violet

// Zones de combats (schématiques)
const combats = [
  ...R(EX.BIH),
  ...R(EX.KOS),
  ...masque(R(EX.HRV), [[15.0, 45.6], [16.6, 45.5], [16.9, 44.7], [16.4, 43.6], [15.6, 43.9], [14.9, 44.8]], P), // Krajina
  ...masque(R(EX.HRV), [[16.8, 45.2], [16.8, 45.75], [17.7, 45.75], [17.7, 45.2]], P), // Slavonie occidentale
  ...masque(R(EX.HRV), [[18.4, 45.0], [18.4, 45.9], [19.5, 45.9], [19.5, 45.0]], P), // Slavonie orientale (Vukovar)
]

const sarajevo = P(18.41, 43.86)
const srebrenica = P(19.30, 44.10)
const belgrade = P(20.46, 44.82)
const croix = ([x, y]) => `<path d="M${x - 4},${y - 4}l8,8m0,-8l-8,8" stroke="${C.accent}" stroke-width="2.6" stroke-linecap="round"/>`

const yL = cadre[3] + 22
const boite = y => [[[14, y - 10], [38, y - 10], [38, y + 3], [14, y + 3]]]
const svg = doc(W, yL + 50,
  "Carte de l'éclatement de la Yougoslavie (1991-1999) : nouveaux États et dates d'indépendance, Sarajevo, Srebrenica, zones de combats (schématiques). Réviz, 3e histoire, le monde après 1989. Généré par scripts/illustrations/cartes/eclatement-yougoslavie.mjs",
  `<rect x="${cadre[0]}" y="${cadre[1]}" width="${cadre[2] - cadre[0]}" height="${cadre[3] - cadre[1]}" fill="${C.mer}"/>
<path d="${dc(pays.filter(p => !exYougo.includes(p.unite)).flatMap(p => p.rings), 1, 0.5)}" fill="${C.voisin}" stroke="${C.voisinTrait}" stroke-width="0.8" stroke-linejoin="round"/>
${Object.values(EX).map(u => `<path d="${dc(R(u), 1, 0.5)}" fill="${YOU_F}" stroke="${C.encre}" stroke-width="2.4" stroke-linejoin="round" paint-order="stroke"/>`).join('\n')}
<path d="${hachures(combats, { angle: 45, pas: 4.2 })}" stroke="${C.accent}" stroke-width="1.1" opacity="0.8"/>
<rect x="${cadre[0]}" y="${cadre[1]}" width="${cadre[2] - cadre[0]}" height="${cadre[3] - cadre[1]}" fill="none" stroke="${C.grisTrait}" stroke-width="0.75"/>
${ville(...sarajevo, { r: 3 })}${ville(...belgrade, { r: 3 })}
${croix(srebrenica)}
<g font-size="11.5" font-weight="600" fill="${C.encre}">
${etiq(...P(14.75, 46.4), ['Slovénie', '1991'], { ancre: 'middle', fond: YOU_F })}
${etiq(...P(15.6, 45.15), ['Croatie', '1991'], { ancre: 'middle', fond: YOU_F })}
${etiq(...P(17.6, 44.55), ['Bosnie-', 'Herzégovine', '1992'], { ancre: 'middle', fond: YOU_F })}
${etiq(...P(21.15, 43.45), 'Serbie', { ancre: 'middle', fond: YOU_F })}
${etiq(...P(19.25, 42.8), ['Monté-', 'négro', '2006'], { ancre: 'middle', fond: YOU_F })}
${etiq(...P(21.0, 42.6), ['Kosovo', '2008'], { ancre: 'middle', fond: YOU_F })}
${etiq(...P(21.7, 41.45), ['Macédoine', '1991'], { ancre: 'middle', fond: YOU_F })}
${txt(sarajevo[0] + 3, sarajevo[1] + 14, 'Sarajevo', { ancre: 'middle' })}
${txt(srebrenica[0] + 7, srebrenica[1] - 5, 'Srebrenica')}
${txt(belgrade[0] + 5, belgrade[1] - 5, 'Belgrade')}
<rect x="14" y="${yL - 10}" width="24" height="13" fill="${YOU_F}" stroke="${C.encre}" stroke-width="1.2"/>
${txt(44, yL, 'États issus de la Yougoslavie (indépendance)', { halo: false })}
<rect x="14" y="${yL + 10}" width="24" height="13" fill="${YOU_F}"/>
<path d="${hachures(boite(yL + 20), { angle: 45, pas: 4.2 })}" stroke="${C.accent}" stroke-width="1.1" opacity="0.8"/>
${txt(44, yL + 20, 'principales zones de combats', { halo: false })}
${croix([26, yL + 36])}
${txt(44, yL + 40, 'massacre de Srebrenica (1995)', { halo: false })}
</g>
${mention(...P(15.2, 42.6), 'mer Adriatique', { ancre: 'middle' })}`)

ecrireSvg('eclatement-yougoslavie', svg, '3eme/histoire')
