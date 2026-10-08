// -------------------------------------------------------
// Réviz — 6e histoire, « Le monde des cités grecques ».
// Schéma des institutions de la démocratie athénienne au Ve siècle av. J.-C. :
// les citoyens se réunissent à l'Ecclésia (sur la Pnyx), qui vote les lois, la
// guerre et la paix, l'ostracisme ; la Boulè (500 citoyens tirés au sort)
// prépare les lois ; les exclus (femmes, métèques, esclaves) à part.
//
//   node scripts/illustrations/democratie-athenienne.mjs
// -------------------------------------------------------
import { C, doc, etiq, mention, txt, trajet } from './cartes/_histoire.mjs'
import { ecrireSvg } from './cartes/_commun.mjs'

const W = 360
const boite = (x, y, w, h, { fill = '#FFFFFF', stroke = C.encre, sw = 1.75, tirets = '' } = {}) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"${tirets ? ` stroke-dasharray="${tirets}"` : ''}/>`
const fl = (pts, o = {}) => trajet(pts, { couleur: C.encre, epaisseur: 1.75, long: 7, large: 7, ...o })

// Boîtes
const cit = [95, 14, 170, 46]
const bou = [14, 118, 128, 46]
const ecc = [218, 118, 128, 46]
const dec = [204, 214, 144, 84]
const exc = [14, 214, 128, 84]

const svg = doc(W, 312,
  "Schéma des institutions de la démocratie athénienne au Ve siècle av. J.-C. : citoyens, Boulè, Ecclésia et ses décisions, exclus. Réviz, 6e histoire, le monde des cités grecques. Généré par scripts/illustrations/democratie-athenienne.mjs",
  `${boite(...cit, { fill: '#FBE9DD', stroke: C.accent, sw: 2.25 })}
${boite(...bou)}
${boite(...ecc)}
${boite(...dec, { fill: C.violet, stroke: C.violet })}
${boite(...exc, { stroke: C.grisTrait, tirets: '4 3' })}
${fl([[150, 60], [110, 86], [80, 117]])}
${fl([[210, 60], [250, 86], [280, 117]])}
${fl([[142, 152], [217, 152]])}
${fl([[282, 164], [282, 213]])}
<g font-size="11.5" font-weight="600" fill="${C.encre}">
${etiq(180, 35, 'Citoyens', { ancre: 'middle', fond: '#FBE9DD' })}
${mention(180, 51, 'hommes libres et majeurs', { ancre: 'middle', halo: false })}
${mention(84, 86, 'tirés au sort', { ancre: 'end', halo: false })}
${mention(276, 86, 'se réunissent', { ancre: 'start', halo: false })}
${etiq(78, 139, 'Boulè', { ancre: 'middle' })}
${mention(78, 155, '500 citoyens', { ancre: 'middle', halo: false })}
${etiq(282, 139, 'Ecclésia', { ancre: 'middle' })}
${mention(282, 155, 'sur la Pnyx', { ancre: 'middle', halo: false })}
${etiq(180, 128, ['prépare', 'les lois'], { ancre: 'middle' })}
${mention(290, 194, 'vote', { ancre: 'start', halo: false })}
${etiq(215, 240, 'les lois', { fond: C.violet })}
${etiq(215, 260, 'la guerre et la paix', { fond: C.violet })}
${etiq(215, 280, "l'ostracisme", { fond: C.violet })}
${mention(26, 232, 'exclus', { halo: false })}
${etiq(26, 251, 'femmes')}
${etiq(26, 268, 'métèques')}
${etiq(26, 285, 'esclaves')}
</g>`)

ecrireSvg('democratie-athenienne', svg, '6eme/histoire')
