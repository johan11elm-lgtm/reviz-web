// -------------------------------------------------------
// Réviz — Outils communs aux figures de maths 5e et 6e (groupe « maths-5e-6e »).
// Chaque figure est calculée par un script m56-<nom>.mjs de ce dossier :
// coordonnées exactes, angles et parallélismes vrais. Le SVG produit suit
// docs/illustrations-style.md (règles v2) : largeur 360, étiquettes seules,
// légendes masquables (ill-legende / ill-fond), pas d'id ni de <style>.
//
// Conventions : on travaille en coordonnées écran (y vers le bas) ; les angles
// de direction sont donnés en degrés, sens mathématique (0° = vers la droite,
// 90° = vers le haut).
// -------------------------------------------------------
import { writeFileSync, mkdirSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ICI = path.dirname(fileURLToPath(import.meta.url))
export const ILLUS = path.resolve(ICI, '../../../public/programme/illustrations')

export const FONT = "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
export const C = {
  encre: '#2D2B57',
  gris: '#8A8273',
  accent: '#B34400',
  aplat: '#FBE9DD',
  separateur: '#EDE8E1',
  grille: '#EAE8F2',
  blanc: '#FFFFFF',
}

/** Arrondi au dixième, écrit sans zéro inutile. */
export const f = v => {
  const r = Math.round(v * 10) / 10
  return String(Object.is(r, -0) ? 0 : r)
}
export const rad = d => (d * Math.PI) / 180
export const deg = r => (r * 180) / Math.PI

// ---------- géométrie ----------
export const P = (x, y) => ({ x, y })
export const add = (a, b) => P(a.x + b.x, a.y + b.y)
export const sub = (a, b) => P(a.x - b.x, a.y - b.y)
export const mul = (a, k) => P(a.x * k, a.y * k)
export const mil = (a, b) => P((a.x + b.x) / 2, (a.y + b.y) / 2)
export const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y)
export const norm = a => mul(a, 1 / Math.hypot(a.x, a.y))
/** Vecteur unitaire de direction d (degrés, sens mathématique). */
export const dir = d => P(Math.cos(rad(d)), -Math.sin(rad(d)))
/** Direction (degrés, sens mathématique, dans [0, 360[) du vecteur a → b. */
export const direction = (a, b) => (deg(Math.atan2(-(b.y - a.y), b.x - a.x)) + 360) % 360
export const pol = (o, r, d) => add(o, mul(dir(d), r))
/** Projeté orthogonal de m sur la droite (a, b). */
export function projete(m, a, b) {
  const u = norm(sub(b, a))
  const t = (m.x - a.x) * u.x + (m.y - a.y) * u.y
  return add(a, mul(u, t))
}
/** Intersection des droites (a, b) et (c, d). */
export function inter(a, b, c, d) {
  const d1 = sub(b, a), d2 = sub(d, c)
  const den = d1.x * d2.y - d1.y * d2.x
  const t = ((c.x - a.x) * d2.y - (c.y - a.y) * d2.x) / den
  return add(a, mul(d1, t))
}
/** Centre du cercle circonscrit à abc. */
export function circonscrit(a, b, c) {
  const d = 2 * (a.x * (b.y - c.y) + b.x * (c.y - a.y) + c.x * (a.y - b.y))
  const s = q => q.x * q.x + q.y * q.y
  return P(
    (s(a) * (b.y - c.y) + s(b) * (c.y - a.y) + s(c) * (a.y - b.y)) / d,
    (s(a) * (c.x - b.x) + s(b) * (a.x - c.x) + s(c) * (b.x - a.x)) / d,
  )
}
/** Angle géométrique (degrés) en s entre s→a et s→b. */
export function angleEn(s, a, b) {
  const u = norm(sub(a, s)), v = norm(sub(b, s))
  return deg(Math.acos(Math.max(-1, Math.min(1, u.x * v.x + u.y * v.y))))
}

// ---------- tracés ----------
export const pt = p => `${f(p.x)},${f(p.y)}`
export const seg = (a, b) => `M${pt(a)} L${pt(b)}`
export const poly = (pts, ferme = true) => 'M' + pts.map(pt).join(' L') + (ferme ? ' Z' : '')

