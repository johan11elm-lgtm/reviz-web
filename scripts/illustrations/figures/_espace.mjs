// -------------------------------------------------------
// Réviz — Projections pour les figures de géométrie dans l'espace (maths 3e/4e).
//  - perspective cavalière : fuyantes à 45° (vers le haut à droite), coefficient 0,5 ;
//  - vue plongeante orthogonale (solides de révolution : bases dessinées en ovales).
// Repère : x vers la droite, y en profondeur (vers l'arrière), z vers le haut.
// La visibilité des arêtes se déduit des faces : une face est vue si sa normale
// sortante pointe vers l'observateur (direction opposée à celle de projection).
// -------------------------------------------------------
export const v3 = {
  add: (a, b) => a.map((c, i) => c + b[i]),
  sub: (a, b) => a.map((c, i) => c - b[i]),
  mul: (a, k) => a.map(c => c * k),
  dot: (a, b) => a.reduce((s, c, i) => s + c * b[i], 0),
  cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
  lerp: (a, b, t) => a.map((c, i) => c + (b[i] - c) * t),
}

/** Perspective cavalière (angle des fuyantes `angle`°, coefficient k), origine écran `o`, échelle s. */
export function cavaliere({ o, s = 1, k = 0.5, angle = 45 }) {
  const a = (angle * Math.PI) / 180
  const proj = ([x, y, z]) => [o[0] + s * (x + k * y * Math.cos(a)), o[1] - s * (z + k * y * Math.sin(a))]
  // Vecteur vers l'observateur : opposé au noyau de la projection.
  const vers = [k * Math.cos(a), -1, k * Math.sin(a)]
  return { proj, vers }
}

/** Vue orthogonale plongeante d'angle phi (degrés) et d'azimut az (rotation autour de z). */
export function plongeante({ o, s = 1, phi = 20, az = 0 }) {
  const p = (phi * Math.PI) / 180, t = (az * Math.PI) / 180
  const tourne = ([x, y, z]) => [x * Math.cos(t) - y * Math.sin(t), x * Math.sin(t) + y * Math.cos(t), z]
  const proj = q => {
    const [x, y, z] = tourne(q)
    return [o[0] + s * x, o[1] - s * (z * Math.cos(p) + y * Math.sin(p))]
  }
  // Vecteur vers l'observateur, exprimé dans le repère de l'objet.
  const w = [0, -Math.cos(p), Math.sin(p)]
  const vers = [w[0] * Math.cos(t) + w[1] * Math.sin(t), -w[0] * Math.sin(t) + w[1] * Math.cos(t), w[2]]
  return { proj, vers }
}

/**
 * Polyèdre convexe : sommets (objet nom → point 3D) et faces (listes de noms).
 * Renvoie les arêtes avec leur visibilité.
 */
export function aretes(sommets, faces, vers) {
  const centre = v3.mul(Object.values(sommets).reduce(v3.add), 1 / Object.keys(sommets).length)
  const vue = faces.map(f => {
    const [a, b, c] = f.map(nm => sommets[nm])
    let nrm = v3.cross(v3.sub(b, a), v3.sub(c, a))
    if (v3.dot(nrm, v3.sub(a, centre)) < 0) nrm = v3.mul(nrm, -1)
    return v3.dot(nrm, vers) > 1e-9
  })
  const map = new Map()
  faces.forEach((f, i) => f.forEach((nm, j) => {
    const nm2 = f[(j + 1) % f.length]
    const cle = [nm, nm2].sort().join('-')
    const e = map.get(cle) || { a: nm, b: nm2, vue: false }
    e.vue = e.vue || vue[i]
    map.set(cle, e)
  }))
  return { aretes: [...map.values()], facesVues: vue }
}

/** Cercle horizontal (centre c, rayon r) échantillonné, avec visibilité de chaque point selon `estVu`. */
export function cercleH(c, r, N = 120) {
  return Array.from({ length: N + 1 }, (_, i) => {
    const t = (2 * Math.PI * i) / N
    return [c[0] + r * Math.cos(t), c[1] + r * Math.sin(t), c[2]]
  })
}

/** Découpe une suite de points 3D en morceaux de même visibilité, projetés. */
export function morceaux(pts3, visible, proj) {
  const out = []
  let cur = null
  for (const p of pts3) {
    const v = visible(p)
    if (!cur || cur.v !== v) {
      const prev = cur ? cur.pts[cur.pts.length - 1] : null
      cur = { v, pts: prev ? [prev] : [] }
      out.push(cur)
    }
    cur.pts.push(proj(p))
  }
  return out.filter(m => m.pts.length > 1)
}
