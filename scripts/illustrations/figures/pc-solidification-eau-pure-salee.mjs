// Réviz — Courbes de refroidissement : eau pure (palier horizontal à 0 °C pendant la
// solidification, de 5 à 15 min) et eau salée (pas de palier net, solidification sous 0 °C).
// Courbes types (pas des mesures) : refroidissement exponentiel vers −20 °C (congélateur),
// T = −20 + 40·2^(−t/5) jusqu'au palier (0 °C à t = 5 min), puis T = −20 + 20·2^(−(t−15)/5)
// (−10 °C à 20 min), valeurs suggérées par la fiche de la ressource. Eau salée : même
// refroidissement jusqu'à −2 °C, puis descente lente (−2 → −6 °C) pendant la solidification,
// puis de nouveau plus rapide. Chapitre 5eme/physique-chimie/changements-d-etat.
// Sortie : public/programme/illustrations/5eme/physique-chimie/solidification-eau-pure-salee.svg
import { C, r1, doc, etq, etqFixe, mention, rappel, ecrireSvg, pointe } from './_pc.mjs'

const X = t => 58 + t * 13.6          // 0 → 20 min
const Y = T => 166 - T * 5.2           // 25 … −15 °C
const pure = t => t <= 5 ? -20 + 40 * 2 ** (-t / 5) : t <= 15 ? 0 : -20 + 20 * 2 ** (-(t - 15) / 5)
const t1 = 5 * Math.log2(40 / 18)     // instant où l'eau salée atteint −2 °C
const sal = t => t <= t1 ? -20 + 40 * 2 ** (-t / 5) : t <= 16 ? -2 - 4 * (t - t1) / (16 - t1) : -20 + 14 * 2 ** (-(t - 16) / 5)
const chemin = (f, a = 0, b = 20, n = 160) => 'M' + Array.from({ length: n + 1 }, (_, i) => { const t = a + (b - a) * i / n; return `${r1(X(t))},${r1(Y(f(t)))}` }).join(' L')

const corps = []
// quadrillage
let g = ''
for (let t = 5; t <= 20; t += 5) g += `M${r1(X(t))},${Y(-19)} V${Y(25)} `
for (let T = -10; T <= 20; T += 10) g += `M${X(0)},${r1(Y(T))} H${r1(X(20))} `
corps.push(`<path d="${g.trim()}" stroke="${C.violet}" stroke-width="1" fill="none"/>`)
// axe du temps sur 0 °C ; axe des températures à t = 0
corps.push(`<path d="M${X(0)},${Y(-19)} H${r1(X(20) + 12)} M${X(0)},${Y(-19)} V${Y(25) - 8}" stroke="${C.encre}" stroke-width="1.75" fill="none"/>`)
corps.push(pointe([X(0), Y(-19)], [X(20) + 18, Y(-19)], { long: 9, large: 9 }))
corps.push(pointe([X(0), Y(0)], [X(0), Y(25) - 14], { long: 9, large: 9 }))
let tic = ''
for (let t = 5; t <= 20; t += 5) tic += `M${r1(X(t))},${Y(-19)} v4 `
for (let T = -10; T <= 20; T += 10) tic += `M${X(0)},${r1(Y(T))} h-4 `
corps.push(`<path d="${tic.trim()}" stroke="${C.encre}" stroke-width="1.5"/>`)
corps.push(`<g font-size="11" font-weight="600" fill="${C.gris}" text-anchor="middle">` +
  [0, 5, 10, 15, 20].map(t => `<text x="${r1(X(t))}" y="${Y(-19) + 16}">${t}</text>`).join('') + '</g>')
corps.push(`<g font-size="11" font-weight="600" fill="${C.gris}" text-anchor="end">` +
  [-10, 0, 10, 20].map(T => `<text x="${X(0) - 7}" y="${r1(Y(T) + 4)}">${String(T).replace('-', '−')}</text>`).join('') + '</g>')
corps.push(etqFixe(X(0) + 10, Y(25) - 4, 'T (°C)'))
corps.push(etqFixe(348, Y(-19) - 8, 't (min)', 'end'))
// courbes
corps.push(`<path d="${chemin(sal)}" fill="none" stroke="${C.encre}" stroke-width="1.75" stroke-dasharray="5 4"/>`)
corps.push(`<path d="${chemin(pure)}" fill="none" stroke="${C.accent}" stroke-width="2.25"/>`)
// étiquettes
corps.push(etq(r1(X(10)), Y(0) - 12, 'Palier', 'middle'))
corps.push(etq(250, 52, 'Eau pure'))
corps.push(rappel([268, 56], [X(17), Y(pure(17)) - 1]))
corps.push(etq(84, Y(-16), 'Eau salée'))
corps.push(rappel([128, Y(-16) - 6], [X(9), Y(sal(9)) + 1]))

const svg = doc(Y(-19) + 28,
  'Courbes de refroidissement (température en °C en fonction du temps en min) : eau pure, palier horizontal à 0 °C de 5 à 15 min pendant la solidification ; eau salée, pas de palier net, solidification en dessous de 0 °C. Réviz, 5e physique-chimie, changements d’état.',
  corps)
ecrireSvg('solidification-eau-pure-salee', svg, '5eme/physique-chimie')
