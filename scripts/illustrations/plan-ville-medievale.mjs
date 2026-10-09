// -------------------------------------------------------
// Réviz — 5e histoire, « L'essor des villes médiévales ».
// Plan schématique d'une ville médiévale : remparts et portes, château,
// cathédrale, beffroi, place du marché, rues des métiers, port et pont.
// Lieux de pouvoir et lieux d'activité distingués par deux aplats. Plan type,
// sans ville précise.
//
//   node scripts/illustrations/plan-ville-medievale.mjs
// -------------------------------------------------------
import { C, doc, etiq, txt, rappel } from './cartes/_histoire.mjs'
import { ecrireSvg, r1 } from './cartes/_commun.mjs'

const W = 360
const POUV = '#FBE9DD'
const ACT = '#F4EBDD'
const BRUN = '#B8A27E'

// Enceinte : demi-ellipse posée sur la rivière (calculée).
const cx = 186
const yB = 226 // berge (bas de l'enceinte)
const rx = 140
const ry = 186
const enceinte = []
for (let a = 180; a <= 360; a += 15) {
  const t = (a * Math.PI) / 180
  enceinte.push([r1(cx + rx * Math.cos(t)), r1(yB + ry * 0.92 * Math.sin(t) * 0.98)])
}
const tours = enceinte.filter((_, i) => i % 2 === 0)
const mur = 'M' + enceinte.map(p => p.join(',')).join('L')
// Portes : milieux de trois segments
const porte = i => [r1((enceinte[i][0] + enceinte[i + 1][0]) / 2), r1((enceinte[i][1] + enceinte[i + 1][1]) / 2)]
const pO = porte(1)
const pN = porte(6)
const pE = porte(10)
const pont = [214, yB]
const marche = [158, 132, 56, 40]
const beffroi = [marche[0] + marche[2] + 4, marche[1] - 2]

const rue = (pts, w = 6) => `<path d="M${pts.map(p => p.join(',')).join('L')}" fill="none" stroke="${C.grisClair}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"/>`
// Échoppes le long de la rue des métiers (de la porte est au marché)
let echoppes = ''
for (let k = 0; k < 5; k++) {
  const x = 230 + k * 16
  const y = 150 + k * 2.6
  echoppes += `<rect x="${r1(x)}" y="${r1(y - 13)}" width="11" height="8" fill="${ACT}" stroke="${BRUN}" stroke-width="1"/><rect x="${r1(x)}" y="${r1(y + 5)}" width="11" height="8" fill="${ACT}" stroke="${BRUN}" stroke-width="1"/>`
}

// Cathédrale : plan en croix latine, chevet à l'est
const ca = [158, 102]
const cathedrale = `M${ca[0] - 34},${ca[1] - 8}h44v-16h14v16h12a8,8 0 0 1 0,16h-12v16h-14v-16h-44z`
// Château : carré à quatre tours d'angle
const chx = [250, 104]
const chateau = `<rect x="${chx[0] - 17}" y="${chx[1] - 15}" width="34" height="30" fill="${POUV}" stroke="${C.accent}" stroke-width="2"/>` +
  [[-17, -15], [17, -15], [-17, 15], [17, 15]].map(([dx, dy]) => `<circle cx="${chx[0] + dx}" cy="${chx[1] + dy}" r="4.5" fill="${POUV}" stroke="${C.accent}" stroke-width="2"/>`).join('')

