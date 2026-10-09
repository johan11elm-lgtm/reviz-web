// Réviz — Chromatographie d'une encre noire : au départ, une tache d'encre déposée sur le papier
// au-dessus du niveau du solvant ; à la fin, le solvant est monté dans le papier et a séparé trois
// colorants (trois taches à des hauteurs différentes) : l'encre noire est un mélange.
// Couleurs des taches indicatives. Chapitre 5eme/physique-chimie/separer-les-constituants-d-un-melange
// (section 5, quiz 6).
// Sortie : public/programme/illustrations/5eme/physique-chimie/chromatographie-encre.svg
import { C, r1, doc, etq, mention, rappel, ecrireSvg } from './_pc.mjs'

const corps = []
const T = `stroke="${C.encre}" stroke-width="1.75" stroke-linejoin="round" fill="none"`
const Y0 = 52, Y1 = 226, ySol = 202, yDep = 186, PW = 34
function cuve(x0, x1, fin) {
  const xm = (x0 + x1) / 2, out = []
  out.push(`<path d="M${x0 + 1.5},${ySol} H${x1 - 1.5} V${Y1 - 1.5} H${x0 + 1.5} Z" fill="${C.bleuClair}"/>`)
  // papier
  const front = fin ? 76 : ySol
  out.push(`<rect x="${xm - PW / 2}" y="${Y0 - 6}" width="${PW}" height="${Y1 - 8 - Y0 + 6}" fill="#FFFFFF" stroke="${C.encre}" stroke-width="1.5"/>`)
  if (fin) out.push(`<rect x="${xm - PW / 2 + 0.75}" y="${front}" width="${PW - 1.5}" height="${ySol - front}" fill="${C.mer}"/>`)
  out.push(`<path d="M${xm - PW / 2 + 0.75},${ySol} H${xm + PW / 2 - 0.75}" stroke="${C.bleu}" stroke-width="1.5"/>`)
  // ligne de dépôt (crayon)
  out.push(`<path d="M${xm - PW / 2 + 4},${yDep} H${xm + PW / 2 - 4}" stroke="${C.gris}" stroke-width="1" stroke-dasharray="3 2"/>`)
  // cuve et baguette
  out.push(`<path d="M${x0 - 4},${Y0} q4,0 4,4 V${Y1} H${x1} V${Y0 + 4} q0,-4 4,-4" ${T}/>`)
  out.push(`<path d="M${xm - 30},${Y0 - 6} H${xm + 30}" stroke="${C.encre}" stroke-width="3" stroke-linecap="round"/>`)
  return out
}
// au départ
const A = [72, 146], B = [204, 278]
corps.push(...cuve(...A, false))
const xa = (A[0] + A[1]) / 2, xb = (B[0] + B[1]) / 2
corps.push(`<circle cx="${xa}" cy="${yDep}" r="4.5" fill="#2B2A33"/>`)
corps.push(mention(xa, 22, 'au départ', 'middle'))
// à la fin
corps.push(...cuve(...B, true))
const taches = [[164, '#E3B23C'], [132, C.rouge], [96, C.bleu]]
for (const [y, c] of taches) corps.push(`<ellipse cx="${xb}" cy="${y}" rx="8" ry="5.5" fill="${c}" opacity="0.9"/>`)
corps.push(mention(xb, 22, 'à la fin', 'middle'))
// étiquettes
corps.push(etq(14, 112, 'Papier'))
corps.push(rappel([56, 108], [xa - PW / 2 + 3, 112]))
corps.push(etq(14, 168, ['Encre', 'noire']))
corps.push(rappel([52, 172], [xa - 5, yDep - 1]))
corps.push(etq(14, 222, 'Solvant'))
corps.push(rappel([62, 218], [A[0] + 6, 212]))
corps.push(etq(286, 136, 'Colorants'))
corps.push(rappel([283, 132], [xb + 9, 132]))

const svg = doc(Y1 + 14,
  'Chromatographie d’une encre noire : au départ, une tache d’encre sur un papier dont le bas trempe dans le solvant ; à la fin, le solvant est monté dans le papier et a séparé trois taches de couleurs différentes à des hauteurs différentes. Réviz, 5e physique-chimie.',
  corps)
ecrireSvg('chromatographie-encre', svg, '5eme/physique-chimie')
