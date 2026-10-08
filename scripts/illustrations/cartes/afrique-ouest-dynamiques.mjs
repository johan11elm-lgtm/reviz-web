// -------------------------------------------------------
// Réviz — 4e géographie, « L'Afrique de l'Ouest dans la mondialisation ».
// Croquis corrigé des dynamiques de l'Afrique de l'Ouest (méthode du chapitre) :
// repères (océan Atlantique, golfe de Guinée, Sahara, pays) ; littoral
// dynamique du golfe de Guinée ; Sahel en difficulté (bande schématique entre
// environ 12,5° et 17° N, limitée aux terres) ; grandes villes et ports
// (Lagos, Abidjan, Accra, Lomé, Dakar) ; flèches d'exportation (pétrole,
// cacao, or) ; corridors des ports vers les capitales des pays enclavés
// (Bamako, Ouagadougou, Niamey). Légende en trois parties.
// Fond : Natural Earth (domaine public).
//
//   node scripts/illustrations/cartes/afrique-ouest-dynamiques.mjs
// -------------------------------------------------------
import { C, FONT, HALO, compact, hachures, fleche, intitule, titrePartie, ecrireSvg, r1 } from './_commun.mjs'
import { fondZone, lisse, MER, TERRE, TERRE_TRAIT } from './_geographie-3e-4e.mjs'

const W = 360
const MY = 12
const f = fondZone({ x: 12, y: MY, largeur: 336 }, [[-19.5, 2.5], [-19.5, 23.5], [15.5, 23.5], [15.5, 2.5], [-2, 1.5], [-2, 24.5]], [-2, 13])
const xy = f.z.xy
const [x0, y0, x1, y1] = f.R
const ligne = pts => lisse(pts.map(([lo, la]) => xy(lo, la)))

const OUEST = ['SEN', 'GMB', 'GNB', 'GIN', 'SLE', 'LBR', 'CIV', 'GHA', 'TGO', 'BEN', 'NGA', 'NER', 'BFA', 'MLI', 'MRT', 'CPV']
const terres = f.pays.filter(p => p.continent === 'Africa').flatMap(p => p.rings)

// Sahel : bande entre 12,5° et 17° N, hachurée, limitée aux terres.
const bande = []
for (let lo = -20; lo <= 16; lo += 1) bande.push(xy(lo, 17))
for (let lo = 16; lo >= -20; lo -= 1) bande.push(xy(lo, 12.5))
const sahel = hachures([bande], { angle: -45, pas: 3.4, dans: [terres] })
// Littoral dynamique du golfe de Guinée, d'Abidjan à Lagos (et un peu au-delà).
const LITTORAL = ligne([[-7.6, 4.5], [-5.5, 5.1], [-4.0, 5.25], [-2.0, 4.8], [-0.2, 5.5], [1.2, 6.1], [2.4, 6.35], [3.4, 6.4], [4.6, 6.0], [5.8, 4.6], [7.0, 4.4]])
const [xDk, yDk] = xy(-17.45, 14.7)

// Villes et ports : [nom, lon, lat, rayon]
const VILLES = [['Lagos', 3.4, 6.45, 6.2], ['Abidjan', -4.0, 5.33, 4.6], ['Dakar', -17.45, 14.7, 4.6], ['Accra', -0.2, 5.6, 4.2], ['Lomé', 1.22, 6.13, 3.2]]
const villes = VILLES.map(([, lo, la, r]) => { const [x, y] = xy(lo, la); return `<circle cx="${x}" cy="${y}" r="${r}"/>` }).join('')
// Capitales des pays enclavés (repères, petits carrés).
const CAPITALES = [['Bamako', -8.0, 12.64], ['Ouagadougou', -1.52, 12.37], ['Niamey', 2.11, 13.51]]
const capitales = CAPITALES.map(([, lo, la]) => { const [x, y] = xy(lo, la); return `<rect x="${r1(x - 3)}" y="${r1(y - 3)}" width="6" height="6"/>` }).join('')