const yL = 278
const svg = doc(W, yL + 30,
  "Plan schématique d'une ville médiévale : remparts et portes, château, cathédrale, beffroi, place du marché, rues des métiers, port et pont sur la rivière. Réviz, 5e histoire, l'essor des villes médiévales. Généré par scripts/illustrations/plan-ville-medievale.mjs",
  `<rect x="12" y="${yB}" width="336" height="26" fill="${C.bleuClair}"/>
<path d="M12,${yB}H348" stroke="${C.bleu}" stroke-width="1.2"/>
<path d="M12,${yB + 26}H348" stroke="${C.bleu}" stroke-width="1.2"/>
${rue([pO, [110, 162], [marche[0], marche[1] + 26]])}
${rue([pN, [207, 82], [207, marche[1]]])}
${rue([pE, [230, 152], [marche[0] + marche[2], marche[1] + 20]])}
${rue([[pont[0], yB], [pont[0], 196], [marche[0] + 40, marche[1] + marche[3]]])}
${rue([[pont[0], yB + 26], [pont[0], yB + 34]])}
<rect x="${pont[0] - 6}" y="${yB - 1}" width="12" height="28" fill="${C.grisClair}" stroke="${C.encre}" stroke-width="1.5"/>
<path d="M60,${yB}h70" stroke="${BRUN}" stroke-width="5"/>
<path d="M72,${yB + 8}h16l-3,5h-10zM104,${yB + 9}h16l-3,5h-10z" fill="#FFFFFF" stroke="${C.encre}" stroke-width="1.2"/>
${echoppes}
<rect x="${marche[0]}" y="${marche[1]}" width="${marche[2]}" height="${marche[3]}" fill="${ACT}" stroke="${BRUN}" stroke-width="1.5"/>
<path d="M${marche[0] + 10},${marche[1] + 12}h8v6h-8zM${marche[0] + 28},${marche[1] + 12}h8v6h-8zM${marche[0] + 19},${marche[1] + 24}h8v6h-8zM${marche[0] + 38},${marche[1] + 25}h8v6h-8z" fill="#FFFFFF" stroke="${BRUN}" stroke-width="1"/>
<rect x="${beffroi[0]}" y="${beffroi[1]}" width="12" height="12" fill="${POUV}" stroke="${C.accent}" stroke-width="2"/>
<path d="${cathedrale}" fill="${POUV}" stroke="${C.accent}" stroke-width="2" stroke-linejoin="round"/>
${chateau}
<path d="${mur}" fill="none" stroke="${C.encre}" stroke-width="4" stroke-linejoin="round"/>
${tours.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="4" fill="${C.encre}"/>`).join('')}
${[pO, pN, pE].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="6.5" fill="#FFFFFF" stroke="${C.encre}" stroke-width="2.5"/>`).join('')}
<g font-size="11.5" font-weight="600" fill="${C.encre}">
${etiq(14, 30, 'Remparts')}${rappel(74, 34, enceinte[4][0] - 1, enceinte[4][1] + 1)}
${etiq(14, 140, 'Porte')}${rappel(50, 144, pO[0] - 6, pO[1] + 2)}
${etiq(346, 58, 'Château', { ancre: 'end' })}${rappel(300, 62, chx[0] + 18, chx[1] - 6)}
${etiq(14, 82, 'Cathédrale')}${rappel(84, 78, ca[0] - 30, ca[1] - 2)}
${etiq(346, 132, 'Beffroi', { ancre: 'end' })}${rappel(301, 128, beffroi[0] + 12, beffroi[1] + 4)}
${etiq(marche[0] - 4, marche[1] + 62, ['Place', 'du marché'], { ancre: 'end' })}${rappel(marche[0] - 6, marche[1] + 55, marche[0] + 6, marche[1] + marche[3] - 4)}
${etiq(346, 196, ['Rues des', 'métiers'], { ancre: 'end' })}${rappel(318, 185, 300, 168)}
${etiq(pont[0] + 12, yB + 44, 'Pont')}
${etiq(66, yB + 44, 'Port')}${rappel(80, yB + 33, 84, yB + 12)}
<rect x="14" y="${yL + 8}" width="24" height="13" fill="${POUV}" stroke="${C.accent}" stroke-width="1.75"/>
${txt(44, yL + 18, 'lieu de pouvoir', { halo: false })}
<rect x="186" y="${yL + 8}" width="24" height="13" fill="${ACT}" stroke="${BRUN}" stroke-width="1.5"/>
${txt(216, yL + 18, "lieu d'activité", { halo: false })}
</g>`)

ecrireSvg('plan-ville-medievale', svg, '5eme/histoire')
