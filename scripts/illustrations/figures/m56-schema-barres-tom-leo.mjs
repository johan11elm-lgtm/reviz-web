// Réviz — 6e maths, « Pensée algébrique et programmation », section 2 : schéma en barres
// du problème « Tom a 3 fois plus de billes que Léo ; à eux deux, ils en ont 48 ».
// Léo : 1 barre ; Tom : 3 barres de même longueur ; accolade 48 sur les 4 barres ;
// 1 barre = 48 ÷ 4 = 12.
import { C, P, f, etiquette, ecrire } from './_m56.mjs'

const x0 = 92, w = 62, h = 30, y1 = 30, y2 = 76
const barre = (x, y) => `M${x},${y} h${w} v${h} h${-w} Z`
const barres = [barre(x0, y1), barre(x0, y2), barre(x0 + w, y2), barre(x0 + 2 * w, y2)]
// accolade verticale à droite, de y1 à y2 + h
const xa = x0 + 3 * w + 12, ya = y1, yb = y2 + h, ym = (ya + yb) / 2, b = 9
const accolade = `M${xa},${ya} C${xa + b},${ya} ${xa + b * 0.2},${ym} ${xa + b},${ym} C${xa + b * 0.2},${ym} ${xa + b},${yb} ${xa},${yb}`

ecrire('6eme/maths/schema-barres-tom-leo.svg', 158,
  "Schéma en barres : Léo a une barre, Tom trois barres de même longueur ; une accolade indique que les 4 barres font 48 billes, donc 1 barre vaut 48 ÷ 4 = 12. Réviz, 6e maths, pensée algébrique et programmation.",
  [
    `<path d="${barres.join(' ')}" fill="${C.aplat}" stroke="${C.encre}" stroke-width="1.75" stroke-linejoin="round"/>`,
    `<path d="${accolade}" fill="none" stroke="${C.accent}" stroke-width="2" stroke-linejoin="round"/>`,
    `<g font-size="12.5" font-weight="700" text-anchor="end"><text x="${x0 - 10}" y="${y1 + h / 2 + 4.5}">Léo</text><text x="${x0 - 10}" y="${y2 + h / 2 + 4.5}">Tom</text></g>`,
    `<text x="${xa + b + 8}" y="${f(ym + 5)}" font-size="12.5" font-weight="700">48</text>`,
    etiquette(x0 + 1.5 * w, 140, '1 barre = 12', { a: 'middle', taille: 12.5, poids: 700 }),
  ])
