// -------------------------------------------------------
// Réviz — Outils communs aux scripts de cartes et croquis de géographie.
// Géométrie (anneaux, découpe, hachures), écriture compacte des chemins,
// textes, flèches et légendes de croquis au format de docs/illustrations-style.md.
// Utilisé par les scripts de scripts/illustrations/cartes/ ; s'appuie sur ../carto.mjs.
// -------------------------------------------------------
import { writeFileSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ICI = path.dirname(fileURLToPath(import.meta.url))
const SORTIE = path.resolve(ICI, '../../../public/programme/illustrations/3eme/geographie')

export const FONT = "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
export const C = {
  encre: '#2D2B57',
  gris: '#8A8273', // mentions secondaires (règles v2)
  grisClair: '#E4E1DA', grisTrait: '#C9C4B8',
  accent: '#B34400',
  bleu: '#3461C9', bleuClair: '#DCE6FA',
  rouge: '#C8364F', rougeClair: '#F9DCE1',
  vert: '#2E8B57', vertClair: '#DDF2E3',
  ocre: '#F4EBDD', ocreRose: '#F5E3DF',
  violet: '#EAE8F2',
  mer: '#EEF3FA',
  voisin: '#F1EEE8', voisinTrait: '#CFC8BA',
}

export const r1 = v => Math.round(v * 10) / 10
const fmt = v => {
  const s = String(r1(v))
  return s.startsWith('0.') ? s.slice(1) : s.startsWith('-0.') ? '-' + s.slice(2) : s
}

/** Anneaux [[x, y], …] d'un <path d> produit par carto.mjs (M…L…Z). */
export function anneaux(d) {
  return d.split('M').filter(Boolean).map(s => s.replace(/Z/g, '').split('L').map(p => p.split(',').map(Number)))
}

const aire = r => {
  let a = 0
  for (let i = 0; i < r.length; i++) {
    const [x1, y1] = r[i]
    const [x2, y2] = r[(i + 1) % r.length]
    a += x1 * y2 - x2 * y1
  }
  return a / 2
}

/**
 * Écriture compacte : coordonnées absolues arrondies (au pas `prec`), puis
 * écrites en relatif. Les anneaux plus petits que `aireMin` sont retirés.
 */
export function compact(rings, { prec = 0.5, aireMin = 0.6 } = {}) {
  let out = ''
  const q = v => Math.round(v / prec) * prec
  for (const r of rings) {
    if (r.length < 3 || Math.abs(aire(r)) < aireMin) continue
    const pts = []
    for (const [x, y] of r) {
      const p = [q(x), q(y)]
      const l = pts[pts.length - 1]
      if (!l || l[0] !== p[0] || l[1] !== p[1]) pts.push(p)
    }
    if (pts.length < 3) continue
    let s = `M${fmt(pts[0][0])},${fmt(pts[0][1])}l`
    const deltas = []
    for (let i = 1; i < pts.length; i++) {
      deltas.push(fmt(pts[i][0] - pts[i - 1][0]) + ',' + fmt(pts[i][1] - pts[i - 1][1]))
    }
    s += deltas.join(' ').replace(/ -/g, '-').replace(/,-/g, '-') + 'z'
    out += s
  }
  return out
}

/** Découpe de Sutherland-Hodgman : garde le côté droit de a→b à l'écran (repère SVG, y vers le bas). */
export function couperDemiPlan(rings, a, b) {
  const cote = p => (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0])
  const inter = (p, q) => {
    const cp = cote(p)
    const cq = cote(q)
    const t = cp / (cp - cq)
    return [p[0] + t * (q[0] - p[0]), p[1] + t * (q[1] - p[1])]
  }
  return rings.map(r => {
    const out = []
    for (let i = 0; i < r.length; i++) {
      const p = r[i]
      const q = r[(i + 1) % r.length]
      const ip = cote(p) >= 0
      const iq = cote(q) >= 0
      if (ip && iq) out.push(q)
      else if (ip && !iq) out.push(inter(p, q))
      else if (!ip && iq) out.push(inter(p, q), q)
    }
    return out
  }).filter(r => r.length >= 3)
}

/** Découpe par un rectangle [x0, y0, x1, y1]. */
export function couperRect(rings, [x0, y0, x1, y1]) {
  let r = rings
  r = couperDemiPlan(r, [x0, y0], [x1, y0])
  r = couperDemiPlan(r, [x1, y0], [x1, y1])
  r = couperDemiPlan(r, [x1, y1], [x0, y1])
  r = couperDemiPlan(r, [x0, y1], [x0, y0])
  return r
}

