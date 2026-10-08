// Réviz — 6e maths, « Volumes et vision dans l'espace », sections 3 et 4 : l'escalier de
// 3 marches, d'un cube de profondeur (3 cubes en bas, 2 au milieu, 1 en haut : 6 cubes),
// en perspective cavalière (fuyantes à 45°, coefficient 0,5), et ses trois vues à plat :
// de face, de côté, de dessus. Faces de face, de dessus et de côté de la même teinte que
// la vue correspondante. Figure calculée.
import { C, P, add, poly, etiquette, ecrire, f } from './_m56.mjs'

const FACE = C.aplat, DESSUS = '#EAE8F2', COTE = '#DCE6FA'
const hauteurs = [3, 2, 1] // colonnes de gauche à droite
const s = 34, k = 0.5, fx = s * k * Math.SQRT1_2, fy = -s * k * Math.SQRT1_2 // fuyante
const O = P(20, 172) // coin avant gauche du bas
const pr = (x, y, z) => P(O.x + x * s + y * fx, O.y - z * s + y * fy) // x largeur, y profondeur, z hauteur
const faces = []
const existe = (x, z) => x >= 0 && x < hauteurs.length && z < hauteurs[x]
for (let x = 0; x < hauteurs.length; x++) {
  for (let z = 0; z < hauteurs[x]; z++) {
    faces.push([FACE, [pr(x, 0, z), pr(x + 1, 0, z), pr(x + 1, 0, z + 1), pr(x, 0, z + 1)]])
    if (!existe(x, z + 1)) faces.push([DESSUS, [pr(x, 0, z + 1), pr(x + 1, 0, z + 1), pr(x + 1, 1, z + 1), pr(x, 1, z + 1)]])
    if (!existe(x + 1, z)) faces.push([COTE, [pr(x + 1, 0, z), pr(x + 1, 1, z), pr(x + 1, 1, z + 1), pr(x + 1, 0, z + 1)]])
  }
}
const persp = faces.map(([c, pts]) => `<path d="${poly(pts)}" fill="${c}"/>`).join('')
const aretes = faces.map(([, pts]) => poly(pts)).join(' ')

// vues à plat (carrés de 22)
const q = 22
const carres = (x0, y0, cases, fill) => {
  const d = cases.map(([i, j]) => poly([P(x0 + i * q, y0 + j * q), P(x0 + (i + 1) * q, y0 + j * q), P(x0 + (i + 1) * q, y0 + (j + 1) * q), P(x0 + i * q, y0 + (j + 1) * q)])).join(' ')
  return `<path d="${d}" fill="${fill}" stroke="${C.encre}" stroke-width="1.5" stroke-linejoin="round"/>`
}
const vueFace = [], yF = 40
hauteurs.forEach((h, i) => { for (let z = 0; z < h; z++) vueFace.push([i, 2 - z]) })
const xF = 186, xC = 296, yD = 150

ecrire('6eme/maths/escalier-cubes-trois-vues.svg', 210,
  "Escalier de 3 marches d'un cube de profondeur (3 cubes en bas, 2 au milieu, 1 en haut, soit 6 cubes) en perspective cavalière, et ses trois vues : de face, un escalier de 6 carrés ; de côté, une colonne de 3 carrés ; de dessus, une rangée de 3 carrés. Réviz, 6e maths, volumes et vision dans l'espace.",
  [
    persp,
    `<path d="${aretes}" fill="none" stroke="${C.encre}" stroke-width="1.5" stroke-linejoin="round"/>`,
    `<path d="M160,24 V196" stroke="${C.separateur}" stroke-width="1"/>`,
    carres(xF, yF, vueFace, FACE),
    carres(xC, yF, [[0, 0], [0, 1], [0, 2]], COTE),
    carres(xF, yD, [[0, 0], [1, 0], [2, 0]], DESSUS),
    etiquette(xF + 33, yF + 3 * q + 18, 'De face', { a: 'middle' }),
    etiquette(xC + 11, yF + 3 * q + 18, 'De côté', { a: 'middle' }),
    etiquette(xF + 33, yD + q + 18, 'De dessus', { a: 'middle' }),
  ])
