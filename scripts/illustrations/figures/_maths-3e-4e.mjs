// -------------------------------------------------------
// Réviz — Outils des figures de maths 3e/4e (transformations, espace,
// probabilités, pyramides et cônes). Chaque figure est calculée par un script
// de scripts/illustrations/figures/ : coordonnées exactes, perspective
// cavalière, ellipses et parallélismes obtenus par le calcul.
// Style : docs/illustrations-style.md (règles v2).
// -------------------------------------------------------
import { writeFileSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ICI = path.dirname(fileURLToPath(import.meta.url))
const RACINE = path.resolve(ICI, '../../../public/programme/illustrations')

export const FONT = "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
export const C = {
  encre: '#2D2B57',
  gris: '#8A8273',
  accent: '#B34400',
  aplat: '#FBE9DD',
  separateur: '#EDE8E1',
  quadrillage: '#EAE8F2',
}

/** Nombre arrondi au dixième, écrit court. */
export const n = v => {
  const r = Math.round(v * 10) / 10
  const s = String(Object.is(r, -0) ? 0 : r)
  return s.startsWith('0.') ? s.slice(1) : s.startsWith('-0.') ? '-' + s.slice(2) : s
}
export const pt = p => `${n(p[0])},${n(p[1])}`

// --- vecteurs ---
export const add = (a, b) => [a[0] + b[0], a[1] + b[1]]
export const sub = (a, b) => [a[0] - b[0], a[1] - b[1]]
export const mul = (a, k) => [a[0] * k, a[1] * k]
export const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]
export const len = a => Math.hypot(a[0], a[1])
export const unit = a => mul(a, 1 / (len(a) || 1))
export const perp = a => [-a[1], a[0]]
export const dot = (a, b) => a[0] * b[0] + a[1] * b[1]
export const rot = (p, c, deg) => {
  // Rotation dans le repère mathématique (y vers le haut) : sur l'écran, y descend,
  // donc un angle positif (anti-horaire) correspond à -deg en coordonnées écran.
  const a = (-deg * Math.PI) / 180
  const d = sub(p, c)
  return [c[0] + d[0] * Math.cos(a) - d[1] * Math.sin(a), c[1] + d[0] * Math.sin(a) + d[1] * Math.cos(a)]
}

/** Chemin polyligne (fermé si ferme). */
export const chemin = (pts, ferme = false) => 'M' + pts.map(pt).join('L') + (ferme ? 'Z' : '')

export function trait(pts, { couleur = C.encre, ep = 1.75, tirets = '', fill = 'none', ferme = false, extra = '' } = {}) {
  return `<path d="${chemin(pts, ferme)}" fill="${fill}" stroke="${couleur}" stroke-width="${ep}"${tirets ? ` stroke-dasharray="${tirets}"` : ''} stroke-linecap="round" stroke-linejoin="round"${extra}/>`
}
export const aplat = (pts, fill = C.aplat) => `<path d="${chemin(pts, true)}" fill="${fill}"/>`

export const point = (p, couleur = C.encre) => `<circle cx="${n(p[0])}" cy="${n(p[1])}" r="2.2" fill="${couleur}"/>`

/** Nom de point (12,5 gras, encre), centré en (x, y) de ligne de base. */
export const nom = (p, s) => `<text x="${n(p[0])}" y="${n(p[1])}" font-size="12.5" font-weight="700" fill="${C.encre}" text-anchor="middle">${s}</text>`

/** Place le nom d'un point P à distance d dans la direction dir (vecteur), centré visuellement. */
export function nomPres(P, s, dir, d = 11) {
  const u = unit(dir)
  return nom([P[0] + u[0] * d, P[1] + u[1] * d + 4.5], s)
}

export const largeur = (s, taille = 11.5) => [...s.replace(/<[^>]+>/g, '')].length * 6.3 * (taille / 11.5)

/**
 * Étiquette masquable (11,5, semi-gras, encre). (x, y) : ligne de base de la 1re ligne,
 * ancre start / middle / end. Renvoie { svg, boite: [x0, y0, x1, y1] }.
 */
export function etiquette(x, y, lignes, { ancre = 'start', taille = 11.5, couleur = C.encre, gras = 600, masquable = true } = {}) {
  const L = [].concat(lignes)
  const w = Math.max(...L.map(s => largeur(s, taille)))
  const x0 = ancre === 'start' ? x - 3 : ancre === 'end' ? x - w - 3 : x - w / 2 - 3
  const h = 15 + (L.length - 1) * 13
  const boite = [x0, y - 11, x0 + w + 6, y - 11 + h]
  const t = `<text x="${n(x)}" y="${n(y)}" font-size="${taille}" font-weight="${gras}" fill="${couleur}"${ancre !== 'start' ? ` text-anchor="${ancre}"` : ''}>${L[0]}${L.slice(1).map(s => `<tspan x="${n(x)}" dy="13">${s}</tspan>`).join('')}</text>`
  if (!masquable) return { svg: t, boite }
  const rect = `<rect class="ill-fond" x="${n(boite[0])}" y="${n(boite[1])}" width="${n(boite[2] - boite[0])}" height="${h}" rx="4" fill="#FFFFFF"/>`
  return { svg: `<g class="ill-legende">${rect}${t}</g>`, boite }
}

