// -------------------------------------------------------
// Réviz — Réseau alimentaire d'une haie : herbe, graines, lapin, mulot, renard, chouette, et
// décomposeurs qui recyclent la matière morte. Flèches « est mangé par ». 4e SVT, relations alimentaires.
//   node scripts/illustrations/svt/reseau-alimentaire.mjs
// -------------------------------------------------------
import { C, document, ecrire, mention, fleche, largeur } from './_svt.mjs'

const N = {
  renard: [62, 50, 'Renard'], chouette: [172, 50, 'Chouette'],
  lapin: [62, 128, 'Lapin'], mulot: [172, 128, 'Mulot'],
  herbe: [62, 206, 'Herbe', true], graines: [172, 206, 'Graines', true],
}
const HB = 24
const boite = ([x, y, t, veg]) => {
  const w = largeur(t) + 22
  return `<rect x="${x - w / 2}" y="${y - HB / 2}" width="${w}" height="${HB}" rx="7" fill="${veg ? C.vertClair : '#FFFFFF'}" stroke="${veg ? C.vert : C.encre}" stroke-width="1.75"/>` +
    `<text x="${x}" y="${y + 4}" text-anchor="middle" font-size="11.5" font-weight="600" fill="${C.encre}">${t}</text>`
}
// flèche d'un aliment (bas) vers son mangeur (haut), de bord à bord
const mange = (a, b) => {
  const [x1, y1] = N[a], [x2, y2] = N[b]
  const dx = x2 - x1, dy = y2 - y1, n = Math.hypot(dx, dy)
  const k1 = (HB / 2 + 3) / Math.abs(dy / n), k2 = (HB / 2 + 4) / Math.abs(dy / n)
  return fleche(x1 + dx / n * k1, y1 + dy / n * k1, x2 - dx / n * k2, y2 - dy / n * k2, { ep: 1.75, taille: 7 })
}
let s = ''
// cadre de l'écosystème
s += `<rect x="12" y="20" width="214" height="204" rx="12" fill="none" stroke="${C.grisTrait}" stroke-width="1.5" stroke-dasharray="5 4"/>`
s += mention(20, 14, 'haie')
s += [['herbe', 'lapin'], ['graines', 'mulot'], ['herbe', 'mulot'], ['lapin', 'renard'], ['mulot', 'renard'], ['mulot', 'chouette']].map(([a, b]) => mange(a, b)).join('')
s += Object.values(N).map(boite).join('')
// Décomposeurs
s += fleche(228, 128, 256, 128, { ep: 1.75, taille: 7, tirets: '4 3', couleur: C.gris })
s += `<rect x="258" y="${128 - HB / 2}" width="98" height="${HB}" rx="7" fill="${C.ocre}" stroke="${C.encre}" stroke-width="1.75"/>`
s += `<text x="307" y="132" text-anchor="middle" font-size="11.5" font-weight="600" fill="${C.encre}">Décomposeurs</text>`
s += mention(309, 158, 'cadavres,', 'middle') + mention(309, 171, 'déchets,', 'middle') + mention(309, 184, 'feuilles mortes', 'middle')
// Légende de la flèche
s += fleche(16, 246, 46, 246, { ep: 1.75, taille: 7 }) + mention(54, 250, 'est mangé par')

ecrire('4eme/svt/reseau-alimentaire.svg', document(258,
  'Réseau alimentaire d\'une haie (flèches « est mangé par ») et décomposeurs. Réviz, 4e SVT, relations alimentaires.', s))
