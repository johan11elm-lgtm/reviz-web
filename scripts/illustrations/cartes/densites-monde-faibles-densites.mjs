// -------------------------------------------------------
// Réviz — 6e géographie, « Les espaces de faible densité ».
// Planisphère des densités de population par pays en 2024 (teintes claires =
// faibles densités), avec les grands espaces peu peuplés nommés : Sahara, désert
// australien, Grand Nord canadien, Sibérie, Groenland, Antarctique, Himalaya,
// Andes, Amazonie.
// Données : ONU, World Population Prospects 2024 (densités par pays, voir
// scripts/illustrations/extraire-densites-wpp.mjs et donnees/densites-pays-2024.json).
// Fond : Natural Earth 1:50m (domaine public), via carto.mjs.
// Une densité par pays est une moyenne : l'Himalaya, peu peuplé, est dans des pays
// denses (Inde, Népal, Chine) ; la carte le montre volontairement (piège du chapitre).
//
//   node scripts/illustrations/cartes/densites-monde-faibles-densites.mjs
// -------------------------------------------------------
import { C, FONT, compact, ecrireSvg, r1, titrePartie, xml } from './_commun.mjs'
import { fondMonde, nomMasquable, fichePays, classeDensite, CLASSES_DENSITE, TEINTES_DENSITE, bordLeger, graticuleLeger } from './_geographie-5e-6e.mjs'

const W = 360
const SUD = -90
const NORD = 84
const f = fondMonde({ x: 12, y: 12, largeur: 336 }, { sud: SUD, nord: NORD, tol: 1.1, aireMin: 2.5 })
const { m } = f
const xy = m.xy
const yCarte = r1(12 + m.hauteur)

const parClasse = CLASSES_DENSITE.map(() => [])
for (const p of f.pays) parClasse[classeDensite(fichePays(p)?.densite)].push(...p.rings)
const bord = bordLeger(m, SUD, NORD)

// Montagnes : chevrons (comme sur la carte des densités de France, 3e)
const chevron = (lo, la) => { const [x, y] = xy(lo, la); return `M${r1(x - 4)},${r1(y + 2.5)}l4-5 4,5` }
const montagnes = [[84, 29.5], [90, 28.5], [-69, -18], [-70, -32], [-77, -6]].map(([lo, la]) => chevron(lo, la)).join('')

const NOMS = [
  [-104, 63, ['Grand Nord', 'canadien']],
  [-40, 71, 'Groenland'],
  [102, 64, 'Sibérie'],
  [6, 23, 'Sahara'],
  [80, 36.5, 'Himalaya'],
  [-60, -6, 'Amazonie'],
  [-100, -26, 'Andes'],
  [131, -24, ['Désert', 'australien']],
  [20, -80, 'Antarctique'],
]
const noms = NOMS.map(([lo, la, s]) => { const [x, y] = xy(lo, la); return nomMasquable(x, y, s) }).join('\n')
// Trait de rappel des Andes (nom posé dans le Pacifique)
const [ax, ay] = xy(-100, -26)
const [bx, by] = xy(-71, -24)
const rappelAndes = `<path d="M${r1(ax + 20)},${r1(ay - 4)}L${r1(bx - 4)},${r1(by)}" stroke="${C.encre}" stroke-width="1" opacity="0.6"/>`

// Légende : 5 classes
const yL = yCarte + 26
const lw = 62
const leg = CLASSES_DENSITE.map((c, i) => {
  const x = 14 + i * (lw + 4)
  return `<rect x="${x}" y="${yL + 6}" width="${lw}" height="12" fill="${TEINTES_DENSITE[i]}" stroke="${C.encre}" stroke-width="0.75"/>` +
    `<text x="${x + lw / 2}" y="${yL + 33}" text-anchor="middle">${xml(c.texte)}</text>`
}).join('')
const H = yL + 42

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" font-family="${FONT}">
<!-- Planisphère des densités de population par pays en 2024 (ONU, WPP 2024), cinq classes du plus clair (moins de 10 hab./km²) au plus foncé (plus de 300), avec les grands espaces peu peuplés nommés. Réviz, 6e géographie, les espaces de faible densité. Fond Natural Earth (domaine public). Généré par scripts/illustrations/cartes/densites-monde-faibles-densites.mjs -->
<path d="${bord}" fill="#FFFFFF"/>
<path d="${graticuleLeger(m, 30, SUD, NORD)}" fill="none" stroke="${C.grisTrait}" stroke-width="0.5" opacity="0.7"/>
<path d="${f.terres}" fill="none" stroke="${C.encre}" stroke-width="1.7" stroke-linejoin="round"/>
${parClasse.map((rings, i) => `<path d="${compact(rings, { prec: 0.5, aireMin: 2.5 })}" fill="${TEINTES_DENSITE[i]}" stroke="#FFFFFF" stroke-width="0.4" stroke-linejoin="round"/>`).join('\n')}
<path d="${montagnes}" fill="none" stroke="${C.encre}" stroke-width="1.5" stroke-linejoin="round"/>
<path d="${bord}" fill="none" stroke="${C.encre}" stroke-width="0.75"/>
<g font-size="11.5" font-weight="600" fill="${C.encre}">
${noms}
</g>
${rappelAndes}
${titrePartie(12, yL, 'Densité de population en 2024 (hab./km²)')}
<g font-size="11" font-weight="600" fill="${C.encre}">${leg}</g>
</svg>
`
ecrireSvg('densites-monde-faibles-densites', svg, '6eme/geographie')
