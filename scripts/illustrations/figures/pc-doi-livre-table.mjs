// Réviz — Diagramme objets-interactions du livre posé sur une table : bulles Livre, Table, Terre ;
// trait plein Livre–Table (contact), trait pointillé Livre–Terre (à distance).
// Chapitre 3eme/physique-chimie/forces-et-interactions (section 3).
// Sortie : public/programme/illustrations/3eme/physique-chimie/doi-livre-table.svg
import { C, r1, doc, etq, etqFixe, ecrireSvg } from './_pc.mjs'

const corps = []
const bulle = (x, y, rx, nom, accent = false) =>
  `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="21" fill="${accent ? '#FBE9DD' : '#FFFFFF'}" stroke="${accent ? C.accent : C.encre}" stroke-width="${accent ? 2.25 : 1.75}"/>` +
  etqFixe(x, y + 4.5, nom, 'middle')
const L = [180, 42], T = [76, 168], E = [284, 168]
// bords des ellipses : on arrête les traits au contour
const bord = (c, rx, ry, vers) => { const dx = vers[0] - c[0], dy = vers[1] - c[1]; const t = 1 / Math.sqrt((dx / rx) ** 2 + (dy / ry) ** 2); return [c[0] + dx * t, c[1] + dy * t] }
const a1 = bord(L, 40, 21, T), b1 = bord(T, 40, 21, L)
const a2 = bord(L, 40, 21, E), b2 = bord(E, 40, 21, L)
corps.push(`<path d="M${r1(a1[0])},${r1(a1[1])} L${r1(b1[0])},${r1(b1[1])}" stroke="${C.encre}" stroke-width="2.25"/>`)
corps.push(`<path d="M${r1(a2[0])},${r1(a2[1])} L${r1(b2[0])},${r1(b2[1])}" stroke="${C.encre}" stroke-width="2.25" stroke-dasharray="6 5"/>`)
corps.push(bulle(...L, 40, 'Livre', true))
corps.push(bulle(...T, 40, 'Table'))
corps.push(bulle(...E, 40, 'Terre'))
// étiquettes des traits, au milieu, à l'extérieur du triangle
corps.push(etq((L[0] + T[0]) / 2 - 14, (L[1] + T[1]) / 2 - 2, 'Contact', 'end'))
corps.push(etq((L[0] + E[0]) / 2 + 14, (L[1] + E[1]) / 2 - 2, 'À distance'))

const svg = doc(204,
  'Diagramme objets-interactions du livre posé sur une table : bulle Livre reliée à Table par un trait plein (contact) et à Terre par un trait pointillé (à distance). Réviz, 3e physique-chimie, interactions et forces.',
  corps)
ecrireSvg('doi-livre-table', svg, '3eme/physique-chimie')
