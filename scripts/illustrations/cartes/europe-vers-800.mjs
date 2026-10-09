// -------------------------------------------------------
// Réviz — 5e histoire, « Byzance et l'Europe carolingienne ».
// Carte de l'Europe et de la Méditerranée vers 800 : l'empire carolingien
// (Aix-la-Chapelle), l'Empire byzantin (Constantinople), Rome, et le monde
// musulman au sud (émirat de Cordoue, Maghreb, califat abbasside de Bagdad).
//
// LIMITES APPROXIMATIVES ET SCHÉMATIQUES : chaque ensemble est reconstitué à
// partir des pays actuels (Natural Earth 1:50m, domaine public), entiers ou coupés
// par des polygones simples (voir _empires.mjs).
//
//   node scripts/illustrations/cartes/europe-vers-800.mjs
// -------------------------------------------------------
import { carteZone } from '../carto.mjs'
import { C, doc, etiq, txt, dc, ville } from './_histoire.mjs'
import { ecrireSvg, couperRect, anneaux } from './_commun.mjs'
import { reconstituer, CAROLINGIENS_ENTIERS, CAROLINGIENS_COUPES, BYZANCE_ENTIERS, BYZANCE_COUPES, ISLAM_ENTIERS, ISLAM_COUPES } from './_empires.mjs'

const W = 360
const z = carteZone({ x: 12, y: 12, largeur: 336 }, [[-10, 56], [46, 56], [-10, 29], [46, 29], [18, 58], [18, 28]], [18, 42])
const cadre = [12, 12, 348, 12 + z.hauteur]
const pays = z.pays(0.6).map(p => ({ ...p, rings: couperRect(anneaux(p.d), cadre) })).filter(p => p.rings.length)
const tout = pays.flatMap(p => p.rings)
const caro = reconstituer(pays, z.xy, CAROLINGIENS_ENTIERS, CAROLINGIENS_COUPES)
const byz = reconstituer(pays, z.xy, BYZANCE_ENTIERS, BYZANCE_COUPES)
const islam = reconstituer(pays, z.xy, ISLAM_ENTIERS, ISLAM_COUPES)
const P = z.xy

const ISL = '#F4EBDD'
const FERME = 1
const zone = (rings, fill, stroke, visible) => {
  const d = dc(rings, 2, 1)
  return `<path d="${d}" fill="none" stroke="${stroke}" stroke-width="${FERME + 2 * visible}" stroke-linejoin="round"/>` +
    `<path d="${d}" fill="${fill}" stroke="${fill}" stroke-width="${FERME}" stroke-linejoin="round"/>`
}

const aix = P(6.08, 50.78)
const rome = P(12.5, 41.9)
const cple = P(28.98, 41.01)
const bagdad = P(44.4, 33.3)
const cordoue = P(-4.78, 37.88)

const svg = doc(W, cadre[3] + 12,
  "Carte de l'Europe et de la Méditerranée vers 800 : empire carolingien (Aix-la-Chapelle), Empire byzantin (Constantinople), Rome, monde musulman au sud (limites approximatives). Réviz, 5e histoire, Byzance et l'Europe carolingienne. Généré par scripts/illustrations/cartes/europe-vers-800.mjs",
  `<rect x="${cadre[0]}" y="${cadre[1]}" width="${cadre[2] - cadre[0]}" height="${cadre[3] - cadre[1]}" fill="${C.mer}"/>
${zone(tout, '#FFFFFF', C.voisinTrait, 0.7)}
${zone(islam, ISL, '#C9B79A', 0.8)}
${zone(byz, C.violet, C.encre, 1)}
${zone(caro, '#FBE9DD', C.accent, 1.2)}
<rect x="${cadre[0]}" y="${cadre[1]}" width="${cadre[2] - cadre[0]}" height="${cadre[3] - cadre[1]}" fill="none" stroke="${C.grisTrait}" stroke-width="0.75"/>
${ville(...aix)}${ville(...rome)}${ville(...cple)}${ville(...bagdad)}${ville(...cordoue)}
<g font-size="11.5" font-weight="600" fill="${C.encre}">
${txt(aix[0] + 5, aix[1] - 3, 'Aix-la-Chapelle')}
${txt(rome[0] + 4, rome[1] + 12, 'Rome')}
${txt(cple[0] + 4, cple[1] - 6, 'Constantinople', { ancre: 'middle' })}
${txt(bagdad[0] - 5, bagdad[1] + 4, 'Bagdad', { ancre: 'end' })}
${txt(cordoue[0] + 2, cordoue[1] + 13, 'Cordoue', { ancre: 'middle' })}
${etiq(...P(3, 46.6), ['Empire', 'carolingien'], { ancre: 'middle', fond: '#FBE9DD' })}
${etiq(...P(32, 38.6), ['Empire', 'byzantin'], { ancre: 'middle', fond: C.violet })}
${etiq(...P(10, 31.5), 'Monde musulman', { ancre: 'middle', fond: ISL })}
</g>`)

ecrireSvg('europe-vers-800', svg, '5eme/histoire')
