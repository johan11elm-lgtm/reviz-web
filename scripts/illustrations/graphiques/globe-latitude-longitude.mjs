// -------------------------------------------------------
// Réviz — 6e géographie, « Se repérer sur la Terre ».
// Schéma du globe en deux vignettes : à gauche, la latitude, angle mesuré au
// centre de la Terre depuis l'équateur, vers le nord ou le sud (exemple : 45° N) ;
// à droite, la Terre vue du dessus du pôle Nord, la longitude, angle mesuré
// depuis le méridien de Greenwich, vers l'est ou l'ouest (exemple : 60° E).
// Vue du pôle Nord, la Terre tourne dans le sens inverse des aiguilles d'une
// montre : l'est est dans ce sens. Coordonnées calculées.
//
//   node scripts/illustrations/graphiques/globe-latitude-longitude.mjs
// -------------------------------------------------------
import { C, FONT, ecrireSvg, r1, pointe } from '../cartes/_commun.mjs'
import { etiquette, rappel } from './_geographie-5e-6e.mjs'

const W = 360
const H = 244
const R = 60
const RAD = Math.PI / 180
const f = v => r1(v)

// Arc de cercle de centre (cx, cy), rayon r, de l'angle a1 à a2 (degrés, sens trigonométrique à l'écran : y vers le haut).
const arc = (cx, cy, r, a1, a2) => {
  const p = a => [cx + r * Math.cos(a * RAD), cy - r * Math.sin(a * RAD)]
  const [x1, y1] = p(a1)
  const [x2, y2] = p(a2)
  const large = Math.abs(a2 - a1) > 180 ? 1 : 0
  const sens = a2 > a1 ? 0 : 1
  return `M${f(x1)},${f(y1)}A${r},${r} 0 ${large} ${sens} ${f(x2)},${f(y2)}`
}

// ---- Vignette 1 : latitude (globe vu de côté)
const A = { x: 92, y: 128 }
const EQ = 13 // demi-petit axe de l'ellipse de l'équateur
const LAT = 45
const P1 = [A.x + R * Math.cos(LAT * RAD), A.y - R * Math.sin(LAT * RAD)]
const E1 = [A.x + R, A.y]
// Parallèle de P (ellipse) : rayon R cos φ, à la hauteur de P
const rp = R * Math.cos(LAT * RAD)
const g1 = [
  `<circle cx="${A.x}" cy="${A.y}" r="${R}" fill="${C.bleuClair}" stroke="${C.encre}" stroke-width="1.75"/>`,
  // équateur : moitié arrière en tirets, moitié avant pleine
  `<path d="M${A.x - R},${A.y}A${R},${EQ} 0 0 1 ${A.x + R},${A.y}" fill="none" stroke="${C.encre}" stroke-width="1" stroke-dasharray="3 3" opacity="0.7"/>`,
  `<path d="M${A.x - R},${A.y}A${R},${EQ} 0 0 0 ${A.x + R},${A.y}" fill="none" stroke="${C.encre}" stroke-width="1.75"/>`,
  // parallèle de P
  `<path d="M${f(A.x - rp)},${f(P1[1])}A${f(rp)},${f(EQ * Math.cos(LAT * RAD))} 0 0 0 ${f(A.x + rp)},${f(P1[1])}" fill="none" stroke="${C.encre}" stroke-width="1" opacity="0.6"/>`,
  // axe des pôles
  `<path d="M${A.x},${A.y - R - 6}V${A.y + R + 6}" stroke="${C.encre}" stroke-width="1" stroke-dasharray="2 2"/>`,
  // rayons vers l'équateur et vers P, angle en accent
  `<path d="M${A.x},${A.y}L${E1[0]},${E1[1]}M${A.x},${A.y}L${f(P1[0])},${f(P1[1])}" stroke="${C.encre}" stroke-width="1.5"/>`,
  `<path d="M${A.x},${A.y}L${f(A.x + 24)},${A.y}${arc(A.x, A.y, 24, 0, LAT).replace('M', 'L')}Z" fill="#FBE9DD"/>`,
  `<path d="${arc(A.x, A.y, 24, 0, LAT)}" fill="none" stroke="${C.accent}" stroke-width="2.25"/>`,
  `<circle cx="${A.x}" cy="${A.y}" r="2.2" fill="${C.encre}"/>`,
  `<circle cx="${f(P1[0])}" cy="${f(P1[1])}" r="3" fill="${C.accent}" stroke="#FFFFFF" stroke-width="1"/>`,
]
// ---- Vignette 2 : longitude (vue du dessus du pôle Nord)
const B = { x: 266, y: 128 }
const LON = 60
// Greenwich vers le bas de l'écran (angle −90°) ; l'est est dans le sens inverse des aiguilles d'une montre.
const aG = -90
const aP = aG + LON
const pt = a => [B.x + R * Math.cos(a * RAD), B.y - R * Math.sin(a * RAD)]
const G2 = pt(aG)
const P2 = pt(aP)
const meridiens = [...Array(12).keys()].map(i => i * 30).filter(a => a !== 0 && a !== 60).map(d => {
  const [x, y] = pt(aG + d)
  return `M${B.x},${B.y}L${f(x)},${f(y)}`
}).join('')
const g2 = [
  `<circle cx="${B.x}" cy="${B.y}" r="${R}" fill="${C.bleuClair}" stroke="${C.encre}" stroke-width="1.75"/>`,
  `<path d="${meridiens}" stroke="${C.encre}" stroke-width="0.75" opacity="0.4"/>`,
  `<path d="M${B.x},${B.y}L${f(B.x + 24 * Math.cos(aG * RAD))},${f(B.y - 24 * Math.sin(aG * RAD))}${arc(B.x, B.y, 24, aG, aP).replace('M', 'L')}Z" fill="#FBE9DD"/>`,
  `<path d="M${B.x},${B.y}L${f(G2[0])},${f(G2[1])}" stroke="${C.encre}" stroke-width="2.25"/>`,
  `<path d="M${B.x},${B.y}L${f(P2[0])},${f(P2[1])}" stroke="${C.encre}" stroke-width="1.5"/>`,
  `<path d="${arc(B.x, B.y, 24, aG, aP)}" fill="none" stroke="${C.accent}" stroke-width="2.25"/>`,
  `<circle cx="${B.x}" cy="${B.y}" r="2.2" fill="${C.encre}"/>`,
  `<circle cx="${f(P2[0])}" cy="${f(P2[1])}" r="3" fill="${C.accent}" stroke="#FFFFFF" stroke-width="1"/>`,
]
// Flèches est / ouest le long de l'équateur, à l'extérieur
const RA = R + 9
const fl = (a1, a2) => {
  const p = a => [B.x + RA * Math.cos(a * RAD), B.y - RA * Math.sin(a * RAD)]
  return `<path d="${arc(B.x, B.y, RA, a1, a2 + (a2 > a1 ? -4 : 4))}" fill="none" stroke="${C.gris}" stroke-width="1.5"/>` + pointe(p(a2 + (a2 > a1 ? -8 : 8)), p(a2), { long: 6, large: 6, fill: C.gris })
}
const fleches = fl(-75, -30) + fl(-105, -150)

