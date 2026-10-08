// -------------------------------------------------------
// Réviz — Extraction des données de la carte des plaques (4e SVT, tectonique des plaques)
// vers scripts/illustrations/donnees/tectonique.json.
//
// Sources (téléchargées le 2026-10-08 dans un dossier temporaire, passé en argument) :
// - Limites de plaques : P. Bird (2003), « An updated digital model of plate boundaries », G3 4(3) 1027,
//   modèle PB2002, conversion GeoJSON de github.com/fraxen/tectonicplates (licence ODC-By 1.0),
//   fichier GeoJSON/PB2002_steps.json : chaque pas porte une classe (STEPCLASS) — OSR dorsale océanique (seule classée « dorsale »),
//   SUB subduction, OTF/CTF failles transformantes, CRB rift continental, CCB/OCB convergence continentale.
// - Séismes : « earthquakes-23k.csv » de github.com/plotly/datasets (séismes de magnitude ≥ 5,5,
//   1965-2016, catalogue de l'USGS / NEIC) ; on garde la magnitude ≥ 6 et une case de 3° au plus par séisme.
// - Volcans : « volcano_db.csv » de github.com/plotly/datasets (base des volcans holocènes du Smithsonian
//   Global Volcanism Program, codes de dernière éruption) ; volcans actifs = dernière éruption connue
//   depuis 1900 (codes D1 : 1964 ou après, D2 : 1900-1963).
//
//   node scripts/illustrations/extraire-tectonique.mjs /tmp/claude-0/dl-tecto
// -------------------------------------------------------
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ICI = path.dirname(fileURLToPath(import.meta.url))
const SRC = process.argv[2]
if (!SRC) throw new Error('dossier des données téléchargées attendu en argument')
const r1 = v => Math.round(v * 10) / 10

// Limites : on enchaîne les pas consécutifs d'une même limite et d'une même classe.
// Dorsales : OSR avec les failles transformantes océaniques (OTF) qui les décalent ; les rifts continentaux (CRB)
// vont avec les « autres limites ».
const CLASSE = { OSR: 'dorsale', OTF: 'dorsale', SUB: 'subduction' }
const steps = JSON.parse(readFileSync(path.join(SRC, 'PB2002_steps.json'), 'utf8')).features
  .map(f => f.properties)
  .sort((a, b) => a.PLATEBOUND.localeCompare(b.PLATEBOUND) || a.SEQNUM - b.SEQNUM)
const lignes = { dorsale: [], subduction: [], autre: [] }
let cour = null
for (const p of steps) {
  const cl = CLASSE[p.STEPCLASS] || 'autre'
  const a = [r1(p.STARTLONG), r1(p.STARTLAT)], b = [r1(p.FINALLONG), r1(p.FINALLAT)]
  const fin = cour && cour.pts[cour.pts.length - 1]
  if (cour && cour.cl === cl && cour.bound === p.PLATEBOUND && Math.abs(fin[0] - a[0]) < 0.25 && Math.abs(fin[1] - a[1]) < 0.25) {
    cour.pts.push(b)
  } else {
    cour = { cl, bound: p.PLATEBOUND, pts: [a, b] }
    lignes[cl].push(cour)
  }
}
const sortie = { lignes: {} }
for (const [cl, ls] of Object.entries(lignes)) sortie.lignes[cl] = ls.map(l => l.pts)

// Séismes : magnitude ≥ 6, une case de 3° au plus.
const cases = new Map()
const csv = readFileSync(path.join(SRC, 'earthquakes-23k.csv'), 'utf8').trim().split('\n').slice(1)
for (const l of csv) {
  const [, la, lo, mag] = l.split(',').map(Number)
  if (!(mag >= 6)) continue
  const k = `${Math.floor(lo / 3)},${Math.floor(la / 3)}`
  if (!cases.has(k)) cases.set(k, [r1(lo), r1(la)])
}
sortie.seismes = [...cases.values()]

// Volcans actifs (dernière éruption depuis 1900), une case de 1,5° au plus.
const vcases = new Map()
const vcsv = readFileSync(path.join(SRC, 'volcano_db.csv'), 'latin1').trim().split(/\r?\n/)
const ent = vcsv[0].split(',')
const iLa = ent.indexOf('Latitude'), iLo = ent.indexOf('Longitude'), iLk = ent.indexOf('Last Known')
for (const l of vcsv.slice(1)) {
  // champs sans virgules internes dans ce fichier ; on lit depuis la fin par sécurité
  const c = l.replace(/\r$/, '').split(',')
  const off = c.length - ent.length
  const lk = c[iLk + off], la = Number(c[iLa + off]), lo = Number(c[iLo + off])
  if (!['D1', 'D2'].includes(lk) || !isFinite(la) || !isFinite(lo)) continue
  const k = `${Math.floor(lo / 1.5)},${Math.floor(la / 1.5)}`
  if (!vcases.has(k)) vcases.set(k, [r1(lo), r1(la)])
}
sortie.volcans = [...vcases.values()]

writeFileSync(path.join(ICI, 'donnees/tectonique.json'), JSON.stringify(sortie))
console.log(`✓ donnees/tectonique.json : ${Object.entries(sortie.lignes).map(([k, v]) => `${k} ${v.length}`).join(', ')} ; séismes ${sortie.seismes.length} ; volcans ${sortie.volcans.length}`)