/** Arc de cercle de centre s, rayon r, de la direction d1 à la direction d2 (sens direct). */
export function arc(s, r, d1, d2) {
  let delta = d2 - d1
  while (delta < 0) delta += 360
  while (delta > 360) delta -= 360
  const a = pol(s, r, d1), b = pol(s, r, d1 + delta)
  return `M${pt(a)} A${f(r)} ${f(r)} 0 ${delta > 180 ? 1 : 0} 0 ${pt(b)}`
}
/** Secteur angulaire plein (pour l'aplat d'un angle). */
export function secteur(s, r, d1, d2) {
  return `M${pt(s)} L` + arc(s, r, d1, d2).slice(1) + ' Z'
}
/** Codage d'angle droit en s entre les directions d1 et d2 (perpendiculaires). */
export function angleDroit(s, d1, d2, c = 8) {
  const a = pol(s, c, d1), b = pol(s, c, d2), m = add(a, mul(dir(d2), c))
  return `M${pt(a)} L${pt(m)} L${pt(b)}`
}
/** Codage de longueurs égales : n petits traits obliques au milieu de [ab]. */
export function codeLongueur(a, b, n = 1, { l = 5, ecart = 3.2, oblique = 70 } = {}) {
  const m = mil(a, b)
  const d = direction(a, b)
  const u = dir(d)
  const out = []
  for (let i = 0; i < n; i++) {
    const c = add(m, mul(u, (i - (n - 1) / 2) * ecart))
    out.push(seg(pol(c, l, d + oblique), pol(c, l, d + oblique + 180)))
  }
  return out.join(' ')
}
/** Pointe de flèche pleine en b, pour un trait venant de a. */
export function pointe(a, b, l = 7, e = 3.2) {
  const u = norm(sub(b, a)), n = P(-u.y, u.x)
  const base = sub(b, mul(u, l))
  return `M${pt(b)} L${pt(add(base, mul(n, e)))} L${pt(sub(base, mul(n, e)))} Z`
}
/** Petit chevron de parallélisme au point m, orienté selon la direction d. */
export function chevron(m, d, l = 4) {
  return `M${pt(pol(m, l, d + 145))} L${pt(m)} L${pt(pol(m, l, d - 145))}`
}

// ---------- textes ----------
const largeurTexte = (t, taille = 11.5) => [...t].length * 6.3 * (taille / 11.5)

/** Noms de points (12,5 gras, encre). liste : [[x, y, texte, ancre?]] */
export function noms(liste) {
  const t = liste.map(([x, y, s, a]) => `<text x="${f(x)}" y="${f(y)}"${a && a !== 'middle' ? ` text-anchor="${a}"` : ''}>${s}</text>`)
  return `<g font-size="12.5" font-weight="700" fill="${C.encre}" text-anchor="middle">${t.join('')}</g>`
}
/** Mention secondaire (11, semi-gras, gris). */
export function mention(x, y, s, a = 'middle') {
  return `<text x="${f(x)}" y="${f(y)}" font-size="11" font-weight="600" fill="${C.gris}" text-anchor="${a}">${s}</text>`
}
/** Rectangle englobant d'une étiquette (lignes de texte, taille 11,5 par défaut). */
export function boite(x, y, lignes, a = 'start', { taille = 11.5, marge = 3, inter = 13 } = {}) {
  const w = Math.max(...lignes.map(l => largeurTexte(l.replace(/<[^>]+>/g, ''), taille))) + 2 * marge
  const h = (lignes.length - 1) * inter + taille + 2 * marge + 1
  const x0 = a === 'start' ? x - marge : a === 'end' ? x - w + marge : x - w / 2
  const y0 = y - taille * 0.82 - marge
  return { x: x0, y: y0, w, h }
}
/**
 * Étiquette masquable : <g class="ill-legende"> avec fond blanc.
 * lignes : tableau de chaînes ; options : ancre, taille, poids.
 */
export function etiquette(x, y, lignes, { a = 'start', taille = 11.5, poids = 600, couleur = C.encre, marge = 3 } = {}) {
  if (typeof lignes === 'string') lignes = [lignes]
  const b = boite(x, y, lignes, a, { taille, marge })
  const tspans = lignes.map((l, i) => (i === 0 ? l : `<tspan x="${f(x)}" dy="13">${l}</tspan>`)).join('')
  const attrs = `${a !== 'start' ? ` text-anchor="${a}"` : ''}${taille !== 11.5 ? ` font-size="${taille}"` : ''}${poids !== 600 ? ` font-weight="${poids}"` : ''}${couleur !== C.encre ? ` fill="${couleur}"` : ''}`
  return `<g class="ill-legende"><rect class="ill-fond" x="${f(b.x)}" y="${f(b.y)}" width="${f(b.w)}" height="${f(b.h)}" rx="4" fill="#FFFFFF"/><text x="${f(x)}" y="${f(y)}"${attrs}>${tspans}</text></g>`
}

// ---------- écriture ----------
/** Assemble et écrit le SVG ; renvoie le chemin écrit. */
export function ecrire(rel, h, commentaire, corps) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 ${f(h)}" font-family="${FONT}" font-size="11.5" font-weight="600" fill="${C.encre}">
  <!-- ${commentaire} -->
  ${corps.filter(Boolean).join('\n  ')}
</svg>
`
  if (/ id=|<style|<defs|<marker/.test(svg)) throw new Error('SVG interdit (id, style, defs, marker)')
  const out = path.join(ILLUS, rel)
  mkdirSync(path.dirname(out), { recursive: true })
  writeFileSync(out, svg)
  console.log(`✓ ${path.relative(process.cwd(), out)} (${(statSync(out).size / 1024).toFixed(1)} Ko)`)
  return out
}
