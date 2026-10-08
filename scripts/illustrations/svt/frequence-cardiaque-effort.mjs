// -------------------------------------------------------
// Réviz — Fréquence cardiaque en fonction du temps : repos, effort, récupération, pour une personne
// entraînée et une personne non entraînée. Courbes types, valeurs illustratives (repos 60 et 75,
// effort 150 et 175 battements par minute ; récupération plus rapide chez la personne entraînée).
// 5e SVT, effort physique.
//   node scripts/illustrations/svt/frequence-cardiaque-effort.mjs
// -------------------------------------------------------
import { C, r1, document, ecrire, etiquette, mention } from './_svt.mjs'

const X0 = 44, X1 = 346, Y0 = 224, Y1 = 40, TMAX = 20, VMIN = 40, VMAX = 200
const x = t => X0 + (X1 - X0) * t / TMAX
const y = v => Y0 - (Y0 - Y1) * (v - VMIN) / (VMAX - VMIN)
const D = 4, F = 12 // début et fin de l'effort (min)
const fc = (repos, effort, tauM, tauR) => t => {
  if (t <= D) return repos
  const finEffort = effort - (effort - repos) * Math.exp(-(F - D) / tauM)
  if (t <= F) return effort - (effort - repos) * Math.exp(-(t - D) / tauM)
  return repos + (finEffort - repos) * Math.exp(-(t - F) / tauR)
}
const entraine = fc(60, 150, 0.9, 1.4), non = fc(75, 175, 1.2, 4.5)
const courbe = (f, coul) => {
  const p = []
  for (let t = 0; t <= TMAX; t += 0.1) p.push(`${r1(x(t))},${r1(y(f(t)))}`)
  return `<path d="M${p.join(' L')}" fill="none" stroke="${coul}" stroke-width="2.25" stroke-linejoin="round"/>`
}
let s = ''
// phase d'effort grisée
s += `<rect x="${x(D)}" y="${Y1 - 8}" width="${x(F) - x(D)}" height="${Y0 - Y1 + 8}" fill="${C.violet}" opacity="0.6"/>`
for (let v = 50; v <= VMAX; v += 50) {
  s += `<path d="M${X0},${r1(y(v))} H${X1}" stroke="${C.violet}" stroke-width="1"/>`
  s += `<text x="${X0 - 6}" y="${r1(y(v) + 4)}" text-anchor="end" font-size="11" font-weight="600" fill="${C.gris}">${v}</text>`
}
for (let t = 0; t <= TMAX; t += 4) {
  s += `<path d="M${r1(x(t))},${Y0} v4" stroke="${C.encre}" stroke-width="1.2"/>`
  s += `<text x="${r1(x(t))}" y="${Y0 + 17}" text-anchor="middle" font-size="11" font-weight="600" fill="${C.gris}">${t}</text>`
}
s += `<path d="M${X0},${Y1 - 12} V${Y0} H${X1 + 4}" stroke="${C.encre}" stroke-width="1.75" fill="none"/>`
s += courbe(non, C.encre) + courbe(entraine, C.accent)
// Noms des courbes (non masquables)
s += `<g font-size="11.5" font-weight="600">`
s += `<text x="${x(14.6)}" y="${r1(y(non(14.6)) - 8)}" fill="${C.encre}">non entraînée</text>`
s += `<text x="${x(15)}" y="${r1(y(90))}" fill="${C.accent}">entraînée</text>`
s += '</g>'
// Phases (masquables)
const leg = [
  etiquette(x(D / 2), Y1 + 2, 'Repos', { ancre: 'middle' }),
  etiquette(x((D + F) / 2), Y1 + 2, 'Effort', { ancre: 'middle', fond: '#F2F1F7' }),
  etiquette(x((F + TMAX) / 2), Y1 + 2, 'Récupération', { ancre: 'middle' }),
].map(e => e.svg).join('')
s += `<g font-size="11.5" font-weight="600" fill="${C.encre}">${leg}</g>`
s += mention(6, 14, 'battements par minute') + mention(X1, Y0 + 32, 'temps (min)', 'end')

ecrire('5eme/svt/frequence-cardiaque-effort.svg', document(Y0 + 40,
  'Fréquence cardiaque au repos, pendant l\'effort et pendant la récupération, personne entraînée et non entraînée (valeurs illustratives). Réviz, 5e SVT, effort physique.', s))