/** Intervalles [x0, x1] d'une ligne horizontale y dans des anneaux (pair-impair). */
function intervalles(rings, y) {
  const xs = []
  for (const r of rings) {
    for (let i = 0; i < r.length; i++) {
      const [x1, y1] = r[i]
      const [x2, y2] = r[(i + 1) % r.length]
      if ((y1 <= y && y2 > y) || (y2 <= y && y1 > y)) xs.push(x1 + ((y - y1) * (x2 - x1)) / (y2 - y1))
    }
  }
  xs.sort((a, b) => a - b)
  const out = []
  for (let i = 0; i + 1 < xs.length; i += 2) {
    const last = out[out.length - 1]
    // Deux surfaces voisines (départements, pays) : intervalles bout à bout fusionnés.
    if (last && xs[i] - last[1] < 2.5) last[1] = Math.max(last[1], xs[i + 1])
    else out.push([xs[i], xs[i + 1]])
  }
  return out
}

function croiser(A, B) {
  const out = []
  for (const [a0, a1] of A) for (const [b0, b1] of B) {
    const lo = Math.max(a0, b0)
    const hi = Math.min(a1, b1)
    if (hi - lo > 0.4) out.push([lo, hi])
  }
  return out
}

/**
 * Hachures parallèles dessinées en segments (pas de motif ni de clipPath) :
 * `rings` est la surface à hachurer, `dans` d'autres surfaces auxquelles se limiter.
 */
export function hachures(rings, { angle = 45, pas = 4, dans = [], decalage = 0 } = {}) {
  const t = (angle * Math.PI) / 180
  const cos = Math.cos(t)
  const sin = Math.sin(t)
  const rot = ([x, y]) => [x * cos + y * sin, -x * sin + y * cos]
  const inv = ([u, v]) => [u * cos - v * sin, u * sin + v * cos]
  const R = rings.map(r => r.map(rot))
  const D = dans.map(rs => rs.map(r => r.map(rot)))
  const vs = R.flat().map(p => p[1])
  if (!vs.length) return ''
  const v0 = Math.ceil((Math.min(...vs) - decalage) / pas) * pas + decalage
  const v1 = Math.max(...vs)
  let s = ''
  for (let v = v0; v <= v1; v += pas) {
    let iv = intervalles(R, v)
    for (const d of D) iv = croiser(iv, intervalles(d, v))
    for (const [u0, u1] of iv) {
      const a = inv([u0, v])
      const b = inv([u1, v])
      s += `M${fmt(a[0])},${fmt(a[1])}l${fmt(b[0] - a[0])},${fmt(b[1] - a[1])}`
    }
  }
  return s.replace(/,-/g, '-')
}

/** Échappe un texte pour le SVG (« < 30 » dans une légende casserait le fichier). */
export const xml = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/** Texte simple. */
export function texte(x, y, s, attrs = '') {
  return `<text x="${r1(x)}" y="${r1(y)}"${attrs ? ' ' + attrs : ''}>${xml(s)}</text>`
}

/** Pointe de flèche pleine au point `b`, orientée selon a→b. */
export function pointe(a, b, { long = 7, large = 6, fill = C.encre } = {}) {
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  const l = Math.hypot(dx, dy) || 1
  const ux = dx / l
  const uy = dy / l
  const bx = b[0] - ux * long
  const by = b[1] - uy * long
  const p1 = [bx - uy * large / 2, by + ux * large / 2]
  const p2 = [bx + uy * large / 2, by - ux * large / 2]
  return `<path d="M${fmt(b[0])},${fmt(b[1])}L${fmt(p1[0])},${fmt(p1[1])}L${fmt(p2[0])},${fmt(p2[1])}Z" fill="${fill}"/>`
}

/**
 * Flèche courbe de a vers b (courbe quadratique, contrôle `c`), tige arrêtée
 * avant la pointe pour un bout net.
 */
export function fleche(a, c, b, { couleur = C.encre, epaisseur = 2, long = 7, large = 7, tirets = '' } = {}) {
  // Point de la courbe juste avant la pointe : tangente en b = b - c.
  const dx = b[0] - c[0]
  const dy = b[1] - c[1]
  const l = Math.hypot(dx, dy) || 1
  const fin = [b[0] - (dx / l) * (long - 1), b[1] - (dy / l) * (long - 1)]
  const d = `M${fmt(a[0])},${fmt(a[1])}Q${fmt(c[0])},${fmt(c[1])} ${fmt(fin[0])},${fmt(fin[1])}`
  return `<path d="${d}" fill="none" stroke="${couleur}" stroke-width="${epaisseur}" stroke-linecap="round"${tirets ? ` stroke-dasharray="${tirets}"` : ''}/>` +
    pointe(c, b, { long, large, fill: couleur })
}

