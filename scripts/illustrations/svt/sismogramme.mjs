// -------------------------------------------------------
// Réviz — Sismogramme schématique : ligne calme, arrivée des ondes P, puis des ondes S,
// puis des ondes de surface de grande amplitude. Tracé calculé (sinusoïdes amorties, bruit
// pseudo-aléatoire fixe), pas un enregistrement réel. 4e SVT, séismes.
//   node scripts/illustrations/svt/sismogramme.mjs
// -------------------------------------------------------
import { C, r1, document, ecrire, etiquette, mention, fleche } from './_svt.mjs'

const X0 = 14, X1 = 346, YM = 118
const TP = 70, TS = 140, TL = 210 // arrivées (en x)
let graine = 7
const alea = () => { graine = (graine * 16807) % 2147483647; return graine / 2147483647 - 0.5 }
const env = (x, t0, a, monte, tau) => x < t0 ? 0 : a * Math.min(1, (x - t0) / monte) * Math.exp(-(x - t0) / tau)
const pts = []
for (let x = X0; x <= X1; x += 0.8) {
  const aP = env(x, TP, 13, 3, 60)
  const aS = env(x, TS, 30, 4, 55)
  const aL = env(x, TL, 66, 14, 45)
  const v = 0.6 * alea() +
    aP * Math.sin((x - TP) * 1.9) * (0.75 + 0.5 * alea()) +
    aS * Math.sin((x - TS) * 1.2) * (0.75 + 0.5 * alea()) +
    aL * Math.sin((x - TL) * 0.62) * (0.85 + 0.3 * alea())
  pts.push(`${r1(x)},${r1(YM - v)}`)
}
let s = ''
s += `<path d="M${pts.join(' L')}" fill="none" stroke="${C.encre}" stroke-width="1.5" stroke-linejoin="round"/>`
// Repères d'arrivée
let leg = ''
for (const [x, t, acc] of [[TP, 'Ondes P', true], [TS, 'Ondes S', true], [TL, ['Ondes', 'de surface'], false]]) {
  s += `<path d="M${x},${YM + 4} V40" stroke="${C.accent}" stroke-width="1.5" stroke-dasharray="4 3"/>`
  leg += etiquette(x + 4, 32, t).svg
}
s += `<g font-size="11.5" font-weight="600" fill="${C.encre}">${leg}</g>`
s += fleche(X0, 196, 120, 196, { ep: 1.5, taille: 6 })
s += mention(126, 200, 'temps')
s += mention(X0, YM - 14, 'ligne calme')

ecrire('4eme/svt/sismogramme.svg', document(208,
  'Sismogramme schématique : ligne calme, arrivée des ondes P, des ondes S puis des ondes de surface. Réviz, 4e SVT, séismes.', s))