// ---- Textes
const mentions = `<g font-size="11" font-weight="600" fill="${C.gris}" text-anchor="middle">
<text x="${A.x}" y="36">vue de côté</text>
<text x="${B.x}" y="36">vue du dessus du pôle Nord</text>
<text x="${f(pt(-22)[0] + 20)}" y="${f(pt(-22)[1] + 8)}">est</text>
<text x="${f(pt(-158)[0] - 24)}" y="${f(pt(-158)[1] + 8)}">ouest</text>
</g>`
const eLat = etiquette(f(A.x + R + 8), f(A.y - 6), '45° N')
const eEq = etiquette(f(A.x - R + 4), f(A.y + R + 28), 'Équateur')
const ePN = etiquette(A.x, f(A.y - R - 11), 'Pôle Nord', { ancre: 'middle' })
const eLon = etiquette(f(B.x + 12), f(B.y + 46), '60° E')
const eGr = etiquette(f(B.x - 8), f(B.y + R + 26), ['Méridien', 'de Greenwich'], { ancre: 'end' })
const eLatT = etiquette(A.x, 20, 'Latitude', { ancre: 'middle' })
const eLonT = etiquette(B.x, 20, 'Longitude', { ancre: 'middle' })

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" font-family="${FONT}">
<!-- Latitude et longitude sur le globe : à gauche, la latitude est l'angle mesuré au centre de la Terre entre l'équateur et le lieu (45° N) ; à droite, vue du pôle Nord, la longitude est l'angle entre le méridien de Greenwich et le méridien du lieu (60° E), vers l'est ou l'ouest. Réviz, 6e géographie, se repérer sur la Terre. Généré par scripts/illustrations/graphiques/globe-latitude-longitude.mjs -->
${g1.join('\n')}
${g2.join('\n')}
${fleches}
${mentions}
<g font-size="11.5" font-weight="600" fill="${C.encre}">
${rappel([eEq.boite[0] + 18, eEq.boite[1]], [A.x - 22, A.y + 12])}
${eEq.svg}
${ePN.svg}
${rappel([eLat.boite[0], eLat.boite[1] + 8], [A.x + 22, A.y - 9])}
${eLat.svg}
${rappel([eLon.boite[0] + 6, eLon.boite[1]], [B.x + 10, B.y + 22])}
${eLon.svg}
${rappel([eGr.boite[0] + eGr.boite[2], eGr.boite[1] + 7], [G2[0], G2[1] - 14])}
${eGr.svg}
${eLatT.svg}
${eLonT.svg}
</g>
</svg>
`
ecrireSvg('globe-latitude-longitude', svg, '6eme/geographie')
