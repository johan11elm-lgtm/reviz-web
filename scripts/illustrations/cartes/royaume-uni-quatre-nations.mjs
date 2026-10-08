// -------------------------------------------------------
// Réviz — 6e anglais, « Londres, l'impératif et les directions ».
// Carte du Royaume-Uni : les quatre nations (England, Scotland, Wales,
// Northern Ireland), leurs capitales et la Tamise (the Thames) à Londres.
// Fond Natural Earth 50m (domaine public) via carto.mjs ; Tamise : Natural Earth 10m.
// Les Shetland, au nord du cadre, ne sont pas représentées.
//
//   node scripts/illustrations/cartes/royaume-uni-quatre-nations.mjs
// -------------------------------------------------------
import { C, FONT, HALO, compact, texte, intitule, ecrireSvg, r1 } from './_commun.mjs'
import { fondIles } from './_anglais-francais.mjs'

const W = 360
const { z, cadre, unites, fleuve } = fondIles({ x: 12, y: 12, largeur: 336 },
  [[-10.6, 51.4], [1.8, 51.4], [-5, 49.9], [-4, 59.0], [-10.4, 54]], [-4.3, 54.6])
const UK = ['ENG', 'SCT', 'WLS', 'NIR']
const d = list => compact(list.flatMap(p => p.rings), { prec: 0.5, aireMin: 0.8 })
const uk = unites.filter(u => UK.includes(u.unite))
const autres = unites.filter(u => !UK.includes(u.unite))

// Capitales [nom, lon, lat, dx, dy, ancre]
const CAP = [
  ['London', -0.13, 51.51, 7, -6, 'start'],
  ['Edinburgh', -3.19, 55.95, 7, 4, 'start'],
  ['Cardiff', -3.18, 51.48, -7, 13, 'end'],
  ['Belfast', -5.93, 54.6, 7, 4, 'start'],
]
// Nations (étiquettes masquables), position en lon/lat du début du texte
const NATIONS = [
  ['England', -1.9, 52.6],
  ['Scotland', -5.0, 57.25],
  ['Wales', -4.75, 52.25],
]
// Northern Ireland : étiquette en mer, au nord-ouest, reliée par un trait de rappel
const NI = { lon: -10.3, lat: 55.9, vers: [-6.9, 54.75] }

const H = cadre[3] + 12
const pt = (lo, la) => z.xy(lo, la)
const etiq = []
for (const [n, lo, la, l2] of NATIONS) {
  const [x, y] = pt(lo, la)
  etiq.push(intitule(x, y, l2 ? [n, l2] : n))
}
{
  const [x, y] = pt(NI.lon, NI.lat)
  etiq.push(intitule(x, y, ['Northern', 'Ireland']))
  const [cx, cy] = pt(...NI.vers)
  const x0 = x + 50
  const y0 = y + 15
  etiq.push(`<path d="M${r1(x0)},${r1(y0)}L${r1(cx)},${r1(cy)}" stroke="${C.encre}" stroke-width="1" opacity="0.6"/><circle cx="${r1(cx)}" cy="${r1(cy)}" r="1.8" fill="${C.encre}"/>`)
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
// Tamise : nom posé sous l'estuaire
const [tx, ty] = pt(-1.75, 51.2)
const tamise = intitule(tx, ty + 11, 'the Thames')

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" font-family="${FONT}">
<!-- Le Royaume-Uni et ses quatre nations (England, Scotland, Wales, Northern Ireland), leurs capitales et la Tamise. Réviz, 6e anglais, Londres, l'impératif et les directions. Généré par scripts/illustrations/cartes/royaume-uni-quatre-nations.mjs -->
<rect x="${cadre[0]}" y="${cadre[1]}" width="${cadre[2] - cadre[0]}" height="${cadre[3] - cadre[1]}" fill="${C.mer}"/>
<path d="${d(autres)}" fill="${C.voisin}" stroke="${C.voisinTrait}" stroke-width="0.6" stroke-linejoin="round"/>
<path d="${d(uk)}" fill="${C.violet}" stroke="${C.encre}" stroke-width="0.9" stroke-linejoin="round"/>
<path d="${fleuve('Thames')}" fill="none" stroke="${C.bleu}" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"/>
<rect x="${cadre[0]}" y="${cadre[1]}" width="${cadre[2] - cadre[0]}" height="${cadre[3] - cadre[1]}" fill="none" stroke="${C.grisTrait}" stroke-width="0.75"/>
<g font-size="11" font-weight="600" fill="${C.gris}" ${HALO}>
${texte(...pt(-9.6, 52.9), 'Republic')}${texte(...pt(-9.6, 52.9).map((v, i) => v + (i ? 13 : 0)), 'of Ireland')}
${texte(...pt(1.2, 49.98), 'France', 'text-anchor="end"')}
${texte(...pt(1.7, 56.6), 'North Sea', 'text-anchor="end"')}
</g>
<g font-size="11.5" font-weight="600" fill="${C.encre}">
${etiq.join('\n')}
${caps.join('\n')}
${tamise}
</g>
</svg>
`
ecrireSvg('royaume-uni-quatre-nations', svg, '6eme/anglais')
