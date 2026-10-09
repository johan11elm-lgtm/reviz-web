// -------------------------------------------------------
// Réviz — Les étapes de la mitose pour une cellule à 2 paires de chromosomes (4 chromosomes),
// 3e SVT, mitose et division cellulaire. Quatre vignettes : chromosomes visibles (deux chromatides),
// alignement au centre, séparation des chromatides vers les pôles, deux cellules filles.
// Un chromosome est suivi en orange d'une étape à l'autre.
//   node scripts/illustrations/svt/mitose-etapes.mjs
// -------------------------------------------------------
import { C, r1, document, ecrire, etiquette } from './_svt.mjs'
import { chromatide } from './_chromatide.mjs'

const HW = 3.6
const LONG = 28, COURT = 16
// Les 4 chromosomes : longueur, accent
const CHR = [
  { L: LONG, acc: false }, { L: COURT, acc: false }, { L: LONG, acc: true }, { L: COURT, acc: false },
]
const coul = acc => acc ? `fill="${C.accentClair}" stroke="${C.accent}"` : `fill="${C.violet}" stroke="${C.encre}"`

/** Chromosome à deux chromatides, centre (x, y), rotation (degrés). Repère local : longueur verticale. */
function duplique(x, y, L, rot, acc) {
  const ht = -L / 2, yc = -L * 0.12, bs = L / 2
  const off = s => yy => s * (HW * 0.55 + HW * 0.55 * (1 - Math.exp(-(((yy - yc) / 3.5) ** 2))))
  const d = chromatide(0, ht, yc, bs, HW, { ecart: off(-1), pas: 2 }) + chromatide(0, ht, yc, bs, HW, { ecart: off(1), pas: 2 })
  return `<path transform="translate(${r1(x)} ${r1(y)}) rotate(${rot})" d="${d}" ${coul(acc)} stroke-width="1.2"/>`
}
/** Chromatide seule (chromosome à une chromatide), courbée de `k` (extrémités vers +x local). */
function simple(x, y, L, rot, acc, k = 0) {
  const ht = -L / 2, yc = -L * 0.12, bs = L / 2
  const d = chromatide(0, ht, yc, bs, HW, { ecart: yy => k * ((yy - yc) / (L / 2)) ** 2, pas: 2 })
  return `<path transform="translate(${r1(x)} ${r1(y)}) rotate(${rot})" d="${d}" ${coul(acc)} stroke-width="1.2"/>`
}

const cellule = (cx, cy, rx, ry) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${C.ocre}" stroke="${C.encre}" stroke-width="1.75"/>`

// Positions en ligne le long du plan équatorial (horizontal ; pôles en haut et en bas)
function rangee(cx) {
  const gap = 7
  const tot = CHR.reduce((a, c) => a + c.L, 0) + gap * (CHR.length - 1)
  let x = cx - tot / 2
  return CHR.map(c => { const m = x + c.L / 2; x += c.L + gap; return m })
}

const G = [92, 268], Y = [76, 236]
let s = ''
// 1. Chromosomes visibles, à deux chromatides
{
  const [cx, cy] = [G[0], Y[0]]
  s += cellule(cx, cy, 72, 50)
  const pos = [[-34, -10, 30], [-6, 22, 75], [26, 6, -40], [40, -24, 15]]
  CHR.forEach((c, i) => { const [dx, dy, r] = pos[i]; s += duplique(cx + dx, cy + dy, c.L, r, c.acc) })
}
// 2. Alignement au centre
{
  const [cx, cy] = [G[1], Y[0]]
  s += cellule(cx, cy, 72, 50)
  s += `<path d="M${cx - 66},${cy} H${cx + 66}" stroke="${C.encre}" stroke-width="1" stroke-dasharray="3 3" opacity="0.45"/>`
  rangee(cx).forEach((x, i) => { s += duplique(x, cy, CHR[i].L, 90, CHR[i].acc) })
}
// 3. Séparation des chromatides vers les pôles
{
  const [cx, cy] = [G[0], Y[1]]
  s += cellule(cx, cy, 72, 58)
  rangee(cx).forEach((x, i) => {
    s += simple(x, cy - 24, CHR[i].L, 90, CHR[i].acc, 4)
    s += simple(x, cy + 24, CHR[i].L, -90, CHR[i].acc, 4)
  })
}
// 4. Deux cellules filles
{
  const [cx, cy] = [G[1], Y[1]]
  s += cellule(cx, cy - 28, 66, 27) + cellule(cx, cy + 28, 66, 27)
  rangee(cx).forEach((x, i) => {
    s += simple(x, cy - 28, CHR[i].L, 90, CHR[i].acc)
    s += simple(x, cy + 28, CHR[i].L, 90, CHR[i].acc)
  })
}
// Étiquettes (étapes)
const et = [
  etiquette(G[0], Y[0] + 70, '1. Chromosomes visibles', { ancre: 'middle' }),
  etiquette(G[1], Y[0] + 70, '2. Alignement au centre', { ancre: 'middle' }),
  etiquette(G[0], Y[1] + 78, ['3. Séparation', 'des chromatides'], { ancre: 'middle' }),
  etiquette(G[1], Y[1] + 78, ['4. Deux cellules', 'filles'], { ancre: 'middle' }),
]
s += `<g font-size="11.5" font-weight="600" fill="${C.encre}">${et.map(e => e.svg).join('')}</g>`
ecrire('3eme/svt/mitose-etapes.svg', document(342,
  'Étapes de la mitose d\'une cellule à 2 paires de chromosomes ; un chromosome est suivi en orange. Réviz, 3e SVT, mitose et division cellulaire.', s))
