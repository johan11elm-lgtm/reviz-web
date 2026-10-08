// -------------------------------------------------------
// Réviz — 5e histoire, « Charles Quint et Soliman ».
// En haut, planisphère du XVIe siècle : voyages de Colomb (1492), de Vasco de
// Gama (1498) et de l'expédition de Magellan (1519-1522) ; Amérique espagnole.
// En bas, zoom sur l'Europe et la Méditerranée : possessions de Charles Quint
// (Espagne, Pays-Bas, Italie), Saint-Empire dont il est l'empereur, Empire
// ottoman de Soliman (Istanbul, trois continents), siège de Vienne (1529).
//
// LIMITES ET TRAJETS APPROXIMATIFS ET SCHÉMATIQUES : ensembles reconstitués à
// partir des pays actuels (Natural Earth 1:50m, domaine public) entiers ou coupés
// par des polygones simples (voir _empires.mjs) ; itinéraires simplifiés.
//
//   node scripts/illustrations/cartes/monde-xvie-charles-quint-soliman.mjs
// -------------------------------------------------------
import { carteMonde, carteZone } from '../carto.mjs'
import { C, doc, etiq, txt, mention, ringsPays, dc, trajet, ville, rappel } from './_histoire.mjs'
import { ecrireSvg, couperRect, anneaux, hachures } from './_commun.mjs'
import {
  reconstituer, CQ_EUROPE_ENTIERS, CQ_EUROPE_COUPES, CQ_AMERIQUE_ENTIERS, CQ_AMERIQUE_COUPES,
  SAINT_EMPIRE_ENTIERS, OTTOMANS_ENTIERS, OTTOMANS_COUPES,
} from './_empires.mjs'

const W = 360
const CQ = '#FBE9DD'
const OTT = C.violet
const FERME = 1
const zone = (rings, fill, stroke, visible, aireMin = 1) => {
  const d = dc(rings, aireMin, 1)
  return `<path d="${d}" fill="none" stroke="${stroke}" stroke-width="${FERME + 2 * visible}" stroke-linejoin="round"/>` +
    `<path d="${d}" fill="${fill}" stroke="${fill}" stroke-width="${FERME}" stroke-linejoin="round"/>`
}

// ---- Planisphère
const m = carteMonde({ x: 12, y: 12, largeur: 336 }, { sud: -58, nord: 72 })
const cM = [12, 12, 348, 12 + m.hauteur]
const paysM = m.pays(1.1).map(p => ({ ...p, rings: couperRect(anneaux(p.d), cM) })).filter(p => p.rings.length)
const P = m.xy
const pts = l => l.map(([lo, la]) => P(lo, la))
const cqM = reconstituer(paysM, P, [...CQ_EUROPE_ENTIERS, ...CQ_AMERIQUE_ENTIERS], { ...CQ_EUROPE_COUPES, ...CQ_AMERIQUE_COUPES })
const ottM = reconstituer(paysM, P, OTTOMANS_ENTIERS, OTTOMANS_COUPES)

const o = { couleur: C.encre, epaisseur: 1.75, long: 6, large: 6 }
const colomb = trajet(pts([[-6.9, 37], [-15.5, 28.5], [-40, 26], [-60, 25], [-74, 23.5]]), { ...o, couleur: C.accent, epaisseur: 2.25 })
const gama = trajet(pts([[-9.5, 38.5], [-20, 20], [-25, -2], [-16, -25], [3, -36], [19, -37], [33, -28], [41, -12], [44, 0], [58, 10], [73, 11.5]]), { ...o, tirets: '4 2.5' })
const mag1 = trajet(pts([[-6.6, 36.4], [-22, 14], [-33, -6], [-42, -25], [-58, -42], [-68, -53.5], [-80, -48], [-100, -30], [-140, -12], [-179.5, 2]]), { ...o, tirets: '1 2.6', long: 0.1, large: 0.1 })
const mag2 = trajet(pts([[179.5, 4], [150, 12], [125, 10]]), { ...o, tirets: '1 2.6' })
const mag3 = trajet(pts([[127, 0], [120, -12], [95, -25], [60, -38], [22, -40], [5, -28], [-16, -5], [-28, 12], [-18, 30], [-9, 36]]), { ...o, tirets: '1 2.6' })

// ---- Zoom Europe et Méditerranée
const yZ = cM[3] + 30
const z = carteZone({ x: 12, y: yZ, largeur: 336 }, [[-10, 55.5], [45, 55.5], [-10, 29], [45, 29], [17, 57], [17, 28]], [17, 42])
const cZ = [12, yZ, 348, yZ + z.hauteur]
const paysZ = z.pays(0.9).map(p => ({ ...p, rings: couperRect(anneaux(p.d), cZ) })).filter(p => p.rings.length)
const Z = z.xy
const cqZ = reconstituer(paysZ, Z, CQ_EUROPE_ENTIERS, CQ_EUROPE_COUPES)
const seZ = reconstituer(paysZ, Z, SAINT_EMPIRE_ENTIERS, {})
const ottZ = reconstituer(paysZ, Z, OTTOMANS_ENTIERS, OTTOMANS_COUPES)
const ist = Z(28.98, 41.01)
const vienne = Z(16.37, 48.21)
const coinsZoom = [P(-10, 56), P(45, 56), P(45, 29), P(-10, 29)]

