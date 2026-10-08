// -------------------------------------------------------
// Réviz — 3e géographie, « L'Union européenne, un nouveau territoire de
// référence et d'appartenance ». Carte de l'Europe : les 27 États de l'UE,
// les 21 pays de la zone euro (hachures) et le contour de l'espace Schengen.
//
// Compositions vérifiées en octobre 2026 :
//  - Zone euro, 21 pays (Bulgarie depuis le 1er janvier 2026) : page « Pays qui
//    utilisent l'euro », european-union.europa.eu, mise à jour le 12/01/2026.
//  - Espace Schengen, 29 pays : 25 États de l'UE (tous sauf l'Irlande et Chypre)
//    + Islande, Liechtenstein, Norvège, Suisse. Commission européenne, page
//    « Schengen area » (home-affairs.ec.europa.eu) ; Bulgarie et Roumanie membres
//    à part entière depuis le 1er janvier 2025 ; Chypre applique une partie de
//    l'acquis mais les contrôles aux frontières intérieures n'y sont pas levés
//    (pas de décision du Conseil connue en octobre 2026).
//  Le Liechtenstein, trop petit à cette échelle, est absent du fond (il est
//  entouré par la Suisse et l'Autriche, toutes deux dans Schengen).
//
//   node scripts/illustrations/cartes/ue-zone-euro-schengen.mjs
// -------------------------------------------------------
import { carteEurope } from '../carto.mjs'
import { C, FONT, HALO, anneaux, compact, couperRect, hachures, texte, intitule, intituleFixe, titrePartie, ecrireSvg } from './_commun.mjs'

const EURO = ['AUT', 'BEL', 'BGR', 'HRV', 'CYP', 'EST', 'FIN', 'FRA', 'DEU', 'GRC', 'IRL', 'ITA', 'LVA', 'LTU', 'LUX', 'MLT', 'NLD', 'PRT', 'SVK', 'SVN', 'ESP']
const HORS_SCHENGEN_UE = ['IRL', 'CYP']
const SCHENGEN_HORS_UE = ['ISL', 'NOR', 'CHE'] // + Liechtenstein (absent du fond)

const W = 360
const e = carteEurope({ x: 12, y: 12, largeur: 336 })
const cadre = [12, 12, 348, 12 + e.hauteur]
const TOL = 0.9

const pays = e.pays(TOL)
  .map(p => ({ ...p, rings: couperRect(anneaux(p.d), cadre) }))
  .filter(p => p.rings.length)
const ue = pays.filter(p => p.ue)
console.log('UE :', ue.length, 'États ; zone euro :', pays.filter(p => EURO.includes(p.iso)).length)
const schengen = pays.filter(p => (p.ue && !HORS_SCHENGEN_UE.includes(p.iso)) || SCHENGEN_HORS_UE.includes(p.iso))
console.log('Schengen sur le fond :', schengen.length, '+ Liechtenstein = ', schengen.length + 1)
const autres = pays.filter(p => !schengen.includes(p))

const d = (list, aireMin = 1.5) => compact(list.flatMap(p => p.rings), { prec: 1, aireMin })
const UE_FILL = '#EAE8F2'
const HORS_FILL = '#F3F1EC'
const fill = p => (p.ue ? UE_FILL : HORS_FILL)

// Noms : les pays qui font la différence entre les trois ensembles.
const NOMS = [
  // [nom, lon, lat, ancre]
  ['Islande', -18.5, 64.9, 'middle'],
  ['Norvège', 8.6, 60.6, 'middle'],
  ['Suède', 15.6, 63.2, 'middle'],
  ['Irlande', -8.1, 53.15, 'middle'],
  ['Danemark', 9.1, 56.0, 'end'],
  ['Pologne', 19.3, 52.1, 'middle'],
  ['Tchéquie', 15.3, 49.8, 'middle'],
  ['Suisse', 8.2, 46.85, 'middle'],
  ['Hongrie', 21.2, 47.05, 'end'],
  ['Roumanie', 23.0, 45.55, 'start'],
  ['Chypre', 32.0, 34.75, 'end'],
]

