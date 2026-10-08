// Réviz — Modèle particulaire des trois états : trois récipients, chacun avec 12 particules
// dessinées de la même façon. Solide : serrées et rangées ; liquide : serrées, en désordre,
// surface libre horizontale ; gaz (récipient fermé) : espacées, en désordre, dans tout le récipient.
// Figure commune : 5eme/physique-chimie/etats-de-la-matiere (modèle particulaire) et
// 4eme/physique-chimie/modele-moleculaire-de-la-matiere (compact/dispersé, ordonné/désordonné).
// Sortie : public/programme/illustrations/communs/modele-particulaire-etats.svg
import { C, r1, doc, etq, rappel, ecrireSvg } from './_pc.mjs'

const W = 92, H = 100, Y0 = 22, R = 6.4, D = 2 * R + 0.4
const XS = [18, 134, 250]
const fond = Y0 + H
const corps = []
const particules = pts => `<g fill="#FBE9DD" stroke="${C.accent}" stroke-width="1.5">` + pts.map(([x, y]) => `<circle cx="${r1(x)}" cy="${r1(y)}" r="${R}"/>`).join('') + '</g>'

// récipients : ouverts (solide, liquide), fermé (gaz)
corps.push(`<path d="M${XS[0]},${Y0} V${fond} H${XS[0] + W} V${Y0} M${XS[1]},${Y0} V${fond} H${XS[1] + W} V${Y0} M${XS[2]},${Y0} V${fond} H${XS[2] + W} V${Y0} Z" fill="none" stroke="${C.encre}" stroke-width="1.75" stroke-linejoin="round"/>`)

// solide : bloc 4 × 3, posé au fond, au centre
const sol = []
for (let i = 0; i < 3; i++) for (let j = 0; j < 4; j++) sol.push([XS[0] + W / 2 + (j - 1.5) * D, fond - 1 - R - i * D])
corps.push(particules(sol))

// liquide : dépôt de 12 disques lâchés à des abscisses fixées (ordre et positions choisis
// pour un tas compact sans rangées) : chaque disque descend jusqu'au fond ou au contact d'un autre.
const xl0 = XS[1] + 1 + R, xl1 = XS[1] + W - 1 - R
// 6 au fond avec des écarts irréguliers, puis 6 lâchés au-dessus des creux (et contre la paroi droite)
const bas6 = [0, 14, 29.4, 42.6, 58.8, 73.4]
const lachers = [...bas6, 7.4, 21.4, 36.6, 50.2, 65.8, 77.6].map(dx => dx / (xl1 - xl0))
const liq = []
for (const u of lachers) {
  const x = xl0 + u * (xl1 - xl0)
  let y = fond - 1 - R
  for (const [px, py] of liq) {
    const dx = Math.abs(px - x)
    if (dx < D) y = Math.min(y, py - Math.sqrt(D * D - dx * dx))
  }
  liq.push([x, y])
}
corps.push(particules(liq))
const ySurf = Math.min(...liq.map(p => p[1])) - R - 2
corps.push(`<path d="M${XS[1] + 1},${r1(ySurf)} H${XS[1] + W - 1}" stroke="${C.bleu}" stroke-width="1.5"/>`)

// gaz : 12 particules éparpillées dans tout le récipient fermé
const gaz = [[14, 14], [52, 10], [78, 26], [30, 36], [64, 48], [12, 58], [44, 64], [80, 72], [24, 86], [58, 88], [36, 18], [8, 30]]
  .map(([dx, dy]) => [XS[2] + dx + 1, Y0 + dy])
corps.push(particules(gaz))

// étiquettes
corps.push(etq(XS[0] + W / 2, fond + 22, 'Solide', 'middle'))
corps.push(etq(XS[1] + W / 2, fond + 22, 'Liquide', 'middle'))
corps.push(etq(XS[2] + W / 2, fond + 22, 'Gaz', 'middle'))
corps.push(etq(XS[1] + W / 2, Y0 + 26, ['Surface', 'libre'], 'middle'))
corps.push(rappel([XS[1] + W / 2, Y0 + 30 + 13 + 2], [XS[1] + W / 2, ySurf]))

const svg = doc(fond + 36,
  'Modèle particulaire : trois récipients contenant chacun 12 particules identiques ; solide : serrées et rangées ; liquide : serrées et en désordre, surface libre horizontale ; gaz (récipient fermé) : espacées dans tout le récipient. Réviz, 5e et 4e physique-chimie.',
  corps)
ecrireSvg('modele-particulaire-etats', svg, 'communs')