const yL = cZ[3] + 22
const boite = [[[14, yL - 10], [38, yL - 10], [38, yL + 3], [14, yL + 3]]]

const svg = doc(W, yL + 40,
  "Planisphère du XVIe siècle avec les voyages de Colomb (1492), Vasco de Gama (1498) et Magellan (1519-1522), et zoom sur l'Europe et la Méditerranée : possessions de Charles Quint, Saint-Empire, Empire ottoman de Soliman, Istanbul et le siège de Vienne (1529). Limites approximatives. Réviz, 5e histoire, Charles Quint et Soliman. Généré par scripts/illustrations/cartes/monde-xvie-charles-quint-soliman.mjs",
  `<rect x="${cM[0]}" y="${cM[1]}" width="${cM[2] - cM[0]}" height="${cM[3] - cM[1]}" fill="${C.mer}"/>
<path d="${dc(paysM.flatMap(p => p.rings), 3, 1)}" fill="#FFFFFF" stroke="${C.voisinTrait}" stroke-width="1.4" stroke-linejoin="round" paint-order="stroke"/>
${zone(cqM, CQ, C.accent, 0.8)}
${zone(ottM, OTT, C.encre, 0.6)}
<path d="M${coinsZoom.map(p => p.join(',')).join('L')}Z" fill="none" stroke="${C.encre}" stroke-width="1" stroke-dasharray="3 2"/>
${gama}
${mag1}${mag2}${mag3}
${colomb}
<rect x="${cM[0]}" y="${cM[1]}" width="${cM[2] - cM[0]}" height="${cM[3] - cM[1]}" fill="none" stroke="${C.grisTrait}" stroke-width="0.75"/>
<rect x="${cZ[0]}" y="${cZ[1]}" width="${cZ[2] - cZ[0]}" height="${cZ[3] - cZ[1]}" fill="${C.mer}"/>
<path d="${dc(paysZ.flatMap(p => p.rings), 3, 1)}" fill="#FFFFFF" stroke="${C.voisinTrait}" stroke-width="1.4" stroke-linejoin="round" paint-order="stroke"/>
${zone(ottZ, OTT, C.encre, 1)}
${zone(seZ, '#FFFFFF', C.encre, 1)}
<path d="${hachures(seZ, { angle: 45, pas: 3.6 })}" stroke="${C.encre}" stroke-width="0.7" opacity="0.7"/>
${zone(cqZ, CQ, C.accent, 1.2)}
<path d="${hachures(cqZ.filter(r => r.some(([x, y]) => y < Z(0, 49.2)[1])), { angle: 45, pas: 3.6 })}" stroke="${C.encre}" stroke-width="0.7" opacity="0.7"/>
<rect x="${cZ[0]}" y="${cZ[1]}" width="${cZ[2] - cZ[0]}" height="${cZ[3] - cZ[1]}" fill="none" stroke="${C.grisTrait}" stroke-width="0.75"/>
${ville(...ist)}${ville(...vienne)}
<g font-size="11.5" font-weight="600" fill="${C.encre}">
${etiq(...P(-150, 40), ['Colomb', '1492'], { ancre: 'middle' })}${rappel(P(-150, 40)[0] + 26, P(-150, 40)[1] - 2, ...P(-52, 25.5))}
${etiq(...P(-170, -42), ['Magellan', '1519-1522'], { ancre: 'start' })}
${etiq(...P(100, 50), ['Vasco de Gama', '1498'], { ancre: 'middle' })}${rappel(P(100, 50)[0] - 6, P(100, 50)[1] + 17, ...P(70, 12))}
${etiq(...P(-60, -8), ['Amérique', 'espagnole'], { ancre: 'middle', fond: CQ })}
${txt(ist[0] - 4, ist[1] - 5, 'Istanbul', { ancre: 'end' })}
${txt(vienne[0] - 5, vienne[1] - 4, 'Vienne', { ancre: 'end' })}
${etiq(vienne[0] + 6, vienne[1] - 14, 'siège de 1529')}
${etiq(...Z(-4, 39.6), 'Espagne', { ancre: 'middle', fond: CQ })}
${etiq(...Z(15.5, 55.2), 'Saint-Empire')}${rappel(Z(15.5, 55.2)[0] - 3, Z(15.5, 55.2)[1] - 4, ...Z(11.5, 52))}
${etiq(...Z(35, 38.4), ['Empire', 'ottoman'], { ancre: 'middle', fond: OTT })}
<rect x="14" y="${yL - 10}" width="24" height="13" fill="${CQ}" stroke="${C.accent}" stroke-width="1.5"/>
${txt(44, yL, 'possessions de Charles Quint', { halo: false })}
<rect x="14" y="${yL + 10}" width="24" height="13" fill="#FFFFFF" stroke="${C.encre}" stroke-width="1"/>
<path d="${hachures([[[14, yL + 10], [38, yL + 10], [38, yL + 23], [14, yL + 23]]], { angle: 45, pas: 3.6 })}" stroke="${C.encre}" stroke-width="0.7" opacity="0.7"/>
${txt(44, yL + 21, "Saint-Empire (Charles Quint empereur)", { halo: false })}
</g>
${mention(cZ[0] + 6, cZ[3] - 6, 'zoom')}`)

ecrireSvg('monde-xvie-charles-quint-soliman', svg, '5eme/histoire')
