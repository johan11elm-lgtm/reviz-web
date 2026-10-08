// -------------------------------------------------------
// Réviz — 3e histoire, « La Ve République ».
// Schéma des institutions de la Ve République : le président, élu pour 5 ans au
// suffrage universel direct, nomme le Premier ministre, peut dissoudre l'Assemblée
// nationale et organiser un référendum ; le gouvernement est responsable devant
// l'Assemblée ; le Parlement (Assemblée nationale et Sénat) ; les citoyens élisent
// le président et les députés.
//
//   node scripts/illustrations/institutions-ve-republique.mjs
// -------------------------------------------------------
import { C, doc, etiq, mention, pointe } from './cartes/_histoire.mjs'
import { ecrireSvg } from './cartes/_commun.mjs'

const W = 360
const boite = ([x, y, w, h], { fill = '#FFFFFF', stroke = C.encre, sw = 1.75, tirets = '' } = {}) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"${tirets ? ` stroke-dasharray="${tirets}"` : ''}/>`
// Flèche en ligne brisée (angles droits), pointe pleine au bout.
const fl = (pts, { tirets = '' } = {}) => {
  const n = pts.length
  const [a, b] = [pts[n - 2], pts[n - 1]]
  const l = Math.hypot(b[0] - a[0], b[1] - a[1])
  const fin = [b[0] - (b[0] - a[0]) / l * 6, b[1] - (b[1] - a[1]) / l * 6]
  const d = 'M' + [...pts.slice(0, -1), fin].map(p => p.join(',')).join('L')
  return `<path d="${d}" fill="none" stroke="${C.encre}" stroke-width="1.75" stroke-linejoin="round"${tirets ? ` stroke-dasharray="${tirets}"` : ''}/>` + pointe(a, b, { long: 7, large: 7, fill: C.encre })
}

const PRES = [96, 14, 168, 52]
const GOUV = [30, 120, 94, 46]
const PARL = [190, 104, 146, 80]
const AN = [198, 124, 70, 46]
const SEN = [274, 124, 56, 46]
const CIT = [12, 252, 336, 36]
const xAN = AN[0] + AN[2] / 2

const svg = doc(W, 300,
  "Schéma des institutions de la Ve République : président, gouvernement, Parlement (Assemblée nationale et Sénat), citoyens, et les flèches nomme, peut dissoudre, référendum, responsable devant, élisent. Réviz, 3e histoire, la Ve République. Généré par scripts/illustrations/institutions-ve-republique.mjs",
  `${boite(PRES, { fill: '#FBE9DD', stroke: C.accent, sw: 2.25 })}
${boite(GOUV)}
${boite(PARL, { fill: C.violet, stroke: C.violet })}
${boite(AN)}
${boite(SEN)}
${boite(CIT, { fill: '#F4EBDD', stroke: '#F4EBDD' })}
${fl([[PRES[0] + PRES[2], 40], [342, 40], [342, CIT[1] - 1]])}
${fl([[118, PRES[1] + PRES[3]], [80, GOUV[1] - 1]])}
${fl([[xAN, PRES[1] + PRES[3]], [xAN, AN[1] - 1]], { tirets: '4 3' })}
${fl([[GOUV[0] + GOUV[2], 154], [AN[0] - 1, 154]])}
${fl([[18, CIT[1]], [18, 40], [PRES[0] - 1, 40]])}
${fl([[xAN, CIT[1]], [xAN, AN[1] + AN[3] + 1]])}
<g font-size="11.5" font-weight="600" fill="${C.encre}">
${etiq(180, 34, 'Président de la République', { ancre: 'middle', fond: '#FBE9DD' })}
${mention(180, 52, 'élu pour 5 ans', { ancre: 'middle', halo: false })}
${etiq(76, 141, 'Gouvernement', { ancre: 'middle' })}
${mention(76, 157, 'Premier ministre', { ancre: 'middle', halo: false })}
${etiq(xAN, 143, ['Assemblée', 'nationale'], { ancre: 'middle' })}
${etiq(SEN[0] + SEN[2] / 2, 151, 'Sénat', { ancre: 'middle' })}
${etiq(180, 274, 'Citoyens', { ancre: 'middle', fond: '#F4EBDD' })}
${etiq(337, 32, 'référendum', { ancre: 'end' })}
${etiq(46, 90, 'nomme')}
${etiq(xAN + 5, 82, ['peut', 'dissoudre'])}
${etiq(26, 198, ['élisent', 'au suffrage', 'universel direct'])}
${etiq(xAN + 5, 210, ['élisent les', 'députés'])}
${etiq(161, 132, ['responsable', 'devant'], { ancre: 'middle' })}
</g>
${mention(PARL[0] + PARL[2] / 2, PARL[1] + 14, 'Parlement', { ancre: 'middle', halo: false })}`)

ecrireSvg('institutions-ve-republique', svg, '3eme/histoire')
