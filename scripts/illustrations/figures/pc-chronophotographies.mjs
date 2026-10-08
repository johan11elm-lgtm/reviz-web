// Réviz — Trois chronophotographies schématiques (une position toutes les 0,1 s) :
// uniforme (écarts 2, 2, 2, 2 cm), accéléré (1, 2, 3, 4 cm), ralenti (4, 3, 2, 1 cm),
// avec une règle graduée en cm commune aux trois lignes.
// Valeurs du chapitre 5eme/physique-chimie/decrire-un-mouvement (section 4 :
// « 2 cm, 2 cm, 2 cm : uniforme ; 1 cm, 2 cm, 3 cm : accéléré »). Figure commune,
// accrochée aussi à 6eme/sciences-et-technologie/decrire-un-mouvement.
// Sortie : public/programme/illustrations/communs/chronophotographies.svg
import { C, r1, doc, etq, mention, fr, ecrireSvg, flecheDroite } from './_pc.mjs'

const X0 = 92, CM = 24          // origine de la règle, px par cm
const lignes = [
  { nom: 'Uniforme', ecarts: [2, 2, 2, 2] },
  { nom: 'Accéléré', ecarts: [1, 2, 3, 4] },
  { nom: 'Ralenti', ecarts: [4, 3, 2, 1] },
]
const Y0 = 60, DY = 54
const corps = []
// sens du mouvement (le même pour les trois lignes)
corps.push(mention(X0 - 6, 20, 'sens du mouvement'))
corps.push(flecheDroite([X0 + 112, 16], [X0 + 172, 16], { epaisseur: 1.5, long: 7, large: 6 }))
lignes.forEach((l, i) => {
  const y = Y0 + i * DY
  const pos = [0]
  l.ecarts.forEach(e => pos.push(pos.at(-1) + e))
  // trajectoire (trait fin)
  corps.push(`<path d="M${X0},${y} H${r1(X0 + pos.at(-1) * CM)}" stroke="${C.encre}" stroke-width="1" opacity="0.35"/>`)
  // écarts (mention au-dessus, au milieu de chaque intervalle)
  corps.push(`<g font-size="11" font-weight="600" fill="${C.gris}" text-anchor="middle">` +
    l.ecarts.map((e, k) => `<text x="${r1(X0 + (pos[k] + e / 2) * CM)}" y="${y - 11}">${fr(e)} cm</text>`).join('') + '</g>')
  // positions
  corps.push(`<g fill="#FBE9DD" stroke="${C.accent}" stroke-width="2.25">` +
    pos.map(p => `<circle cx="${r1(X0 + p * CM)}" cy="${y}" r="5"/>`).join('') + '</g>')
  corps.push(etq(14, y + 4, l.nom))
})
// règle
const yR = Y0 + 3 * DY - 10
const xA = X0 - 8, xB = X0 + 10 * CM + 8
corps.push(`<rect x="${xA}" y="${yR}" width="${r1(xB - xA)}" height="26" rx="2" fill="#FFFFFF" stroke="${C.encre}" stroke-width="1.75"/>`)
let tics = ''
for (let k = 0; k <= 20; k++) {
  const x = r1(X0 + k * CM / 2)
  tics += `M${x},${yR} v${k % 2 ? 5 : 9} `
}
corps.push(`<path d="${tics.trim()}" stroke="${C.encre}" stroke-width="1.25"/>`)
corps.push(`<g font-size="11" font-weight="600" fill="${C.gris}" text-anchor="middle">` +
  Array.from({ length: 11 }, (_, k) => `<text x="${r1(X0 + k * CM)}" y="${yR + 21}">${k}</text>`).join('') + '</g>')
corps.push(mention(xA - 6, yR + 21, 'cm', 'end'))

const svg = doc(yR + 26 + 14,
  'Trois chronophotographies schématiques, une position toutes les 0,1 s : uniforme (écarts égaux de 2 cm), accéléré (1, 2, 3, 4 cm), ralenti (4, 3, 2, 1 cm), et une règle en cm. Réviz, 5e physique-chimie et 6e sciences, décrire un mouvement.',
  corps)
ecrireSvg('chronophotographies', svg, 'communs')
