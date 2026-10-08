// -------------------------------------------------------
// Réviz — 6e géographie, « Se repérer sur la Terre ».
// Planisphère légendé : six continents, cinq océans, équateur, tropiques du
// Cancer et du Capricorne, cercles polaires, méridien de Greenwich, quadrillage
// des latitudes et des longitudes tous les 30°, Paris et La Réunion.
// Deux fichiers : planisphere-reperes.svg (légendé, noms masquables) et
// planisphere-reperes-muet.svg (même fond, sans aucun nom, pour s'entraîner).
// Fond : Natural Earth 1:50m (domaine public), projection Natural Earth, via carto.mjs.
// Tropiques à 23°26′ (23,44°), cercles polaires à 66°34′ (66,56°).
//
//   node scripts/illustrations/cartes/planisphere-reperes.mjs
// -------------------------------------------------------
import { C, FONT, ecrireSvg, r1, intitule } from './_commun.mjs'
import { fondMonde, nom, nomMasquable, graticuleLeger, parallele, meridien, bordLeger } from './_geographie-5e-6e.mjs'

const W = 360
const X0 = 38
const LARG = 312
const SUD = -90
const f = fondMonde({ x: X0, y: 26, largeur: LARG }, { sud: SUD, nord: 84, tol: 1.2, prec: 0.5, aireMin: 3 })
const { m } = f
const xy = m.xy
const YL = r1(26 + m.hauteur + 30) // haut de la légende des lignes
const H = r1(YL + 84)

const bord = bordLeger(m, SUD, 84)
const P = la => parallele(m, la)
const fond = `<path d="${bord}" fill="${C.mer}"/>
<path d="${graticuleLeger(m, 30, SUD, 84)}" fill="none" stroke="${C.grisTrait}" stroke-width="0.6"/>
${f.terresUnies(C.ocre, { trait: 1 })}
<path d="${P(23.44)}${P(-23.44)}" fill="none" stroke="${C.encre}" stroke-width="1.1" stroke-dasharray="5 3"/>
<path d="${P(66.56)}${P(-66.56)}" fill="none" stroke="${C.encre}" stroke-width="1.1" stroke-dasharray="1.5 2.5" stroke-linecap="round"/>
<path d="${P(0)}${meridien(m, 0, SUD, 84)}" fill="none" stroke="${C.accent}" stroke-width="1.75"/>
<path d="${bord}" fill="none" stroke="${C.encre}" stroke-width="1"/>`

// Graduations en degrés (mentions secondaires) : latitudes à gauche, longitudes en bas.
const lat = [60, 30, 0, -30, -60].map(la => {
  const [x, y] = xy(-180, la)
  const t = la === 0 ? '0°' : `${Math.abs(la)}° ${la > 0 ? 'N' : 'S'}`
  return `<text x="${r1(x - 4)}" y="${r1(y + 4)}" text-anchor="end">${t}</text>`
}).join('')
const lon = [-60, 0, 60].map(lo => {
  const [x, y] = xy(lo, 84)
  const t = lo === 0 ? '0°' : `${Math.abs(lo)}° ${lo > 0 ? 'E' : 'O'}`
  return `<text x="${r1(x)}" y="${r1(y - 5)}" text-anchor="middle">${t}</text>`
}).join('')
const degres = `<g font-size="11" font-weight="600" fill="${C.gris}">${lat}${lon}</g>`

// Noms des lignes (dans le Pacifique, à gauche, au-dessus de chaque ligne)
const [ex, ey] = xy(-170, 0)
const nomsLignes = nomMasquable(ex, ey - 4, 'Équateur', { ancre: 'start' })
// Légende des autres lignes, sous la carte
const echant = (y, tirets, cap = '') => `<path d="M14,${y - 4}h30" stroke="${C.encre}" stroke-width="1.1" stroke-dasharray="${tirets}"${cap}/>`
const legLignes = echant(YL, '5 3') + echant(YL + 34, '1.5 2.5', ' stroke-linecap="round"') +
  `<path d="M29,${YL + 56}v16" stroke="${C.accent}" stroke-width="1.75"/>` + intitule(52, YL + 68, 'Méridien de Greenwich (0°)') +
  intitule(52, YL, ['Tropique du Cancer (environ 23° N)', 'et tropique du Capricorne (23° S)']) +
  intitule(52, YL + 34, ['Cercle polaire arctique (environ 66° N)', 'et cercle polaire antarctique (66° S)'])

const CONTINENTS = [
  [-102, 50, ['Amérique', 'du Nord']],
  [-58, -8, ['Amérique', 'du Sud']],
  [32, 55, 'Europe'],
  [20, 10, 'Afrique'],
  [95, 48, 'Asie'],
  [134, -23, 'Océanie'],
  [40, -80, 'Antarctique'],
]
const OCEANS = [
  [-140, -32, ['Océan', 'Pacifique']],
  [-42, 30, ['Océan', 'Atlantique']],
  [78, -36, ['Océan', 'Indien']],
  [70, 72.5, 'Océan Arctique'],
  [-110, -60, 'Océan Austral'],
]
const nomsContinents = CONTINENTS.map(([lo, la, s]) => { const [x, y] = xy(lo, la); return nomMasquable(x, y, s) }).join('\n')
const nomsOceans = OCEANS.map(([lo, la, s]) => { const [x, y] = xy(lo, la); return nomMasquable(x, y, s, { italique: true }) }).join('\n')

const [px, py] = xy(2.35, 48.86)
const [rx, ry] = xy(55.5, -21.1)
const points = `<g fill="${C.encre}" stroke="#FFFFFF" stroke-width="1"><circle cx="${px}" cy="${py}" r="3"/><circle cx="${rx}" cy="${ry}" r="3"/></g>`
const villes = nom(px - 5, py + 4, 'Paris', { ancre: 'end', taille: 11 }) + nom(rx - 4, ry + 13, 'La Réunion', { ancre: 'end', taille: 11 })

const entete = (quoi, h = H) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${h}" font-family="${FONT}">
<!-- ${quoi} Réviz, 6e géographie, se repérer sur la Terre. Fond Natural Earth (domaine public). Généré par scripts/illustrations/cartes/planisphere-reperes.mjs -->`

const legende = `${entete('Planisphère des repères : continents, océans, équateur et méridien de Greenwich (accent), tropiques (tirets), cercles polaires (pointillés), quadrillage tous les 30°, Paris et La Réunion.')}
${fond}
${degres}
${points}
<g font-size="11.5" font-weight="600" fill="${C.encre}">
${villes}
${nomsLignes}
${nomsContinents}
${nomsOceans}
${legLignes}
</g>
</svg>
`
ecrireSvg('planisphere-reperes', legende, '6eme/geographie')

const muet = `${entete('Planisphère muet pour s\'entraîner : continents, océans, équateur et méridien de Greenwich (accent), tropiques (tirets), cercles polaires (pointillés), quadrillage tous les 30°, sans aucun nom.', r1(26 + m.hauteur + 14))}
${fond}
${degres}
</svg>
`
ecrireSvg('planisphere-reperes-muet', muet, '6eme/geographie')
