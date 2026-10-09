// -------------------------------------------------------
// Réviz — 5e histoire, « L'ordre seigneurial ».
// Plan schématique d'une seigneurie : château sur motte, réserve, tenures des
// paysans, village et église paroissiale, four, moulin et pressoir banaux,
// forêt et terres défrichées. Plan type des manuels, sans lieu précis.
//
//   node scripts/illustrations/plan-seigneurie.mjs
// -------------------------------------------------------
import { C, doc, etiq, mention, rappel } from './cartes/_histoire.mjs'
import { ecrireSvg, r1 } from './cartes/_commun.mjs'

const W = 360
const OCRE = '#F4EBDD'
const BRUN = '#B8A27E'

// Forêt : arbres en quinconce
let arbres = ''
for (let j = 0; j < 3; j++) for (let x = 20 + (j % 2) * 9; x < 236; x += 18) {
  const y = 22 + j * 15
  arbres += `M${x + 6},${y}a6,6 0 1 1 -12,0a6,6 0 1 1 12,0z`
}
// Terres défrichées : souches et sillons
let souches = ''
for (const [x, y] of [[250, 24], [276, 40], [300, 22], [326, 44], [262, 54], [314, 56], [338, 26]]) souches += `M${x + 2.5},${y}a2.5,2.5 0 1 1 -5,0a2.5,2.5 0 1 1 5,0z`
let sillons = ''
for (let y = 18; y < 64; y += 6) sillons += `M244,${y}h100`

// Réserve : parcelles
let reserve = ''
for (let x = 34; x < 168; x += 14) reserve += `M${x},156v76`
// Tenures : lanières
const lanieres = (x0, y0, w, h, pas) => {
  let s = ''
  let k = 0
  for (let x = x0; x < x0 + w; x += pas, k++) if (k % 2 === 0) s += `M${x},${y0}h${pas}v${h}h-${pas}z`
  return s
}
// Maisons du village
const maisons = [[196, 120], [212, 128], [196, 138], [228, 146], [246, 152], [262, 140], [276, 128]]
  .map(([x, y]) => `<rect x="${x}" y="${y}" width="11" height="8" fill="#FFFFFF" stroke="${C.encre}" stroke-width="1.2"/>`).join('')

const ch = [112, 112] // château
const eg = [240, 118] // église
const four = [214, 160]
const press = [290, 150]
const moul = [116, 262]

