// -------------------------------------------------------
// Réviz — Caryotypes humains schématiques (idéogrammes), 3e SVT, information génétique.
// Deux fichiers : caryotype-garcon.svg (46, XY) et caryotype-trisomie-21.svg (47, trois chromosomes 21).
// Longueurs relatives (en mégabases) et position du centromère (part du bras court) :
// ordres de grandeur de l'assemblage humain de référence (GRCh38), arrondis ; le dessin est
// un schéma de manuel (pas une photographie) : chromosomes à deux chromatides, rangés par paires,
// centromères alignés sur chaque ligne.
//   node scripts/illustrations/svt/caryotypes.mjs
// -------------------------------------------------------
import { C, r1, document, ecrire, mention } from './_svt.mjs'

// [nom, longueur (Mb), part du bras court]
const CHR = {
  1: [248, 0.49], 2: [242, 0.39], 3: [198, 0.46], 4: [190, 0.26], 5: [181, 0.27],
  6: [171, 0.35], 7: [159, 0.37], 8: [145, 0.31], 9: [138, 0.33], 10: [134, 0.30], 11: [135, 0.39], 12: [133, 0.27],
  13: [114, 0.16], 14: [107, 0.16], 15: [102, 0.18], 16: [90, 0.41], 17: [83, 0.30], 18: [80, 0.23],
  19: [59, 0.45], 20: [64, 0.44], 21: [47, 0.27], 22: [51, 0.29], X: [156, 0.39], Y: [57, 0.18],
}
const ECH = 0.25 // px par Mb
const LC = 3.9 // largeur d'une chromatide

/** Un chromosome à deux chromatides, centromère en (cx, yc). */
function chromosome(cx, yc, nom, { accent = false } = {}) {
  const [mb, p] = CHR[nom]
  const L = mb * ECH
  const hp = L * p, hq = L - hp
  const trait = accent ? C.accent : C.encre
  const fond = accent ? C.accentClair : C.violet
  const g = 0.7 // demi-écart au centromère
  let s = ''
  for (const x of [cx - LC - 0.35, cx + 0.35]) {
    s += `<rect x="${r1(x)}" y="${r1(yc - hp)}" width="${LC}" height="${r1(Math.max(hp - g, 1.6))}" rx="1.7"/>`
    s += `<rect x="${r1(x)}" y="${r1(yc + g)}" width="${LC}" height="${r1(hq - g)}" rx="1.7"/>`
  }
  return `<g fill="${fond}" stroke="${trait}" stroke-width="1">${s}</g><circle cx="${r1(cx)}" cy="${r1(yc)}" r="1.9" fill="${trait}"/>`
}

const LIGNES = [
  [1, 2, 3, 4, 5],
  [6, 7, 8, 9, 10, 11, 12],
  [13, 14, 15, 16, 17, 18],
  [19, 20, 21, 22, 'XY'],
]

function caryotype(trisomie) {
  let out = ''
  let y = 12
  const nums = []
  for (const ligne of LIGNES) {
    const membres = ligne.flatMap(n => (n === 'XY' ? ['X', 'Y'] : [n]))
    const hp = Math.max(...membres.map(n => CHR[n][0] * ECH * CHR[n][1]))
    const hq = Math.max(...membres.map(n => CHR[n][0] * ECH * (1 - CHR[n][1])))
    const yc = y + hp
    const pas = 336 / ligne.length
    ligne.forEach((n, i) => {
      const cxPaire = 12 + pas * (i + 0.5)
      let lot
      if (n === 'XY') lot = ['X', 'Y']
      else if (n === 21 && trisomie) lot = [21, 21, 21]
      else lot = [n, n]
      const ecart = 11.5
      const x0 = cxPaire - ecart * (lot.length - 1) / 2
      const acc = (trisomie && n === 21) || (!trisomie && n === 'XY')
      lot.forEach((m, k) => { out += chromosome(x0 + k * ecart, yc, m, { accent: acc }) })
      const etiq = n === 'XY' ? 'X  Y' : String(n)
      if (n === 'XY') {
        nums.push(mention(x0, yc + hq + 15, 'X', 'middle'), mention(x0 + ecart, yc + hq + 15, 'Y', 'middle'))
      } else nums.push(mention(cxPaire, yc + hq + 15, etiq, 'middle'))
    })
    y = yc + hq + 26
  }
  const h = r1(y - 6)
  const titre = trisomie
    ? 'Caryotype schématique d\'un garçon atteint de trisomie 21 : 47 chromosomes, trois chromosomes 21 (en orange). Réviz, 3e SVT, information génétique.'
    : 'Caryotype schématique d\'un garçon : 46 chromosomes, 22 paires d\'autosomes puis X et Y (en orange). Réviz, 3e SVT, information génétique.'
  return document(h, titre, out + nums.join(''))
}

ecrire('3eme/svt/caryotype-garcon.svg', caryotype(false))
ecrire('3eme/svt/caryotype-trisomie-21.svg', caryotype(true))
