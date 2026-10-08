// -------------------------------------------------------
// Réviz — 5e histoire, « L'essor des villes médiévales » (l'Église dans la ville).
// Coupe transversale schématique d'une cathédrale gothique : nef haute et
// bas-côtés, voûtes sur croisée d'ogives, arcs-boutants, contreforts, grandes
// verrières à vitraux ; en encart, la voûte vue d'en dessous (croisée d'ogives).
// Géométrie calculée (arcs brisés).
//
//   node scripts/illustrations/coupe-cathedrale-gothique.mjs
// -------------------------------------------------------
import { C, doc, etiq, mention, rappel } from './cartes/_histoire.mjs'
import { ecrireSvg, r1 } from './cartes/_commun.mjs'

const W = 360
const PIERRE = '#F4EBDD'
const X = 180 // axe
const SOL = 276

/** Arc brisé (tiers-point) de (x0, y) à (x1, y), « équilatéral » : rayon = portée. */
function arcBrise(x0, x1, y, sens = 1) {
  const r = Math.abs(x1 - x0)
  return `M${r1(x0)},${y}A${r},${r} 0 0 ${sens} ${r1((x0 + x1) / 2)},${r1(y - r * Math.sqrt(3) / 2)}A${r},${r} 0 0 ${sens} ${r1(x1)},${y}`
}
const hautArc = (x0, x1, y) => r1(y - Math.abs(x1 - x0) * Math.sqrt(3) / 2)

// Nef : piliers intérieurs
const nefG = 154
const nefD = 206
const naissNef = 132 // naissance de la voûte de la nef
const murNef = 112 // haut des murs de la nef (sous le toit)
// Bas-côtés
const bcG = 118
const bcD = 242
const naissBc = 208
// Contreforts
const cfG = [90, 108]
const cfD = [252, 270]
const hautCf = 160

const voute = arcBrise(nefG, nefD, naissNef)
const sommet = hautArc(nefG, nefD, naissNef)

// Parties pleines (pierre) en coupe
const pierre = [
  // piliers de la nef jusqu'au haut des murs
  `M${nefG - 6},${SOL}V${murNef}h6V${SOL}z`,
  `M${nefD},${SOL}V${murNef}h6V${SOL}z`,
  // murs extérieurs des bas-côtés
  `M${bcG - 6},${SOL}V${naissBc - 12}h6V${SOL}z`,
  `M${bcD},${SOL}V${naissBc - 12}h6V${SOL}z`,
  // contreforts et pinacles
  `M${cfG[0]},${SOL}V${hautCf}l${(cfG[1] - cfG[0]) / 2},-16l${(cfG[1] - cfG[0]) / 2},16V${SOL}z`,
  `M${cfD[0]},${SOL}V${hautCf}l${(cfD[1] - cfD[0]) / 2},-16l${(cfD[1] - cfD[0]) / 2},16V${SOL}z`,
].join('')

// Toits
const toitNef = `M${nefG - 12},${murNef + 2}L${X},${murNef - 64}L${nefD + 12},${murNef + 2}`
const toitBcG = `M${nefG - 6},${naissBc - 38}L${bcG - 12},${naissBc - 10}`
const toitBcD = `M${nefD + 6},${naissBc - 38}L${bcD + 12},${naissBc - 10}`

// Arcs-boutants : du sommet du contrefort au mur de la nef (bande courbe)
const ab = (xCf, xNef, sens) => {
  const y0 = hautCf + 4
  const y1 = naissNef + 2
  const dx = xNef - xCf
  // extrados (ligne droite inclinée) et intrados (arc)
  return `M${xCf},${y0}L${xNef},${y1 - 10}L${xNef},${y1 + 6}Q${r1(xCf + dx * 0.55)},${r1(y1 + 8)} ${xCf},${y0 + 18}z`
}
const arcsBoutants = ab(cfG[1], nefG - 6, 1) + ab(cfD[0], nefD + 6, -1)

