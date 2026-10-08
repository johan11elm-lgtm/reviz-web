// -------------------------------------------------------
// Réviz — Fond commun des cartes d'anglais (îles Britanniques, Irlande).
// S'appuie sur carto.mjs (carteZone : pays Natural Earth 50m, Royaume-Uni en
// quatre nations) pour la projection et les pays voisins, et sur les données
// Natural Earth 10m extraites par extraire-fleuves-iles-britanniques.mjs :
// iles-britanniques-10m.json (contours fins de IRL, NIR, ENG, SCT, WLS, IMN, qui
// remplacent ceux du fond 50m) et iles-britanniques-fleuves.json (Thames, Severn, Shannon).
// -------------------------------------------------------
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { carteZone, simplifier } from '../carto.mjs'
import { anneaux, couperRect } from './_commun.mjs'

const ICI = path.dirname(fileURLToPath(import.meta.url))
const UNITES_10M = JSON.parse(readFileSync(path.join(ICI, '../donnees/iles-britanniques-10m.json'), 'utf8')).unites
const FLEUVES = JSON.parse(readFileSync(path.join(ICI, '../donnees/iles-britanniques-fleuves.json'), 'utf8')).fleuves

/** Carte d'une zone des îles Britanniques : unités découpées au cadre + fleuves 10m. */
export function fondIles(cadreCarte, emprise, centre, { tol = 0.5 } = {}) {
  const z = carteZone(cadreCarte, emprise, centre)
  const cadre = [cadreCarte.x, cadreCarte.y, cadreCarte.x + cadreCarte.largeur, cadreCarte.y + z.hauteur]
  const proj = rings => rings
    .map(a => simplifier(a.map(([lo, la]) => z.xy(lo, la)), tol))
    .filter(a => a.length >= 3)
  const fines = UNITES_10M.map(u => ({ unite: u.unite, rings: couperRect(proj(u.polygones.flat()), cadre) }))
  const unites = z.pays(tol)
    .filter(p => !UNITES_10M.some(u => u.unite === p.unite))
    .map(p => ({ ...p, rings: couperRect(anneaux(p.d), cadre) }))
    .concat(fines)
    .filter(p => p.rings.length)
  const fleuve = (nom, tolerance = 0.3) => FLEUVES.find(f => f.nom === nom).lignes
    .map(l => simplifier(l.map(([lo, la]) => z.xy(lo, la)), tolerance))
    .filter(l => l.length > 1)
    .map(l => 'M' + l.map(p => p.join(',')).join('L')).join('')
  return { z, cadre, unites, fleuve }
}
