// Réviz — 5e maths, « Angles et triangles » : deux parallèles (d) et (d') coupées
// par une sécante (angle aigu de 65°, comme dans l'exemple de la section 3).
// Trois fois la même configuration : une paire d'angles alternes-internes, une paire
// de correspondants, une paire d'opposés par le sommet. Figure calculée.
import { C, P, pol, seg, arc, secteur, chevron, noms, etiquette, ecrire, f } from './_m56.mjs'

const ALPHA = 65 // angle aigu entre la sécante et les parallèles
const yD = 58, yD2 = 130, R = 15
const gauche = 30, largeur = 110
const paires = [
  { titre: ['Alternes-internes'], angles: [['P', 180, 180 + ALPHA], ['Q', 0, ALPHA]] },
  { titre: ['Correspondants'], angles: [['P', 0, ALPHA], ['Q', 0, ALPHA]] },
  { titre: ['Opposés par', 'le sommet'], angles: [['P', 0, ALPHA], ['P', 180, 180 + ALPHA]] },
]
const traits = [], aplats = [], arcs = [], points = [], etiquettes = [], seps = [], chevrons = []
paires.forEach((p, i) => {
  const x0 = gauche + i * largeur, cx = x0 + largeur / 2
  const dx = (yD2 - yD) / 2 / Math.tan((ALPHA * Math.PI) / 180)
  const Pp = P(cx + dx, yD), Q = P(cx - dx, yD2)
  traits.push(seg(P(x0 + 6, yD), P(x0 + largeur - 6, yD)), seg(P(x0 + 6, yD2), P(x0 + largeur - 6, yD2)))
  traits.push(seg(pol(Q, 40, 180 + ALPHA), pol(Pp, 40, ALPHA)))
  chevrons.push(chevron(P(x0 + largeur - 20, yD), 0), chevron(P(x0 + largeur - 20, yD2), 0))
  for (const [q, d1, d2] of p.angles) {
    const s = q === 'P' ? Pp : Q
    aplats.push(secteur(s, R, d1, d2))
    arcs.push(arc(s, R, d1, d2))
  }
  points.push(Pp, Q)
  const yT = p.titre.length === 1 ? 192 : 186
  etiquettes.push(etiquette(cx, yT, p.titre, { a: 'middle' }))
  if (i > 0) seps.push(`M${f(x0)},20 V170`)
})

ecrire('5eme/maths/angles-paralleles-secante.svg', 206,
  "Deux droites parallèles (d) et (d') coupées par une sécante, trois fois : angles alternes-internes, angles correspondants, angles opposés par le sommet (65° chacun). Réviz, 5e maths, angles et triangles.",
  [
    `<path d="${seps.join(' ')}" stroke="${C.separateur}" stroke-width="1"/>`,
    `<path d="${aplats.join(' ')}" fill="${C.aplat}"/>`,
    `<path d="${traits.join(' ')}" fill="none" stroke="${C.encre}" stroke-width="1.75" stroke-linecap="round"/>`,
    `<path d="${chevrons.join(' ')}" fill="none" stroke="${C.encre}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`,
    `<path d="${arcs.join(' ')}" fill="none" stroke="${C.accent}" stroke-width="2.25"/>`,
    `<g>${points.map(p => `<circle cx="${f(p.x)}" cy="${f(p.y)}" r="2.2"/>`).join('')}</g>`,
    noms([[4, yD + 4.5, '(d)', 'start'], [4, yD2 + 4.5, "(d')", 'start']]),
    ...etiquettes,
  ])