// ---- Légende
const yL = 12 + e.hauteur + 22
const L = []
L.push(titrePartie(12, yL, "L'Union européenne"))
const a = [yL + 22, yL + 43]
L.push(`<rect x="14" y="${a[0] - 11}" width="26" height="14" fill="${UE_FILL}" stroke="${C.encre}" stroke-width="0.75"/>`)
L.push(`<rect x="14" y="${a[1] - 11}" width="26" height="14" fill="${HORS_FILL}" stroke="${C.encre}" stroke-width="0.75"/>`)
const y2 = a[1] + 30
L.push(titrePartie(12, y2, 'La zone euro'))
const b = y2 + 22
const boite = [[[14, b - 11], [40, b - 11], [40, b + 3], [14, b + 3]]]
L.push(`<rect x="14" y="${b - 11}" width="26" height="14" fill="${UE_FILL}" stroke="${C.encre}" stroke-width="0.75"/>`)
L.push(`<path d="${hachures(boite, { angle: 45, pas: 3.4 })}" stroke="${C.encre}" stroke-width="0.8"/>`)
const y3 = b + 30
L.push(titrePartie(12, y3, "L'espace Schengen"))
const c = y3 + 22
L.push(`<rect x="15" y="${c - 10}" width="24" height="12" fill="${UE_FILL}" stroke="${C.accent}" stroke-width="2.25"/>`)
const T = [
  intitule(50, a[0], "État membre de l'UE (27)"),
  intituleFixe(50, a[1], "État hors de l'UE"),
  intitule(50, b, 'Pays de la zone euro (21)'),
  intitule(50, c, 'Espace Schengen (29 pays)'),
]
const H = c + 12

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" font-family="${FONT}">
<!-- L'Union européenne à 27, la zone euro (21 pays, 2026) et l'espace Schengen (29 pays). Réviz, 3e géographie, l'UE territoire de référence. Généré par scripts/illustrations/cartes/ue-zone-euro-schengen.mjs -->
<path d="${d(autres.filter(p => !p.ue))}" fill="${HORS_FILL}" stroke="${C.grisTrait}" stroke-width="0.6" stroke-linejoin="round"/>
<path d="${d(autres.filter(p => p.ue))}" fill="${UE_FILL}" stroke="${C.encre}" stroke-width="0.6" stroke-linejoin="round"/>
<path d="${d(schengen, 6)}" fill="none" stroke="${C.accent}" stroke-width="4.5" stroke-linejoin="round"/>
<path d="${d(schengen.filter(p => !p.ue))}" fill="${HORS_FILL}" stroke="${C.grisTrait}" stroke-width="0.6" stroke-linejoin="round"/>
<path d="${d(schengen.filter(p => p.ue))}" fill="${UE_FILL}" stroke="${C.encre}" stroke-width="0.6" stroke-linejoin="round"/>
<path d="${hachures(pays.filter(p => EURO.includes(p.iso)).flatMap(p => p.rings), { angle: 45, pas: 3.4 })}" stroke="${C.encre}" stroke-width="0.8"/>
<rect x="${cadre[0]}" y="${cadre[1]}" width="${cadre[2] - cadre[0]}" height="${cadre[3] - cadre[1]}" fill="none" stroke="${C.grisTrait}" stroke-width="0.75"/>
<g font-size="11.5" font-weight="600" fill="${C.encre}">
<g ${HALO}>
${NOMS.map(([n, lo, la, an]) => { const [x, y] = e.xy(lo, la); return texte(x, y, n, an !== 'start' ? `text-anchor="${an}"` : '') }).join('')}
</g>
${L.join('\n')}
${T.join('\n')}
</g>
</svg>
`
ecrireSvg('ue-zone-euro-schengen', svg)
