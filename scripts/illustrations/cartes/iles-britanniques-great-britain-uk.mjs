// -------------------------------------------------------
// Réviz — 3e anglais, « Comparatif et superlatif ».
// Carte des îles Britanniques : le United Kingdom (England, Scotland, Wales,
// Northern Ireland), l'île de Great Britain (contour en accent : England,
// Scotland, Wales), la République d'Irlande, les capitales, le Ben Nevis
// (56,80° N, 5,00° W), la Severn et la Tamise.
// Fond Natural Earth 50m (domaine public) via carto.mjs ; fleuves : Natural Earth 10m.
// Le contour de Great Britain est l'anneau principal de chacune des trois
// nations (îles côtières non entourées). Les Shetland sont hors cadre.
//
//   node scripts/illustrations/cartes/iles-britanniques-great-britain-uk.mjs
// -------------------------------------------------------
import { C, FONT, HALO, compact, texte, intitule, ecrireSvg, r1 } from './_commun.mjs'
import { fondIles } from './_anglais-francais.mjs'

const W = 360
const { z, cadre, unites, fleuve } = fondIles({ x: 12, y: 12, largeur: 336 },
  [[-10.6, 51.4], [1.8, 51.4], [-5, 49.9], [-4, 59.0], [-10.4, 54]], [-4.3, 54.6])
const UK = ['ENG', 'SCT', 'WLS', 'NIR']
const GB = ['ENG', 'SCT', 'WLS']
const IRL_FILL = C.ocre
const d = (list, aireMin = 0.8) => compact(list.flatMap(p => p.rings), { prec: 0.5, aireMin })
const uk = unites.filter(u => UK.includes(u.unite))
const irl = unites.filter(u => u.unite === 'IRL')
const autres = unites.filter(u => !UK.includes(u.unite) && u.unite !== 'IRL')
const aire = r => Math.abs(r.reduce((a, [x1, y1], i) => { const [x2, y2] = r[(i + 1) % r.length]; return a + x1 * y2 - x2 * y1 }, 0) / 2)
const ileGB = unites.filter(u => GB.includes(u.unite)).map(u => ({ rings: [u.rings.reduce((m, r) => (aire(r) > aire(m) ? r : m))] }))

const pt = (lo, la) => z.xy(lo, la)
// Capitales [nom, lon, lat, dx, dy, ancre]
const CAP = [
  ['London', -0.13, 51.51, 7, -6, 'start'],
  ['Edinburgh', -3.19, 55.95, 7, 4, 'start'],
  ['Cardiff', -3.18, 51.48, -7, 13, 'end'],
  ['Belfast', -5.93, 54.6, 7, 4, 'start'],
  ['Dublin', -6.26, 53.35, 7, 4, 'start'],
]
const NATIONS = [
  ['England', -1.5, 53.35],
  ['Scotland', -4.6, 57.6],
  ['Wales', -4.75, 52.25],
]
const etiq = []
for (const [n, lo, la] of NATIONS) etiq.push(intitule(...pt(lo, la), n))
{
  const [x, y] = pt(-10.3, 55.9)
  etiq.push(intitule(x, y, ['Northern', 'Ireland']))
  const [cx, cy] = pt(-6.9, 54.75)
  etiq.push(`<path d="M${r1(x + 50)},${r1(y + 15)}L${r1(cx)},${r1(cy)}" stroke="${C.encre}" stroke-width="1" opacity="0.6"/><circle cx="${r1(cx)}" cy="${r1(cy)}" r="1.8" fill="${C.encre}"/>`)
}
const caps = []
for (const [n, lo, la, dx, dy, an] of CAP) {
  const [x, y] = pt(lo, la)
  caps.push(`<rect x="${r1(x - 3.2)}" y="${r1(y - 3.2)}" width="6.4" height="6.4" fill="${C.encre}" stroke="#FFFFFF" stroke-width="1"/>`)
  const w = n.length * 6.3 + 6
  const tx = x + dx
  const rx = an === 'end' ? tx - w + 3 : tx - 3
  caps.push(`<g class="ill-legende"><rect class="ill-fond" x="${r1(rx)}" y="${r1(y + dy - 11)}" width="${r1(w)}" height="15" rx="4" fill="#FFFFFF"/>` +
    texte(tx, y + dy, n, an === 'end' ? 'text-anchor="end"' : '') + '</g>')
}
// Ben Nevis : triangle
const [bx, by] = pt(-5.0037, 56.7969)
const ben = `<path d="M${r1(bx)},${r1(by - 5)}L${r1(bx + 5)},${r1(by + 4)}L${r1(bx - 5)},${r1(by + 4)}Z" fill="${C.accent}" stroke="#FFFFFF" stroke-width="1"/>` +
  intitule(bx + 9, by + 8, 'Ben Nevis')
