// -------------------------------------------------------
// Réviz — Extraction Natural Earth 10m (domaine public) pour les cartes d'anglais
// (dépôt GitHub nvkelso/natural-earth-vector, dossier geojson/) :
//  - fleuves Thames, Severn, Shannon (ne_10m_rivers_lake_centerlines.geojson) :
//    le fond 50m de carto.mjs n'a que la Tamise ;
//  - contours 10m des unités IRL, NIR, ENG, SCT, WLS, IMN (ne_10m_admin_0_map_units.geojson),
//    plus fins que le fond 50m pour une carte zoomée sur l'Irlande ou la Grande-Bretagne.
//
//   node scripts/illustrations/extraire-fleuves-iles-britanniques.mjs <dossier>
//   → scripts/illustrations/donnees/iles-britanniques-fleuves.json
//   → scripts/illustrations/donnees/iles-britanniques-10m.json
// Les tronçons « Lake Centerline » (traversée des loughs du Shannon) sont gardés.
// -------------------------------------------------------
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { simplifier } from './carto.mjs'

const ICI = path.dirname(fileURLToPath(import.meta.url))
const dossier = process.argv[2]
if (!dossier) { console.error('Usage : node extraire-fleuves-iles-britanniques.mjs <dossier>'); process.exit(1) }
const g = JSON.parse(readFileSync(path.join(dossier, 'ne_10m_rivers_lake_centerlines.geojson'), 'utf8'))
const NOMS = ['Thames', 'Severn', 'Shannon']
const r4 = v => Math.round(v * 1e4) / 1e4
const dansIles = l => l.every(([lo, la]) => lo > -11 && lo < 2 && la > 49.5 && la < 59)
const fleuves = NOMS.map(nom => {
  const lignes = g.features
    .filter(f => f.properties.name === nom)
    .flatMap(f => (f.geometry.type === 'LineString' ? [f.geometry.coordinates] : f.geometry.coordinates))
    .filter(dansIles)
    .map(l => l.map(([lo, la]) => [r4(lo), r4(la)]))
  return { nom, lignes }
})
for (const f of fleuves) console.log(f.nom, f.lignes.length, 'lignes')
writeFileSync(path.join(ICI, 'donnees/iles-britanniques-fleuves.json'),
  JSON.stringify({ source: 'Natural Earth 10m rivers_lake_centerlines (domaine public)', fleuves }) + '\n')

// Contours 10m (simplifiés à 0,004° près, anneaux de moins de 4 points écartés)
const mu = JSON.parse(readFileSync(path.join(dossier, 'ne_10m_admin_0_map_units.geojson'), 'utf8'))
const r3 = v => Math.round(v * 1e3) / 1e3
const unites = mu.features
  .filter(f => ['IRL', 'NIR', 'ENG', 'SCT', 'WLS', 'IMN'].includes(f.properties.GU_A3))
  .map(f => {
    const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates
    return {
      unite: f.properties.GU_A3,
      polygones: polys
        .map(an => an.map(a => simplifier(a, 0.004).map(([lo, la]) => [r3(lo), r3(la)])).filter(a => a.length >= 4))
        .filter(an => an.length && an[0][0][1] < 59.5),
    }
  })
for (const u of unites) console.log(u.unite, u.polygones.length, 'polygones')
writeFileSync(path.join(ICI, 'donnees/iles-britanniques-10m.json'),
  JSON.stringify({ source: 'Natural Earth 10m admin_0_map_units (domaine public)', unites }) + '\n')
