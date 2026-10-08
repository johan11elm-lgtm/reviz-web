#!/usr/bin/env node
// -------------------------------------------------------
// Réviz — Illustrations des chapitres du programme (schémas, cartes, figures,
// œuvres). Voir docs/plan-illustrations.md et docs/illustrations-style.md.
//
//   node scripts/programme/illustrations.mjs etat
//   node scripts/programme/illustrations.mjs verifier
//   node scripts/programme/illustrations.mjs ajouter <classe>/<matiere>/<id> <illustrations.json>
//   node scripts/programme/illustrations.mjs retirer <classe>/<matiere>/<id> <id-illustration>
//   node scripts/programme/illustrations.mjs rendu <fichier.svg> <sortie.png> [largeur] [test]
//
// « ajouter » lit un objet ou un tableau d'illustrations, contrôle chacune
// (fichier présent, texte alternatif, ancre qui existe dans le chapitre,
// poids, SVG propre) et remplace le seul champ `illustrations` du chapitre
// (même id → remplacée). Rien d'autre n'est réécrit : ne jamais passer par
// valider.mjs, qui réécrit tous les chapitres.
// « rendu » produit un PNG pour relire un dessin (Playwright), et « test »
// le montre comme en mode « Me tester » (légendes masquées).
// -------------------------------------------------------
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseIllustrations } from '../../src/utils/lessonSchema.js'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const PUBLIC = path.join(ROOT, 'public')
const PROGRAMME = path.join(PUBLIC, 'programme')
const POIDS_MAX = { svg: 40 * 1024, webp: 350 * 1024, png: 350 * 1024, jpg: 350 * 1024 }

const lire = f => JSON.parse(readFileSync(f, 'utf8'))
// Même format que les autres chapitres : JSON compact, une ligne.
const ecrire = (f, d) => writeFileSync(f, JSON.stringify(d))

function chapitres() {
  const out = []
  for (const classe of readdirSync(PROGRAMME)) {
    const dc = path.join(PROGRAMME, classe)
    if (classe === 'illustrations' || !statSync(dc).isDirectory()) continue
    for (const matiere of readdirSync(dc)) {
      const dm = path.join(dc, matiere)
      if (!statSync(dm).isDirectory()) continue
      for (const f of readdirSync(dm)) {
        if (f.endsWith('.json') && f !== 'index.json') out.push(`${classe}/${matiere}/${f.slice(0, -5)}`)
      }
    }
  }
  return out.sort()
}

const fichierChapitre = ref => path.join(PROGRAMME, `${ref}.json`)

