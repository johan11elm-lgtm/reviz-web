// -------------------------------------------------------
// Réviz — Recomposition typographique du calligramme « Il pleut » de
// Guillaume Apollinaire (1880-1918), Calligrammes, Mercure de France, 1918
// (poème paru d'abord dans la revue SIC, n° 12, décembre 1916). Domaine public.
// Les cinq vers, sans ponctuation, sont écrits lettre à lettre en cinq lignes
// verticales légèrement obliques, comme des filets de pluie. Ce n'est pas un
// fac-similé : la disposition est simplifiée (colonnes parallèles, même départ).
// Pour 6e (Chanter et enchanter le monde) et 3e (Visions poétiques du monde).
//
//   node scripts/illustrations/figures/calligramme-il-pleut.mjs
//   → public/programme/illustrations/communs/calligramme-il-pleut.svg
// -------------------------------------------------------
import { writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ICI = path.dirname(fileURLToPath(import.meta.url))
const SORTIE = path.resolve(ICI, '../../../public/programme/illustrations/communs/calligramme-il-pleut.svg')

const VERS = [
  'Il pleut des voix de femmes comme si elles étaient mortes même dans le souvenir',
  'c’est vous aussi qu’il pleut merveilleuses rencontres de ma vie ô gouttelettes',
  'et ces nuages cabrés se prennent à hennir tout un univers de villes auriculaires',
  'écoute s’il pleut tandis que le regret et le dédain pleurent une ancienne musique',
  'écoute tomber les liens qui te retiennent en haut et en bas',
]
const PAS = 8.8 // écart vertical entre deux lettres
const DERIVE = 0.42 // décalage horizontal par lettre (oblique)
const X0 = 36
const ECART = 68
const Y0 = 24
const r1 = v => Math.round(v * 10) / 10
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;')

let maxY = 0
const colonnes = VERS.map((v, k) => {
  const lettres = [...v]
  // L'apostrophe (glyphe haut) se place à droite de la lettre qui la précède,
  // sans prendre de pas : sinon elle ressemble à une cédille sous la lettre.
  const xs = []
  const ys = []
  let t = 0
  lettres.forEach((c, i) => {
    if (i && c !== '’') t += 1
    const x = X0 + k * ECART + t * DERIVE + (c === '’' ? 4 : 0)
    xs.push(r1(x))
    ys.push(r1(Y0 + t * PAS))
  })
  maxY = Math.max(maxY, ys[ys.length - 1])
  // Espaces insécables : chaque caractère garde sa place (pas de fusion des blancs).
  return `<text x="${xs.join(' ')}" y="${ys.join(' ')}">${esc(v.replace(/ /g, ' '))}</text>`
})
const H = Math.ceil(maxY + 14)
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 ${H}" font-family="Georgia, 'Times New Roman', serif">
<!-- « Il pleut », calligramme de Guillaume Apollinaire (Calligrammes, 1918, domaine public), recomposé lettre à lettre en cinq lignes verticales obliques. Réviz, 6e et 3e français (poésie). Généré par scripts/illustrations/figures/calligramme-il-pleut.mjs -->
<g font-size="10" fill="#2D2B57" text-anchor="middle">
${colonnes.join('\n')}
</g>
</svg>
`
writeFileSync(SORTIE, svg)
console.log(`calligramme-il-pleut.svg : ${(Buffer.byteLength(svg) / 1024).toFixed(1)} Ko, hauteur ${H}`)
