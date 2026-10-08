// -------------------------------------------------------
// Réviz — Neurone légendé (corps cellulaire, noyau, dendrites, axone, terminaisons) et synapse
// agrandie (fin de l'axone, vésicules, neurotransmetteur, récepteurs du neurone suivant, sens du
// message). 3e SVT, système nerveux et santé.
//   node scripts/illustrations/svt/neurone-synapse.mjs
// -------------------------------------------------------
import { C, document, ecrire, etiquette, rappel, mention, fleche } from './_svt.mjs'

let s = '', leg = ''
const L = (x, y, t, o, cible) => {
  const e = etiquette(x, y, t, o)
  leg += e.svg
  if (cible) s += rappel(...cible(e.boite), ...cible.to)
  return e
}
// ---- Neurone ----
const BX = 96, BY = 64
s += `<g stroke="${C.encre}" stroke-width="2.25" stroke-linecap="round" fill="none">`
// dendrites
s += `<path d="M84,54 L62,36 L46,34 M62,36 L58,20 M80,72 L58,88 L42,86 M58,88 L56,104 M88,48 L84,24 L74,12 M84,24 L96,12 M82,62 L52,60 L40,52"/>`
// axone et terminaisons
s += `<path d="M114,64 H300 M300,64 Q312,64 322,46 M300,64 H328 M300,64 Q312,64 322,82"/>`
s += '</g>'
s += `<path d="M${BX - 18},${BY - 6} Q${BX - 10},${BY - 24} ${BX + 6},${BY - 18} Q${BX + 22},${BY - 10} ${BX + 20},${BY + 4} Q${BX + 14},${BY + 22} ${BX - 4},${BY + 20} Q${BX - 22},${BY + 14} ${BX - 18},${BY - 6} Z" fill="${C.violet}" stroke="${C.encre}" stroke-width="1.75"/>`
s += `<circle cx="${BX}" cy="${BY}" r="7" fill="#C9C4E0" stroke="${C.encre}" stroke-width="1.5"/>`
for (const [x, y] of [[322, 46], [328, 64], [322, 82]]) s += `<circle cx="${x}" cy="${y}" r="4.5" fill="${C.violet}" stroke="${C.encre}" stroke-width="1.5"/>`
s += `<circle cx="328" cy="64" r="13" fill="none" stroke="${C.accent}" stroke-width="1.5" stroke-dasharray="3 2.5"/>`
{
  const e1 = etiquette(8, 120, 'Dendrites'); leg += e1.svg; s += rappel(30, e1.boite.y, 50, 88)
  const e2 = etiquette(150, 30, ['Corps', 'cellulaire']); leg += e2.svg; s += rappel(e2.boite.x, 30, 110, 52)
  const e3 = etiquette(132, 102, 'Noyau'); leg += e3.svg; s += rappel(e3.boite.x, e3.boite.y + 4, 100, 69)
  const e4 = etiquette(212, 96, 'Axone', { ancre: 'middle' }); leg += e4.svg; s += rappel(212, e4.boite.y, 212, 64)
  const e5 = etiquette(354, 22, 'Terminaisons', { ancre: 'end' }); leg += e5.svg; s += rappel(316, e5.boite.y + e5.boite.h, 320, 41)
}
// ---- Synapse agrandie ----
const T = 158
s += `<path d="M322,77 L296,${T - 14}" stroke="${C.accent}" stroke-width="1" stroke-dasharray="3 2.5" opacity="0.8" fill="none"/>`
s += mention(196, T - 2, 'synapse agrandie')
// fin de l'axone (bouton)
s += `<path d="M12,${T + 46} H52 Q62,${T + 10} 112,${T + 8} Q172,${T + 8} 172,${T + 76} Q172,${T + 144} 112,${T + 144} Q62,${T + 142} 52,${T + 106} H12" fill="${C.violet}" stroke="${C.encre}" stroke-width="1.75"/>`
// vésicules avec neurotransmetteur
const ves = [[104, T + 40], [138, T + 52], [100, T + 82], [132, T + 96], [104, T + 118]]
for (const [x, y] of ves) {
  s += `<circle cx="${x}" cy="${y}" r="10" fill="#FFFFFF" stroke="${C.encre}" stroke-width="1.5"/>`
  for (const [dx, dy] of [[-3.5, -2], [3, -3], [0, 3.5]]) s += `<circle cx="${x + dx}" cy="${y + dy}" r="2" fill="${C.accent}"/>`
}
// neurotransmetteur dans la fente
for (const [x, y] of [[177, T + 70], [181, T + 78], [178, T + 62], [176, T + 92], [181, T + 46], [180, T + 102]]) s += `<circle cx="${x}" cy="${y}" r="2" fill="${C.accent}"/>`
// neurone suivant avec récepteurs
s += `<path d="M348,${T + 10} H206 Q196,${T + 10} 196,${T + 24} V${T + 128} Q196,${T + 142} 206,${T + 142} H348" fill="${C.violet}" stroke="${C.encre}" stroke-width="1.75"/>`
for (const y of [T + 34, T + 58, T + 82, T + 106, T + 128]) {
  s += `<path d="M197,${y - 5.5} H192 Q188,${y - 5.5} 188,${y - 2.5} V${y + 2.5} Q188,${y + 5.5} 192,${y + 5.5} H197" stroke="${C.encre}" stroke-width="1.75" fill="#FFFFFF"/>`
}
for (const y of [T + 58, T + 82]) s += `<circle cx="192.5" cy="${y}" r="2" fill="${C.accent}"/>`
{
  const e1 = etiquette(8, T + 2, "Fin de l'axone"); leg += e1.svg; s += rappel(40, e1.boite.y + e1.boite.h, 58, T + 32)
  const e2 = etiquette(8, T + 170, 'Vésicule'); leg += e2.svg; s += rappel(e2.boite.x + e2.boite.w, T + 164, 98, T + 127)
  const e3 = etiquette(184, T + 170, 'Neurotransmetteur', { ancre: 'middle' }); leg += e3.svg; s += rappel(180, e3.boite.y, 180, T + 104)
  const e4 = etiquette(354, T + 170, 'Récepteur', { ancre: 'end' }); leg += e4.svg; s += rappel(e4.boite.x + 8, e4.boite.y, 189, T + 131)
  const e5 = etiquette(282, T + 80, ['Neurone', 'suivant'], { ancre: 'middle', fond: C.violet }); leg += e5.svg
}
// sens du message
s += fleche(60, T + 194, 300, T + 194, { ep: 2.25, couleur: C.encre, taille: 8 })
s += mention(180, T + 212, 'sens du message', 'middle')
s += `<g font-size="11.5" font-weight="600" fill="${C.encre}">${leg}</g>`

ecrire('3eme/svt/neurone-synapse.svg', document(T + 220,
  'Neurone légendé, puis synapse agrandie : fin de l\'axone, vésicules, neurotransmetteur, récepteurs du neurone suivant, sens du message. Réviz, 3e SVT, système nerveux.', s))
