// Réviz — Modèles moléculaires compacts, code couleur conventionnel (H blanc, C noir, O rouge,
// N bleu) : H₂O (coudée), O₂, N₂, H₂, CO₂ (linéaire), CO, CH₄ (C entouré de 4 H, vu en
// perspective : un H devant). Formules masquables (« écrire la formule à partir d'un modèle »),
// noms en mention. Chapitre 4eme/physique-chimie/molecules-et-atomes (sections 2 et 3, méthode étape 3).
// Rayons relatifs indicatifs (H plus petit), pas à l'échelle exacte.
// Sortie : public/programme/illustrations/4eme/physique-chimie/modeles-moleculaires.svg
import { C, r1, doc, etq, etqFixe, mention, ecrireSvg } from './_pc.mjs'

const ATOME = {
  H: { r: 8, fill: '#FFFFFF' },
  C: { r: 11, fill: '#2B2A33' },
  O: { r: 10.5, fill: C.rouge },
  N: { r: 10.5, fill: C.bleu },
}
const bille = (el, x, y) => `<circle cx="${r1(x)}" cy="${r1(y)}" r="${ATOME[el].r}" fill="${ATOME[el].fill}" stroke="${C.encre}" stroke-width="1.5"/>`
const dist = (a, b) => 0.78 * (ATOME[a].r + ATOME[b].r)
const pol = (d, deg) => [d * Math.cos(deg * Math.PI / 180), -d * Math.sin(deg * Math.PI / 180)]

// chaque molécule : liste [élément, dx, dy] dans l'ordre de dessin (arrière → avant)
const MOL = {
  H2O: () => { const a = pol(dist('O', 'H'), 180 + 37.75), b = pol(dist('O', 'H'), -37.75); return [['H', ...a], ['H', ...b], ['O', 0, 0]] },
  O2: () => { const d = dist('O', 'O') / 2; return [['O', -d, 0], ['O', d, 0]] },
  N2: () => { const d = dist('N', 'N') / 2; return [['N', -d, 0], ['N', d, 0]] },
  H2: () => { const d = dist('H', 'H') / 2; return [['H', -d, 0], ['H', d, 0]] },
  CO2: () => { const d = dist('C', 'O'); return [['O', -d, 0], ['O', d, 0], ['C', 0, 0]] },
  CO: () => { const d = dist('C', 'O'); return [['C', -d / 2, 0], ['O', d / 2, 0]] },
  CH4: () => {
    const d = dist('C', 'H')
    return [['H', ...pol(d, 90)], ['H', ...pol(d, 200)], ['H', ...pol(d, 340)], ['C', 0, 0], ['H', ...pol(d * 0.62, 268)]]
  },
}
const LISTE = [
  { k: 'H2O', f: 'H₂O', nom: 'eau' }, { k: 'O2', f: 'O₂', nom: 'dioxygène' },
  { k: 'N2', f: 'N₂', nom: 'diazote' }, { k: 'H2', f: 'H₂', nom: 'dihydrogène' },
  { k: 'CO2', f: 'CO₂', nom: 'dioxyde de carbone' }, { k: 'CO', f: 'CO', nom: 'monoxyde de carbone' },
  { k: 'CH4', f: 'CH₄', nom: 'méthane' },
]
const corps = []
// clé des couleurs
const ky = 22
;['H', 'C', 'O', 'N'].forEach((el, i) => {
  const x = 40 + i * 84
  corps.push(bille(el, x, ky))
  corps.push(etqFixe(x + ATOME[el].r + 7, ky + 4, el))
})
corps.push(`<path d="M14,48 H346" stroke="${C.violet}" stroke-width="1.5"/>`)
// molécules : 4 en haut, 3 en bas
const cellules = [[52, 92], [136, 92], [220, 92], [304, 92], [66, 186], [180, 186], [294, 186]]
LISTE.forEach((m, i) => {
  const [cx, cy] = cellules[i]
  for (const [el, dx, dy] of MOL[m.k]()) corps.push(bille(el, cx + dx, cy + dy))
  corps.push(etq(cx, cy + 38, m.f, 'middle'))
  const nom = m.nom.length > 14 ? m.nom.replace(/^(\S+) /, '$1|').split('|') : [m.nom]
  corps.push(mention(cx, cy + 54, nom, 'middle'))
})

const svg = doc(262,
  'Modèles moléculaires compacts, code couleur H blanc, C noir, O rouge, N bleu : eau H₂O, dioxygène O₂, diazote N₂, dihydrogène H₂, dioxyde de carbone CO₂, monoxyde de carbone CO, méthane CH₄. Réviz, 4e physique-chimie, molécules et atomes.',
  corps)
ecrireSvg('modeles-moleculaires', svg, '4eme/physique-chimie')
