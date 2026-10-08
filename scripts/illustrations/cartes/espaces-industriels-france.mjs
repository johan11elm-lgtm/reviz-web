// -------------------------------------------------------
// Réviz — 3e géographie, « Les espaces productifs industriels et leurs évolutions ».
// Carte des espaces industriels : régions industrielles anciennes en difficulté
// (Nord, Lorraine), ZIP (Dunkerque, Le Havre, Fos-sur-Mer), technopôle (Sophia
// Antipolis), métropoles qui attirent les industries de pointe (Toulouse,
// Bordeaux, Grenoble, Lyon), déplacement de l'industrie vers l'Ouest et le Sud.
// Tous les lieux sont nommés dans le chapitre (sections 2 à 4 et 6).
//
//   node scripts/illustrations/cartes/espaces-industriels-france.mjs
// -------------------------------------------------------
import { carteFrance } from '../carto.mjs'
import { C, FONT, HALO, compact, hachures, fleche, texte, intitule, titrePartie, ecrireSvg, r1, fondDepartements } from './_commun.mjs'

const W = 360
const MY = 12
const f = carteFrance({ x: 12, y: MY, largeur: 336 })
const fond = fondDepartements(f, { tol: 1, prec: 1 })
const CLAIR = '#FBE9DD' // aplat clair de l'accent

const DIFFICULTE = ['59', '62', '54', '57']
const rDif = fond.rings(DIFFICULTE)

const ZIP = [
  ['Dunkerque', 2.38, 51.03, -8, 4, 'end'],
  ['Le Havre', 0.11, 49.49, -8, 4, 'end'],
  ['Fos-sur-Mer', 4.94, 43.44, -2, 17, 'middle'],
]
const METROPOLES = [
  ['Toulouse', 1.44, 43.6, 8, 4, 'start'],
  ['Bordeaux', -0.58, 44.84, -8, 4, 'end'],
  ['Grenoble', 5.72, 45.19, 8, 5, 'start'],
  ['Lyon', 4.83, 45.76, -8, 1, 'end'],
]
const SOPHIA = ['Sophia Antipolis', 7.05, 43.62]
const REGIONS = [['Nord', 3.15, 50.35], ['Lorraine', 6.25, 48.75]]

const etoile = (x, y, R = 6.5, r = 2.7) => {
  let d = ''
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5
    const k = i % 2 ? r : R
    d += (i ? 'L' : 'M') + r1(x + k * Math.cos(a)) + ',' + r1(y + k * Math.sin(a))
  }
  return d + 'Z'
}
const carre = (x, y, c = 8) => `<rect x="${r1(x - c / 2)}" y="${r1(y - c / 2)}" width="${c}" height="${c}"/>`
const anc = a => (a !== 'start' ? `text-anchor="${a}"` : '')

// Déplacement de l'industrie du Nord-Est vers l'Ouest et le Sud : large flèche grise.
const a = f.xy(4.6, 48.45)
const b = f.xy(0.9, 45.55)
const ctrl = f.xy(1.6, 47.9)
const deplacement = fleche(a, ctrl, b, { couleur: C.grisTrait, epaisseur: 5, long: 13, large: 15 })

// ---- Légende
const yL = MY + f.hauteur + 22
const L = []
L.push(titrePartie(12, yL, 'Des espaces industriels en difficulté'))
const i0 = yL + 22
L.push(`<rect x="14" y="${i0 - 11}" width="26" height="14" fill="${CLAIR}" stroke="${C.encre}" stroke-width="0.75"/>`)
L.push(`<path d="${hachures([[[14, i0 - 11], [40, i0 - 11], [40, i0 + 3], [14, i0 + 3]]], { angle: -45, pas: 3.6 })}" stroke="${C.accent}" stroke-width="1"/>`)
const y2 = i0 + 30
L.push(titrePartie(12, y2, 'Des espaces industriels dynamiques'))
const it = [y2 + 22, y2 + 43, y2 + 64, y2 + 85]
L.push(`<circle cx="27" cy="${it[0] - 4}" r="4.5" fill="#FFFFFF" stroke="${C.encre}" stroke-width="1.75"/><circle cx="27" cy="${it[0] - 4}" r="1.6" fill="${C.encre}"/>`)
L.push(`<path d="${etoile(27, it[1] - 4.5)}" fill="${C.encre}"/>`)
L.push(`<g fill="${C.encre}">${carre(27, it[2] - 4)}</g>`)
L.push(fleche([14, it[3] + 2], [26, it[3] - 4], [42, it[3] - 1], { couleur: C.grisTrait, epaisseur: 5, long: 9, large: 11 }))
const T = [
  intitule(50, i0, 'Région industrielle ancienne en difficulté'),
  intitule(50, it[0], 'Métropole attirant les industries de pointe'),
  intitule(50, it[1], 'Technopôle'),
  intitule(50, it[2], 'Zone industrialo-portuaire (ZIP)'),
  intitule(50, it[3], ["Déplacement de l'industrie", "vers l'Ouest, le Sud et les littoraux"]),
]
const H = it[3] + 13 + 12

const xy = ([, lo, la]) => f.xy(lo, la)
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" font-family="${FONT}">
<!-- Espaces industriels de la France métropolitaine : régions en difficulté et espaces dynamiques. Réviz, 3e géographie, espaces productifs industriels. Généré par scripts/illustrations/cartes/espaces-industriels-france.mjs -->
${fond.contour}
${fond.blanc}
<path d="${compact(rDif, { prec: 1 })}" fill="${CLAIR}" stroke="${CLAIR}" stroke-width="1" stroke-linejoin="round"/>
<path d="${hachures(rDif, { angle: -45, pas: 3.6 })}" stroke="${C.accent}" stroke-width="1"/>
${deplacement}
<g fill="#FFFFFF" stroke="${C.encre}" stroke-width="1.75">${METROPOLES.map(m => { const [x, y] = xy(m); return `<circle cx="${x}" cy="${y}" r="4.5"/>` }).join('')}</g>
<g fill="${C.encre}">${METROPOLES.map(m => { const [x, y] = xy(m); return `<circle cx="${x}" cy="${y}" r="1.6"/>` }).join('')}
<g stroke="#FFFFFF" stroke-width="1">${ZIP.map(z => { const [x, y] = xy(z); return carre(x, y) }).join('')}
<path d="${etoile(...xy(SOPHIA))}"/></g></g>
<g font-size="11" font-weight="600" fill="${C.gris}" ${HALO}>
${REGIONS.map(([n, lo, la]) => { const [x, y] = f.xy(lo, la); return texte(x, y, n, 'text-anchor="middle"') }).join('')}
</g>
<g font-size="11.5" font-weight="600" fill="${C.encre}">
<g ${HALO}>
${(() => { const [x, y] = xy(SOPHIA); return `<text x="${r1(x - 14)}" y="${r1(y + 19)}">Sophia<tspan x="${r1(x - 14)}" dy="13">Antipolis</tspan></text>` })()}
${[...ZIP, ...METROPOLES].map(([n, lo, la, dx, dy, an]) => { const [x, y] = f.xy(lo, la); return texte(x + dx, y + dy, n, anc(an)) }).join('')}
</g>
${L.join('\n')}
${T.join('\n')}
</g>
</svg>
`
ecrireSvg('espaces-industriels-france', svg)
