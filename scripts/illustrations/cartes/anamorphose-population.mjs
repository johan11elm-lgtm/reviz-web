// -------------------------------------------------------
// Réviz — 6e géographie, « La répartition de la population mondiale ».
// Anamorphose des pays du monde selon leur population en 2024, en carrés
// proportionnels (cartogramme de Demers) : chaque pays devient un carré dont la
// surface est proportionnelle à sa population, placé au plus près de sa position
// sur le planisphère. L'Inde et la Chine deviennent énormes, le Canada, la Russie
// et l'Australie minuscules. Pays et territoires de plus de 1 million d'habitants
// (les plus petits seraient invisibles à cette échelle).
// Un cartogramme continu (Dougenik et al.) a été essayé : sur ce fond allégé, il
// replie les contours ; les carrés restent lisibles et exacts (surface ∝ population).
// Données : ONU, World Population Prospects 2024 (population par pays, voir
// scripts/illustrations/extraire-densites-wpp.mjs). Positions de départ : centres
// des pays sur le planisphère Natural Earth (domaine public), via carto.mjs.
//
//   node scripts/illustrations/cartes/anamorphose-population.mjs
// -------------------------------------------------------
import { C, FONT, ecrireSvg, r1, anneaux, intitule } from './_commun.mjs'
import { carteMonde } from '../carto.mjs'
import { fichePays, nomMasquable } from './_geographie-5e-6e.mjs'

const W = 360
const m = carteMonde({ x: 12, y: 30, largeur: 336 }, { sud: -58, nord: 76 })

const aire = r => {
  let a = 0
  for (let i = 0; i < r.length; i++) {
    const [x1, y1] = r[i]
    const [x2, y2] = r[(i + 1) % r.length]
    a += x1 * y2 - x2 * y1
  }
  return a / 2
}
const centroide = r => {
  let A = 0; let cx = 0; let cy = 0
  for (let i = 0; i < r.length; i++) {
    const [x1, y1] = r[i]
    const [x2, y2] = r[(i + 1) % r.length]
    const k = x1 * y2 - x2 * y1
    A += k; cx += (x1 + x2) * k; cy += (y1 + y2) * k
  }
  if (Math.abs(A) < 1e-9) return [r.reduce((s, q) => s + q[0], 0) / r.length, r.reduce((s, q) => s + q[1], 0) / r.length]
  return [cx / (3 * A), cy / (3 * A)]
}

// Un carré par pays ONU (code ISO) : population WPP 2024 (milliers), départ au centre
// du plus grand morceau du pays sur le planisphère.
const parIso = new Map()
for (const p of m.pays(0.8)) {
  const f = fichePays(p)
  if (!f || f.population < 1000) continue
  const cle = f.iso
  const r = anneaux(p.d).filter(a => a.length >= 3).sort((a, b) => Math.abs(aire(b)) - Math.abs(aire(a)))[0]
  if (!r) continue
  const A = Math.abs(aire(r))
  const prec = parIso.get(cle)
  if (!prec || A > prec.A) parIso.set(cle, { iso: cle, nom: p.nom, pop: f.population, A, depart: centroide(r) })
}
// Corrections de départ : la Russie et le Canada partent de leur cœur peuplé, pas du Grand Nord ;
// la France du centre de la métropole.
const DEPARTS = { RUS: [45, 56], CAN: [-90, 50], FRA: [2.5, 46.5], USA: [-96, 39], NOR: [10, 61], PAK: [58, 34] }
const carres = [...parIso.values()].map(c => {
  const d = DEPARTS[c.iso] ? m.xy(...DEPARTS[c.iso]) : c.depart
  return { ...c, depart: d, x: d[0], y: d[1] }
})

// Échelle : la Terre entière (8,16 milliards) ≈ 21 000 unités² de carrés
const totalPop = carres.reduce((s, c) => s + c.pop, 0)
const K = 21000 / totalPop
for (const c of carres) c.cote = Math.sqrt(c.pop * K)

