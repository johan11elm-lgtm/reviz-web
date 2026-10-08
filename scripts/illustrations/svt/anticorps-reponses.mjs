// -------------------------------------------------------
// Réviz — Quantité d'anticorps dans le sang après un premier puis un second contact avec le même
// antigène (réponse primaire lente et faible, réponse secondaire rapide et forte). 3e SVT,
// réactions immunitaires. Courbe type de manuel : valeurs illustratives (unités arbitraires),
// délai 5 j puis pic vers 12 j (15 u.) au 1er contact ; délai 2 j puis pic vers 47 j (100 u.) au 2e contact (jour 40).
//   node scripts/illustrations/svt/anticorps-reponses.mjs
// -------------------------------------------------------
import { C, r1, document, ecrire, etiquette, mention, rappel, fleche } from './_svt.mjs'

const X0 = 44, X1 = 344, Y0 = 214, Y1 = 34, TMAX = 70, VMAX = 100
const TMIN = -4
const x = t => X0 + (X1 - X0) * (t - TMIN) / (TMAX - TMIN)
const y = v => Y0 - (Y0 - Y1) * v / VMAX
const bosse = (t, debut, tp, A, k, tau) => {
  const u = t - debut
  if (u <= 0) return 0
  return u < tp ? A * (u / tp) ** k * Math.exp(k * (1 - u / tp)) : A * Math.exp(-(u - tp) / tau)
}
const f = t => bosse(t, 5, 7, 15, 2.2, 7) + bosse(t, 42, 5, 100, 2.2, 14)

let s = ''
for (let v = 20; v <= VMAX; v += 20) s += `<path d="M${X0},${r1(y(v))} H${X1}" stroke="${C.violet}" stroke-width="1"/>`
for (let t = 0; t <= 60; t += 10) {
  s += `<path d="M${r1(x(t))},${Y0} v4" stroke="${C.encre}" stroke-width="1.2"/>`
  s += `<text x="${r1(x(t))}" y="${Y0 + 17}" text-anchor="middle" font-size="11" font-weight="600" fill="${C.gris}">${t}</text>`
}
for (let v = 0; v <= VMAX; v += 20) s += `<text x="${X0 - 6}" y="${r1(y(v) + 4)}" text-anchor="end" font-size="11" font-weight="600" fill="${C.gris}">${v}</text>`
s += `<path d="M${X0},${Y1 - 10} V${Y0} H${X1 + 6}" stroke="${C.encre}" stroke-width="1.75" fill="none"/>`
// Courbe
const pts = []
for (let t = TMIN; t <= TMAX; t += 0.5) pts.push(`${r1(x(t))},${r1(y(f(t)))}`)
s += `<path d="M${pts.join(' L')}" fill="none" stroke="${C.accent}" stroke-width="2.25" stroke-linejoin="round"/>`
// Contacts avec l'antigène
for (const [t, txt] of [[0, '1er contact'], [40, '2e contact']]) {
  s += fleche(x(t), y(40), x(t), Y0 - 3, { ep: 1.5, taille: 6 })
  s += mention(x(t) + (t ? 0 : -6), y(40) - 6, txt, t ? 'middle' : 'start')
}
// Étiquettes des réponses
const eP = etiquette(x(14), y(28), ['Réponse', 'primaire'])
const eS = etiquette(x(58), y(80), ['Réponse', 'secondaire'])
s += `<g font-size="11.5" font-weight="600" fill="${C.encre}">${eP.svg}${eS.svg}</g>`
s += rappel(eP.boite.x + 10, eP.boite.y + eP.boite.h, x(13), y(f(13)) - 3)
s += rappel(eS.boite.x, eS.boite.y + 8, x(52) + 2, y(f(52)))
s += mention(6, 14, 'quantité d\'anticorps dans le sang') + mention(X1, Y0 + 17, 'jours', 'end')

ecrire('3eme/svt/anticorps-reponses.svg', document(238,
  'Quantité d\'anticorps dans le sang après un 1er puis un 2e contact avec le même antigène (valeurs illustratives). Réviz, 3e SVT, réactions immunitaires.', s))
