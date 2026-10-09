// -------------------------------------------------------
// Réviz — 5e anglais, « Le superlatif et l'Irlande ».
// Carte de l'île d'Irlande : République d'Irlande (Dublin) et Irlande du Nord
// (Belfast, Royaume-Uni), la frontière, le Shannon, la Giant's Causeway,
// Killarney, Skellig Michael et la côte ouest du Wild Atlantic Way.
// Fond Natural Earth 50m (domaine public) via carto.mjs ; Shannon : Natural Earth 10m.
// Wild Atlantic Way : tracé schématique = le littoral (Natural Earth) de la
// République d'Irlande entre la péninsule d'Inishowen (Donegal) et Kinsale (Cork),
// côté ouest ; la route réelle suit ce littoral d'assez près.
// Coordonnées : Giant's Causeway 55,241° N 6,512° W ; Killarney 52,060° N 9,504° W ;
// Skellig Michael 51,771° N 10,539° W (île trop petite pour le fond : simple point).
//
//   node scripts/illustrations/cartes/irlande-wild-atlantic-way.mjs
// -------------------------------------------------------
import { C, FONT, HALO, compact, texte, intitule, ecrireSvg, r1 } from './_commun.mjs'
import { fondIles } from './_anglais-francais.mjs'

const W = 360
const { z, cadre, unites, fleuve } = fondIles({ x: 12, y: 12, largeur: 336 },
  [[-10.9, 53.3], [-4.6, 53.3], [-8, 51.25], [-7.3, 55.55]], [-7.8, 53.4], { tol: 0.35 })
const IRL_FILL = C.ocre
const d = list => compact(list.flatMap(p => p.rings), { prec: 0.5, aireMin: 0.8 })
const irl = unites.filter(u => u.unite === 'IRL')
const nir = unites.filter(u => u.unite === 'NIR')
const autres = unites.filter(u => !['IRL', 'NIR'].includes(u.unite))
const pt = (lo, la) => z.xy(lo, la)

// --- Wild Atlantic Way : portion ouest de l'anneau principal de l'Irlande
const aire = r => Math.abs(r.reduce((a, [x1, y1], i) => { const [x2, y2] = r[(i + 1) % r.length]; return a + x1 * y2 - x2 * y1 }, 0) / 2)
const anneau = irl.flatMap(u => u.rings).reduce((m, r) => (aire(r) > aire(m) ? r : m))
const proche = p => anneau.reduce((b, q, i) => (Math.hypot(q[0] - p[0], q[1] - p[1]) < Math.hypot(anneau[b][0] - p[0], anneau[b][1] - p[1]) ? i : b), 0)
const iA = proche(pt(-7.3, 55.3)) // Inishowen
const iB = proche(pt(-8.52, 51.68)) // Kinsale
const sens = (a, b, pas) => { const out = []; for (let i = a; ; i = (i + pas + anneau.length) % anneau.length) { out.push(anneau[i]); if (i === b) break } return out }
const c1 = sens(iA, iB, 1)
const c2 = sens(iA, iB, -1)
const minX = c => Math.min(...c.map(p => p[0]))
const ouest = minX(c1) < minX(c2) ? c1 : c2
const waw = 'M' + ouest.map(p => p.map(r1).join(',')).join('L')

// --- Frontière : arêtes communes IRL / NIR (points de NIR proches d'IRL)
const segIrl = anneau.map((q, i) => [q, anneau[(i + 1) % anneau.length]])
const distSeg = (p, [a, b]) => {
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy || 1e-9)))
  return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy)
}
const anneauNir = nir.flatMap(u => u.rings).reduce((m, r) => (aire(r) > aire(m) ? r : m))
const surFrontiere = anneauNir.map(p => segIrl.some(sg => distSeg(p, sg) < 0.8))
// Une seule ligne continue (le pointillé ne repart pas à chaque segment) :
// on part d'un point hors frontière pour parcourir l'anneau d'un bout à l'autre.
let frontiere = ''
const n0 = surFrontiere.indexOf(false)
let courant = []
for (let k = 1; k <= anneauNir.length; k++) {
  const i = (n0 + k) % anneauNir.length
  if (surFrontiere[i]) courant.push(anneauNir[i])
  else if (courant.length) {
    if (courant.length > 1) frontiere += 'M' + courant.map(q => q.map(r1).join(',')).join('L')
    courant = []
  }
}

