// -------------------------------------------------------
// Réviz — Appareil reproducteur féminin vu de face (schéma simplifié) : ovaires, trompes,
// utérus, muqueuse utérine, col de l'utérus, vagin. 4e SVT, appareils reproducteurs.
//   node scripts/illustrations/svt/appareil-reproducteur-feminin.mjs
// -------------------------------------------------------
import { C, document, ecrire, etiquette, rappel } from './_svt.mjs'

let s = '', leg = ''
const lab = (x, y, t, ancre, cx, cy, side) => {
  const e = etiquette(x, y, t, { ancre })
  leg += e.svg
  const bx = side === 'g' ? e.boite.x + e.boite.w : e.boite.x
  s += rappel(bx, e.boite.y + 7.5, cx, cy)
}
const CX = 180
// Trompes (tube) : du haut de l'utérus vers chaque ovaire, terminées par un pavillon
for (const k of [-1, 1]) {
  const x = v => CX + k * v
  const d = `M${x(46)},62 Q${x(74)},44 ${x(96)},50 Q${x(112)},56 ${x(114)},74`
  s += `<path d="${d}" fill="none" stroke="${C.encre}" stroke-width="9" stroke-linecap="round"/>`
  s += `<path d="${d}" fill="none" stroke="${C.ocreRose}" stroke-width="5.5" stroke-linecap="round"/>`
  // pavillon (franges)
  s += `<path d="M${x(106)},78 L${x(104)},90 M${x(114)},80 L${x(114)},93 M${x(122)},78 L${x(125)},90" stroke="${C.encre}" stroke-width="2" stroke-linecap="round"/>`
  // ovaire
  s += `<ellipse cx="${x(100)}" cy="104" rx="19" ry="12" fill="${C.ocreRose}" stroke="${C.encre}" stroke-width="1.75"/>`
  s += `<circle cx="${x(94)}" cy="102" r="3.5" fill="#FFFFFF" stroke="${C.encre}" stroke-width="1"/><circle cx="${x(106)}" cy="107" r="2.5" fill="#FFFFFF" stroke="${C.encre}" stroke-width="1"/>`
}
// Utérus (paroi musclée) + col
s += `<path d="M${CX - 50},64 Q${CX - 52},44 ${CX - 30},42 H${CX + 30} Q${CX + 52},44 ${CX + 50},64 Q${CX + 46},116 ${CX + 18},146 V170 H${CX - 18} V146 Q${CX - 46},116 ${CX - 50},64 Z" fill="${C.ocreRose}" stroke="${C.encre}" stroke-width="1.75" stroke-linejoin="round"/>`
// Muqueuse utérine (paroi interne) et cavité
s += `<path d="M${CX - 34},58 H${CX + 34} Q${CX + 30},104 ${CX + 6},136 H${CX - 6} Q${CX - 30},104 ${CX - 34},58 Z" fill="${C.accentClair}" stroke="${C.accent}" stroke-width="2.25" stroke-linejoin="round"/>`
s += `<path d="M${CX - 22},64 H${CX + 22} Q${CX + 18},100 ${CX + 2},128 H${CX - 2} Q${CX - 18},100 ${CX - 22},64 Z" fill="#FFFFFF"/>`
// canal du col
s += `<path d="M${CX},134 V170" stroke="${C.encre}" stroke-width="2" />`
// Vagin
s += `<path d="M${CX - 18},170 L${CX - 22},236 M${CX + 18},170 L${CX + 22},236" stroke="${C.encre}" stroke-width="1.75" fill="none"/>`
s += `<path d="M${CX - 18},170 L${CX - 22},236 H${CX + 22} L${CX + 18},170 Z" fill="${C.ocreRose}"/>`
s += `<path d="M${CX - 9},172 L${CX - 11},236 H${CX + 11} L${CX + 9},172 Z" fill="#FFFFFF" stroke="${C.encre}" stroke-width="1.2"/>`
s += `<path d="M${CX - 18},170 H${CX + 18}" stroke="${C.encre}" stroke-width="1.75"/>`
// Étiquettes
lab(6, 30, 'Trompe', 'start', CX - 76, 47, 'g')
lab(6, 132, 'Ovaire', 'start', CX - 112, 110, 'g')
lab(6, 168, 'Utérus', 'start', CX - 36, 120, 'g')
lab(6, 216, 'Vagin', 'start', CX - 16, 212, 'g')
lab(354, 140, ['Muqueuse', 'utérine'], 'end', CX + 22, 112, 'd')
lab(354, 184, ["Col de", "l'utérus"], 'end', CX + 18, 160, 'd')
s += `<g font-size="11.5" font-weight="600" fill="${C.encre}">${leg}</g>`

ecrire('4eme/svt/appareil-reproducteur-feminin.svg', document(248,
  'Appareil reproducteur féminin vu de face, schéma simplifié. Réviz, 4e SVT, appareils reproducteurs.', s))
