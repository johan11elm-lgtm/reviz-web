// -------------------------------------------------------
// Réviz — 4e géographie, « Les espaces du tourisme ».
// Croquis corrigé (modèle) d'une station balnéaire du type de Benidorm,
// demandé par la méthode du chapitre : mer, trait de côte, plage, front de mer
// bâti continu de tours d'hôtels, quartiers de résidences et d'hôtels en
// arrière, marina (port de plaisance), axes de transport, collines restées
// naturelles. Légende en deux parties : ce qui attire, ce qui est aménagé.
// La photo de Benidorm (sous droits) n'a pas pu être reproduite : c'est un
// modèle théorique, sans lieu réel exact.
//
//   node scripts/illustrations/cartes/croquis-station-balneaire.mjs
// -------------------------------------------------------
import { C, FONT, intitule, titrePartie, ecrireSvg, r1, fleche } from './_commun.mjs'

const W = 360
const X0 = 12
const X1 = 348
const Y0 = 12
const YB = 236 // bas du dessin
const CLAIR = '#FBE9DD'
const SABLE = '#F3E3B5'

// Trait de côte : une large baie (la côte recule au milieu), un cap à l'est.
const XCAP = 302
const cote = x => x <= XCAP
  ? 182 - 30 * Math.sin((Math.PI * (x - X0)) / (XCAP - X0))
  : 182 + (x - XCAP) * 1.15 // le cap s'avance vers la mer
const xs = []
for (let x = X0; x <= X1; x += 4) xs.push(x)
const pts = xs.map(x => [x, r1(cote(x))])
const poly = p => 'M' + p.map(q => q.join(',')).join('L')
const mer = poly(pts) + `L${X1},${YB}L${X0},${YB}Z`
// Plage : bande de sable de 9 unités le long de la baie.
const XP0 = 70
const XP1 = 290
const plageX = xs.filter(x => x >= XP0 && x <= XP1)
const plage = 'M' + plageX.map(x => `${x},${r1(cote(x))}`).join('L') + 'L' + plageX.slice().reverse().map(x => `${x},${r1(cote(x) - 9)}`).join('L') + 'Z'
// Front de mer bâti : tours en plan (petits rectangles) serrés derrière la promenade.
let tours = ''
for (let x = XP0 + 1; x < XP1 - 6; x += 9) {
  const y = cote(x + 3.5) - 25
  tours += `M${x},${r1(y)}h7v10h-7z`
}
// Promenade du front de mer : entre la plage et les tours.
const promenade = poly(plageX.map(x => [x, r1(cote(x) - 12)]))
// Quartiers de résidences et d'hôtels : zone claire derrière le front de mer.
const yR = x => cote(x) - 26
const villeX = xs.filter(x => x >= 28 && x <= 300)
const ville = "M" + villeX.map(x => `${x},${r1(x >= XP0 && x <= XP1 ? cote(x) - 9 : cote(x) - 1)}`).join('L') + 'L300,70Q170,46 28,76Z'
// Marina : bassin fermé par deux jetées, à l'ouest de la plage.
const j1 = [26, cote(26)]
const j2 = [60, cote(60)]
const marina = `M${j1[0]},${r1(j1[1])}V${r1(j1[1] + 26)}H${j1[0] + 16}M${j2[0]},${r1(j2[1])}V${r1(j2[1] + 22)}L${j2[0] - 8},${r1(j2[1] + 28)}`
const bateaux = [[33, j1[1] + 6], [42, j1[1] + 4], [33, j1[1] + 15], [46, j1[1] + 12], [40, j1[1] + 20]]
  .map(([x, y]) => `M${r1(x)},${r1(y)}h5l-1.2,2.4h-2.6z`).join('')
// Axes : autoroute parallèle à la côte, en arrière ; routes d'accès vers le front de mer.
const voie = 'M12,90Q120,60 200,62Q280,64 348,92'
const axes = `<path d="${voie}" fill="none" stroke="${C.encre}" stroke-width="3" stroke-linecap="round"/>` +
  `<path d="M120,${r1(yR(120))}L124,66M236,${r1(yR(236))}L232,63" stroke="${C.encre}" stroke-width="1.5"/>`

