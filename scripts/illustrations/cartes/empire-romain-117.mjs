// -------------------------------------------------------
// Réviz — 6e histoire, « Conquêtes, paix romaine et romanisation ».
// Carte de l'Empire romain à son extension maximale (117 apr. J.-C., Trajan) :
// Rome, Mare nostrum, quelques provinces (Hispanie, Gaule, Bretagne, Égypte),
// le limes (Rhin-Danube) et le mur d'Hadrien, Lyon et Nîmes.
//
// LIMITES APPROXIMATIVES ET SCHÉMATIQUES : l'Empire est reconstitué à partir des
// pays actuels (Natural Earth 1:50m, domaine public), entiers ou coupés par des
// polygones simples (Rhin et limes de Germanie, Danube, Dacie, lisière du Sahara,
// Mésopotamie de Trajan). Les tracés ne suivent pas les frontières antiques exactes.
// Le mur d'Hadrien est construit à partir de 122 : il est placé pour situer le
// limes de Bretagne, comme dans le chapitre.
//
//   node scripts/illustrations/cartes/empire-romain-117.mjs
// -------------------------------------------------------
import { carteZone } from '../carto.mjs'
import { C, HALO, doc, etiq, txt, mention, ringsPays, dc, lisse, ville } from './_histoire.mjs'
import { ecrireSvg, couperRect, anneaux, r1 } from './_commun.mjs'
import { ROME_ENTIERS, ROME_COUPES, reconstituer } from './_empires.mjs'

const W = 360
const z = carteZone({ x: 12, y: 12, largeur: 336 }, [[-10, 56.5], [50, 56.5], [-10, 23.5], [50, 23.5], [20, 58], [20, 22]], [20, 40])
const cadre = [12, 12, 348, 12 + z.hauteur]
const pays = z.pays(0.6).map(p => ({ ...p, rings: couperRect(anneaux(p.d), cadre) })).filter(p => p.rings.length)

const empire = reconstituer(pays, z.xy, ROME_ENTIERS, ROME_COUPES)
const autres = pays.flatMap(p => p.rings)

// Limes du Rhin et du Danube (schématique) et mur d'Hadrien.
const limes = [[4.2, 51.9], [6.3, 51.8], [7.6, 50.4], [8.9, 50.1], [10.4, 49.2], [12.1, 49.0], [13.4, 48.6], [16.4, 48.2], [18.9, 47.8],
  [18.9, 45.9], [20.2, 46.4], [22.5, 47.6], [24.8, 47.6], [26.1, 46.4], [26.1, 44.6], [28.8, 45.4], [29.6, 45.2]].map(([lo, la]) => z.xy(lo, la))
const hadrien = [[-3.1, 54.95], [-2.4, 55.0], [-1.6, 55.0]].map(([lo, la]) => z.xy(lo, la))

const P = z.xy
const rome = P(12.5, 41.9)
const lyon = P(4.83, 45.76)
const nimes = P(4.36, 43.84)

const yL = cadre[3] + 22
const legende = `<rect x="14" y="${yL - 10}" width="24" height="13" fill="#FBE9DD" stroke="${C.accent}" stroke-width="1.5"/>
<path d="M188,${yL - 3.5}h26" stroke="${C.encre}" stroke-width="3" stroke-dasharray="5 3"/>`

const svg = doc(W, yL + 12,
  "Carte de l'Empire romain à son extension maximale en 117 (Trajan), limites approximatives : Rome, Mare nostrum, provinces (Hispanie, Gaule, Bretagne, Égypte), limes, mur d'Hadrien, Lyon et Nîmes. Réviz, 6e histoire, conquêtes, paix romaine et romanisation. Généré par scripts/illustrations/cartes/empire-romain-117.mjs",
  `<rect x="${cadre[0]}" y="${cadre[1]}" width="${cadre[2] - cadre[0]}" height="${cadre[3] - cadre[1]}" fill="${C.mer}"/>
<path d="${dc(autres, 3, 1)}" fill="#FFFFFF" stroke="${C.voisinTrait}" stroke-width="1.8" stroke-linejoin="round"/>
<path d="${dc(autres, 3, 1)}" fill="#FFFFFF" stroke="#FFFFFF" stroke-width="0.8" stroke-linejoin="round"/>
<path d="${dc(empire, 2, 1)}" fill="#FBE9DD" stroke="${C.accent}" stroke-width="2.6" stroke-linejoin="round"/>
<path d="${dc(empire, 2, 1)}" fill="#FBE9DD" stroke="#FBE9DD" stroke-width="1" stroke-linejoin="round"/>
<path d="${lisse(limes)}" fill="none" stroke="${C.encre}" stroke-width="3" stroke-dasharray="5 3" stroke-linejoin="round"/>
<path d="M${hadrien.map(p => p.join(',')).join('L')}" fill="none" stroke="${C.encre}" stroke-width="3.5" stroke-linecap="round"/>
<rect x="${cadre[0]}" y="${cadre[1]}" width="${cadre[2] - cadre[0]}" height="${cadre[3] - cadre[1]}" fill="none" stroke="${C.grisTrait}" stroke-width="0.75"/>
${ville(...lyon)}${ville(...nimes)}
<rect x="${r1(rome[0] - 3.5)}" y="${r1(rome[1] - 3.5)}" width="7" height="7" fill="${C.encre}" stroke="#FFFFFF" stroke-width="1"/>
<g font-size="11.5" font-weight="600" fill="${C.encre}">
${txt(rome[0] + 6, rome[1] + 12, 'Rome')}
${txt(lyon[0] + 5, lyon[1] + 2, 'Lyon')}
${txt(nimes[0] + 5, nimes[1] + 9, 'Nîmes')}
${etiq(...P(-4, 39.6), 'Hispanie', { ancre: 'middle', fond: '#FBE9DD' })}
${etiq(...P(1.6, 47.9), 'Gaule', { ancre: 'middle', fond: '#FBE9DD' })}
${etiq(...P(-1.6, 52.6), 'Bretagne', { ancre: 'middle', fond: '#FBE9DD' })}
${etiq(...P(30, 27.5), 'Égypte', { ancre: 'middle', fond: '#FBE9DD' })}
${etiq(...P(18, 35.2), 'Mare nostrum', { ancre: 'middle', fond: C.mer })}
${etiq(...P(14.5, 50.6), 'limes', { ancre: 'middle' })}
${etiq(...P(0.2, 55.9), ["mur d'Hadrien"], { fond: C.mer })}
${txt(44, yL, 'Empire romain en 117', { halo: false })}
${txt(220, yL, 'limes', { halo: false })}
</g>
${legende}`)

ecrireSvg('empire-romain-117', svg, '6eme/histoire')
