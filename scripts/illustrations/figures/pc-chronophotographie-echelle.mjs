// Réviz — Chronophotographie à l'échelle 1 (règle en cm) : une position toutes les 0,1 s.
// Uniforme : positions espacées de 5 cm (donc v = 0,05 m ÷ 0,1 s = 0,5 m/s, valeurs de la
// section 6 du chapitre 3eme/physique-chimie/mouvement-et-vitesse) ; variantes accéléré
// (écarts 2, 4, 6, 8 cm) et ralenti (8, 6, 4, 2 cm), sans valeurs écrites : à mesurer sur la règle.
// Sortie : public/programme/illustrations/3eme/physique-chimie/chronophotographie-echelle.svg
import { C, r1, doc, etq, mention, fr, ecrireSvg, flecheDroite } from './_pc.mjs'

const X0 = 92, CM = 9.6
const lignes = [
  { nom: 'Uniforme', ecarts: [5, 5, 5, 5, 5], principal: true },
  { nom: 'Accéléré', ecarts: [2, 4, 6, 8] },
  { nom: 'Ralenti', ecarts: [8, 6, 4, 2] },
]
const corps = []
corps.push(mention(X0 - 6, 20, 'sens du mouvement'))
corps.push(flecheDroite([X0 + 112, 16], [X0 + 172, 16], { epaisseur: 1.5, long: 7, large: 6 }))
const ys = [62, 128, 172]
lignes.forEach((l, i) => {
  const y = ys[i]
  const pos = [0]
  l.ecarts.forEach(e => pos.push(pos.at(-1) + e))
  corps.push(`<path d="M${X0},${y} H${r1(X0 + pos.at(-1) * CM)}" stroke="${C.encre}" stroke-width="1" opacity="0.35"/>`)
  if (l.principal) {
    corps.push(`<g font-size="11" font-weight="600" fill="${C.gris}" text-anchor="middle">` +
      l.ecarts.map((e, k) => `<text x="${r1(X0 + (pos[k] + e / 2) * CM)}" y="${y - 11}">${fr(e)} cm</text>`).join('') +
      pos.map((p, k) => `<text x="${r1(X0 + p * CM)}" y="${y + 21}">${k === 0 ? '0 s' : fr(k / 10)}</text>`).join('') + '</g>')
    corps.push(`<g fill="#FBE9DD" stroke="${C.accent}" stroke-width="2.25">` +
      pos.map(p => `<circle cx="${r1(X0 + p * CM)}" cy="${y}" r="4.5"/>`).join('') + '</g>')
  } else {
    corps.push(`<g fill="#FFFFFF" stroke="${C.encre}" stroke-width="1.75">` +
      pos.map(p => `<circle cx="${r1(X0 + p * CM)}" cy="${y}" r="4.5"/>`).join('') + '</g>')
  }
  corps.push(etq(14, y + 4, l.nom))
})
// règle 0 – 25 cm
const yR = 200
const xA = X0 - 8, xB = X0 + 25 * CM + 8
corps.push(`<rect x="${xA}" y="${yR}" width="${r1(xB - xA)}" height="26" rx="2" fill="#FFFFFF" stroke="${C.encre}" stroke-width="1.75"/>`)
let tics = ''
for (let k = 0; k <= 25; k++) tics += `M${r1(X0 + k * CM)},${yR} v${k % 5 ? 5 : 9} `
corps.push(`<path d="${tics.trim()}" stroke="${C.encre}" stroke-width="1.25"/>`)
corps.push(`<g font-size="11" font-weight="600" fill="${C.gris}" text-anchor="middle">` +
  [0, 5, 10, 15, 20, 25].map(k => `<text x="${r1(X0 + k * CM)}" y="${yR + 21}">${k}</text>`).join('') + '</g>')
corps.push(mention(xA - 6, yR + 21, 'cm', 'end'))

const svg = doc(yR + 26 + 14,
  'Chronophotographie avec une règle en cm, une position toutes les 0,1 s : mouvement uniforme à positions espacées de 5 cm (v = 0,5 m/s), et deux variantes, accéléré (écarts 2, 4, 6, 8 cm) et ralenti (8, 6, 4, 2 cm). Réviz, 3e physique-chimie, mouvement et vitesse.',
  corps)
ecrireSvg('chronophotographie-echelle', svg, '3eme/physique-chimie')
