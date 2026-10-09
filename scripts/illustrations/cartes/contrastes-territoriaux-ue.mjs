// -------------------------------------------------------
// Réviz — 3e géographie, « Les contrastes territoriaux et la politique de
// cohésion de l'Union européenne ». Croquis corrigé des contrastes de l'UE,
// comme le demande la méthode du chapitre : dorsale européenne (de Londres à
// Milan par Bruxelles, Amsterdam et la vallée du Rhin), périphéries intégrées,
// périphéries en rattrapage à l'Est (pays entrés en 2004-2007, et la Croatie)
// et au Sud (Portugal, sud de l'Italie, Grèce), RUP en encart, grandes
// métropoles, coopérations transfrontalières (Lille-Kortrijk-Tournai,
// Lorraine-Luxembourg). Royaume-Uni, Suisse et Norvège en gris (hors UE).
// Classement simplifié de manuel, par États (le sud de l'Italie est découpé à
// part), d'après le chapitre (section 2, méthode) et le cahier des charges.
//
//   node scripts/illustrations/cartes/contrastes-territoriaux-ue.mjs
// -------------------------------------------------------
import { carteEurope } from '../carto.mjs'
import { C, FONT, HALO, anneaux, compact, couperRect, couperDemiPlan, pointe, texte, intitule, intituleFixe, titrePartie, ecrireSvg, r1 } from './_commun.mjs'

const RATTRAPAGE = ['POL', 'CZE', 'SVK', 'HUN', 'ROU', 'BGR', 'EST', 'LVA', 'LTU', 'HRV', 'SVN', 'CYP', 'MLT', 'PRT', 'GRC']
const INTEGREE = '#DCD8EA'
const CLAIR = '#FBE9DD'
const HORS = '#F3F1EC'

const W = 360
const e = carteEurope({ x: 12, y: 12, largeur: 336 })
const cadre = [12, 12, 348, 12 + e.hauteur]
const pays = e.pays(0.9).map(p => ({ ...p, rings: couperRect(anneaux(p.d), cadre) })).filter(p => p.rings.length)
const d = (rings, aireMin = 1.5) => compact(rings, { prec: 1, aireMin })
const ue = pays.filter(p => p.ue)
const hors = pays.filter(p => !p.ue)
const ratt = ue.filter(p => RATTRAPAGE.includes(p.iso))
const integ = ue.filter(p => !RATTRAPAGE.includes(p.iso))
// Sud de l'Italie (Mezzogiorno, Sardaigne et Sicile) : sous une ligne de Rome à l'Adriatique.
const italie = pays.find(p => p.iso === 'ITA').rings
const sudItalie = couperDemiPlan(italie, e.xy(7.5, 42.1), e.xy(18.5, 41.3))

// Dorsale européenne : bande lissée autour d'un axe Londres → Milan.
function bande(axe, demi) {
  const P = axe.map(([lo, la]) => e.xy(lo, la))
  const g = []
  const dr = []
  P.forEach((p, i) => {
    const a = P[Math.max(0, i - 1)]
    const b = P[Math.min(P.length - 1, i + 1)]
    const dx = b[0] - a[0]
    const dy = b[1] - a[1]
    const l = Math.hypot(dx, dy)
    g.push([p[0] - (dy / l) * demi[i], p[1] + (dx / l) * demi[i]])
    dr.push([p[0] + (dy / l) * demi[i], p[1] - (dx / l) * demi[i]])
  })
  const pts = [...g, ...dr.reverse()]
  const m = (p, q) => `${r1((p[0] + q[0]) / 2)},${r1((p[1] + q[1]) / 2)}`
  let s = `M${m(pts[pts.length - 1], pts[0])}`
  for (let i = 0; i < pts.length; i++) s += `Q${r1(pts[i][0])},${r1(pts[i][1])} ${m(pts[i], pts[(i + 1) % pts.length])}`
  return s + 'Z'
}
const dorsale = bande(
  [[-1.6, 52.6], [0.2, 51.6], [4.4, 51.6], [6.9, 50.8], [8.4, 49.6], [8.0, 47.9], [9.2, 45.5]],
  [6, 8, 10, 10, 9, 8, 7],
)

// Grandes métropoles : [nom ou null, lon, lat, dx, dy, ancre]
const VILLES = [
  ['Londres', -0.13, 51.51, -6, 4, 'end'],
  ['Paris', 2.35, 48.86, 0, 15, 'middle'],
  ['Bruxelles', 4.35, 50.85, -6, 13, 'end'],
  ['Amsterdam', 4.9, 52.37, -6, -3, 'end'],
  ['Francfort', 8.68, 50.11, 6, 2, 'start'],
  ['Milan', 9.19, 45.46, 6, 9, 'start'],
  ['Madrid', -3.7, 40.42, 0, 14, 'middle'],
  ['Varsovie', 21.0, 52.23, 0, 14, 'middle'],
  [null, 12.5, 41.9], [null, 13.4, 52.52], [null, 16.37, 48.21], [null, 2.17, 41.39],
]
const anc = a => (a !== 'start' ? `text-anchor="${a}"` : '')

// Coopérations transfrontalières : double flèche courte à cheval sur la frontière.
function double([lo, la], l = 6) {
  const [x, y] = e.xy(lo, la)
  const a = [x - l, y]
  const b = [x + l, y]
  return `<path d="M${r1(a[0] + 3)},${r1(y)}H${r1(b[0] - 3)}" stroke="${C.encre}" stroke-width="1.75"/>` +
    pointe(b, a, { long: 4.5, large: 5 }) + pointe(a, b, { long: 4.5, large: 5 })
}
const TRANSFRONTALIER = [[3.2, 50.72], [6.1, 49.45]] // Lille-Kortrijk-Tournai ; Lorraine-Luxembourg