// Corridors (tirets) : Dakar-Bamako, Abidjan-Ouagadougou, Lomé-Ouagadougou, Cotonou-Niamey.
const CORRIDORS = [
  [[-17.2, 14.8], [-14.5, 14.2], [-11.4, 14.4], [-8.2, 12.8]],
  [[-4.0, 5.6], [-4.6, 8.5], [-4.3, 11.2], [-1.7, 12.25]],
  [[1.2, 6.4], [1.0, 9.5], [-0.2, 11.6], [-1.3, 12.25]],
  [[2.4, 6.6], [2.6, 9.4], [2.8, 11.6], [2.2, 13.3]],
]
const corridors = CORRIDORS.map(ligne).join('')

// Exportations vers le reste du monde : [produit, départ, contrôle, arrivée] en lon/lat.
const FX = { couleur: C.accent, epaisseur: 2.5, long: 9, large: 9 }
const EXPORTS = [
  ['pétrole', [6.0, 4.6], [6.7, 3.2], [6.1, 1.9]],
  ['cacao', [-7.2, 6.0], [-9.5, 4.4], [-13.5, 3.5]],
  ['or', [-2.0, 7.0], [-2.6, 4.5], [-3.3, 2.2]],
]
const exports_ = EXPORTS.map(([, a, c, b]) => fleche(xy(...a), xy(...c), xy(...b), FX)).join('')
// Noms des produits à la pointe des flèches : [dx, dy, ancre]
const POS_EXP = [[7, 1, 'start'], [-3, -7, 'end'], [6, 2, 'start']]
const exportsNoms = EXPORTS.map(([n, , , b], i) => { const [x, y] = xy(...b); const [dx, dy, an] = POS_EXP[i]; return `<text x="${r1(x + dx)}" y="${r1(y + dy)}"${an !== 'start' ? ` text-anchor="${an}"` : ''}>${n}</text>` }).join('')

// Noms de lieux.
const NOMS_VILLES = [
  ['Lagos', 3.4, 6.45, 4, 15, 'middle'], ['Abidjan', -4.0, 5.33, -3, 16, 'end'], ['Dakar', -17.45, 14.7, 0, -9, 'middle'],
  ['Accra', -0.2, 5.6, -1, 17, 'middle'], ['Lomé', 1.22, 6.13, 3, -19, 'start'],
  ['Bamako', -8.0, 12.64, -6, 4, 'end'], ['Ouagadougou', -1.52, 12.37, 0, 15, 'middle'], ['Niamey', 2.11, 13.51, 6, 4, 'start'],
]
const nomsVilles = NOMS_VILLES.map(([n, lo, la, dx, dy, a]) => { const [x, y] = xy(lo, la); return `<text x="${r1(x + dx)}" y="${r1(y + dy)}"${a !== 'start' ? ` text-anchor="${a}"` : ''}>${n}</text>` }).join('')
const MENTIONS = [
  ['Sahara', -4, 21, 'middle'], ['Mali', -4.5, 18.6, 'middle'], ['Niger', 10.5, 18.2, 'middle'], ['Sahel', 6.5, 15.4, 'middle'],
  ['Nigeria', 8.6, 9.7, 'middle'], ['Côte', -7.5, 8.8, 'middle'], ['d\'Ivoire', -7.5, 8.0, 'middle'],
  ['Océan', -17.0, 7.6, 'middle'], ['Atlantique', -17.0, 6.6, 'middle'], ['Golfe de', 3.5, 2.6, 'middle'], ['Guinée', 3.5, 1.7, 'middle'],
]
const mentions = MENTIONS.map(([n, lo, la, a]) => { const [x, y] = xy(lo, la); return `<text x="${x}" y="${y}"${a !== 'start' ? ` text-anchor="${a}"` : ''}>${n}</text>` }).join('')

