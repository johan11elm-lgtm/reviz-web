// Réviz, 3e maths, probabilités (section 5 et méthode).
// Arbre des possibles de deux lancers d'une pièce équilibrée : P (pile) ou F (face), 1/2 sur
// chaque branche ; quatre chemins PP, PF, FP, FF de probabilité 1/2 × 1/2 = 1/4 ; chemin PP en accent.
// node scripts/illustrations/figures/arbre-deux-lancers-piece.mjs
import { C, doc, ecrire, trait, nom, add, sub, mul, unit, perp, lerp, etiquette, mention, verifierBoites } from './_maths-3e-4e.mjs'

const boites = []
const lab = e => { boites.push(e.boite); return e.svg }
const racine = [22, 124]
const x1 = 120, x2 = 216
const n1 = { P: [x1, 70], F: [x1, 178] }
const n2 = { PP: [x2, 42], PF: [x2, 98], FP: [x2, 150], FF: [x2, 206] }
const gap = 9 // espace laissé autour des lettres

const out = []
function branche(a, b, haut, accent, ecartA = 0) {
  const u = unit(sub(b, a))
  const A = add(a, mul(u, ecartA)), B = sub(b, mul(u, gap))
  out.push(trait([A, B], accent ? { couleur: C.accent, ep: 2.25 } : {}))
  // probabilité 1/2 au milieu, au-dessus (branche montante) ou en dessous (descendante)
  const m = lerp(A, B, 0.5)
  let p = perp(u)
  if ((haut && p[1] > 0) || (!haut && p[1] < 0)) p = mul(p, -1)
  const q = add(m, mul(p, 10))
  out.push(lab(etiquette(q[0], q[1] + (haut ? 0 : 8), '1/2', { ancre: 'middle' })))
}
branche(racine, n1.P, true, true, 2)
branche(racine, n1.F, false, false, 2)
branche(n1.P, n2.PP, true, true, gap)
branche(n1.P, n2.PF, false, false, gap)
branche(n1.F, n2.FP, true, false, gap)
branche(n1.F, n2.FF, false, false, gap)
out.push(`<circle cx="${racine[0]}" cy="${racine[1]}" r="2.2" fill="${C.encre}"/>`)
for (const [k, p] of Object.entries(n1)) out.push(nom([p[0], p[1] + 4.5], k))
for (const [k, p] of Object.entries(n2)) out.push(nom([p[0], p[1] + 4.5], k[1]))
// Colonnes issue et probabilité
const xi = 264, xp = 324
for (const [k, p] of Object.entries(n2)) {
  out.push(`<text x="${xi}" y="${p[1] + 4.5}" font-size="12.5" font-weight="700" fill="${k === 'PP' ? C.accent : C.encre}" text-anchor="middle">${k}</text>`)
  out.push(lab(etiquette(xp, p[1] + 4.5, '1/4', { ancre: 'middle' })))
}
out.push(lab(mention(x1, 16, '1er lancer', { ancre: 'middle', masquable: false })))
out.push(lab(mention(x2, 16, '2e lancer', { ancre: 'middle', masquable: false })))
out.push(lab(mention(xi, 16, 'issue', { ancre: 'middle', masquable: false })))
out.push(lab(mention(354, 16, 'probabilité', { ancre: 'end', masquable: false })))
// Calcul du chemin PP, en encre sous l'arbre
out.push(`<text x="180" y="244" font-size="13" font-weight="600" fill="${C.encre}" text-anchor="middle">P(pile puis pile) = 1/2 × 1/2 = 1/4</text>`)
verifierBoites(boites, 'arbre')

const svg = doc(256,
  "Arbre des possibles de deux lancers d'une pièce équilibrée : branches P et F de probabilité 1/2, puis de nouveau P et F ; issues PP, PF, FP, FF de probabilité 1/4 chacune ; le chemin PP est surligné. Réviz, 3e maths, probabilités.",
  out)
ecrire('3eme/maths', 'arbre-deux-lancers-piece', svg)