/** Problèmes d'une illustration déjà normalisée, dans son chapitre. */
function controler(ill, lecon) {
  const pb = []
  const fichier = path.join(PUBLIC, ill.src)
  if (!existsSync(fichier)) return [`fichier introuvable : public${ill.src}`]
  const ext = ill.src.split('.').pop()
  const poids = statSync(fichier).size
  if (poids > POIDS_MAX[ext]) pb.push(`trop lourd : ${Math.round(poids / 1024)} Ko (max ${POIDS_MAX[ext] / 1024} Ko)`)
  if (ill.alt.length < 40) pb.push('texte alternatif trop court : décrire ce que montre la figure')
  const m = ill.ancre.match(/^resume\.sections\[(\d+)\]$/)
  if (m && !lecon.resume?.sections?.[Number(m[1])]) pb.push(`ancre ${ill.ancre} : cette section n'existe pas`)
  if (ill.ancre === 'resume.methode' && !lecon.resume?.methode?.etapes?.length) pb.push('ancre resume.methode : le chapitre n\'a pas de méthode')
  if (ext === 'svg') {
    const svg = readFileSync(fichier, 'utf8')
    if (!/^\s*<svg[\s>]/.test(svg)) pb.push('le SVG doit commencer par <svg> (pas de prologue XML ni de DOCTYPE)')
    if (!/viewBox=/.test(svg)) pb.push('SVG sans viewBox')
    // « < 30 » ou « R&D » non échappés : le fichier n'est plus du XML et l'image ne s'affiche pas.
    const sansCommentaires = svg.replace(/<!--[\s\S]*?-->/g, '')
    if (/<(?![a-zA-Z/!?])/.test(sansCommentaires)) pb.push('SVG mal formé : « < » non échappé dans un texte (écrire &lt;)')
    if (/&(?!(amp|lt|gt|quot|apos|#\d+|#x[0-9a-f]+);)/i.test(sansCommentaires)) pb.push('SVG mal formé : « & » non échappé (écrire &amp;)')
    if (/<script|on[a-z]+\s*=|javascript:/i.test(svg)) pb.push('SVG avec script ou gestionnaire d\'événement')
    if (/<style/i.test(svg)) pb.push('SVG avec <style> : interdit (inséré en ligne, il s\'appliquerait à toute la page)')
    if (/(href|src)\s*=\s*["'](?!#)/i.test(svg)) pb.push('SVG qui charge une ressource externe')
    if (/\sid=/.test(svg)) pb.push('SVG avec des id : interdit (deux copies en ligne entreraient en conflit)')
    if (/<(image|foreignObject)/i.test(svg)) pb.push('SVG avec <image> ou <foreignObject>')
    const classes = [...svg.matchAll(/class="([^"]*)"/g)].flatMap(c => c[1].split(/\s+/))
    const autres = classes.filter(c => c && c !== 'ill-legende' && c !== 'ill-fond')
    if (autres.length) pb.push(`classes inconnues : ${[...new Set(autres)].join(', ')}`)
    if (ill.legendesMasquables && !classes.includes('ill-legende')) pb.push('legendesMasquables sans aucun groupe .ill-legende')
  } else if (ill.legendesMasquables) {
    pb.push('legendesMasquables ne vaut que pour un SVG')
  }
  if (!ill.credit && ['webp', 'jpg', 'png'].includes(ext)) pb.push('image sans crédit (œuvre ou photo : auteur, date, lieu, licence)')
  return pb
}

function etat() {
  let n = 0
  for (const ref of chapitres()) {
    const ills = parseIllustrations(lire(fichierChapitre(ref)).illustrations)
    if (!ills.length) continue
    n += ills.length
    console.log(`${ref}`)
    for (const i of ills) console.log(`  - ${i.id} (${i.ancre}) ${i.src}${i.legendesMasquables ? ' [légendes masquables]' : ''}`)
  }
  console.log(`\n${n} illustration${n > 1 ? 's' : ''}`)
}

function verifier() {
  let erreurs = 0
  let total = 0
  for (const ref of chapitres()) {
    const lecon = lire(fichierChapitre(ref))
    const brut = Array.isArray(lecon.illustrations) ? lecon.illustrations : []
    const ills = parseIllustrations(brut)
    total += ills.length
    if (brut.length !== ills.length) {
      console.log(`✕ ${ref} : ${brut.length - ills.length} illustration(s) rejetée(s) par parseIllustrations`)
      erreurs++
    }
    const ids = ills.map(i => i.id)
    if (new Set(ids).size !== ids.length) { console.log(`✕ ${ref} : ids en double`); erreurs++ }
    for (const ill of ills) {
      for (const p of controler(ill, lecon)) { console.log(`✕ ${ref} · ${ill.id} : ${p}`); erreurs++ }
    }
  }
  console.log(erreurs ? `\n${erreurs} problème(s) sur ${total} illustration(s)` : `\n✓ ${total} illustration(s), aucun problème`)
  process.exitCode = erreurs ? 1 : 0
}

function ajouter(ref, source) {
  const f = fichierChapitre(ref)
  if (!existsSync(f)) throw new Error(`chapitre introuvable : ${ref}`)
  const lecon = lire(f)
  const brut = [].concat(lire(source))
  const ills = parseIllustrations(brut)
  if (ills.length !== brut.length) {
    throw new Error('illustration rejetée : src hors de /programme/illustrations/ (minuscules, chiffres, -, _), alt vide ou ancre invalide (resume.intro, resume.methode, resume.sections[i])')
  }
  const pbs = ills.flatMap(i => controler(i, lecon).map(p => `${i.id} : ${p}`))
  if (pbs.length) throw new Error(pbs.join('\n'))
  const existantes = Array.isArray(lecon.illustrations) ? lecon.illustrations : []
  const nouveaux = new Set(ills.map(i => i.id))
  const fusion = [...existantes.filter(i => !nouveaux.has(i.id)), ...ills]
  // Champ placé avant « programme » (métadonnées de génération), comme le premier exemple.
  const out = {}
  for (const [k, v] of Object.entries(lecon)) {
    if (k === 'illustrations') continue
    if (k === 'programme') out.illustrations = fusion
    out[k] = v
  }
  if (!out.illustrations) out.illustrations = fusion
  ecrire(f, out)
  console.log(`✓ ${ref} : ${fusion.length} illustration(s) (${ills.map(i => i.id).join(', ')})`)
}

function retirer(ref, id) {
  const f = fichierChapitre(ref)
  const lecon = lire(f)
  const avant = lecon.illustrations ?? []
  lecon.illustrations = avant.filter(i => i.id !== id)
  if (!lecon.illustrations.length) delete lecon.illustrations
  ecrire(f, lecon)
  console.log(`✓ ${ref} : ${avant.length - (lecon.illustrations?.length ?? 0)} retirée(s)`)
}

async function rendu(svgPath, out, largeur = '720', test = '') {
  const { chromium } = await import('playwright')
  const svg = readFileSync(svgPath, 'utf8')
  const masque = test
    ? '.ill-legende text{opacity:0}.ill-legende .ill-fond{fill:#ECE9F4;stroke:#B9B2CF;stroke-dasharray:3 2}'
    : ''
  const b = await chromium.launch()
  const p = await b.newPage({ viewport: { width: Number(largeur) + 40, height: 1200 }, deviceScaleFactor: 2 })
  await p.setContent(`<style>body{margin:20px;background:#fff}svg{width:${largeur}px;display:block}${masque}</style>${svg}`)
  await p.locator('svg').first().screenshot({ path: out })
  await b.close()
  console.log(`✓ ${out}`)
}

const [cmd, ...args] = process.argv.slice(2)
try {
  if (cmd === 'etat') etat()
  else if (cmd === 'verifier') verifier()
  else if (cmd === 'ajouter' && args.length === 2) ajouter(...args)
  else if (cmd === 'retirer' && args.length === 2) retirer(...args)
  else if (cmd === 'rendu' && args.length >= 2) await rendu(...args)
  else {
    console.log('Usage : etat | verifier | ajouter <classe>/<matiere>/<id> <illustrations.json> | retirer <ref> <id> | rendu <svg> <png> [largeur] [test]')
    process.exitCode = 1
  }
} catch (e) {
  console.error(`✕ ${e.message}`)
  process.exitCode = 1
}
