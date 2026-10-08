// -------------------------------------------------------
// Réviz — 4e histoire, « Traites négrières et esclavage au XVIIIe siècle ».
// Carte du commerce triangulaire au XVIIIe siècle : ports européens (Nantes,
// Bordeaux, La Rochelle, Le Havre, Liverpool), côtes d'Afrique de l'Ouest,
// Antilles et Saint-Domingue ; trois flèches et leurs cargaisons (produits
// manufacturés, captifs, produits coloniaux). Trajets schématiques.
// Fond : Natural Earth 1:50m (domaine public), planisphère recadré (carto.mjs).
//
//   node scripts/illustrations/cartes/commerce-triangulaire.mjs
// -------------------------------------------------------
import { C, doc, etiq, txt, mention, dc, trajet, ville, rappel, regionMonde } from './_histoire.mjs'
import { ecrireSvg, couperRect, anneaux } from './_commun.mjs'

const W = 360
const z = regionMonde({ x: 12, y: 12, largeur: 336 }, [-92, 32], [-12, 60], 25)
const cadre = z.cadre
const pays = z.pays(0.6).map(p => ({ ...p, rings: couperRect(anneaux(p.d), cadre) })).filter(p => p.rings.length)
const P = z.xy
const pts = l => l.map(([lo, la]) => P(lo, la))

// Côtes d'Afrique de l'Ouest (traite) : du Sénégal à l'Angola, tracé le long de la côte.
const cote = pts([[-17.2, 14.7], [-16.5, 12], [-13.5, 9.5], [-11, 7], [-7.5, 4.5], [-3, 5], [1.5, 6.2], [4.5, 6.3], [7, 4.4], [9.5, 3], [9.4, 0], [11.5, -4], [12.3, -6.5], [13.2, -9]])
// Flèches du triangle
const f1 = trajet(pts([[-6, 45], [-18, 32], [-21, 20], [-14, 8]]), { couleur: C.encre, epaisseur: 2.6, long: 9, large: 9 })
const f2 = trajet(pts([[-12, 2], [-30, 4], [-48, 12], [-59, 16.5]]), { couleur: C.accent, epaisseur: 3, long: 10, large: 10 })
const f3 = trajet(pts([[-67, 22.5], [-60, 33], [-40, 44], [-12, 47.5]]), { couleur: C.encre, epaisseur: 2.6, long: 9, large: 9 })

// Ports
const PORTS = [
  ['Liverpool', -2.98, 53.41],
  ['Le Havre', 0.1, 49.49],
  ['Nantes', -1.55, 47.22],
  ['La Rochelle', -1.15, 46.16],
  ['Bordeaux', -0.58, 44.84],
]
const xL = 278 // colonne des noms de ports (à droite, sur l'Europe continentale)

const saintDom = P(-72.3, 19)
const svg = doc(W, cadre[3] + 12,
  "Carte du commerce triangulaire au XVIIIe siècle : ports européens (Liverpool, Le Havre, Nantes, La Rochelle, Bordeaux), côtes d'Afrique de l'Ouest, Antilles et Saint-Domingue, trois flèches (produits manufacturés, captifs, produits coloniaux). Réviz, 4e histoire, traites négrières et esclavage. Généré par scripts/illustrations/cartes/commerce-triangulaire.mjs",
  `<rect x="${cadre[0]}" y="${cadre[1]}" width="${cadre[2] - cadre[0]}" height="${cadre[3] - cadre[1]}" fill="${C.mer}"/>
<path d="${dc(pays.flatMap(p => p.rings), 1.5, 0.5)}" fill="#FFFFFF" stroke="${C.voisinTrait}" stroke-width="1.4" stroke-linejoin="round" paint-order="stroke"/>
<path d="M${cote.map(p => p.join(',')).join('L')}" fill="none" stroke="${C.accent}" stroke-width="5" stroke-opacity="0.35" stroke-linecap="round" stroke-linejoin="round"/>
${f1}
${f3}
${f2}
<rect x="${cadre[0]}" y="${cadre[1]}" width="${cadre[2] - cadre[0]}" height="${cadre[3] - cadre[1]}" fill="none" stroke="${C.grisTrait}" stroke-width="0.75"/>
${PORTS.map(([, lo, la]) => ville(...P(lo, la), { r: 2.2 })).join('')}
${ville(...saintDom, { r: 2.6 })}
<g font-size="11.5" font-weight="600" fill="${C.encre}">
${PORTS.map(([n, lo, la], i) => { const y = 46 + i * 16; const [x, yy] = P(lo, la); return txt(xL, y, n) + rappel(xL - 3, y - 4, x + 2, yy) }).join('\n')}
${txt(...P(-98, 45), 'Amérique')}
${txt(...P(20, 7), 'Afrique', { ancre: 'middle' })}
${txt(300, 27, 'Europe')}
${txt(14, saintDom[1] + 15, 'Saint-Domingue')}
${etiq(...P(4, 19), ['produits', 'manufacturés'], { ancre: 'middle' })}
${etiq(...P(-34, 0), 'captifs', { ancre: 'middle' })}
${etiq(...P(-48, 50.5), ['produits', 'coloniaux'], { ancre: 'middle' })}
</g>
${mention(...P(-57, 20.5), 'Antilles', { ancre: 'start' })}
${mention(...P(-36, 29), 'océan Atlantique', { ancre: 'middle' })}
${mention(...P(-9, -4), ["côtes d'Afrique", "de l'Ouest"], { ancre: 'start' })}`)

ecrireSvg('commerce-triangulaire', svg, '4eme/histoire')
