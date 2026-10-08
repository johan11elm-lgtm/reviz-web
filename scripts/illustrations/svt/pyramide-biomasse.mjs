// -------------------------------------------------------
// Réviz — Pyramide de biomasse : 1 000 kg d'herbe, 100 kg de lapins, 10 kg de renards (valeurs du
// chapitre). Largeurs non proportionnelles (sinon l'étage des renards serait invisible). 4e SVT, relations alimentaires.
//   node scripts/illustrations/svt/pyramide-biomasse.mjs
// -------------------------------------------------------
import { C, document, ecrire, etiquette, mention, fleche } from './_svt.mjs'

const CX = 166, HT = 40
const ETAGES = [
  { nom: 'Herbe', kg: '1 000 kg', w: 280, fill: C.vertClair, trait: C.vert },
  { nom: 'Lapins', kg: '100 kg', w: 168, fill: C.ocre, trait: C.encre },
  { nom: 'Renards', kg: '10 kg', w: 84, fill: C.ocre, trait: C.encre },
]
let s = '', leg = ''
ETAGES.forEach((e, i) => {
  const y = 20 + (2 - i) * (HT + 4)
  s += `<rect x="${CX - e.w / 2}" y="${y}" width="${e.w}" height="${HT}" rx="4" fill="${e.fill}" stroke="${e.trait}" stroke-width="1.75"/>`
  s += `<text x="${CX}" y="${y + 17}" text-anchor="middle" font-size="11.5" font-weight="600" fill="${C.encre}">${e.nom}</text>`
  leg += etiquette(CX, y + 31, e.kg, { ancre: 'middle', fond: e.fill }).svg
})
// ÷ 10 d'un étage à l'autre
for (const i of [0, 1]) {
  const yb = 20 + (2 - i) * (HT + 4) + HT / 2, yh = yb - (HT + 4)
  const x = 322
  s += fleche(x, yb, x, yh + 4, { ep: 1.5, taille: 6, couleur: C.gris })
  s += mention(x + 7, (yb + yh) / 2 + 4, '÷ 10')
}
s += `<g font-size="11.5" font-weight="600" fill="${C.encre}">${leg}</g>`

ecrire('4eme/svt/pyramide-biomasse.svg', document(160,
  'Pyramide de biomasse : 1 000 kg d\'herbe, 100 kg de lapins, 10 kg de renards (largeurs non proportionnelles). Réviz, 4e SVT, relations alimentaires.', s))