// ---- Légende en deux parties
const yL = YB + 26
const X2 = 186
const L = []
L.push(titrePartie(12, yL, 'Ce qui attire'))
const a = [yL + 22, yL + 43, yL + 64]
L.push(`<rect x="14" y="${a[0] - 11}" width="26" height="14" fill="${C.bleuClair}" stroke="${C.encre}" stroke-width="0.75"/>`)
L.push(`<rect x="14" y="${a[1] - 11}" width="26" height="14" fill="${SABLE}" stroke="${C.encre}" stroke-width="0.75"/>`)
L.push(`<rect x="14" y="${a[2] - 11}" width="26" height="14" fill="${C.vertClair}" stroke="${C.encre}" stroke-width="0.75"/>`)
L.push(titrePartie(X2, yL, 'Ce qui est aménagé'))
const b = [yL + 22, yL + 56, yL + 77, yL + 98, yL + 119]
L.push(`<path d="M${X2 + 2},${b[0] - 11}h7v10h-7zM${X2 + 11},${b[0] - 11}h7v10h-7zM${X2 + 20},${b[0] - 11}h7v10h-7z" fill="${C.accent}"/>`)
L.push(`<rect x="${X2 + 2}" y="${b[1] - 11}" width="26" height="14" fill="${CLAIR}" stroke="${C.encre}" stroke-width="0.75"/>`)
L.push(`<path d="M${X2 + 4},${b[2] - 13}V${b[2] + 2}H${X2 + 16}M${X2 + 27},${b[2] - 13}V${b[2] - 1}L${X2 + 21},${b[2] + 2}" fill="none" stroke="${C.encre}" stroke-width="2"/><path d="M${X2 + 10},${b[2] - 8}h5l-1.2,2.4h-2.6z" fill="${C.encre}"/>`)
L.push(`<path d="M${X2 + 2},${b[3] - 4}H${X2 + 28}" stroke="${C.encre}" stroke-width="3" stroke-linecap="round"/>`)
L.push(`<path d="M${X2 + 2},${b[4] - 4}H${X2 + 28}" stroke="${C.encre}" stroke-width="1.5" stroke-dasharray="3 2"/>`)
const T = [
  intitule(50, a[0], 'Mer'),
  intitule(50, a[1], 'Plage'),
  intitule(50, a[2], 'Collines naturelles'),
  intitule(X2 + 36, b[0], ['Front de mer', 'de tours d\'hôtels']),
  intitule(X2 + 36, b[1], 'Hôtels, résidences'),
  intitule(X2 + 36, b[2], 'Marina'),
  intitule(X2 + 36, b[3], 'Autoroute'),
  intitule(X2 + 36, b[4], 'Promenade'),
]
const H = b[4] + 12

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" font-family="${FONT}">
<!-- Croquis corrigé (modèle théorique) d'une station balnéaire du type de Benidorm : mer, plage, front de mer de tours d'hôtels, quartiers d'hôtels et de résidences, marina, autoroute, promenade, collines naturelles. Réviz, 4e géographie, les espaces du tourisme. Généré par scripts/illustrations/cartes/croquis-station-balneaire.mjs -->
<rect x="${X0}" y="${Y0}" width="${X1 - X0}" height="${YB - Y0}" fill="${C.vertClair}"/>
<path d="${ville}" fill="${CLAIR}"/>
<path d="${mer}" fill="${C.bleuClair}"/>
<path d="${plage}" fill="${SABLE}"/>
${axes}
<path d="${promenade}" fill="none" stroke="${C.encre}" stroke-width="1.5" stroke-dasharray="3 2"/>
<path d="${tours}" fill="${C.accent}"/>
<path d="${marina}" fill="none" stroke="${C.encre}" stroke-width="2" stroke-linejoin="round"/>
<path d="${bateaux}" fill="${C.encre}"/>
<path d="${poly(pts)}" fill="none" stroke="${C.encre}" stroke-width="1.75" stroke-linejoin="round"/>
<rect x="${X0}" y="${Y0}" width="${X1 - X0}" height="${YB - Y0}" fill="none" stroke="${C.encre}" stroke-width="1" opacity="0.5"/>
<g font-size="11.5" font-weight="600" fill="${C.encre}">
${L.join('\n')}
${T.join('\n')}
</g>
</svg>
`
ecrireSvg('croquis-station-balneaire', svg, '4eme/geographie')
