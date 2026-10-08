// -------------------------------------------------------
// Réviz — 6e histoire, « La route de la soie et la Chine des Han ».
// Carte de l'Eurasie au IIe siècle apr. J.-C. : l'Empire romain (Rome) et la
// Chine des Han (Chang'an, Luoyang) aux deux bouts ; routes terrestres d'oasis
// en oasis par l'Asie centrale, routes maritimes par la mer Rouge, l'océan
// Indien et l'Inde ; peuples intermédiaires (Parthes, Kouchans).
//
// LIMITES ET TRACÉS APPROXIMATIFS ET SCHÉMATIQUES : empires reconstitués à partir
// des pays actuels (Natural Earth 1:50m, domaine public) coupés par des polygones
// simples (voir _empires.mjs) ; itinéraires simplifiés.
//
//   node scripts/illustrations/cartes/eurasie-routes-soie.mjs
// -------------------------------------------------------
import { C, doc, etiq, txt, mention, dc, lisse, ville, regionMonde } from './_histoire.mjs'
import { ecrireSvg, couperRect, anneaux, r1 } from './_commun.mjs'
import { reconstituer, ROME_IIE_ENTIERS, ROME_COUPES, HAN_ENTIERS, HAN_COUPES, PARTHES_ENTIERS, PARTHES_COUPES, KOUCHANS_ENTIERS, KOUCHANS_COUPES } from './_empires.mjs'

const W = 360
const z = regionMonde({ x: 12, y: 12, largeur: 336 }, [-10, 128], [0, 54], 32)
const cadre = z.cadre
const pays = z.pays(0.7).map(p => ({ ...p, rings: couperRect(anneaux(p.d), cadre) })).filter(p => p.rings.length)
const tout = pays.flatMap(p => p.rings)
const rome = reconstituer(pays, z.xy, ROME_IIE_ENTIERS, ROME_COUPES)
const han = reconstituer(pays, z.xy, HAN_ENTIERS, HAN_COUPES)
const parthes = reconstituer(pays, z.xy, PARTHES_ENTIERS, PARTHES_COUPES)
const kouchans = reconstituer(pays, z.xy, KOUCHANS_ENTIERS, KOUCHANS_COUPES)
const P = z.xy
const pts = l => l.map(([lo, la]) => P(lo, la))

// Routes terrestres : Luoyang → Chang'an → Dunhuang → oasis du Tarim → Kashgar → Merv → Ctésiphon → Antioche.
const terre = pts([[112.4, 34.6], [108.9, 34.3], [103.8, 36.1], [98.5, 39.7], [94.7, 40.1], [88.5, 42.4], [82.9, 41.7], [76, 39.5],
  [69, 39.8], [61.8, 37.6], [54.4, 36.4], [48, 34.6], [44.6, 33.1], [38.3, 34.6], [36.2, 36.2]])
const terreSud = pts([[94.7, 40.1], [88, 38.8], [80, 37.1], [76, 39.5]])
// Routes maritimes : Rome → Alexandrie → mer Rouge → Inde → détroit de Malacca → côtes de Chine du Sud.
const mer = pts([[12.3, 41.6], [16.5, 37.6], [24, 33.6], [29.9, 31.6], [32.6, 29.6], [34.6, 26], [37.5, 20.5], [41.5, 15], [44, 12.2], [52, 13.5],
  [62, 17], [70.5, 18.5], [74, 12.5], [78.2, 6.8], [82.5, 5.4], [90, 6.5], [97, 5.2], [100.5, 3], [104.5, 2.5], [108, 9], [108.6, 16], [110.2, 20.2]])

