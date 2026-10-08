// -------------------------------------------------------
// Réviz — 6e histoire, « Les débuts de l'humanité ».
// Planisphère du peuplement de la Terre par Homo sapiens : apparition en Afrique
// (vers 300 000 ans), puis flèches vers l'Asie, l'Australie (au moins 50 000 ans),
// l'Europe (45 000 à 40 000 ans) et l'Amérique par la Béringie (au moins 15 000 ans).
// Dates : celles du chapitre (resume.sections[1].exemple). Trajets schématiques.
// Fond : Natural Earth 1:50m (domaine public), via carto.mjs (carteMonde).
//
//   node scripts/illustrations/cartes/peuplement-homo-sapiens.mjs
// -------------------------------------------------------
import { carteMonde } from '../carto.mjs'
import { C, HALO, doc, etiq, txt, ringsPays, dc, trajet, rappel } from './_histoire.mjs'
import { ecrireSvg } from './_commun.mjs'

const W = 360
const Y0 = 36
const m = carteMonde({ x: 12, y: Y0, largeur: 336 }, { sud: -48, nord: 80 })
const cadre = [12, Y0, 348, Y0 + m.hauteur]
const pays = m.pays(0.9)
const afrique = ringsPays(pays, cadre, p => p.continent === 'Africa')
const autres = ringsPays(pays, cadre, p => p.continent !== 'Africa')

const P = (lo, la) => m.xy(lo, la)
// Point de départ : Afrique de l'Est.
const dep = P(36, 4)
const proche = P(42, 28) // sortie par le Proche-Orient
const fl = []
// Vers l'Europe
fl.push(trajet([dep, P(38, 18), proche, P(28, 40), P(12, 48)]))
// Vers l'Asie du Sud puis l'Australie
fl.push(trajet([proche, P(62, 24), P(80, 19), P(100, 12), P(113, 0), P(126, -12), P(134, -22)]))
// Vers l'Asie de l'Est puis la Béringie et l'Amérique
fl.push(trajet([P(80, 18), P(95, 32), P(115, 42), P(140, 56), P(170, 64)]))
fl.push(trajet([P(-170, 64), P(-150, 62), P(-122, 50), P(-100, 35)]))
fl.push(trajet([P(-90, 15), P(-75, 0), P(-62, -20)]))


const yb = cadre[3] + 24
const svg = doc(W, yb + 12,
  "Peuplement de la Terre par Homo sapiens : départ d'Afrique et flèches datées vers l'Europe, l'Asie, l'Australie et l'Amérique par la Béringie. Réviz, 6e histoire, les débuts de l'humanité. Généré par scripts/illustrations/cartes/peuplement-homo-sapiens.mjs",
  `<rect x="${cadre[0]}" y="${cadre[1]}" width="${cadre[2] - cadre[0]}" height="${cadre[3] - cadre[1]}" fill="${C.mer}"/>
<path d="${dc(autres, 3, 1)}" fill="#FFFFFF" stroke="${C.voisinTrait}" stroke-width="1.4" stroke-linejoin="round"/>
<path d="${dc(afrique, 3, 1)}" fill="#FBE9DD" stroke="${C.accent}" stroke-width="1.4" stroke-linejoin="round"/>
<path d="${dc(autres, 3, 1)}" fill="#FFFFFF" stroke="#FFFFFF" stroke-width="0.8" stroke-linejoin="round"/>
<path d="${dc(afrique, 3, 1)}" fill="#FBE9DD" stroke="#FBE9DD" stroke-width="0.8" stroke-linejoin="round"/>
${fl.join('\n')}
<circle cx="${dep[0]}" cy="${dep[1]}" r="5" fill="${C.accent}" stroke="#FFFFFF" stroke-width="1.5"/>
<rect x="${cadre[0]}" y="${cadre[1]}" width="${cadre[2] - cadre[0]}" height="${cadre[3] - cadre[1]}" fill="none" stroke="${C.grisTrait}" stroke-width="0.75"/>
<g font-size="11.5" font-weight="600" fill="${C.encre}">
${txt(...P(4, 14), 'Afrique', { ancre: 'middle' })}
${txt(...P(40, 58), 'Europe', { ancre: 'middle' })}
${txt(...P(90, 52), 'Asie', { ancre: 'middle' })}
${txt(...P(134, -26), 'Australie', { ancre: 'middle' })}
${txt(...P(-100, 50), 'Amérique', { ancre: 'middle' })}
${etiq(150, yb, 'vers 300 000 ans')}${rappel(197, yb - 11, dep[0], dep[1] + 5)}
${etiq(290, yb, '50 000 ans')}${rappel(310, yb - 11, ...P(136, -30))}
${etiq(160, 26, '45 000 à 40 000 ans')}${rappel(200, 30, ...P(10, 50))}
${etiq(P(-108, 40)[0] - 32, 26, '15 000 ans')}${rappel(P(-108, 40)[0], 30, ...P(-108, 40))}
</g>
<text x="${P(176, 73)[0]}" y="${P(176, 73)[1]}" text-anchor="end" font-size="11" font-weight="600" fill="${C.gris}" ${HALO}>Béringie</text>`)

ecrireSvg('peuplement-homo-sapiens', svg, '6eme/histoire')
