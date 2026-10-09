#!/usr/bin/env node
// -------------------------------------------------------
// Réviz — Extraction des données des outre-mer français pour les cartes du
// groupe géographie 3e-4e (planisphère des territoires ultramarins) :
//  - positions des territoires (centre du plus grand polygone), tirées de
//    Natural Earth 1:10m Admin 0 map units (domaine public) ;
//  - contours des ZEE françaises, tirés de Marine Regions (Flanders Marine
//    Institute, VLIZ), World EEZ v11 basse résolution, 2019, licence CC BY 4.0
//    (https://www.marineregions.org/, doi:10.14284/386), simplifiés.
// Lancé une fois ; le résultat est versionné dans scripts/illustrations/donnees/outre-mer.json.
//
//   node scripts/illustrations/extraire-outre-mer.mjs <ne_10m_admin_0_map_units.geojson> <eez_v11_lowres (sans extension)>
// -------------------------------------------------------
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { simplifier } from './carto.mjs'

const ICI = path.dirname(fileURLToPath(import.meta.url))
const [neFichier, eezBase] = process.argv.slice(2)
if (!neFichier || !eezBase) { console.error('Usage : extraire-outre-mer.mjs <map_units.geojson> <eez sans extension>'); process.exit(1) }

const arrondir = pts => pts.map(([x, y]) => [Math.round(x * 100) / 100, Math.round(y * 100) / 100])
function aire(a) {
  let s = 0
  for (let i = 0, j = a.length - 1; i < a.length; j = i++) s += (a[j][0] + a[i][0]) * (a[j][1] - a[i][1])
  return s / 2
}
function centre(a) {
  let x = 0, y = 0, s = 0
  for (let i = 0, j = a.length - 1; i < a.length; j = i++) {
    const f = a[j][0] * a[i][1] - a[i][0] * a[j][1]
    x += (a[j][0] + a[i][0]) * f; y += (a[j][1] + a[i][1]) * f; s += f
  }
  return [Math.round((x / (3 * s)) * 100) / 100, Math.round((y / (3 * s)) * 100) / 100]
}

// ---- Territoires (Natural Earth)
const UNITES = { GLP: 'Guadeloupe', MTQ: 'Martinique', GUF: 'Guyane', REU: 'La Réunion', MYT: 'Mayotte', SPM: 'Saint-Pierre-et-Miquelon',
  MAF: 'Saint-Martin', BLM: 'Saint-Barthélemy', PYF: 'Polynésie française', WLF: 'Wallis-et-Futuna', NCL: 'Nouvelle-Calédonie', ATF: 'Kerguelen', CLP: 'Clipperton', FXX: 'France métropolitaine' }
const ne = JSON.parse(readFileSync(neFichier, 'utf8'))
const territoires = []
for (const f of ne.features) {
  const u = f.properties.GU_A3
  if (!UNITES[u]) continue
  const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates
  const grand = polys.map(p => p[0]).sort((a, b) => Math.abs(aire(b)) - Math.abs(aire(a)))[0]
  territoires.push({ unite: u, nom: UNITES[u], lonlat: centre(grand) })
}

// ---- ZEE (Marine Regions, shapefile : polygones type 5 + table dBase)
function lireDbf(f) {
  const b = readFileSync(f)
  const n = b.readUInt32LE(4), hl = b.readUInt16LE(8), rl = b.readUInt16LE(10)
  const champs = []
  for (let o = 32; b[o] !== 0x0d; o += 32) champs.push({ nom: b.toString('latin1', o, o + 11).replace(/\0.*$/, ''), long: b[o + 16] })
  const lignes = []
  for (let i = 0; i < n; i++) {
    let o = hl + i * rl + 1
    const r = {}
    for (const c of champs) { r[c.nom] = b.toString('utf8', o, o + c.long).trim(); o += c.long }
    lignes.push(r)
  }
  return lignes
}
function lireShp(f) {
  const b = readFileSync(f)
  const out = []
  let o = 100
  while (o < b.length) {
    const len = b.readInt32BE(o + 4) * 2
    const c = o + 8
    if (b.readInt32LE(c) === 5) {
      const np = b.readInt32LE(c + 36), nPts = b.readInt32LE(c + 40)
      const parts = []
      for (let i = 0; i < np; i++) parts.push(b.readInt32LE(c + 44 + 4 * i))
      const p0 = c + 44 + 4 * np
      const pts = []
      for (let i = 0; i < nPts; i++) pts.push([b.readDoubleLE(p0 + 16 * i), b.readDoubleLE(p0 + 16 * i + 8)])
      out.push(parts.map((s, i) => pts.slice(s, i + 1 < np ? parts[i + 1] : nPts)))
    } else out.push(null)
    o = c + len
  }
  return out
}
const table = lireDbf(eezBase + '.dbf')
const formes = lireShp(eezBase + '.shp')
const zee = []
table.forEach((r, i) => {
  const francaise = r.SOVEREIGN1 === 'France' || r.SOVEREIGN2 === 'France' || r.SOVEREIGN3 === 'France'
  if (!francaise || r.POL_TYPE === 'Joint regime' || !formes[i]) return
  // Anneaux (extérieurs et trous mêlés dans un shapefile) : on ne garde que les plus grands, simplifiés à 0,05°.
  const anneaux = formes[i].map(a => arrondir(simplifier(a, 0.05))).filter(a => a.length >= 4 && Math.abs(aire(a)) > 0.5)
  if (anneaux.length) zee.push({ nom: r.GEONAME, territoire: r.ISO_TER1 || r.TERRITORY1, type: r.POL_TYPE, anneaux })
})

writeFileSync(path.join(ICI, 'donnees/outre-mer.json'), JSON.stringify({
  source: 'Territoires : Natural Earth 1:10m Admin 0 map units (domaine public). ZEE : Flanders Marine Institute (2019), Maritime Boundaries Geodatabase, World EEZ v11 basse résolution, marineregions.org, CC BY 4.0, simplifiées à 0,05°.',
  territoires, zee,
}))
console.log(territoires.length, 'territoires ;', zee.length, 'ZEE ;', zee.map(z => z.nom + ' ' + z.anneaux.length).join(' | '))