// Fleuves
const [sx, sy] = pt(-2.05, 52.5)
const [tx, ty] = pt(-1.75, 51.2)
const fl = intitule(sx, sy, 'the Severn') + intitule(tx, ty + 11, 'the Thames')

// Légende
const yL = cadre[3] + 24
const L = [
  `<rect x="14" y="${yL - 11}" width="26" height="14" fill="${C.violet}" stroke="${C.encre}" stroke-width="0.75"/>`,
  intitule(50, yL, 'the United Kingdom'),
  `<rect x="15" y="${yL + 21 - 10}" width="24" height="12" fill="${C.violet}" stroke="${C.accent}" stroke-width="2.25"/>`,
  intitule(50, yL + 21, 'Great Britain (the island)'),
  `<rect x="14" y="${yL + 42 - 11}" width="26" height="14" fill="${IRL_FILL}" stroke="${C.encre}" stroke-width="0.75"/>`,
  intitule(50, yL + 42, 'the Republic of Ireland'),
]
const H = yL + 42 + 12

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" font-family="${FONT}">
<!-- Les îles Britanniques : United Kingdom, île de Great Britain, République d'Irlande, capitales, Ben Nevis, Severn et Tamise. Réviz, 3e anglais, comparatif et superlatif. Généré par scripts/illustrations/cartes/iles-britanniques-great-britain-uk.mjs -->
<rect x="${cadre[0]}" y="${cadre[1]}" width="${cadre[2] - cadre[0]}" height="${cadre[3] - cadre[1]}" fill="${C.mer}"/>
<path d="${d(autres)}" fill="${C.voisin}" stroke="${C.voisinTrait}" stroke-width="0.6" stroke-linejoin="round"/>
<path d="${d(ileGB, 4)}" fill="none" stroke="${C.accent}" stroke-width="4.5" stroke-linejoin="round"/>
<path d="${d(irl)}" fill="${IRL_FILL}" stroke="${C.encre}" stroke-width="0.9" stroke-linejoin="round"/>
<path d="${d(uk)}" fill="${C.violet}" stroke="${C.encre}" stroke-width="0.9" stroke-linejoin="round"/>
<path d="${fleuve('Thames')}${fleuve('Severn')}" fill="none" stroke="${C.bleu}" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"/>
<rect x="${cadre[0]}" y="${cadre[1]}" width="${cadre[2] - cadre[0]}" height="${cadre[3] - cadre[1]}" fill="none" stroke="${C.grisTrait}" stroke-width="0.75"/>
<g font-size="11" font-weight="600" fill="${C.gris}" ${HALO}>
${texte(...pt(1.2, 49.98), 'France', 'text-anchor="end"')}
${texte(...pt(1.7, 56.6), 'North Sea', 'text-anchor="end"')}
</g>
<g font-size="11.5" font-weight="600" fill="${C.encre}">
${etiq.join('\n')}
${ben}
${fl}
${caps.join('\n')}
${L.join('\n')}
</g>
</svg>
`
ecrireSvg('iles-britanniques-great-britain-uk', svg, '3eme/anglais')
