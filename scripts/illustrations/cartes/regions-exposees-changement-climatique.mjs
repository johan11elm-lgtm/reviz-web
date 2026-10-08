// -------------------------------------------------------
// Réviz — 5e géographie, « Les effets régionaux du changement climatique ».
// Planisphère des régions exposées, un figuré par type de menace, comme le
// demande la méthode du chapitre : sécheresse et désertification (Sahel, avec la
// Grande Muraille verte du Sénégal à Djibouti), montée des eaux (Bangladesh,
// Pays-Bas, Maldives, Tuvalu, Kiribati), recul des glaciers (Alpes, Himalaya,
// Andes), fonte de la banquise (Arctique).
// Figurés schématiques placés d'après le chapitre : bande du Sahel entre 10,5° et
// 19° N découpée sur les terres d'Afrique, banquise au-delà de 75° N, tracé de la
// Grande Muraille verte simplifié. Fond : Natural Earth 1:50m (domaine public), via carto.mjs.
//
//   node scripts/illustrations/cartes/regions-exposees-changement-climatique.mjs
// -------------------------------------------------------
import { C, FONT, compact, couperRect, hachures, ecrireSvg, r1, intitule, titrePartie } from './_commun.mjs'
import { fondMonde, nomMasquable, bordLeger, polyligne } from './_geographie-5e-6e.mjs'

const W = 360
const SUD = -58
const NORD = 84
const f = fondMonde({ x: 12, y: 12, largeur: 336 }, { sud: SUD, nord: NORD, tol: 1.1, aireMin: 2.5 })
const { m } = f
const xy = m.xy
const yCarte = r1(12 + m.hauteur)
const bord = bordLeger(m, SUD, NORD)

// Sahel : bande 10,5-19° N, de l'Atlantique à la mer Rouge, sur les terres seulement
const afrique = f.pays.filter(p => p.continent === 'Africa').flatMap(p => p.rings)
const [sx0, sy0] = xy(-18, 19)
const [sx1, sy1] = xy(40, 10.5)
const sahel = couperRect(afrique, [sx0, sy0, sx1, sy1])
const hSahel = hachures(sahel, { angle: 45, pas: 2.6 })

// Banquise arctique (schématique) : au-delà de 75° N, sur la mer
const [, yb] = xy(0, 75)
const [, yn] = xy(0, NORD)
const banquise = `<path d="M${xy(-180, 75)[0]},${yb}H${xy(180, 75)[0]}" stroke="${C.bleu}" stroke-width="1.25" stroke-dasharray="4 3" fill="none"/>`
const zoneBanquise = (() => {
  const pts = []
  for (let lo = -180; lo <= 180; lo += 6) pts.push(xy(lo, 75))
  for (let lo = 180; lo >= -180; lo -= 6) pts.push(xy(lo, NORD))
  return polyligne(pts) + 'z'
})()

// Grande Muraille verte : du Sénégal à Djibouti (tracé simplifié)
const gmv = polyligne([[-16.5, 15], [-8, 15.5], [0, 14.5], [8, 14], [16, 14.5], [24, 13.5], [32, 13], [38, 13], [43, 11.6]].map(([lo, la]) => xy(lo, la)))

// Montée des eaux : points bleus
const EAUX = [[90.3, 23.7], [5.3, 52.2], [73.5, 3.2], [179.2, -8.5], [173, 1.4]]
const eaux = EAUX.map(([lo, la]) => { const [x, y] = xy(lo, la); return `<circle cx="${x}" cy="${y}" r="3.6" fill="${C.bleu}" stroke="#FFFFFF" stroke-width="1"/>` }).join('')

// Recul des glaciers : triangles accent
const tri = (x, y) => `M${r1(x)},${r1(y - 4.5)}l4.5,7.5h-9z`
const GLACIERS = [[10, 46.3], [84, 29], [-70, -14], [-70, -33]]
const glaciers = GLACIERS.map(([lo, la]) => tri(...xy(lo, la))).join('')