const yL = cadre[3] + 22
const svg = doc(W, yL + 30,
  "Carte de l'Eurasie au IIe siècle : Empire romain et Chine des Han aux deux bouts, routes terrestres par les oasis d'Asie centrale, routes maritimes par la mer Rouge, l'océan Indien et l'Inde, Parthes et Kouchans entre les deux (limites approximatives). Réviz, 6e histoire, route de la soie et Chine des Han. Généré par scripts/illustrations/cartes/eurasie-routes-soie.mjs",
  `<rect x="${cadre[0]}" y="${cadre[1]}" width="${cadre[2] - cadre[0]}" height="${cadre[3] - cadre[1]}" fill="${C.mer}"/>
<path d="${dc(tout, 3, 1)}" fill="#FFFFFF" stroke="${C.voisinTrait}" stroke-width="1.6" stroke-linejoin="round"/>
<path d="${dc(tout, 3, 1)}" fill="#FFFFFF" stroke="#FFFFFF" stroke-width="0.8" stroke-linejoin="round"/>
<path d="${dc(parthes.concat(kouchans), 2, 1)}" fill="${C.violet}" stroke="${C.encre}" stroke-width="1.6" stroke-linejoin="round" stroke-opacity="0.5"/>
<path d="${dc(parthes.concat(kouchans), 2, 1)}" fill="${C.violet}" stroke="${C.violet}" stroke-width="0.8" stroke-linejoin="round"/>
<path d="${dc(rome.concat(han), 2, 1)}" fill="#FBE9DD" stroke="${C.accent}" stroke-width="2.4" stroke-linejoin="round"/>
<path d="${dc(rome.concat(han), 2, 1)}" fill="#FBE9DD" stroke="#FBE9DD" stroke-width="0.8" stroke-linejoin="round"/>
<path d="${lisse(terre)}" fill="none" stroke="${C.accent}" stroke-width="2.25" stroke-linejoin="round" stroke-linecap="round"/>
<path d="${lisse(terreSud)}" fill="none" stroke="${C.accent}" stroke-width="2.25" stroke-linejoin="round" stroke-linecap="round"/>
<path d="${lisse(mer)}" fill="none" stroke="${C.accent}" stroke-width="2.25" stroke-dasharray="5 3.5" stroke-linejoin="round" stroke-linecap="round"/>
<rect x="${cadre[0]}" y="${cadre[1]}" width="${cadre[2] - cadre[0]}" height="${cadre[3] - cadre[1]}" fill="none" stroke="${C.grisTrait}" stroke-width="0.75"/>
${ville(...P(12.5, 41.9), { r: 3.2 })}${ville(...P(108.9, 34.3), { r: 3 })}${ville(...P(112.4, 34.6), { r: 3 })}
<g font-size="11.5" font-weight="600" fill="${C.encre}">
${txt(P(12.5, 41.9)[0] - 5, P(12.5, 41.9)[1] + 4, 'Rome', { ancre: 'end' })}
${txt(P(108.9, 34.3)[0] + 6, P(108.9, 34.3)[1] + 16, "Chang'an", { ancre: 'middle' })}
${txt(P(112.4, 34.6)[0] + 2, P(112.4, 34.6)[1] - 6, 'Luoyang', { ancre: 'start' })}
${etiq(...P(12, 25), 'Empire romain', { ancre: 'middle' })}
${etiq(...P(114, 24.5), ['Chine', 'des Han'], { ancre: 'middle', fond: '#FBE9DD' })}
${etiq(...P(49.5, 31.5), 'Parthes', { ancre: 'middle', fond: C.violet })}
${etiq(...P(73, 29.5), 'Kouchans', { ancre: 'middle', fond: C.violet })}
${mention(...P(76, 47.5), 'Asie centrale', { ancre: 'middle' })}
${mention(...P(78, 19), 'Inde', { ancre: 'middle' })}
${mention(...P(70, 3), 'océan Indien', { ancre: 'middle' })}
${mention(...P(35, 18), 'mer Rouge', { ancre: 'end' })}
<path d="M14,${yL - 4}h26" stroke="${C.accent}" stroke-width="2.25"/>
${txt(46, yL, 'route terrestre', { halo: false })}
<path d="M186,${yL - 4}h26" stroke="${C.accent}" stroke-width="2.25" stroke-dasharray="5 3.5"/>
${txt(218, yL, 'route maritime', { halo: false })}
<rect x="14" y="${yL + 10}" width="26" height="13" fill="${C.violet}"/>
${txt(46, yL + 21, 'peuples intermédiaires', { halo: false })}
</g>`)

ecrireSvg('eurasie-routes-soie', svg, '6eme/histoire')