/** Mention secondaire (11, semi-gras, gris), masquable ou non. */
export const mention = (x, y, s, opts = {}) => etiquette(x, y, s, { taille: 11, couleur: C.gris, ...opts })

/** Trait de rappel du point `de` (bord de case) au point `vers` (dessin), avec un point au bout. */
export const rappel = (de, vers) =>
  `<path d="M${pt(de)}L${pt(vers)}" stroke="${C.encre}" stroke-width="1" opacity="0.6"/><circle cx="${n(vers[0])}" cy="${n(vers[1])}" r="1.8" fill="${C.encre}" opacity="0.8"/>`

/** Codage d'angle droit en S, côtés selon les vecteurs u et v (dessin), taille t. */
export function angleDroit(S, u, v, t = 7, couleur = C.encre) {
  const a = add(S, mul(unit(u), t))
  const b = add(a, mul(unit(v), t))
  const c = add(S, mul(unit(v), t))
  return `<path d="M${pt(a)}L${pt(b)}L${pt(c)}" fill="none" stroke="${couleur}" stroke-width="1.3" stroke-linejoin="round"/>`
}
/** Variante : angle droit en perspective, a et b = extrémités déjà projetées des côtés unitaires. */
export function angleDroitPts(S, A, B, couleur = C.encre) {
  const D = add(A, sub(B, S))
  return `<path d="M${pt(A)}L${pt(D)}L${pt(B)}" fill="none" stroke="${couleur}" stroke-width="1.3" stroke-linejoin="round"/>`
}

/** Pointe de flèche pleine en `b`, orientée de a vers b. */
export function pointe(a, b, { long = 7, large = 6, couleur = C.encre } = {}) {
  const u = unit(sub(b, a))
  const p = perp(u)
  const base = sub(b, mul(u, long))
  return `<path d="M${pt(b)}L${pt(add(base, mul(p, large / 2)))}L${pt(sub(base, mul(p, large / 2)))}Z" fill="${couleur}"/>`
}

/** Chevron de parallélisme (comme la maquette Thalès) au milieu de [a b]. */
export function chevron(a, b, { couleur = C.accent, t = 4 } = {}) {
  const m = lerp(a, b, 0.5)
  const u = unit(sub(b, a))
  const p = perp(u)
  const tip = add(m, mul(u, t / 2))
  return `<path d="M${pt(add(sub(tip, mul(u, t)), mul(p, t * 0.75)))}L${pt(tip)}L${pt(sub(sub(tip, mul(u, t)), mul(p, t * 0.75)))}" fill="none" stroke="${couleur}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>`
}

/** Points d'un arc de cercle (repère écran, angles en degrés mathématiques, sens anti-horaire). */
export function arcPts(c, r, a0, a1, pas = 3) {
  const N = Math.max(2, Math.ceil(Math.abs(a1 - a0) / pas))
  const out = []
  for (let i = 0; i <= N; i++) {
    const a = ((a0 + ((a1 - a0) * i) / N) * Math.PI) / 180
    out.push([c[0] + r * Math.cos(a), c[1] - r * Math.sin(a)])
  }
  return out
}

/** Enveloppe d'un document SVG. */
export function doc(h, commentaire, contenu) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 ${h}" font-family="${FONT}">\n  <!-- ${commentaire} -->\n  ${contenu.filter(Boolean).join('\n  ')}\n</svg>\n`
}

/** Écrit le SVG dans public/programme/illustrations/<dossier>/<nom>.svg. */
export function ecrire(dossier, nomFichier, svg) {
  const d = path.join(RACINE, dossier)
  mkdirSync(d, { recursive: true })
  const f = path.join(d, `${nomFichier}.svg`)
  writeFileSync(f, svg)
  console.log(`${dossier}/${nomFichier}.svg : ${(Buffer.byteLength(svg) / 1024).toFixed(1)} Ko`)
  return f
}

/** Contrôle : deux boîtes [x0,y0,x1,y1] se chevauchent-elles ? */
export const chevauche = (a, b) => a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3]
export function verifierBoites(boites, nomFig) {
  for (let i = 0; i < boites.length; i++) {
    const b = boites[i]
    if (b[0] < 3 || b[2] > 357 || b[1] < 3) console.warn(`${nomFig} : étiquette ${i} près du bord`, b.map(n))
    for (let j = i + 1; j < boites.length; j++) if (chevauche(b, boites[j])) console.warn(`${nomFig} : étiquettes ${i} et ${j} se chevauchent`)
  }
}
