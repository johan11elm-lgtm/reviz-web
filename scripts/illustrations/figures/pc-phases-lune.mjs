// Réviz — Phases de la Lune, vue de dessus (pôle Nord) : Soleil à gauche (rayons parallèles),
// Terre au centre, huit positions de la Lune sur son orbite (sens inverse des aiguilles d'une
// montre), chacune avec sa moitié éclairée tournée vers le Soleil ; à l'extérieur, l'aspect de la
// Lune vu depuis la Terre (hémisphère Nord). Les quatre phases principales sont nommées.
// Figure commune : 6eme/sciences-et-technologie/la-terre-dans-le-systeme-solaire (huit positions)
// et 5eme/physique-chimie/systeme-solaire-et-univers (quatre phases principales).
// Pas à l'échelle (distances et tailles).
// Sortie : public/programme/illustrations/communs/phases-lune.svg
import { C, r1, doc, etq, mention, ecrireSvg, flecheDroite, pointe } from './_pc.mjs'

const CX = 222, CY = 156, R = 74, RA = 112, RL = 10, RAS = 11
const corps = []
// Soleil (bord gauche) et rayons parallèles
corps.push(`<path d="M0,${CY - 92} A120,120 0 0 1 0,${CY + 92}" fill="#FBE9DD" stroke="${C.accent}" stroke-width="2.25"/>`)
for (const dy of [-64, 0, 64]) corps.push(flecheDroite([48, CY + dy], [78, CY + dy], { couleur: C.accent, epaisseur: 1.75, long: 7, large: 6 }))
// orbite
corps.push(`<circle cx="${CX}" cy="${CY}" r="${R}" fill="none" stroke="${C.encre}" stroke-width="1" opacity="0.45" stroke-dasharray="4 4"/>`)
// sens de rotation (petite flèche sur l'orbite, en bas à droite)
{
  const a1 = 330 * Math.PI / 180, a2 = 341 * Math.PI / 180
  const p = a => [CX + R * Math.cos(a), CY - R * Math.sin(a)]
  const [x1, y1] = p(a1), [x2, y2] = p(a2)
  corps.push(pointe(p(a1 - 0.05), p(a2), { long: 8, large: 7 }))
}
// Terre : moitié éclairée côté Soleil
corps.push(`<circle cx="${CX}" cy="${CY}" r="15" fill="${C.bleuClair}" stroke="${C.bleu}" stroke-width="1.75"/>`)
corps.push(`<path d="M${CX},${CY - 15} A15,15 0 0 1 ${CX},${CY + 15} Z" fill="${C.encre}" opacity="0.55"/>`)
// Lune sur l'orbite : moitié gauche (vers le Soleil) éclairée
const lune = (x, y) => `<circle cx="${r1(x)}" cy="${r1(y)}" r="${RL}" fill="#FFFFFF" stroke="${C.encre}" stroke-width="1.5"/><path d="M${r1(x)},${r1(y - RL)} A${RL},${RL} 0 0 1 ${r1(x)},${r1(y + RL)} Z" fill="${C.encre}"/>`
// Aspect vu depuis la Terre, angle de phase phi (0 = nouvelle lune, 180 = pleine lune)
function aspect(x, y, phi) {
  const r = RAS, c = Math.cos(phi * Math.PI / 180)
  let s = `<circle cx="${r1(x)}" cy="${r1(y)}" r="${r}" fill="${C.encre}" stroke="${C.encre}" stroke-width="1.5"/>`
  if (phi === 0) return s
  if (phi === 180) return `<circle cx="${r1(x)}" cy="${r1(y)}" r="${r}" fill="#FFFFFF" stroke="${C.encre}" stroke-width="1.5"/>`
  const croissante = phi < 180                      // limbe droit éclairé
  const ph = croissante ? phi : 360 - phi
  const cc = Math.cos(ph * Math.PI / 180)
  const ex = r1(Math.abs(cc) * r)
  // limbe éclairé (demi-cercle droit ou gauche) puis terminateur (demi-ellipse)
  const s1 = croissante ? 1 : 0
  const s2 = croissante ? (cc > 0 ? 0 : 1) : (cc > 0 ? 1 : 0)
  s += `<path d="M${r1(x)},${r1(y - r)} A${r},${r} 0 0 ${s1} ${r1(x)},${r1(y + r)} A${ex},${r} 0 0 ${s2} ${r1(x)},${r1(y - r)} Z" fill="#FFFFFF"/>`
  s += `<circle cx="${r1(x)}" cy="${r1(y)}" r="${r}" fill="none" stroke="${C.encre}" stroke-width="1.5"/>`
  return s
}
// positions : angle écran (0 = droite, sens trigonométrique, y vers le haut) ; nouvelle lune à gauche
for (let k = 0; k < 8; k++) {
  const phi = k * 45                     // angle de phase
  const a = (180 + phi) * Math.PI / 180  // la Lune avance dans le sens inverse des aiguilles d'une montre
  const x = CX + R * Math.cos(a), y = CY - R * Math.sin(a)
  corps.push(lune(x, y))
  const xa = CX + RA * Math.cos(a), ya = CY - RA * Math.sin(a)
  corps.push(aspect(xa, ya, phi))
}
// étiquettes des quatre phases principales (près de l'aspect vu depuis la Terre)
corps.push(etq(CX - RA, CY - 36, ['Nouvelle', 'lune'], 'middle'))
corps.push(etq(CX + 18, CY + RA + 4, 'Premier quartier'))
corps.push(etq(348, CY + 30, ['Pleine', 'lune'], 'end'))
corps.push(etq(CX + 18, CY - RA + 4, 'Dernier quartier'))
corps.push(etq(CX, CY + 32, 'Terre', 'middle'))
corps.push(etq(14, 22, 'Soleil'))
corps.push(mention(14, 42, ['à l’extérieur :', 'vue depuis', 'la Terre']))

const svg = doc(CY + RA + RAS + 14,
  'Phases de la Lune vues de dessus : Soleil à gauche, Terre au centre, huit positions de la Lune sur son orbite, moitié éclairée tournée vers le Soleil, et à l’extérieur l’aspect vu depuis la Terre (nouvelle lune, premier quartier, pleine lune, dernier quartier). Réviz, 6e sciences et 5e physique-chimie.',
  corps)
ecrireSvg('phases-lune', svg, 'communs')