// Noms : [lon, lat du texte, nom, lon, lat visés (trait de rappel) ou null, ancre]
const NOMS = [
  [-100, 66, 'Arctique', null, null, 'middle'],
  [-12, 22.5, 'Sahel', null, null, 'middle'],
  [-26, 57, 'Pays-Bas', 4, 52.4, 'middle'],
  [-14, 41, 'Alpes', 8.5, 45.5, 'end'],
  [74, 44, 'Himalaya', 83, 31, 'middle'],
  [122, 28, 'Bangladesh', 92, 24.5, 'middle'],
  [52, -12, 'Maldives', 72.5, 2, 'middle'],
  [160, 7, 'Kiribati', 171.5, 2.5, 'end'],
  [166, -19, 'Tuvalu', 178, -10, 'end'],
  [-104, -24, 'Andes', -73, -22, 'middle'],
]
const rappels = []
const noms = NOMS.map(([lo, la, s, lo2, la2, an]) => {
  const [x, y] = xy(lo, la)
  if (lo2 != null) {
    const [x2, y2] = xy(lo2, la2)
    const w = s.length * 6.3 + 4
    const bx = an === 'start' ? x - 2 : an === 'end' ? x + 2 : x2 > x ? x + w / 2 : x - w / 2
    const by = an === 'middle' ? y - 4 : y2 < y ? y - 11 : y - 4
    rappels.push(`M${r1(an === 'middle' ? bx : bx)},${r1(by)}L${r1(x2)},${r1(y2)}`)
  }
  return nomMasquable(x, y, s, { ancre: an })
}).join('\n')

// ---- Légende : les menaces, puis s'adapter
const yL = yCarte + 24
const L = [yL + 22, yL + 54, yL + 74, yL + 94]
const X2 = 190
const legHach = hachures([[[14, L[0] - 11], [40, L[0] - 11], [40, L[0] + 3], [14, L[0] + 3]]], { angle: 45, pas: 2.6 })
const legende = `${titrePartie(12, yL, 'Les menaces')}
<rect x="14" y="${L[0] - 11}" width="26" height="14" fill="#FFFFFF" stroke="${C.encre}" stroke-width="0.75"/>
<path d="${legHach}" stroke="${C.rouge}" stroke-width="1"/>
<circle cx="27" cy="${L[1] - 4}" r="3.6" fill="${C.bleu}"/>
<path d="${tri(27, L[2] - 3.5)}" fill="${C.accent}"/>
<rect x="14" y="${L[3] - 11}" width="26" height="12" fill="${C.bleuClair}"/>
<path d="M14,${L[3] + 1}h26" stroke="${C.bleu}" stroke-width="1.25" stroke-dasharray="4 3"/>
${titrePartie(X2, yL, 'S’adapter')}
<path d="M${X2 + 2},${L[0] - 4}h26" stroke="${C.vert}" stroke-width="2.25" stroke-linecap="round"/>
<g font-size="11.5" font-weight="600" fill="${C.encre}">
${intitule(48, L[0], ['Sécheresse,', 'désertification'])}
${intitule(48, L[1], 'Montée des eaux')}
${intitule(48, L[2], 'Recul des glaciers')}
${intitule(48, L[3], 'Fonte de la banquise')}
${intitule(X2 + 36, L[0], ['Grande Muraille', 'verte'])}
</g>`
const H = L[3] + 16

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" font-family="${FONT}">
<!-- Planisphère des régions exposées au changement climatique : sécheresse au Sahel (hachures rouges) et Grande Muraille verte (trait vert), montée des eaux au Bangladesh, aux Pays-Bas, aux Maldives, à Tuvalu et à Kiribati (points bleus), recul des glaciers des Alpes, de l'Himalaya et des Andes (triangles), fonte de la banquise arctique (bleu clair). Réviz, 5e géographie, les effets régionaux du changement climatique. Fond Natural Earth (domaine public). Généré par scripts/illustrations/cartes/regions-exposees-changement-climatique.mjs -->
<path d="${bord}" fill="${C.mer}"/>
<path d="${zoneBanquise}" fill="${C.bleuClair}"/>
${f.terresUnies(C.voisin, { trait: 1 })}
${banquise}
<path d="${hSahel}" stroke="${C.rouge}" stroke-width="1"/>
<path d="${gmv}" fill="none" stroke="${C.vert}" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"/>
<path d="${glaciers}" fill="${C.accent}" stroke="#FFFFFF" stroke-width="0.75"/>
${eaux}
<path d="${bord}" fill="none" stroke="${C.encre}" stroke-width="0.75"/>
<path d="${rappels.join('')}" stroke="${C.encre}" stroke-width="1" opacity="0.6" fill="none"/>
<g font-size="11.5" font-weight="600" fill="${C.encre}">
${noms}
</g>
${legende}
</svg>
`
ecrireSvg('regions-exposees-changement-climatique', svg, '5eme/geographie')
