#!/usr/bin/env node
// -------------------------------------------------------
// Réviz — Extraction des États des États-Unis contigus (sans l'Alaska ni Hawaï)
// pour les croquis du groupe géographie 3e-4e (organisation du territoire des
// États-Unis : Sun Belt, Rust Belt, intérieur). Source : Natural Earth 1:50m
// Admin 1 states and provinces (domaine public), tracés allégés.
// Lancé une fois ; résultat versionné dans scripts/illustrations/donnees/etats-unis-etats.json.
//
//   node scripts/illustrations/extraire-etats-unis.mjs <ne_50m_admin_1_states_provinces.geojson>
// -------------------------------------------------------
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { simplifier } from './carto.mjs'

const ICI = path.dirname(fileURLToPath(import.meta.url))
const fichier = process.argv[2]
if (!fichier) { console.error('Usage : extraire-etats-unis.mjs <ne_50m_admin_1_states_provinces.geojson>'); process.exit(1) }
const arrondir = pts => pts.map(([x, y]) => [Math.round(x * 1000) / 1000, Math.round(y * 1000) / 1000])
const j = JSON.parse(readFileSync(fichier, 'utf8'))
const etats = j.features
  .filter(f => f.properties.adm0_a3 === 'USA' && !['AK', 'HI'].includes(f.properties.postal))
  .map(f => {
    const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates
    return {
      code: f.properties.postal,
      nom: f.properties.name,
      polygones: polys.map(an => an.map(a => arrondir(simplifier(a, 0.02))).filter(a => a.length >= 4)).filter(an => an.length),
    }
  })
  .sort((a, b) => a.code.localeCompare(b.code))
writeFileSync(path.join(ICI, 'donnees/etats-unis-etats.json'), JSON.stringify({
  source: 'Natural Earth 1:50m Admin 1 states and provinces (domaine public), États contigus, allégé à 0,02°',
  etats,
}))
console.log(etats.length, 'États')