// ---- Légende en trois parties
const yL = y1 + 24
const X2 = 186
const L = []
const T = []
L.push(titrePartie(12, yL, 'Les espaces dynamiques'))
const a = [yL + 22, yL + 43]
L.push(`<path d="M14,${a[0] - 4}H40" stroke="${C.accent}" stroke-width="6" stroke-linecap="round"/>`)
L.push(`<circle cx="22" cy="${a[1] - 4}" r="5" fill="${C.encre}"/><circle cx="35" cy="${a[1] - 4}" r="3.2" fill="${C.encre}"/>`)
T.push(intitule(48, a[0], 'Littoral dynamique'), intitule(48, a[1], 'Grande ville et port'))
const yD = a[1] + 30
L.push(titrePartie(12, yD, 'Les espaces en difficulté'))
const b = [yD + 22, yD + 43]
L.push(`<rect x="14" y="${b[0] - 11}" width="26" height="14" fill="#FFFFFF" stroke="${C.encre}" stroke-width="0.75"/><path d="${hachures([[[14, b[0] - 11], [40, b[0] - 11], [40, b[0] + 3], [14, b[0] + 3]]], { angle: -45, pas: 3.4 })}" stroke="${C.encre}" stroke-width="0.8"/>`)
L.push(`<rect x="24" y="${b[1] - 7}" width="6" height="6" fill="${C.encre}"/>`)
T.push(intitule(48, b[0], 'Sahel'), intitule(48, b[1], ['Capitale d\'un pays', 'enclavé']))
L.push(titrePartie(X2, yL, 'Les flux'))
const c = [yL + 22, yL + 56]
L.push(fleche([X2 + 2, c[0] - 4], [X2 + 14, c[0] - 4], [X2 + 28, c[0] - 4], FX))
L.push(`<path d="M${X2 + 2},${c[1] - 4}H${X2 + 28}" stroke="${C.encre}" stroke-width="2" stroke-dasharray="4 2.5"/>`)
T.push(intitule(X2 + 36, c[0], ['Exportation de', 'matières premières']), intitule(X2 + 36, c[1], ['Corridor vers un', 'pays enclavé']))
const H = Math.max(b[1] + 13, c[1] + 13) + 12

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" font-family="${FONT}">
<!-- Croquis des dynamiques de l'Afrique de l'Ouest : littoral dynamique du golfe de Guinée, Sahel en difficulté, grandes villes et ports, exportations (pétrole, cacao, or), corridors vers les pays enclavés. Réviz, 4e géographie, l'Afrique de l'Ouest dans la mondialisation. Généré par scripts/illustrations/cartes/afrique-ouest-dynamiques.mjs -->
<rect x="${x0}" y="${y0}" width="${r1(x1 - x0)}" height="${r1(y1 - y0)}" fill="${MER}"/>
${f.couche(p => !OUEST.includes(p.iso), `fill="${TERRE}" stroke="${TERRE_TRAIT}" stroke-width="0.6" stroke-linejoin="round"`)}
${f.couche(p => OUEST.includes(p.iso), `fill="#FFFFFF" stroke="${C.encre}" stroke-width="0.8" stroke-linejoin="round"`)}
<path d="${sahel}" stroke="${C.encre}" stroke-width="0.8" opacity="0.75"/>
<path d="${LITTORAL}" fill="none" stroke="${C.accent}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" opacity="0.9"/>
<path d="${corridors}" fill="none" stroke="${C.encre}" stroke-width="2" stroke-dasharray="4 2.5"/>
${exports_}
<g fill="${C.encre}" stroke="#FFFFFF" stroke-width="0.8">${villes}${capitales}</g>
<rect x="${x0}" y="${y0}" width="${r1(x1 - x0)}" height="${r1(y1 - y0)}" fill="none" stroke="${C.encre}" stroke-width="1" opacity="0.5"/>
<g font-size="11" font-weight="600" fill="${C.gris}" ${HALO}>${mentions}</g>
<g font-size="11.5" font-weight="600" fill="${C.encre}">
<g ${HALO}>${nomsVilles}${exportsNoms}</g>
${L.join('\n')}
${T.join('\n')}
</g>
</svg>
`
ecrireSvg('afrique-ouest-dynamiques', svg, '4eme/geographie')
