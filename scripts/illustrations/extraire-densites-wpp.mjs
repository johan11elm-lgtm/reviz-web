#!/usr/bin/env node
// -------------------------------------------------------
// Réviz — Extraction des densités et populations par pays (2024) de l'ONU,
// World Population Prospects 2024, pour les planisphères de géographie 6e
// (répartition de la population, espaces de faible densité, anamorphose).
// Lancé une fois ; le résultat est versionné dans
// scripts/illustrations/donnees/densites-pays-2024.json.
//
//   node scripts/illustrations/extraire-densites-wpp.mjs <dossier>
//
// <dossier> contient, téléchargés depuis le dépôt GitHub
// open-numbers/ddf--unpop--world_population_prospects (reprise du WPP 2024 par Gapminder) :
//   ddf--entities--location--country_area.csv            → wpp_entities_country.csv
//   population/ddf--datapoints--population_density--by--country_area--time.csv
//   population/ddf--datapoints--population--by--country_area--time.csv
// -------------------------------------------------------
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ICI = path.dirname(fileURLToPath(import.meta.url))
const dossier = process.argv[2]
if (!dossier) { console.error('usage : node extraire-densites-wpp.mjs <dossier>'); process.exit(1) }

const csv = f => {
  const [tete, ...lignes] = readFileSync(path.join(dossier, f), 'utf8').trim().split('\n')
  const cles = tete.split(',')
  return lignes.map(l => Object.fromEntries(l.split(',').map((v, i) => [cles[i], v])))
}
const entites = Object.fromEntries(csv('wpp_entities_country.csv').map(r => [r.country_area, r.iso3_code]))
const densite = {}
for (const r of csv('wpp_ddf--datapoints--population_density--by--country_area--time.csv')) {
  if (r.time === '2024' && entites[r.country_area]) densite[entites[r.country_area]] = Number(r.population_density)
}
const population = {}
for (const r of csv('wpp_ddf--datapoints--population--by--country_area--time.csv')) {
  if (r.time === '2024' && entites[r.country_area]) population[entites[r.country_area]] = Math.round(Number(r.population))
}
const pays = Object.keys(densite).sort().map(iso => ({ iso, densite: densite[iso], population: population[iso] }))
writeFileSync(path.join(ICI, 'donnees/densites-pays-2024.json'), JSON.stringify({
  source: 'ONU, World Population Prospects 2024 : densité (hab./km²) et population (milliers) au 1er juillet 2024, par pays ou territoire (code ISO 3166-1 alpha-3). Fichiers du dépôt GitHub open-numbers/ddf--unpop--world_population_prospects.',
  monde: { densite: 62.59 },
  pays,
}))
console.log(`${pays.length} pays ou territoires`)
