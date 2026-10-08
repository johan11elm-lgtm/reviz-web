// -------------------------------------------------------
// Réviz — 6e histoire, « La "révolution" néolithique ».
// En haut, planisphère des foyers du Néolithique (Croissant fertile, Chine,
// Amérique, Afrique, Nouvelle-Guinée) ; en bas, zoom sur le Proche-Orient et
// l'Europe : le Croissant fertile (vers 10 000 av. J.-C.) et les flèches de
// diffusion jusqu'en France (vers 6000-5000 av. J.-C.). Dates du chapitre.
// Le Croissant fertile et les foyers sont des tracés schématiques (pas de
// limites précises) ; fonds Natural Earth 1:50m (domaine public) via carto.mjs.
//
//   node scripts/illustrations/cartes/foyers-neolithique.mjs
// -------------------------------------------------------
import { carteMonde, carteZone } from '../carto.mjs'
import { C, HALO, doc, etiq, txt, mention, ringsPays, dc, trajet, lisse, rappel } from './_histoire.mjs'
import { ecrireSvg, r1 } from './_commun.mjs'

const W = 360

// ---- Planisphère
const m = carteMonde({ x: 12, y: 12, largeur: 336 }, { sud: -45, nord: 75 })
const cM = [12, 12, 348, 12 + m.hauteur]
const terresM = ringsPays(m.pays(0.9), cM)
const P = m.xy

// Foyers [lon, lat, rayon en px]
const foyers = {
  croissant: P(41, 34),
  chine: P(112, 34),
  amerique: P(-99, 19),
  afrique: P(5, 13),
  guinee: P(144, -6),
}

// Emprise du zoom
const EMP = [[-6, 52], [52, 52], [-6, 30], [52, 30], [23, 55], [23, 29]]
const yZ = cM[3] + 28
const z = carteZone({ x: 12, y: yZ, largeur: 336 }, EMP, [23, 42])
const cZ = [12, yZ, 348, yZ + z.hauteur]
const terresZ = ringsPays(z.pays(0.8), cZ)
const Z = z.xy

// Rectangle du zoom sur le planisphère (coins de l'emprise)
const coins = [P(-8, 56), P(54, 56), P(54, 28), P(-8, 28)]
const rectZoom = `M${coins.map(p => p.join(',')).join('L')}Z`

// Croissant fertile : arc schématique de la côte du Levant au golfe Persique.
const arc = [[34.8, 31.2], [35.9, 34.2], [37.6, 36.6], [40.5, 37.0], [43.3, 36.2], [45.0, 34.0], [47.0, 31.4]].map(([lo, la]) => Z(lo, la))

// Diffusion vers l'Europe : voie du Danube et voie méditerranéenne
const fr = Z(2.5, 46.6)
const voies = [
  trajet([Z(36.0, 37.8), Z(30, 39.6), Z(24, 41.6), Z(20, 45.2), Z(14, 48.2), Z(8, 48.9), Z(3.6, 48.2)]),
  trajet([Z(33.6, 36.4), Z(26, 36.0), Z(18, 38.6), Z(11, 41.4), Z(6.5, 43.0), Z(3.4, 43.6)]),
]

const svg = doc(W, cZ[3] + 12,
  "Foyers du Néolithique sur un planisphère (Croissant fertile, Chine, Amérique, Afrique, Nouvelle-Guinée) et zoom sur la diffusion du Néolithique du Croissant fertile vers l'Europe et la France. Réviz, 6e histoire, la révolution néolithique. Généré par scripts/illustrations/cartes/foyers-neolithique.mjs",
  `<rect x="${cM[0]}" y="${cM[1]}" width="${cM[2] - cM[0]}" height="${cM[3] - cM[1]}" fill="${C.mer}"/>
<path d="${dc(terresM, 3, 1)}" fill="#FFFFFF" stroke="${C.voisinTrait}" stroke-width="1.4" stroke-linejoin="round"/>
<path d="${dc(terresM, 3, 1)}" fill="#FFFFFF" stroke="#FFFFFF" stroke-width="0.8" stroke-linejoin="round"/>
${Object.entries(foyers).map(([k, [x, y]]) => `<circle cx="${x}" cy="${y}" r="${k === 'croissant' ? 7 : 5.5}" fill="${k === 'croissant' ? C.accent : '#FBE9DD'}" stroke="${C.accent}" stroke-width="2"/>`).join('')}
<path d="${rectZoom}" fill="none" stroke="${C.encre}" stroke-width="1" stroke-dasharray="3 2"/>
<rect x="${cM[0]}" y="${cM[1]}" width="${cM[2] - cM[0]}" height="${cM[3] - cM[1]}" fill="none" stroke="${C.grisTrait}" stroke-width="0.75"/>
<rect x="${cZ[0]}" y="${cZ[1]}" width="${cZ[2] - cZ[0]}" height="${cZ[3] - cZ[1]}" fill="${C.mer}"/>
<path d="${dc(terresZ, 3, 1)}" fill="#FFFFFF" stroke="${C.voisinTrait}" stroke-width="1.4" stroke-linejoin="round"/>
<path d="${dc(terresZ, 3, 1)}" fill="#FFFFFF" stroke="#FFFFFF" stroke-width="0.8" stroke-linejoin="round"/>
<path d="${lisse(arc)}" fill="none" stroke="${C.accent}" stroke-opacity="0.3" stroke-width="16" stroke-linecap="round" stroke-linejoin="round"/>
<path d="${lisse(arc)}" fill="none" stroke="${C.accent}" stroke-width="2.25" stroke-linecap="round" stroke-dasharray="1 0"/>
${voies.join('\n')}
<circle cx="${fr[0]}" cy="${fr[1]}" r="3" fill="${C.encre}"/>
<rect x="${cZ[0]}" y="${cZ[1]}" width="${cZ[2] - cZ[0]}" height="${cZ[3] - cZ[1]}" fill="none" stroke="${C.grisTrait}" stroke-width="0.75"/>
<g font-size="11.5" font-weight="600" fill="${C.encre}">
${etiq(foyers.amerique[0] + 9, foyers.amerique[1] + 4, 'Amérique')}
${etiq(foyers.afrique[0] - 9, foyers.afrique[1] + 16, 'Afrique', { ancre: 'end' })}
${etiq(foyers.chine[0], foyers.chine[1] - 10, 'Chine', { ancre: 'middle' })}
${etiq(foyers.guinee[0] + 2, foyers.guinee[1] + 20, 'Nouvelle-Guinée', { ancre: 'end' })}
${txt(...Z(2.3, 47.1), 'France', { ancre: 'end' })}
${etiq(Z(45, 33)[0], Z(45, 33)[1] + 24, ['Croissant fertile', 'vers 10 000 av. J.-C.'], { ancre: 'end' })}
${etiq(Z(0, 36)[0], Z(0, 36)[1], ['vers 6000-5000', 'av. J.-C.'], { ancre: 'middle' })}${rappel(Z(0, 36)[0], Z(0, 36)[1] - 11, fr[0] - 4, fr[1] + 6)}
</g>
${mention(cZ[0] + 6, cZ[3] - 6, 'zoom', { halo: true })}`)

ecrireSvg('foyers-neolithique', svg, '6eme/histoire')
