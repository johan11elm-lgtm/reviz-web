// -------------------------------------------------------
// Réviz — Outils communs aux schémas de SVT et de sciences 6e (lots 2 et 3).
// Étiquettes masquables, traits de rappel, flèches, écriture du fichier,
// au format de docs/illustrations-style.md (règles v2).
// -------------------------------------------------------
import { writeFileSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ICI = path.dirname(fileURLToPath(import.meta.url))
const ILLUS = path.resolve(ICI, '../../../public/programme/illustrations')

export const FONT = "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
export const C = {
  encre: '#2D2B57', gris: '#8A8273', accent: '#B34400', accentClair: '#FBE9DD',
  bleu: '#3461C9', bleuClair: '#DCE6FA', rouge: '#C8364F', rougeClair: '#F9DCE1',
  vert: '#2E8B57', vertClair: '#DDF2E3', ocre: '#F4EBDD', ocreRose: '#F5E3DF',
  violet: '#EAE8F2', grisClair: '#E4E1DA', grisTrait: '#C9C4B8',
}
export const r1 = v => Math.round(v * 10) / 10
export const pt = (x, y) => `${r1(x)},${r1(y)}`

/** Largeur estimée d'un texte (6,3 par caractère à 11,5). */
export const largeur = (t, taille = 11.5) => t.length * 6.3 * taille / 11.5

/**
 * Étiquette masquable : lignes de texte (interligne 13) dans un groupe ill-legende
 * avec son rectangle ill-fond. (x, y) = ligne de base de la 1re ligne, ancre start|end|middle.
 * Renvoie { svg, boite: {x, y, w, h} } (boîte du fond, pour accrocher le trait de rappel).
 */
export function etiquette(x, y, lignes, { ancre = 'start', masquable = true, larg, fond = '#FFFFFF' } = {}) {
  if (typeof lignes === 'string') lignes = [lignes]
  const w = r1((larg ?? Math.max(...lignes.map(l => largeur(l)))) + 7)
  const h = 15 + 13 * (lignes.length - 1)
  const bx = ancre === 'start' ? x - 3 : ancre === 'end' ? x - w + 3 : x - w / 2
  const by = y - 11
  const ta = ancre === 'start' ? '' : ` text-anchor="${ancre}"`
  const txt = `<text x="${r1(x)}" y="${r1(y)}"${ta}>${lignes[0]}${lignes.slice(1).map(l => `<tspan x="${r1(x)}" dy="13">${l}</tspan>`).join('')}</text>`
  const boite = { x: r1(bx), y: r1(by), w, h }
  if (!masquable) return { svg: txt, boite }
  return {
    svg: `<g class="ill-legende"><rect class="ill-fond" x="${r1(bx)}" y="${r1(by)}" width="${w}" height="${h}" rx="4" fill="${fond}"/>${txt}</g>`,
    boite,
  }
}

/** Trait de rappel du bord de la case (x1, y1) au dessin (x2, y2), avec un point au bout. */
export const rappel = (x1, y1, x2, y2) =>
  `<path d="M${pt(x1, y1)} L${pt(x2, y2)}" stroke="#2D2B57" stroke-width="1" opacity="0.6" fill="none"/><circle cx="${r1(x2)}" cy="${r1(y2)}" r="1.8" fill="#2D2B57"/>`

/** Pointe de flèche (chevron plein) en (x, y), dirigée selon l'angle de (dx, dy). */
export function pointe(x, y, dx, dy, { couleur = C.encre, taille = 6 } = {}) {
  const n = Math.hypot(dx, dy) || 1
  const ux = dx / n, uy = dy / n
  const bx = x - ux * taille, by = y - uy * taille
  const px = -uy * taille * 0.55, py = ux * taille * 0.55
  return `<path d="M${pt(x, y)} L${pt(bx + px, by + py)} L${pt(bx - px, by - py)} Z" fill="${couleur}"/>`
}

/** Flèche droite de (x1, y1) à (x2, y2). */
export function fleche(x1, y1, x2, y2, { couleur = C.encre, ep = 1.75, taille = 6, tirets } = {}) {
  const n = Math.hypot(x2 - x1, y2 - y1)
  const ux = (x2 - x1) / n, uy = (y2 - y1) / n
  const xe = x2 - ux * taille * 0.8, ye = y2 - uy * taille * 0.8
  const da = tirets ? ` stroke-dasharray="${tirets}"` : ''
  return `<path d="M${pt(x1, y1)} L${pt(xe, ye)}" stroke="${couleur}" stroke-width="${ep}" fill="none"${da}/>` +
    pointe(x2, y2, x2 - x1, y2 - y1, { couleur, taille })
}

/** Mention secondaire (11, semi-gras, gris, minuscules). */
export const mention = (x, y, t, ancre = 'start') =>
  `<text x="${r1(x)}" y="${r1(y)}" font-size="11" font-weight="600" fill="#8A8273"${ancre === 'start' ? '' : ` text-anchor="${ancre}"`}>${t}</text>`

/** Document SVG complet. */
export const document = (h, commentaire, contenu) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 ${h}" font-family="${FONT}">\n  <!-- ${commentaire} -->\n${contenu}\n</svg>\n`

/** Écrit public/programme/illustrations/<rel> et affiche le poids. */
export function ecrire(rel, svg) {
  const f = path.join(ILLUS, rel)
  mkdirSync(path.dirname(f), { recursive: true })
  writeFileSync(f, svg)
  console.log(`✓ ${rel} (${(Buffer.byteLength(svg) / 1024).toFixed(1)} Ko)`)
  return f
}