// --- Lieux
const carre = ([x, y]) => `<rect x="${r1(x - 3.2)}" y="${r1(y - 3.2)}" width="6.4" height="6.4" fill="${C.encre}" stroke="#FFFFFF" stroke-width="1"/>`
const rond = ([x, y]) => `<circle cx="${r1(x)}" cy="${r1(y)}" r="3" fill="${C.encre}" stroke="#FFFFFF" stroke-width="1"/>`
const tri = ([x, y]) => `<path d="M${r1(x)},${r1(y - 5)}L${r1(x + 5)},${r1(y + 4)}L${r1(x - 5)},${r1(y + 4)}Z" fill="${C.encre}" stroke="#FFFFFF" stroke-width="1"/>`
const dub = pt(-6.26, 53.35)
const bel = pt(-5.93, 54.6)
const kil = pt(-9.504, 52.06)
const gc = pt(-6.512, 55.241)
const sk = pt(-10.539, 51.771)
const lieux = [carre(dub), carre(bel), rond(kil), tri(gc), tri(sk)].join('')
const etiq = [
  intitule(dub[0] + 8, dub[1] + 4, 'Dublin'),
  intitule(bel[0] + 8, bel[1] + 4, 'Belfast'),
  intitule(kil[0] + 8, kil[1] + 4, 'Killarney'),
  intitule(gc[0] + 9, gc[1] - 4, ["Giant's", 'Causeway']),
  intitule(sk[0] - 4, sk[1] + 20, ['Skellig', 'Michael']),
]
const [sx, sy] = pt(-8.35, 53.25)
etiq.push(intitule(sx, sy, 'the Shannon'))

// --- Légende
const yL = cadre[3] + 24
const L = [
  `<rect x="14" y="${yL - 11}" width="26" height="14" fill="${IRL_FILL}" stroke="${C.encre}" stroke-width="0.75"/>`,
  intitule(50, yL, 'the Republic of Ireland'),
  `<rect x="14" y="${yL + 21 - 11}" width="26" height="14" fill="${C.violet}" stroke="${C.encre}" stroke-width="0.75"/>`,
  intitule(50, yL + 21, 'Northern Ireland (UK)'),
  `<path d="M14,${yL + 42 - 4}h26" stroke="${C.encre}" stroke-width="2.25" stroke-dasharray="5 3"/>`,
  intitule(50, yL + 42, 'the border'),
  `<path d="M14,${yL + 63 - 4}h26" stroke="${C.accent}" stroke-width="4.5" stroke-linecap="round"/>`,
  intitule(50, yL + 63, 'the Wild Atlantic Way'),
]
const H = yL + 63 + 12

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" font-family="${FONT}">
<!-- L'île d'Irlande : République d'Irlande (Dublin), Irlande du Nord (Belfast, Royaume-Uni), frontière, Shannon, Giant's Causeway, Killarney, Skellig Michael, Wild Atlantic Way (tracé schématique). Réviz, 5e anglais, le superlatif et l'Irlande. Généré par scripts/illustrations/cartes/irlande-wild-atlantic-way.mjs -->
<rect x="${cadre[0]}" y="${cadre[1]}" width="${cadre[2] - cadre[0]}" height="${cadre[3] - cadre[1]}" fill="${C.mer}"/>
<path d="${d(autres)}" fill="${C.voisin}" stroke="${C.voisinTrait}" stroke-width="0.6" stroke-linejoin="round"/>
<path d="${waw}" fill="none" stroke="${C.accent}" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/>
<path d="${d(irl)}" fill="${IRL_FILL}" stroke="${C.encre}" stroke-width="0.9" stroke-linejoin="round"/>
<path d="${d(nir)}" fill="${C.violet}" stroke="${C.encre}" stroke-width="0.9" stroke-linejoin="round"/>
<path d="${frontiere}" fill="none" stroke="${C.encre}" stroke-width="2.25" stroke-dasharray="5 3" stroke-linecap="butt"/>
<path d="${fleuve('Shannon')}" fill="none" stroke="${C.bleu}" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"/>
<rect x="${cadre[0]}" y="${cadre[1]}" width="${cadre[2] - cadre[0]}" height="${cadre[3] - cadre[1]}" fill="none" stroke="${C.grisTrait}" stroke-width="0.75"/>
<g font-size="11" font-weight="600" fill="${C.gris}" ${HALO}>
${texte(...pt(-10.2, 53.0), 'Atlantic', 'text-anchor="middle"')}${texte(...pt(-10.2, 53.0).map((v, i) => v + (i ? 13 : 0)), 'Ocean', 'text-anchor="middle"')}
${texte(...pt(-5.35, 53.75), 'Irish Sea', 'text-anchor="middle"')}
</g>
${lieux}
<g font-size="11.5" font-weight="600" fill="${C.encre}">
${etiq.join('\n')}
${L.join('\n')}
</g>
</svg>
`
ecrireSvg('irlande-wild-atlantic-way', svg, '5eme/anglais')
