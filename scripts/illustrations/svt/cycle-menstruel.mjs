// -------------------------------------------------------
// Réviz — Cycle menstruel sur 28 jours : règles (J1 à J5), épaississement de la muqueuse utérine,
// ovulation vers J14, muqueuse épaisse, puis nouvelles règles (J1 du cycle suivant).
// Épaisseur de la muqueuse : allure schématique (valeurs illustratives). 4e SVT, appareils reproducteurs.
//   node scripts/illustrations/svt/cycle-menstruel.mjs
// -------------------------------------------------------
import { C, r1, document, ecrire, etiquette, mention, rappel } from './_svt.mjs'

const X0 = 24, X1 = 340, JMAX = 33, Y0 = 160, YH = 40
const x = j => X0 + (X1 - X0) * (j - 1) / (JMAX - 1)
// épaisseur (0 à 1)
const ep = j => {
  if (j <= 5) return 1 - 0.8 * (j - 1) / 4
  if (j <= 28) { const u = (j - 5) / 23; return 0.2 + 0.8 * (1 - (1 - u) ** 2) }
  return 1 - 0.8 * (j - 28) / 5
}
const y = v => Y0 - (Y0 - YH) * v
let s = ''
const haut = []
for (let j = 1; j <= JMAX; j += 0.25) haut.push(`${r1(x(j))},${r1(y(ep(j)))}`)
s += `<path d="M${X0},${Y0} L${haut.join(' L')} L${X1},${Y0} Z" fill="${C.rougeClair}" stroke="none"/>`
s += `<path d="M${haut.join(' L')}" fill="none" stroke="${C.rouge}" stroke-width="2.25" stroke-linejoin="round"/>`
s += `<path d="M${X0},${Y0} H${X1}" stroke="${C.encre}" stroke-width="1.75"/>`
// Règles : bandes sous l'axe
for (const [a, b] of [[1, 5], [29, 33]]) {
  s += `<rect x="${r1(x(a) - 4)}" y="${Y0 + 6}" width="${r1(x(b) - x(a) + 8)}" height="9" rx="3" fill="${C.rouge}"/>`
}
// Graduations
for (const [j, t] of [[1, 'J1'], [5, 'J5'], [14, 'J14'], [29, 'J1']]) {
  s += `<text x="${r1(x(j))}" y="${Y0 + 32}" text-anchor="middle" font-size="11" font-weight="600" fill="${C.gris}">${t}</text>`
}
// Ovulation
s += `<path d="M${r1(x(14))},${Y0} V${YH - 10}" stroke="${C.accent}" stroke-width="2.25" stroke-dasharray="5 3"/>`
s += `<circle cx="${r1(x(14))}" cy="${YH - 14}" r="5" fill="${C.accentClair}" stroke="${C.accent}" stroke-width="2"/>`
s += mention(6, 14, 'épaisseur de la muqueuse utérine')
// Étiquettes
let leg = ''
const eOv = etiquette(x(14) + 10, YH - 10, 'Ovulation'); leg += eOv.svg
const eR1 = etiquette(x(3), Y0 + 50, 'Règles', { ancre: 'middle' }); leg += eR1.svg
const eR2 = etiquette(x(31), Y0 + 50, ['Nouvelles', 'règles'], { ancre: 'middle' }); leg += eR2.svg
const eE = etiquette(x(9.2), 150, 'Épaississement', { ancre: 'middle', fond: C.rougeClair }); leg += eE.svg
const eM = etiquette(x(22), 112, ['Muqueuse', 'épaisse'], { ancre: 'middle', fond: C.rougeClair }); leg += eM.svg
s += `<g font-size="11.5" font-weight="600" fill="${C.encre}">${leg}</g>`

ecrire('4eme/svt/cycle-menstruel.svg', document(Y0 + 66,
  'Cycle menstruel de 28 jours : épaisseur de la muqueuse utérine, règles, ovulation vers J14 (allure schématique). Réviz, 4e SVT, appareils reproducteurs.', s))