/** Largeur estimée d'un texte (6,3 par caractère à 11,5). */
export const largeurTexte = (s, taille = 11.5) => s.length * 6.3 * (taille / 11.5)

/**
 * Intitulé de légende masquable : `lignes` (1 ou 2), texte à gauche en (x, y)
 * (y = ligne de base de la première ligne).
 */
export function intitule(x, y, lignes, { taille = 11.5 } = {}) {
  const L = [].concat(lignes)
  const w = Math.max(...L.map(s => largeurTexte(s, taille))) + 6
  const h = 15 + (L.length - 1) * 13
  const rect = `<rect class="ill-fond" x="${r1(x - 3)}" y="${r1(y - 11)}" width="${r1(w)}" height="${h}" rx="4" fill="#FFFFFF"/>`
  const t = L.length === 1
    ? `<text x="${r1(x)}" y="${r1(y)}">${L[0]}</text>`
    : `<text x="${r1(x)}" y="${r1(y)}">${L[0]}<tspan x="${r1(x)}" dy="13">${L[1]}</tspan></text>`
  return `<g class="ill-legende">${rect}${t}</g>`
}

/** Intitulé non masquable (même gabarit, sans case). */
export function intituleFixe(x, y, lignes) {
  const L = [].concat(lignes)
  return L.length === 1
    ? `<text x="${r1(x)}" y="${r1(y)}">${L[0]}</text>`
    : `<text x="${r1(x)}" y="${r1(y)}">${L[0]}<tspan x="${r1(x)}" dy="13">${L[1]}</tspan></text>`
}

/** Titre de partie de légende : mention secondaire (11, semi-gras, #8A8273, minuscules). */
export function titrePartie(x, y, s) {
  return `<text x="${r1(x)}" y="${r1(y)}" font-size="11" font-weight="600" fill="${C.gris}">${s}</text>`
}

/** Halo blanc sous les noms posés sur la carte. */
export const HALO = 'stroke="#FFFFFF" stroke-width="3" stroke-linejoin="round" paint-order="stroke"'

/**
 * Écrit le SVG final et affiche son poids. `dossier` : sous-dossier de
 * public/programme/illustrations/ (3eme/geographie par défaut, ou communs, 6eme/histoire…).
 */
export function ecrireSvg(nom, svg, dossier = null) {
  const sortie = dossier ? path.resolve(ICI, '../../../public/programme/illustrations', dossier) : SORTIE
  mkdirSync(sortie, { recursive: true })
  const f = path.join(sortie, `${nom}.svg`)
  const propre = svg.replace(/\n\s*\n/g, '\n')
  writeFileSync(f, propre)
  console.log(`${nom}.svg : ${(Buffer.byteLength(propre) / 1024).toFixed(1)} Ko`)
  return f
}

/** Semis de points réguliers (quinconce) dans des anneaux : path de petits traits à bout rond. */
export function semis(rings, { pas = 5 } = {}) {
  const ys = rings.flat().map(p => p[1])
  const xsAll = rings.flat().map(p => p[0])
  if (!ys.length) return ''
  let s = ''
  let k = 0
  for (let y = Math.ceil(Math.min(...ys) / pas) * pas; y <= Math.max(...ys); y += pas, k++) {
    const iv = intervalles(rings, y)
    const off = (k % 2) * (pas / 2)
    for (let x = Math.floor(Math.min(...xsAll) / pas) * pas + off; x <= Math.max(...xsAll); x += pas) {
      if (iv.some(([a, b]) => x > a + 1 && x < b - 1)) s += `M${fmt(x)},${fmt(y)}h.1`
    }
  }
  return s
}

/** Contour net de la France par départements : trait encre épais sous un remplissage blanc. */
export function fondDepartements(f, { tol = 1, prec = 1, epaisseur = 4.4 } = {}) {
  const deps = f.departements(tol).map(d => ({ ...d, rings: anneaux(d.d) }))
  const tous = compact(deps.flatMap(d => d.rings), { prec })
  return {
    deps,
    rings: codes => deps.filter(d => codes.includes(d.code)).flatMap(d => d.rings),
    contour: `<path d="${tous}" fill="none" stroke="${C.encre}" stroke-width="${epaisseur}" stroke-linejoin="round"/>`,
    // Le trait blanc referme les petits jours entre départements simplifiés séparément.
    blanc: `<path d="${tous}" fill="#FFFFFF" stroke="#FFFFFF" stroke-width="1.6" stroke-linejoin="round"/>`,
    tous,
  }
}
