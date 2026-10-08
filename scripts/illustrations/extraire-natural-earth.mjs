#!/usr/bin/env node
// -------------------------------------------------------
// Réviz — Extrait de Natural Earth (domaine public, naturalearthdata.com) pour
// les fonds de carte des illustrations : départements de France métropolitaine
// et pays d'Europe, tracés allégés. Lancé une fois ; le résultat est versionné
// dans scripts/illustrations/donnees/.
//
//   node scripts/illustrations/extraire-natural-earth.mjs <dossier>
//
// <dossier> contient ne_50m_admin_0_countries.geojson et
// ne_10m_admin_1_states_provinces.geojson (dépôt GitHub nvkelso/natural-earth-vector).
// -------------------------------------------------------
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { simplifier } from './carto.mjs'

const ICI = path.dirname(fileURLToPath(import.meta.url))
const SORTIE = path.join(ICI, 'donnees')
const dossier = process.argv[2]
if (!dossier) { console.error('Usage : extraire-natural-earth.mjs <dossier>'); process.exit(1) }

// Les 27 États membres (codes ADM0_A3 de Natural Earth).
const UE = new Set(['AUT', 'BEL', 'BGR', 'HRV', 'CYP', 'CZE', 'DNK', 'EST', 'FIN', 'FRA', 'DEU', 'GRC', 'HUN', 'IRL',
  'ITA', 'LVA', 'LTU', 'LUX', 'MLT', 'NLD', 'POL', 'PRT', 'ROU', 'SVK', 'SVN', 'ESP', 'SWE'])

const lire = f => JSON.parse(readFileSync(path.join(dossier, f), 'utf8'))
const arrondir = pts => pts.map(([x, y]) => [Math.round(x * 1000) / 1000, Math.round(y * 1000) / 1000])

/** Anneaux extérieurs et trous, simplifiés en degrés ; petits îlots écartés. */
function alleger(geometrie, tolerance, aireMin = 0) {
  const polys = geometrie.type === 'Polygon' ? [geometrie.coordinates] : geometrie.coordinates
  return polys
    .map(anneaux => anneaux.map(a => arrondir(simplifier(a, tolerance))).filter(a => a.length >= 4))
    .filter(anneaux => anneaux.length && Math.abs(aire(anneaux[0])) >= aireMin)
}
function aire(a) {
  let s = 0
  for (let i = 0, j = a.length - 1; i < a.length; j = i++) s += (a[j][0] + a[i][0]) * (a[j][1] - a[i][1])
  return s / 2
}

mkdirSync(SORTIE, { recursive: true })

// Départements de métropole (Corse comprise).
const admin1 = lire('ne_10m_admin_1_states_provinces.geojson')
const departements = admin1.features
  .filter(f => f.properties.adm0_a3 === 'FRA' && f.properties.type_en === 'Metropolitan department')
  .map(f => ({
    code: f.properties.iso_3166_2.replace('FR-', ''),
    nom: f.properties.name,
    region: f.properties.region,
    polygones: alleger(f.geometry, 0.012, 0.0005),
  }))
  .sort((a, b) => a.code.localeCompare(b.code))
writeFileSync(path.join(SORTIE, 'france-departements.json'), JSON.stringify({
  source: 'Natural Earth 1:10m Admin 1 (domaine public), allégé',
  departements,
}))

// Pays d'Europe et voisins (cadre large : Atlantique → Caucase, Maghreb → Cap Nord).
const admin0 = lire('ne_50m_admin_0_countries.geojson')
const dansCadre = ([x, y]) => x > -32 && x < 48 && y > 26 && y < 73
const pays = admin0.features
  .map(f => ({
    iso: f.properties.ADM0_A3,
    nom: f.properties.NAME_FR ?? f.properties.NAME,
    ue: f.properties.ADM0_A3 && UE.has(f.properties.ADM0_A3),
    polygones: alleger(f.geometry, 0.04, UE.has(f.properties.ADM0_A3) ? 0.002 : 0.02)
      .filter(anneaux => anneaux[0].some(dansCadre)),
  }))
  .filter(p => p.polygones.length)
  .sort((a, b) => a.iso.localeCompare(b.iso))
writeFileSync(path.join(SORTIE, 'europe-pays.json'), JSON.stringify({
  source: 'Natural Earth 1:50m Admin 0 (domaine public), allégé',
  pays,
}))
console.log(`${departements.length} départements, ${pays.length} pays`)