// Écartement itératif : deux carrés qui se chevauchent sont repoussés selon l'axe du plus
// petit chevauchement (le plus petit bouge le plus) ; un léger rappel vers le point de départ.
const ECART = 1
for (let it = 0; it < 900; it++) {
  for (let i = 0; i < carres.length; i++) {
    for (let j = i + 1; j < carres.length; j++) {
      const a = carres[i]; const b = carres[j]
      const ox = (a.cote + b.cote) / 2 + ECART - Math.abs(a.x - b.x)
      const oy = (a.cote + b.cote) / 2 + ECART - Math.abs(a.y - b.y)
      if (ox <= 0 || oy <= 0) continue
      const wa = b.cote ** 2 / (a.cote ** 2 + b.cote ** 2)
      const wb = 1 - wa
      if (ox < oy) {
        const s = a.x < b.x ? -1 : 1
        a.x += s * ox * wa; b.x -= s * ox * wb
      } else {
        const s = a.y < b.y ? -1 : 1
        a.y += s * oy * wa; b.y -= s * oy * wb
      }
    }
  }
  if (it < 500) for (const c of carres) { c.x += (c.depart[0] - c.x) * 0.02; c.y += (c.depart[1] - c.y) * 0.02 }
}
let reste = 0
for (let i = 0; i < carres.length; i++) for (let j = i + 1; j < carres.length; j++) {
  const a = carres[i]; const b = carres[j]
  if ((a.cote + b.cote) / 2 - Math.abs(a.x - b.x) > 0.05 && (a.cote + b.cote) / 2 - Math.abs(a.y - b.y) > 0.05) reste++
}
console.log(`${carres.length} pays, chevauchements restants : ${reste}`)

// Recadrage dans la largeur utile (marges 12)
const xs = carres.flatMap(c => [c.x - c.cote / 2, c.x + c.cote / 2])
const ys = carres.flatMap(c => [c.y - c.cote / 2, c.y + c.cote / 2])
const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)]
const k = Math.min(1, 314 / (x1 - x0))
const X = v => 30 + (v - x0) * k
const Yc = v => 22 + (v - y0) * k
for (const c of carres) { c.X = X(c.x); c.Y = Yc(c.y); c.c = c.cote * k }
const H = r1(22 + (y1 - y0) * k + 26)

const FORT = ['IND', 'CHN']
const rect = c => `M${r1(c.X - c.c / 2)},${r1(c.Y - c.c / 2)}h${r1(c.c)}v${r1(c.c)}h${r1(-c.c)}z`
const corps = carres.filter(c => !FORT.includes(c.iso)).map(rect).join('')
const fort = carres.filter(c => FORT.includes(c.iso)).map(rect).join('')

const get = iso => carres.find(c => c.iso === iso)
// Inde et Chine nommées dans leur carré ; les autres pays repérés par un numéro (liste dessous).
const DEDANS = [['IND', 'Inde'], ['CHN', 'Chine']]
const noms = DEDANS.map(([iso, s]) => { const c = get(iso); return nomMasquable(c.X, c.Y + 4, s) }).join('\n')
const NUMEROS = [['USA', 'États-Unis'], ['IDN', 'Indonésie'], ['PAK', 'Pakistan'], ['NGA', 'Nigeria'], ['BRA', 'Brésil'], ['BGD', 'Bangladesh'],
  ['RUS', 'Russie'], ['JPN', 'Japon'], ['FRA', 'France'], ['CAN', 'Canada'], ['AUS', 'Australie']]
const numeros = NUMEROS.map(([iso], i) => {
  const c = get(iso)
  // Carré trop petit pour son numéro : numéro posé à côté (à gauche pour le Canada, à droite sinon)
  if (c.c < 12) {
    const g = iso === 'CAN'
    return `<text x="${r1(c.X + (g ? -(c.c / 2 + 3) : c.c / 2 + 3))}" y="${r1(c.Y + 4)}"${g ? ' text-anchor="end"' : ''}>${i + 1}</text>`
  }
  return `<text x="${r1(c.X)}" y="${r1(c.Y + 4)}" text-anchor="middle">${i + 1}</text>`
}).join('')
const yL = H - 4
const COL = [14, 128, 242]
const liste = NUMEROS.map(([, n], i) => {
  const x = COL[i % 3]
  const y = yL + Math.floor(i / 3) * 19
  return `<text x="${x + 8}" y="${y}" text-anchor="end">${i + 1}</text>` + intitule(x + 15, y, n)
}).join('\n')
const H2 = yL + Math.ceil(NUMEROS.length / 3) * 19 - 4

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H2}" font-family="${FONT}">
<!-- Anamorphose de la population mondiale en 2024 (ONU, WPP 2024) : un carré par pays de plus de 1 million d'habitants, de surface proportionnelle à sa population, placé près de sa position géographique ; l'Inde et la Chine (aplat orangé) dominent, le Canada, la Russie et l'Australie sont réduits. Réviz, 6e géographie, la répartition de la population mondiale. Généré par scripts/illustrations/cartes/anamorphose-population.mjs -->
<path d="${corps}" fill="${C.violet}" stroke="${C.encre}" stroke-width="0.6"/>
<path d="${fort}" fill="#FBE9DD" stroke="${C.accent}" stroke-width="1.5"/>
<g font-size="11.5" font-weight="600" fill="${C.encre}">
${noms}
${numeros}
${liste}
</g>
</svg>
`
ecrireSvg('anamorphose-population', svg, '6eme/geographie')
