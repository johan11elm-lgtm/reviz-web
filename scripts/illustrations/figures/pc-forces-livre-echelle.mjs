// Réviz — Représentation de forces à l'échelle 1 cm ↔ 2 N (1 cm dessiné = 24 unités).
// À gauche : livre immobile sur une table, poids du livre de 4 N (valeur choisie pour l'exemple)
// → flèche de 4 ÷ 2 = 2 cm, verticale vers le bas depuis le centre G ; action de la table, 4 N,
// flèche de 2 cm vers le haut depuis le milieu de la surface de contact : même longueur, les deux
// forces se compensent (section 6). À droite : l'exemple de la section 5, une force de 6 N
// représentée par une flèche de 6 ÷ 2 = 3 cm, avec une règle graduée en cm dessous.
// Chapitre 3eme/physique-chimie/forces-et-interactions.
// Sortie : public/programme/illustrations/3eme/physique-chimie/forces-livre-echelle.svg
import { C, r1, doc, etq, etqFixe, mention, rappel, ecrireSvg, flecheDroite } from './_pc.mjs'

const CM = 24
const corps = []
// table
const yT = 112, xT0 = 24, xT1 = 212
corps.push(`<path d="M${xT0},${yT} H${xT1} V${yT + 12} H${xT0} Z M${xT0 + 14},${yT + 12} V${yT + 76} M${xT1 - 14},${yT + 12} V${yT + 76}" fill="${C.ocre}" stroke="${C.encre}" stroke-width="1.75" stroke-linejoin="round"/>`)
// livre (fermé, vu de face)
const xL0 = 74, xL1 = 146, hL = 28, yL = yT - hL, xc = (xL0 + xL1) / 2, yG = yT - hL / 2
corps.push(`<rect x="${xL0}" y="${yL}" width="${xL1 - xL0}" height="${hL}" rx="2" fill="#FFFFFF" stroke="${C.encre}" stroke-width="1.75"/>`)
corps.push(`<path d="M${xL0 + 5},${yL + 5} H${xL1 - 5} M${xL0 + 5},${yT - 5} H${xL1 - 5}" stroke="${C.encre}" stroke-width="1" opacity="0.4"/>`)
// forces (accent). Le poids part du centre G ; l'action de la table part d'un point de la surface
// de contact, décalé de 10 unités pour que les deux flèches ne se confondent pas en une seule.
const xR = xc + 10
corps.push(flecheDroite([xc, yG], [xc, yG + 2 * CM], { couleur: C.accent, epaisseur: 2.25, long: 9, large: 8 }))
corps.push(flecheDroite([xR, yT], [xR, yT - 2 * CM], { couleur: C.accent, epaisseur: 2.25, long: 9, large: 8 }))
corps.push(`<circle cx="${xc}" cy="${yG}" r="2.6" fill="${C.encre}"/><circle cx="${xR}" cy="${yT}" r="2.6" fill="${C.encre}"/>`)
corps.push(etqFixe(xc - 9, yG + 4, 'G', 'end'))
// noms des forces : F avec indice
const F = (x, y, ind, ancre) => `<g class="ill-legende" font-size="11.5" font-weight="600" fill="${C.encre}">` +
  `<rect class="ill-fond" x="${r1(ancre === 'end' ? x - 8 - ind.length * 5.4 - 4 : x - 3)}" y="${y - 11}" width="${r1(8 + ind.length * 5.4 + 7)}" height="17" rx="4" fill="#FFFFFF"/>` +
  `<text x="${x}" y="${y}"${ancre === 'end' ? ' text-anchor="end"' : ''}>F<tspan font-size="9" dy="3">${ind}</tspan></text></g>`
corps.push(F(xR + 9, yT - 2 * CM + 10, 'table/livre', 'start'))
corps.push(F(xc + 9, yG + 2 * CM - 2, 'Terre/livre', 'start'))
// échelle
corps.push(mention(24, 20, 'échelle : 1 cm ↔ 2 N'))
// exemple : 6 N ↔ 3 cm, avec règle
const xE = 236, yE = 64
corps.push(flecheDroite([xE, yE], [xE + 3 * CM, yE], { couleur: C.accent, epaisseur: 2.25, long: 9, large: 8 }))
corps.push(`<circle cx="${xE}" cy="${yE}" r="2.6" fill="${C.encre}"/>`)
corps.push(etq(xE + 1.5 * CM, yE - 12, '6 N', 'middle'))
const yR = yE + 16, xa = xE - 8, xb = xE + 3 * CM + 10
corps.push(`<rect x="${xa}" y="${yR}" width="${xb - xa}" height="24" rx="2" fill="#FFFFFF" stroke="${C.encre}" stroke-width="1.75"/>`)
let t = ''
for (let k = 0; k <= 30 + 5; k++) { if (xE + k * CM / 10 > xb - 2) break; t += `M${r1(xE + k * CM / 10)},${yR} v${k % 10 ? (k % 5 ? 3.5 : 6) : 9} ` }
corps.push(`<path d="${t.trim()}" stroke="${C.encre}" stroke-width="1"/>`)
corps.push(`<g font-size="11" font-weight="600" fill="${C.gris}" text-anchor="middle">` + [0, 1, 2, 3].map(k => `<text x="${xE + k * CM}" y="${yR + 20}">${k}</text>`).join('') + '</g>')
corps.push(mention(xb + 5, yR + 18, 'cm'))

const svg = doc(yT + 76 + 12,
  'Forces à l’échelle 1 cm pour 2 N : livre immobile sur une table, poids F Terre/livre (4 N, 2 cm, vers le bas depuis le centre G) et action de la table F table/livre (4 N, 2 cm, vers le haut depuis la surface de contact), de même longueur ; à droite, flèche de 3 cm représentant 6 N, sur une règle. Réviz, 3e physique-chimie.',
  corps)
ecrireSvg('forces-livre-echelle', svg, '3eme/physique-chimie')
