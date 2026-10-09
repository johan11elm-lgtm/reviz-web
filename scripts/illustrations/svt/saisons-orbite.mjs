// -------------------------------------------------------
// Réviz — Les saisons : orbite de la Terre autour du Soleil (vue en perspective, sans échelle),
// axe de rotation incliné d'environ 23° toujours dans la même direction ; en juin l'hémisphère Nord
// est penché vers le Soleil (été), en décembre il est penché à l'opposé (hiver).
// 6e sciences et technologie, la Terre dans le système solaire.
//   node scripts/illustrations/svt/saisons-orbite.mjs
// -------------------------------------------------------
import { C, r1, document, ecrire, etiquette, rappel, mention, fleche } from './_svt.mjs'

const CY = 112, R = 24, INC = 23.4 * Math.PI / 180, LA = 38
const NUIT = '#CFCBE0'
let s = ''
// Orbite
s += `<ellipse cx="180" cy="${CY}" rx="130" ry="42" fill="none" stroke="${C.encre}" stroke-width="1" stroke-dasharray="4 3" opacity="0.6"/>`
// Soleil
s += `<circle cx="180" cy="${CY}" r="22" fill="${C.accentClair}" stroke="${C.accent}" stroke-width="2.25"/>`
s += `<text x="180" y="${CY + 4}" text-anchor="middle" font-size="11.5" font-weight="600" fill="${C.encre}">Soleil</text>`
// Rayons vers chaque Terre
s += fleche(156, CY, 50 + R + 4, CY, { couleur: C.accent, ep: 1.75, taille: 6 })
s += fleche(204, CY, 310 - R - 4, CY, { couleur: C.accent, ep: 1.75, taille: 6 })
function terre(x, soleilADroite) {
  let t = `<circle cx="${x}" cy="${CY}" r="${R}" fill="#FFFFFF" stroke="${C.encre}" stroke-width="1.75"/>`
  // moitié nuit (côté opposé au Soleil)
  t += `<path d="M${x},${CY - R} A${R},${R} 0 0 ${soleilADroite ? 0 : 1} ${x},${CY + R} Z" fill="${NUIT}" stroke="${C.encre}" stroke-width="1.75"/>`
  const sx = Math.sin(INC), cx = Math.cos(INC)
  // équateur
  t += `<path d="M${r1(x - R * cx)},${r1(CY - R * sx)} L${r1(x + R * cx)},${r1(CY + R * sx)}" stroke="${C.encre}" stroke-width="1" stroke-dasharray="3 2"/>`
  // verticale de référence et axe incliné (le haut penche vers la droite)
  t += `<path d="M${x},${CY - LA} V${CY - R - 2}" stroke="${C.gris}" stroke-width="1" stroke-dasharray="2 2"/>`
  t += `<path d="M${r1(x - LA * sx)},${r1(CY + LA * cx)} L${r1(x + LA * sx)},${r1(CY - LA * cx)}" stroke="${C.encre}" stroke-width="2.25" stroke-linecap="round"/>`
  return t
}
s += terre(50, true) + terre(310, false)
// angle de 23° sur la Terre de droite
const ar = 30
s += `<path d="M310,${CY - ar} A${ar},${ar} 0 0 1 ${r1(310 + ar * Math.sin(INC))},${r1(CY - ar * Math.cos(INC))}" fill="none" stroke="${C.encre}" stroke-width="1"/>`
s += mention(328, CY - 40, '23°')
s += mention(50, CY + 56, 'juin', 'middle') + mention(310, CY + 56, 'décembre', 'middle')
// Étiquettes
let leg = ''
const eE = etiquette(6, 26, ['Été dans', "l'hémisphère Nord"])
const eH = etiquette(354, 26, ['Hiver dans', "l'hémisphère Nord"], { ancre: 'end' })
const eA = etiquette(6, CY + 80, 'Axe de rotation')
leg += eE.svg + eH.svg + eA.svg
s += rappel(46, eE.boite.y + eE.boite.h, 58, CY - 14)
s += rappel(300, eH.boite.y + eH.boite.h, 304, CY - 14)
s += rappel(30, eA.boite.y, r1(50 - (LA - 4) * Math.sin(INC)), r1(CY + (LA - 4) * Math.cos(INC)))
s += `<g font-size="11.5" font-weight="600" fill="${C.encre}">${leg}</g>`

ecrire('6eme/sciences-et-technologie/saisons-orbite.svg', document(CY + 92,
  'Orbite de la Terre autour du Soleil, axe incliné de 23° toujours dans la même direction : en juin l\'hémisphère Nord est tourné vers le Soleil, en décembre à l\'opposé. Sans échelle. Réviz, 6e sciences, la Terre dans le système solaire.', s))
