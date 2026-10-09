// -------------------------------------------------------
// Réviz — 3e géographie, « Les espaces productifs agricoles ».
// Carte simplifiée des grandes régions agricoles françaises : grandes cultures
// du Bassin parisien (Beauce), élevage et lait de l'Ouest, fruits et légumes de
// la vallée du Rhône et du Sud-Est, vignobles réputés, port céréalier de Rouen.
// Régions dessinées par groupes de départements (simplification de manuel) ;
// lieux et spécialisations repris du chapitre (sections 1 et 3, méthode).
//
//   node scripts/illustrations/cartes/regions-agricoles-france.mjs
// -------------------------------------------------------
import { carteFrance } from '../carto.mjs'
import { C, FONT, HALO, anneaux, compact, hachures, semis, fleche, texte, intitule, titrePartie, ecrireSvg, r1, fondDepartements } from './_commun.mjs'

const W = 360
const MY = 12
const f = carteFrance({ x: 12, y: MY, largeur: 336 })

const fond = fondDepartements(f, { tol: 1, prec: 1 })
const rings = fond.rings
const rFrance = fond.deps.flatMap(d => d.rings)

// Groupes de départements (simplifiés).
const CEREALES = ['02', '10', '18', '27', '28', '36', '41', '45', '51', '60', '77', '78', '80', '89', '91', '95']
const ELEVAGE = ['14', '22', '29', '35', '44', '49', '50', '53', '56', '61', '85']
const FRUITS = ['07', '13', '26', '30', '84']
const JAUNE = '#F6E7B5' // grandes cultures : l'aplat principal (jaune des céréales, convention)

const rCer = rings(CEREALES)
const rElv = rings(ELEVAGE)
const rFru = rings(FRUITS)

// Vignobles réputés : ovales accent.
const VIGNES = [
  ['Bordelais', -0.35, 44.9, 9, 6, 'end', -12, 4],
  ['Champagne', 4.0, 49.1, 8, 5, 'start', 11, 4],
  ['Bourgogne', 4.75, 47.1, 6, 8, 'start', 9, 4],
]
const ovale = ([, lo, la, rx, ry]) => { const [x, y] = f.xy(lo, la); return `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}"/>` }

// Port céréalier et flux d'exportation : de la Beauce à Rouen, puis vers la mer.
const rouen = f.xy(1.1, 49.44)
const beauce = f.xy(1.55, 48.25)
const mer = f.xy(-0.7, 50.05)
const flux1 = fleche(beauce, [rouen[0] + 14, (beauce[1] + rouen[1]) / 2], [rouen[0] + 3, rouen[1] + 6], { couleur: C.encre, epaisseur: 1.75, long: 6, large: 6 })
const flux2 = fleche([rouen[0] - 5, rouen[1] - 2], [rouen[0] - 20, rouen[1] - 4], mer, { couleur: C.encre, epaisseur: 1.75, long: 6, large: 6 })

const PARIS = f.xy(2.35, 48.86)
const LIEUX = [
  // Régions : mentions secondaires. [nom, lon, lat, ancre]
  ['Beauce', 1.35, 48.0, 'middle'],
  ['Bretagne', -3.0, 48.0, 'middle'],
  ['Normandie', -0.45, 48.95, 'middle'],
  ['Vallée du Rhône', 4.95, 45.2, 'middle'],
]
const anc = a => (a !== 'start' ? `text-anchor="${a}"` : '')