// Encart des régions ultrapériphériques (en haut à gauche, sur l'Atlantique nord).
const ENC = { x: 14, y: 14, w: 122, h: 66 }
const RUP = ['Antilles, Guyane', 'Réunion, Mayotte', 'Açores, Madère,', 'Canaries']
const encart = `<rect x="${ENC.x}" y="${ENC.y}" width="${ENC.w}" height="${ENC.h}" fill="#FFFFFF" stroke="${C.grisTrait}" stroke-width="0.75"/>` +
  `<g fill="${CLAIR}" stroke="${C.encre}" stroke-width="0.75">` +
  [0, 1, 2].map(i => `<rect x="${ENC.x + 7}" y="${ENC.y + 9 + i * 17}" width="9" height="9"/>`).join('') + '</g>' +
  `<g font-size="11" font-weight="600" fill="${C.gris}">` +
  `<text x="${ENC.x + 22}" y="${ENC.y + 17}">${RUP[0]}</text><text x="${ENC.x + 22}" y="${ENC.y + 34}">${RUP[1]}</text>` +
  `<text x="${ENC.x + 22}" y="${ENC.y + 51}">${RUP[2]}<tspan x="${ENC.x + 22}" dy="12">${RUP[3]}</tspan></text></g>`

// ---- Légende : centre, périphéries, dynamiques
const yL = 12 + e.hauteur + 22
const X2 = 180
const L = []
L.push(titrePartie(12, yL, 'Le centre'))
const a = [yL + 22, yL + 43]
L.push(`<rect x="14" y="${a[0] - 11}" width="26" height="14" rx="7" fill="${C.accent}" fill-opacity="0.5"/>`)
L.push(`<circle cx="27" cy="${a[1] - 4}" r="3" fill="${C.encre}" stroke="#FFFFFF" stroke-width="1"/>`)
L.push(titrePartie(X2, yL, 'Les dynamiques'))
const dl = (x, y) => `<path d="M${x + 4},${y}H${x + 22}" stroke="${C.encre}" stroke-width="1.75"/>` + pointe([x, y], [x + 26, y], { long: 5, large: 6 }) + pointe([x + 26, y], [x, y], { long: 5, large: 6 })
L.push(dl(X2 + 2, a[0] - 4))
const y2 = a[1] + 30
L.push(titrePartie(12, y2, 'Les périphéries'))
const b = [y2 + 22, y2 + 43, y2 + 64, y2 + 85]
const boite = (y, fill) => `<rect x="14" y="${y - 11}" width="26" height="14" fill="${fill}" stroke="${C.encre}" stroke-width="0.75"/>`
L.push(boite(b[0], INTEGREE))
L.push(boite(b[1], CLAIR))
L.push(`<rect x="22" y="${b[2] - 9}" width="9" height="9" fill="${CLAIR}" stroke="${C.encre}" stroke-width="0.75"/>`)
L.push(boite(b[3], HORS))
const T = [
  intitule(50, a[0], 'Dorsale européenne'),
  intitule(50, a[1], 'Grande métropole'),
  intitule(X2 + 36, a[0], ['Coopération', 'transfrontalière']),
  intitule(50, b[0], 'Périphérie intégrée'),
  intitule(50, b[1], "Périphérie en rattrapage (Est et Sud)"),
  intitule(50, b[2], 'Région ultrapériphérique (RUP), encart'),
  intituleFixe(50, b[3], "État hors de l'UE"),
]
const H = b[3] + 12

const xy = (lo, la) => e.xy(lo, la)
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" font-family="${FONT}">
<!-- Croquis des contrastes territoriaux de l'UE : dorsale, périphéries intégrées et en rattrapage, RUP, métropoles, coopérations transfrontalières. Réviz, 3e géographie, contrastes et cohésion dans l'UE. Généré par scripts/illustrations/cartes/contrastes-territoriaux-ue.mjs -->
<path d="${d(hors.flatMap(p => p.rings))}" fill="${HORS}" stroke="${C.grisTrait}" stroke-width="0.6" stroke-linejoin="round"/>
<path d="${d(integ.flatMap(p => p.rings))}" fill="${INTEGREE}" stroke="${C.encre}" stroke-width="0.6" stroke-linejoin="round"/>
<path d="${d(ratt.flatMap(p => p.rings))}" fill="${CLAIR}" stroke="${C.encre}" stroke-width="0.6" stroke-linejoin="round"/>
<path d="${d(sudItalie)}" fill="${CLAIR}" stroke="${C.encre}" stroke-width="0.6" stroke-linejoin="round"/>
<path d="${dorsale}" fill="${C.accent}" fill-opacity="0.5"/>
<rect x="${cadre[0]}" y="${cadre[1]}" width="${cadre[2] - cadre[0]}" height="${cadre[3] - cadre[1]}" fill="none" stroke="${C.grisTrait}" stroke-width="0.75"/>
${TRANSFRONTALIER.map(p => double(p)).join('')}
<g fill="${C.encre}" stroke="#FFFFFF" stroke-width="1">${VILLES.map(([, lo, la]) => { const [x, y] = xy(lo, la); return `<circle cx="${x}" cy="${y}" r="3"/>` }).join('')}</g>
${encart}
<g font-size="11.5" font-weight="600" fill="${C.encre}">
<g ${HALO}>
${VILLES.filter(v => v[0]).map(([n, lo, la, dx, dy, an]) => { const [x, y] = xy(lo, la); return texte(x + dx, y + dy, n, anc(an)) }).join('')}
</g>
${L.join('\n')}
${T.join('\n')}
</g>
</svg>
`
ecrireSvg('contrastes-territoriaux-ue', svg)
