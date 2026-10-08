// Réviz — 6e maths, « Fractions : sens et quotient » : demi-droite graduée de 0 à 2,
// chaque unité partagée en 3 parts égales ; on compte 5 parts depuis 0 pour placer 5/3
// (entre 1 et 2). En dessous, une bande unité partagée en 4 parts égales, 3 coloriées : 3/4.
import { C, P, f, pointe, mention, ecrire } from './_m56.mjs'

const corps = []
const trait = (d, c = C.encre, w = 1.75, extra = '') => corps.push(`<path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"${extra}/>`)
// fraction écrite en étage, masquable
const fraction = (cx, yNum, n, d, masquable = true) => {
  const txt = `<text x="${f(cx)}" y="${f(yNum)}" text-anchor="middle" font-size="12.5" font-weight="700">${n}</text><text x="${f(cx)}" y="${f(yNum + 16)}" text-anchor="middle" font-size="12.5" font-weight="700">${d}</text><path d="M${f(cx - 7)},${f(yNum + 4)} H${f(cx + 7)}" stroke="${C.encre}" stroke-width="1.4"/>`
  return masquable ? `<g class="ill-legende"><rect class="ill-fond" x="${f(cx - 11)}" y="${f(yNum - 13)}" width="22" height="34" rx="4" fill="#FFFFFF"/>${txt}</g>` : txt
}

// --- Demi-droite graduée ---
const x0 = 30, u = 132, yL = 62
const X = v => x0 + v * u
trait(`M${x0},${yL} H${f(X(2) + 22)}`)
corps.push(`<path d="${pointe(P(X(2), yL), P(X(2) + 30, yL), 7, 3.2)}" fill="${C.encre}"/>`)
const grands = [], petits = []
for (let i = 0; i <= 6; i++) (i % 3 === 0 ? grands : petits).push(`M${f(X(i / 3))},${yL - (i % 3 ? 4 : 6)} V${yL + (i % 3 ? 4 : 6)}`)
trait(grands.join(' '), C.encre, 1.75)
trait(petits.join(' '), C.encre, 1.3)
corps.push(`<g font-size="12.5" font-weight="700" text-anchor="middle">${[0, 1, 2].map(v => `<text x="${f(X(v))}" y="${yL + 22}">${v}</text>`).join('')}</g>`)
// 5 parts comptées depuis 0 : petits bonds
const bonds = []
for (let i = 0; i < 5; i++) {
  const a = X(i / 3), b = X((i + 1) / 3), m = (a + b) / 2, r = (b - a) / 2
  bonds.push(`M${f(a + 1.5)},${yL - 4} A${f(1.3 * r)} ${f(1.3 * r)} 0 0 1 ${f(b - 1.5)},${yL - 4}`)
  corps.push(mention(m, yL - 4 - 0.47 * r - 7, String(i + 1)))
}
trait(bonds.join(' '), C.accent, 1.6)
corps.push(`<circle cx="${f(X(5 / 3))}" cy="${yL}" r="3.4" fill="${C.accent}"/>`)
corps.push(fraction(X(5 / 3), yL + 22, 5, 3))

// --- Bande unité partagée en 4 ---
const bx = 80, by = 136, bw = 200, bh = 30, p = bw / 4
corps.push(`<path d="M${bx},${by} h${3 * p} v${bh} h${-3 * p} Z" fill="${C.aplat}"/>`)
trait(`M${bx},${by} h${bw} v${bh} h${-bw} Z ${[1, 2, 3].map(i => `M${bx + i * p},${by} v${bh}`).join(' ')}`)
corps.push(fraction(bx + bw + 30, by + 11, 3, 4))

ecrire('6eme/maths/fraction-demi-droite-bande.svg', 182,
  "En haut, demi-droite graduée de 0 à 2 où chaque unité est partagée en 3 parts égales : on compte 5 parts depuis 0 et on place le point 5/3, entre 1 et 2. En bas, une bande unité partagée en 4 parts égales dont 3 sont coloriées : elle représente 3/4. Réviz, 6e maths, fractions : sens et quotient.",
  corps)
