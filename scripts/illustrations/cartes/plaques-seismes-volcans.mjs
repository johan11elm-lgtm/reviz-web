// -------------------------------------------------------
// Réviz — 4e SVT, « La tectonique des plaques ».
// Planisphère centré sur le Pacifique : limites de plaques (dorsales océaniques, subductions/fosses,
// autres limites), séismes de magnitude ≥ 6 (1965-2016) et volcans actifs (dernière éruption depuis 1900).
// Données : scripts/illustrations/donnees/tectonique.json, produit par
// scripts/illustrations/extraire-tectonique.mjs (sources détaillées dans ce script) :
//   limites de plaques : P. Bird (2003), modèle PB2002, via github.com/fraxen/tectonicplates (ODC-By 1.0) ;
//   séismes : catalogue USGS (M ≥ 5,5, 1965-2016), via github.com/plotly/datasets (earthquakes-23k.csv) ;
//   volcans : Smithsonian Global Volcanism Program, via github.com/plotly/datasets (volcano_db.csv).
// Fond : Natural Earth (domaine public), recentré sur le Pacifique par _svt-monde.mjs.
//
//   node scripts/illustrations/cartes/plaques-seismes-volcans.mjs
// -------------------------------------------------------
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { simplifier } from '../carto.mjs'
import { C, r1, compact, ecrireSvg } from './_commun.mjs'
import { mondePacifique } from './_svt-monde.mjs'

const ICI = path.dirname(fileURLToPath(import.meta.url))
const T = JSON.parse(readFileSync(path.join(ICI, '../donnees/tectonique.json'), 'utf8'))
const SUD = -60, NORD = 80
const m = mondePacifique({ x: 6, y: 6, largeur: 348 }, { lon0: 155, sud: SUD, nord: NORD })
const H = m.hauteur
const q = v => Math.round(v * 2) / 2
const fmt = v => { const s = String(q(v)); return s.startsWith('0.') ? s.slice(1) : s.startsWith('-0.') ? '-' + s.slice(2) : s }

/** Polylignes projetées → chemin compact (relatif, au demi-pixel). */
function chemin(ls, tol = 1.3) {
  let d = ''
  for (const l of ls) {
    const pts = simplifier(l, tol).map(([x, y]) => [q(x), q(y)])
    if (pts.length < 2) continue
    d += `M${fmt(pts[0][0])},${fmt(pts[0][1])}l` + pts.slice(1).map((p, i) => `${fmt(p[0] - pts[i][0])},${fmt(p[1] - pts[i][1])}`).join(' ').replace(/ -/g, '-').replace(/,-/g, '-')
  }
  return d
}
const pts = (ps, fn) => ps.filter(([, la]) => la >= SUD && la <= NORD).map(([lo, la]) => fn(...m.xy(lo, la))).join('')

const TERRE = '#ECE8E0', SEISME = '#7F7BAE', AUTRE = '#8A8273'
let s = ''
s += `<path d="M${m.bord().map(([x, y]) => `${r1(x)},${r1(y)}`).join('L')}Z" fill="#F4F7FC" stroke="#C9C4B8" stroke-width="0.75"/>`
s += `<path d="${compact(m.terres(1.1), { prec: 0.5, aireMin: 3 })}" fill="${TERRE}" stroke="${TERRE}" stroke-width="1.6" stroke-linejoin="round"/>`
s += `<path d="${chemin(m.polylignes(T.lignes.autre))}" fill="none" stroke="${AUTRE}" stroke-width="1" stroke-linejoin="round"/>`
s += `<path d="${chemin(m.polylignes(T.lignes.dorsale))}" fill="none" stroke="${C.accent}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`
s += `<path d="${chemin(m.polylignes(T.lignes.subduction))}" fill="none" stroke="${C.encre}" stroke-width="2.25" stroke-linejoin="round" stroke-linecap="round"/>`
s += `<path d="${pts(T.seismes, (x, y) => `M${fmt(x)},${fmt(y)}h0`)}" stroke="${SEISME}" stroke-width="2.2" stroke-linecap="round" opacity="0.75"/>`
s += `<path d="${pts(T.volcans, (x, y) => `M${fmt(x)},${fmt(y - 2.5)}l2.3,4h-4.6z`)}" fill="${C.rouge}"/>`
// Repères (non masquables)
const nom = (lo, la, t) => { const [x, y] = m.xy(lo, la); return `<text x="${r1(x)}" y="${r1(y)}" text-anchor="middle" font-size="11" font-weight="600" fill="${C.gris}">${t}</text>` }
s += nom(-150, 14, 'océan') + nom(-150, 5, 'Pacifique') + nom(90, -20, 'océan Indien')
// Légende
const yl = 6 + H + 20
const leg = (x, y, sym, t) => `${sym(x, y - 4)}<text x="${x + 22}" y="${y}" font-size="11.5" font-weight="600" fill="${C.encre}">${t}</text>`
s += leg(12, yl, (x, y) => `<path d="M${x + 2},${y}h14" stroke="${C.accent}" stroke-width="2.25" stroke-linecap="round"/>`, 'Dorsale océanique')
s += leg(12, yl + 18, (x, y) => `<path d="M${x + 2},${y}h14" stroke="${C.encre}" stroke-width="2.25" stroke-linecap="round"/>`, 'Fosse (subduction)')
s += leg(12, yl + 36, (x, y) => `<path d="M${x + 2},${y}h14" stroke="${AUTRE}" stroke-width="1"/>`, 'Autre limite de plaques')
s += leg(206, yl, (x, y) => `<circle cx="${x + 9}" cy="${y}" r="2.6" fill="${SEISME}"/>`, 'Séisme')
s += leg(206, yl + 18, (x, y) => `<path d="M${x + 9},${y - 3.6}l3.5,6.2h-7z" fill="${C.rouge}"/>`, 'Volcan actif')

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 ${r1(yl + 46)}" font-family="system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif">
<!-- Planisphère centré sur le Pacifique : limites des plaques (Bird 2003, PB2002), séismes M ≥ 6 de 1965 à 2016 (USGS), volcans actifs depuis 1900 (Smithsonian GVP). Réviz, 4e SVT, tectonique des plaques. Généré par scripts/illustrations/cartes/plaques-seismes-volcans.mjs -->
${s}
</svg>
`
ecrireSvg('plaques-seismes-volcans', svg, '4eme/svt')