// ---- Légende
const yL = MY + f.hauteur + 22
const L = []
L.push(titrePartie(12, yL, 'Des régions agricoles spécialisées'))
const it = [yL + 22, yL + 43, yL + 64, yL + 85]
const box = (y, fill, extra = '') => `<rect x="14" y="${y - 11}" width="26" height="14" fill="${fill}" stroke="${C.encre}" stroke-width="0.75"${extra}/>`
L.push(box(it[0], JAUNE))
L.push(box(it[1], '#FFFFFF'))
L.push(`<path d="${hachures([[[14, it[1] - 11], [40, it[1] - 11], [40, it[1] + 3], [14, it[1] + 3]]], { angle: 45, pas: 3.2 })}" stroke="${C.vert}" stroke-width="0.9"/>`)
L.push(box(it[2], '#FFFFFF'))
L.push(`<path d="${semis([[[14, it[2] - 11], [40, it[2] - 11], [40, it[2] + 3], [14, it[2] + 3]]], { pas: 4.4 })}" stroke="${C.encre}" stroke-width="1.7" stroke-linecap="round"/>`)
L.push(`<ellipse cx="27" cy="${it[3] - 4}" rx="9" ry="5.5" fill="${C.accent}" stroke="#FFFFFF" stroke-width="1"/>`)
const y2 = it[3] + 30
L.push(titrePartie(12, y2, 'Une agriculture ouverte sur le monde'))
const iu = [y2 + 22, y2 + 43]
L.push(`<rect x="23" y="${iu[0] - 8}" width="8" height="8" fill="${C.encre}"/>`)
L.push(fleche([14, iu[1] - 4], [27, iu[1] - 7], [40, iu[1] - 4], { couleur: C.encre, epaisseur: 1.75, long: 6, large: 6 }))
const T = [
  intitule(50, it[0], 'Grandes cultures céréalières'),
  intitule(50, it[1], 'Élevage et production laitière'),
  intitule(50, it[2], 'Fruits et légumes'),
  intitule(50, it[3], 'Vignoble réputé'),
  intitule(50, iu[0], 'Port céréalier'),
  intitule(50, iu[1], 'Exportation de céréales'),
]
const H = iu[1] + 12

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" font-family="${FONT}">
<!-- Grandes régions agricoles de la France métropolitaine (carte simplifiée). Réviz, 3e géographie, espaces productifs agricoles. Généré par scripts/illustrations/cartes/regions-agricoles-france.mjs -->
${fond.contour}
${fond.blanc}
<path d="${compact(rCer, { prec: 1 })}" fill="${JAUNE}" stroke="${JAUNE}" stroke-width="0.8" stroke-linejoin="round"/>
<path d="${hachures(rElv, { angle: 45, pas: 4 })}" stroke="${C.vert}" stroke-width="0.9"/>
<path d="${semis(rFru, { pas: 4.6 })}" stroke="${C.encre}" stroke-width="1.7" stroke-linecap="round"/>
<g fill="${C.accent}" stroke="#FFFFFF" stroke-width="1">${VIGNES.map(ovale).join('')}</g>
${flux1}${flux2}
<rect x="${r1(rouen[0] - 4)}" y="${r1(rouen[1] - 4)}" width="8" height="8" fill="${C.encre}" stroke="#FFFFFF" stroke-width="1"/>
<circle cx="${PARIS[0]}" cy="${PARIS[1]}" r="2.6" fill="${C.encre}" stroke="#FFFFFF" stroke-width="1"/>
<g font-size="11" font-weight="600" fill="${C.gris}" ${HALO}>
${LIEUX.map(([n, lo, la, a]) => { const [x, y] = f.xy(lo, la); return texte(x, y, n, anc(a)) }).join('')}
${VIGNES.map(([n, lo, la, , , a, dx, dy]) => { const [x, y] = f.xy(lo, la); return texte(x + dx, y + dy, n, anc(a)) }).join('')}
</g>
<g font-size="11.5" font-weight="600" fill="${C.encre}">
<g ${HALO}>
${texte(rouen[0] + 7, rouen[1] - 5, 'Rouen')}
${texte(PARIS[0] + 6, PARIS[1] + 4, 'Paris')}
</g>
${L.join('\n')}
${T.join('\n')}
</g>
</svg>
`
ecrireSvg('regions-agricoles-france', svg)
