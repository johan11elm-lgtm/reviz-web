// -------------------------------------------------------
// Réviz — 5e géographie, « La transition démographique ».
// Schéma du modèle de transition démographique (courbes théoriques, pas des
// mesures) : taux de natalité et de mortalité (‰) dans le temps ; avant la
// transition les deux sont forts ; phase 1, la mortalité baisse et la natalité
// reste forte ; phase 2, la natalité baisse à son tour ; après, les deux sont
// faibles et proches. L'écart entre les courbes (accroissement naturel) est en aplat.
// Courbes calculées (fonctions logistiques) pour un tracé régulier.
//
//   node scripts/illustrations/graphiques/transition-demographique-modele.mjs
// -------------------------------------------------------
import { C, FONT, ecrireSvg, r1 } from '../cartes/_commun.mjs'
import { repere, etiquette, rappel } from './_geographie-5e-6e.mjs'

const W = 360
const H = 262
const R = repere({ x0: 40, x1: 340, y0: 52, y1: 220 }, [0, 1], [0, 45])
const { X, Y } = R

const logistique = (t, haut, bas, centre, raideur) => bas + (haut - bas) / (1 + Math.exp((t - centre) * raideur))
const mortalite = t => logistique(t, 38, 10, 0.33, 22)
const natalite = t => logistique(t, 40, 11.5, 0.62, 20)

const ts = []
for (let t = 0; t <= 1.0001; t += 0.01) ts.push(r1(t * 100) / 100)
const ptsM = ts.map(t => [t, mortalite(t)])
const ptsN = ts.map(t => [t, natalite(t)])

// Aplat entre les deux courbes (accroissement naturel)
const zone = 'M' + ptsN.map(([a, b]) => `${X(a)},${Y(b)}`).join('L') + 'L' + [...ptsM].reverse().map(([a, b]) => `${X(a)},${Y(b)}`).join('L') + 'Z'

// Limites des phases
const T = [0.2, 0.46, 0.82]
const limites = `<path d="${T.map(t => `M${X(t)},${R.y1}V${R.y0 - 4}`).join('')}" stroke="${C.gris}" stroke-width="1" stroke-dasharray="3 3"/>`
const milieu = (a, b) => r1((X(a) + X(b)) / 2)

const eN = etiquette(X(0.06), Y(40) - 8, 'Natalité')
const eM = etiquette(X(0.04), Y(38) + 31, 'Mortalité')
const eA = etiquette(X(0.5), Y(40) - 14, ['Accroissement', 'naturel'])
const eP1 = etiquette(milieu(T[0], T[1]), R.y0 - 14, 'Phase 1', { ancre: 'middle' })
const eP2 = etiquette(milieu(T[1], T[2]), R.y0 - 14, 'Phase 2', { ancre: 'middle' })

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" font-family="${FONT}">
<!-- Modèle de la transition démographique : taux de natalité (encre) et de mortalité (accent) en ‰ dans le temps, phase 1 (la mortalité baisse, la natalité reste forte) et phase 2 (la natalité baisse), accroissement naturel en aplat entre les courbes. Schéma théorique. Réviz, 5e géographie, la transition démographique. Généré par scripts/illustrations/graphiques/transition-demographique-modele.mjs -->
<path d="${zone}" fill="#FBE9DD"/>
${limites}
${R.axes()}
${R.gradY([10, 20, 30, 40])}
<text x="${R.x0 + 10}" y="${R.y0 - 34}" font-size="11.5" font-weight="600" fill="${C.encre}">Taux (‰)</text>
<text x="${R.x1 + 8}" y="${R.y1 + 18}" font-size="11.5" font-weight="600" fill="${C.encre}" text-anchor="end">Temps</text>
<g font-size="11" font-weight="600" fill="${C.gris}" text-anchor="middle">
<text x="${milieu(0, T[0])}" y="${R.y1 - 8}">avant</text>
<text x="${milieu(T[2], 1)}" y="${R.y1 - 8}">après</text>
</g>
<path d="${R.ligne(ptsN)}" fill="none" stroke="${C.encre}" stroke-width="2.25" stroke-linejoin="round"/>
<path d="${R.ligne(ptsM)}" fill="none" stroke="${C.accent}" stroke-width="2.25" stroke-linejoin="round"/>
<g font-size="11.5" font-weight="600" fill="${C.encre}">
${eN.svg}
${eM.svg}
${rappel([eA.boite[0] + 14, eA.boite[1] + eA.boite[3]], [X(0.45), Y(30)])}
${eA.svg}
${eP1.svg}
${eP2.svg}
</g>
</svg>
`
ecrireSvg('transition-demographique-modele', svg, '5eme/geographie')