// Vitraux (verrières hautes et basses, vues au fond)
const lancette = (x, y, w, h) => `M${x},${y + h}V${y + w * 0.6}A${w},${w} 0 0 1 ${x + w / 2},${y}A${w},${w} 0 0 1 ${x + w},${y + w * 0.6}V${y + h}z`
const vitraux = [lancette(X - 9, 150, 18, 54), lancette(bcG + 9, 226, 14, 36), lancette(bcD - 23, 226, 14, 36)].join('')

// Encart : voûte vue d'en dessous (croisée d'ogives)
const E = [18, 22, 64]
const encart = `<rect x="${E[0]}" y="${E[1]}" width="${E[2]}" height="${E[2]}" fill="${PIERRE}" stroke="${C.encre}" stroke-width="1.75"/>
<path d="M${E[0]},${E[1]}L${E[0] + E[2]},${E[1] + E[2]}M${E[0] + E[2]},${E[1]}L${E[0]},${E[1] + E[2]}" stroke="${C.accent}" stroke-width="2.25"/>
<circle cx="${E[0] + E[2] / 2}" cy="${E[1] + E[2] / 2}" r="3" fill="${C.accent}"/>`

const svg = doc(W, SOL + 24,
  "Coupe transversale schématique d'une cathédrale gothique (nef, bas-côtés, voûte sur croisée d'ogives, arcs-boutants, contreforts, vitraux) et encart de la voûte vue d'en dessous. Réviz, 5e histoire, l'essor des villes médiévales. Généré par scripts/illustrations/coupe-cathedrale-gothique.mjs",
  `${encart}
<path d="${vitraux}" fill="${C.bleuClair}" stroke="${C.bleu}" stroke-width="1.3"/>
<path d="M${X},150V204M${X - 9},180H${X + 9}M${bcG + 16},232V262M${bcD - 16},232V262" stroke="${C.bleu}" stroke-width="1"/>
<path d="${toitNef}" fill="none" stroke="${C.encre}" stroke-width="1.75" stroke-linejoin="round"/>
<path d="${toitBcG}${toitBcD}" fill="none" stroke="${C.encre}" stroke-width="1.75"/>
<path d="${voute}" fill="none" stroke="${C.accent}" stroke-width="2.25"/>
<path d="${arcBrise(bcG, nefG - 6, naissBc)}${arcBrise(nefD + 6, bcD, naissBc)}" fill="none" stroke="${C.encre}" stroke-width="1.5"/>
<path d="${pierre}" fill="${PIERRE}" stroke="${C.encre}" stroke-width="1.5" stroke-linejoin="round"/>
<path d="${arcsBoutants}" fill="${PIERRE}" stroke="${C.encre}" stroke-width="1.5" stroke-linejoin="round"/>
<path d="M14,${SOL}H346" stroke="${C.encre}" stroke-width="1.75"/>
<g font-size="11.5" font-weight="600" fill="${C.encre}">
${etiq(346, 40, ['Voûte sur', "croisée d'ogives"], { ancre: 'end' })}${rappel(262, 54, 201, 107)}${rappel(250, 40, E[0] + E[2] + 2, E[1] + E[2] / 2)}
${etiq(346, 132, 'Arc-boutant', { ancre: 'end' })}${rappel(276, 136, cfD[0] - 12, hautCf - 6)}
${etiq(14, 132, 'Contrefort')}${rappel(48, 136, cfG[0] + 5, hautCf + 10)}
${etiq(14, 214, 'Vitraux')}${rappel(64, 210, bcG + 12, 238)}
</g>
${mention(E[0] + E[2] / 2, E[1] + E[2] + 14, "vue d'en dessous", { ancre: 'middle', halo: false })}
${mention(X, 262, 'nef', { ancre: 'middle' })}
${mention((nefD + bcD) / 2 + 3, SOL + 15, 'bas-côté', { ancre: 'middle', halo: false })}`)

ecrireSvg('coupe-cathedrale-gothique', svg, '5eme/histoire')