const svg = doc(W, 300,
  "Plan schématique d'une seigneurie : forêt et terres défrichées, château sur motte, réserve, village avec église paroissiale, four, pressoir, tenures des paysans, rivière et moulin. Réviz, 5e histoire, l'ordre seigneurial. Généré par scripts/illustrations/plan-seigneurie.mjs",
  `<rect x="12" y="12" width="336" height="276" fill="#FFFFFF"/>
<rect x="12" y="12" width="226" height="56" fill="${C.vertClair}"/>
<path d="${arbres}" fill="#FFFFFF" stroke="${C.vert}" stroke-width="1.5"/>
<rect x="238" y="12" width="110" height="56" fill="${OCRE}"/>
<path d="${sillons}" stroke="${BRUN}" stroke-width="0.8"/>
<path d="${souches}" fill="#FFFFFF" stroke="${BRUN}" stroke-width="1.3"/>
<path d="${lanieres(276, 76, 72, 30, 8)}" fill="${OCRE}" stroke="${BRUN}" stroke-width="0.6"/>
<path d="M276,76h72v30h-72z" fill="none" stroke="${BRUN}" stroke-width="1"/>
<path d="${lanieres(180, 182, 168, 56, 8)}" fill="${OCRE}" stroke="${BRUN}" stroke-width="0.6"/>
<path d="M180,182h168v56h-168z" fill="none" stroke="${BRUN}" stroke-width="1"/>
<rect x="20" y="152" width="150" height="84" fill="#FBE9DD" stroke="${C.accent}" stroke-width="2.25"/>
<path d="${reserve}" stroke="${C.accent}" stroke-width="0.8" opacity="0.45"/>
<path d="M12,272C80,258 150,276 220,262S310,252 348,258" fill="none" stroke="${C.bleu}" stroke-width="5" stroke-linecap="round"/>
<path d="M${ch[0] + 24},${ch[1] + 8}C150,128 170,150 ${four[0] - 8},${four[1] - 6}M${ch[0]},${ch[1] + 26}V152M${four[0] - 10},${four[1] + 2}L176,240L${moul[0] + 10},${moul[1] - 10}" fill="none" stroke="${C.grisTrait}" stroke-width="2.5" stroke-linecap="round"/>
<circle cx="${ch[0]}" cy="${ch[1]}" r="27" fill="none" stroke="${C.bleu}" stroke-width="3"/>
<circle cx="${ch[0]}" cy="${ch[1]}" r="21" fill="${OCRE}" stroke="${C.encre}" stroke-width="1.5"/>
<rect x="${ch[0] - 8}" y="${ch[1] - 8}" width="16" height="16" fill="${C.encre}"/>
${maisons}
<rect x="${eg[0] - 12}" y="${eg[1] - 6}" width="24" height="12" fill="#FFFFFF" stroke="${C.encre}" stroke-width="1.5"/>
<path d="M${eg[0] + 12},${eg[1] - 6}h7v12h-7M${eg[0] + 15.5},${eg[1] - 4}v8M${eg[0] + 12.5},${eg[1] - 1}h6" fill="none" stroke="${C.encre}" stroke-width="1.5"/>
<path d="M${four[0] - 8},${four[1] + 4}a8,8 0 0 1 16,0z" fill="#FFFFFF" stroke="${C.encre}" stroke-width="1.5"/>
<rect x="${press[0] - 7}" y="${press[1] - 6}" width="14" height="12" fill="#FFFFFF" stroke="${C.encre}" stroke-width="1.5"/>
<path d="M${press[0] - 4},${press[1] - 2}h8M${press[0]},${press[1] - 2}v6" stroke="${C.encre}" stroke-width="1.3"/>
<rect x="${moul[0] - 9}" y="${moul[1] - 18}" width="18" height="12" fill="#FFFFFF" stroke="${C.encre}" stroke-width="1.5"/>
<circle cx="${moul[0]}" cy="${moul[1] + 2}" r="7" fill="#FFFFFF" stroke="${C.encre}" stroke-width="1.5"/>
<path d="M${moul[0] - 7},${moul[1] + 2}h14M${moul[0]},${moul[1] - 5}v14" stroke="${C.encre}" stroke-width="1.2"/>
<rect x="12" y="12" width="336" height="276" fill="none" stroke="${C.grisTrait}" stroke-width="0.75"/>
<g font-size="11.5" font-weight="600" fill="${C.encre}">
${etiq(18, 100, ['Château', 'sur motte'])}${rappel(79, 104, ch[0] - 8, ch[1])}
${etiq(26, 200, 'Réserve', { fond: '#FBE9DD' })}
${etiq(122, 46, 'Forêt', { ancre: 'middle', fond: C.vertClair })}
${etiq(293, 34, ['Terres', 'défrichées'], { ancre: 'middle', fond: OCRE })}
${etiq(264, 214, 'Tenures', { ancre: 'middle', fond: OCRE })}
${etiq(250, 86, ['Église', 'paroissiale'], { ancre: 'end' })}${rappel(240, 103, eg[0], eg[1] - 6)}
${etiq(four[0], four[1] + 20, 'Four', { ancre: 'middle' })}
${etiq(340, 168, 'Pressoir', { ancre: 'end' })}${rappel(318, 160, press[0] + 8, press[1] + 2)}
${etiq(moul[0] - 14, moul[1] - 8, 'Moulin', { ancre: 'end' })}
</g>
${mention(264, 174, 'village', { ancre: 'middle' })}`)

ecrireSvg('plan-seigneurie', svg, '5eme/histoire')
