// Réviz, 4e maths, pyramides et cônes (sections 2 et 3).
// À gauche : cône de révolution de rayon r = 3 et de hauteur h = 4 (unités du dessin), en vue
// plongeante : base dessinée en ovale, partie cachée du bord en pointillés, contours apparents
// tangents à l'ovale (calculés), rayon r et hauteur h (avec angle droit codé).
// À droite : son patron (échelle un peu plus petite) : disque de base de rayon 3 et portion de disque de
// rayon la génératrice g = √(3² + 4²) = 5 et d'angle 360° × 3 / 5 = 216°, si bien que la longueur
// de l'arc (2π × 3) est égale au périmètre du disque de base ; arc et périmètre en accent.
// node scripts/illustrations/figures/cone-perspective-et-patron.mjs
import { C, doc, ecrire, trait, point, etiquette, mention, rappel, angleDroitPts, verifierBoites, arcPts, chemin, lerp } from './_maths-3e-4e.mjs'
import { v3, plongeante, cercleH, morceaux } from './_espace.mjs'

const s = 17
const r = 3, h = 4, g = Math.hypot(r, h)
const angle = (360 * r) / g // 216°
const boites = []
const lab = e => { boites.push(e.boite); return e.svg }
const out = []

// --- Cône en perspective ---
const phi = 20
const vue = plongeante({ o: [76, 178], s: 20, phi }) // cône dessiné un peu plus grand que le patron
const nrmLat = p => [h * p[0] / r, h * p[1] / r, r]
const lateralVu = p => v3.dot(nrmLat(p), vue.vers) > 0
const bas = cercleH([0, 0, 0], r, 240)
const S3 = [0, 0, h], O3 = [0, 0, 0], M3 = [r, 0, 0]
const tangents = []
for (let i = 0; i < bas.length - 1; i++) if (lateralVu(bas[i]) !== lateralVu(bas[i + 1])) tangents.push(v3.lerp(bas[i], bas[i + 1], 0.5))
for (const m of morceaux(bas, lateralVu, vue.proj)) out.push(trait(m.pts, m.v ? {} : { tirets: '4 3', ep: 1.2 }))
for (const p of tangents) out.push(trait([vue.proj(p), vue.proj(S3)]))
const [S, O, M] = [S3, O3, M3].map(vue.proj)
// hauteur et rayon : à l'intérieur du cône, en pointillés
out.push(trait([S, O], { tirets: '4 3', ep: 1.2 }), trait([O, M], { tirets: '4 3', ep: 1.2 }))
const e = 0.45
out.push(angleDroitPts(O, vue.proj([0, 0, e]), vue.proj([e, 0, 0])))
out.push(point(S), point(O))
out.push(lab(etiquette(O[0] - 7, lerp(O, S, 0.5)[1] + 4, 'h', { ancre: 'end' })))
out.push(lab(etiquette(lerp(O, M, 0.55)[0], O[1] - 5, 'r', { ancre: 'middle' })))

// --- Patron ---
const A = [252, 66] // sommet de la portion de disque
const G = g * s, Rb = r * s
// portion de disque symétrique par rapport à la verticale, ouverte vers le bas
const a0 = -90 - angle / 2, a1 = -90 + angle / 2
const arc = arcPts(A, G, a0, a1, 2)
out.push(`<path d="${chemin([A, ...arc], true)}" fill="none" stroke="${C.encre}" stroke-width="1.75" stroke-linejoin="round"/>`)
out.push(trait(arc, { couleur: C.accent, ep: 2.25 }))
// disque de base tangent à l'arc en son milieu
const Ob = [A[0], A[1] + G + Rb]
out.push(`<circle cx="${Ob[0]}" cy="${Ob[1]}" r="${Rb}" fill="${C.aplat}" stroke="${C.accent}" stroke-width="2.25"/>`)
out.push(point(A), point(Ob))

// Légendes du patron
const eBase = etiquette(Ob[0] + Rb + 12, Ob[1] + 4, 'base')
out.push(lab(eBase), rappel([eBase.boite[0], eBase.boite[1] + 7.5], [Ob[0] + Rb * 0.55, Ob[1] + Rb * 0.25]))
const eLat = etiquette(A[0], A[1] + G * 0.55, ['face', 'latérale'], { ancre: 'middle' })
out.push(lab(eLat))
out.push(lab(mention(76, 18, 'en perspective', { ancre: 'middle', masquable: false })))
out.push(lab(mention(A[0], 18, 'patron', { ancre: 'middle', masquable: false })))
out.push(`<path d="M150,30 V250" stroke="${C.separateur}" stroke-width="1"/>`)
verifierBoites(boites, 'cone')

const svg = doc(266,
  "Cône de révolution en perspective (base en ovale, partie cachée en pointillés, rayon r, hauteur h) et son patron : un disque (la base) et une portion de disque (la face latérale) dont l'arc a pour longueur le périmètre de la base. Réviz, 4e maths, pyramides et cônes.",
  out)
ecrire('4eme/maths', 'cone-perspective-et-patron', svg)
