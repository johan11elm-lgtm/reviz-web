// -------------------------------------------------------
// Réviz — Trois coupes schématiques des frontières de plaques : dorsale (écartement, remontée de
// magma, nouvelle lithosphère), subduction (plaque océanique qui plonge, fosse, volcan), collision
// (croûte plissée et épaissie, chaîne de montagnes). Non à l'échelle. 4e SVT, tectonique des plaques.
//   node scripts/illustrations/svt/frontieres-plaques.mjs
// -------------------------------------------------------
import { C, r1, document, ecrire, etiquette, rappel, fleche } from './_svt.mjs'

const A = 86, B = 274
const CROUTE = '#E2DCCB', ASTH = '#FBF1EE', EAU = C.bleuClair
const trait = `stroke="${C.encre}" stroke-width="1.5" stroke-linejoin="round"`
const p = (d, fill, extra = trait) => `<path d="${d}" fill="${fill}" ${extra}/>`

function panneau(oy, contenu, labels) {
  return `<g transform="translate(0 ${oy})">${contenu}<g font-size="11.5" font-weight="600" fill="${C.encre}">${labels}</g></g>`
}
const L = (acc, x, y, t, o, from, to) => {
  const e = etiquette(x, y, t, o)
  acc.l += e.svg
  if (to) acc.s += rappel(...from(e.boite), ...to)
}

// ---- Dorsale ----
function dorsale() {
  const a = { s: '', l: '' }
  a.s += `<rect x="${A}" y="28" width="${B - A}" height="88" fill="${ASTH}"/>`
  a.s += p(`M${A},28 H${B} V52 L190,40 Q180,33 170,40 L${A},52 Z`, EAU, 'stroke="none"')
  a.s += p(`M${A},52 L170,40 Q180,33 190,40 L${B},52 V92 Q210,88 184,62 H176 Q150,88 ${A},92 Z`, C.ocreRose)
  a.s += p(`M${A},52 L170,40 Q180,33 190,40 L${B},52 V59 L190,47 Q180,41 170,47 L${A},59 Z`, CROUTE)
  a.s += `<ellipse cx="180" cy="62" rx="7" ry="9" fill="${C.accentClair}" stroke="${C.accent}" stroke-width="1.5"/>`
  a.s += fleche(180, 112, 180, 46, { couleur: C.accent, ep: 2.25, taille: 7 })
  a.s += fleche(156, 32, 112, 32, { ep: 1.75, taille: 6 }) + fleche(204, 32, 248, 32, { ep: 1.75, taille: 6 })
  L(a, 6, 14, 'Dorsale', {}, b => [b.x + b.w, b.y + 8], [176, 36])
  L(a, 6, 70, ['Nouvelle', 'lithosphère'], {}, b => [b.x + b.w, b.y + 8], [166, 58])
  L(a, 354, 84, ['Remontée', 'de magma'], { ancre: 'end' }, b => [b.x, b.y + 8], [183, 92])
  return a
}
// ---- Subduction ----
function subduction() {
  const a = { s: '', l: '' }
  a.s += `<rect x="${A}" y="28" width="${B - A}" height="88" fill="${ASTH}"/>`
  a.s += p(`M${A},28 H210 L196,44 L176,62 L${A},52 Z`, EAU, 'stroke="none"')
  // plaque continentale (croûte épaisse + manteau lithosphérique)
  a.s += p(`M176,62 L196,44 Q200,30 210,26 L226,26 L236,10 L246,26 H${B} V90 L232,90 Q206,74 176,62 Z`, C.ocreRose)
  a.s += p(`M176,62 L196,44 Q200,30 210,26 L226,26 L236,10 L246,26 H${B} V54 H220 Q200,58 176,62 Z`, CROUTE)
  // plaque océanique qui plonge
  a.s += p(`M${A},52 H150 Q176,56 200,72 L238,116 H212 L186,86 Q166,74 150,74 H${A} Z`, C.ocreRose)
  a.s += p(`M${A},52 H150 Q176,56 200,72 L238,116 H230 L195,78 Q172,62 150,59 H${A} Z`, CROUTE)
  // magma qui remonte vers le volcan
  a.s += `<ellipse cx="236" cy="40" rx="6" ry="8" fill="${C.accentClair}" stroke="${C.accent}" stroke-width="1.5"/>`
  a.s += `<path d="M228,100 Q236,72 236,48" fill="none" stroke="${C.accent}" stroke-width="2.25"/>` + fleche(236, 32, 236, 14, { couleur: C.accent, ep: 2.25, taille: 6 })
  a.s += fleche(110, 40, 152, 40, { ep: 1.75, taille: 6 })
  L(a, 6, 14, 'Subduction', {})
  L(a, 6, 78, ['Plaque', 'océanique'], {}, b => [b.x + b.w, b.y + 8], [118, 66])
  L(a, 140, 106, 'Fosse', { ancre: 'middle' }, b => [b.x + b.w - 6, b.y], [176, 63])
  L(a, 354, 14, 'Volcan', { ancre: 'end' }, b => [b.x, b.y + 8], [241, 16])
  return a
}
// ---- Collision ----
function collision() {
  const a = { s: '', l: '' }
  const A2 = A + 18
  a.s += `<rect x="${A2}" y="40" width="${B - A2}" height="76" fill="${ASTH}"/>`
  a.s += p(`M${A2},40 H140 L160,22 L172,30 L182,8 L194,26 L206,18 L222,40 H${B} V92 Q180,100 ${A2},92 Z`, C.ocreRose)
  a.s += p(`M${A2},40 H140 L160,22 L172,30 L182,8 L194,26 L206,18 L222,40 H${B} V64 H226 Q200,100 180,100 Q156,100 136,64 H${A2} Z`, CROUTE)
  // plis
  a.s += `<path d="M146,52 Q156,36 166,52 T186,52 T206,52 T218,54 M144,66 Q156,48 168,66 T190,66 T212,66 M156,80 Q166,64 176,80 T196,80 T206,78" fill="none" stroke="${C.encre}" stroke-width="1.2" opacity="0.7"/>`
  a.s += fleche(110, 32, 136, 32, { ep: 1.75, taille: 6 }) + fleche(264, 32, 230, 32, { ep: 1.75, taille: 6 })
  L(a, 6, 14, 'Collision', {})
  L(a, 6, 82, ['Croûte plissée', 'et épaissie'], {}, b => [b.x + b.w, b.y + 8], [150, 72])
  L(a, 354, 14, ['Chaîne de', 'montagnes'], { ancre: 'end' }, b => [b.x, b.y + 8], [186, 14])
  return a
}

const H = 124
let out = ''
;[dorsale(), subduction(), collision()].forEach((a, i) => {
  out += panneau(8 + i * H, a.s, a.l)
  if (i) out += `<path d="M6,${i * H + 2} H354" stroke="${C.violet}" stroke-width="1.5"/>`
})
ecrire('4eme/svt/frontieres-plaques.svg', document(3 * H + 6,
  'Trois coupes schématiques : dorsale, subduction, collision (non à l\'échelle). Réviz, 4e SVT, tectonique des plaques.', out))
