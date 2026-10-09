// -------------------------------------------------------
// Réviz — 4e histoire, « Conquêtes et sociétés coloniales ».
// Carte (Afrique, Asie, Océanie : planisphère recadré) des empires coloniaux vers 1914 : Empire britannique (Inde,
// Afrique de l'Est et du Sud, dominions…), Empire français (AOF, AEF, Maghreb,
// Madagascar, Indochine…), autres puissances coloniales (Allemagne, Belgique,
// Portugal, Italie, Espagne, Pays-Bas, États-Unis, Japon).
//
// LIMITES APPROXIMATIVES : chaque colonie est représentée par le ou les pays
// actuels qui lui correspondent à peu près (Natural Earth 1:50m, domaine public) ;
// les frontières de 1914 diffèrent souvent des frontières actuelles. Protectorats
// et dominions sont comptés dans l'empire de leur métropole.
//
//   node scripts/illustrations/cartes/empires-coloniaux-1914.mjs
// -------------------------------------------------------
import { C, doc, etiq, txt, dc, rappel, regionMonde } from './_histoire.mjs'
import { ecrireSvg, couperRect, anneaux } from './_commun.mjs'

const W = 360
const BRIT = ['ENG', 'SCT', 'WLS', 'NIR', 'IRL', 'CAN', 'AUS', 'NZL', 'IND', 'PAK', 'BGD', 'LKA', 'MMR', 'MYS', 'SGP', 'BRN', 'ZAF', 'BWA', 'ZWE', 'ZMB', 'MWI', 'KEN', 'UGA', 'TZZ',
  'SDN', 'SDS', 'EGY', 'NGA', 'GHA', 'SLE', 'GMB', 'SOL', 'LSO', 'SWZ', 'GUY', 'BLZ', 'JAM', 'BHS', 'TTO', 'CYP', 'CYN', 'MLT', 'FJI', 'ARE', 'KWT', 'QAT', 'BHR', 'FLK']
const FRA = ['FXX', 'DZA', 'TUN', 'MAR', 'SEN', 'MRT', 'MLI', 'BFA', 'GIN', 'CIV', 'BEN', 'NER', 'TCD', 'CAF', 'COG', 'GAB', 'DJI', 'MDG', 'COM', 'MYT', 'REU', 'VNM', 'LAO', 'KHM',
  'GUF', 'GLP', 'MTQ', 'NCL', 'PYF', 'SPM']
const METRO = ['ENG', 'SCT', 'WLS', 'NIR', 'IRL', 'FXX']
const AUTRES = ['CMR', 'TGO', 'NAM', 'TZA', 'RWA', 'BDI', 'PNX', 'COD', 'AGO', 'MOZ', 'GNB', 'LBY', 'ERI', 'SOM', 'SAH', 'GNQ', 'IDN', 'SUR', 'PHL', 'KOR', 'PRK', 'TWN', 'TLS', 'PRI', 'CPV', 'STP']

const m = regionMonde({ x: 12, y: 12, largeur: 336 }, [-22, 156], [-38, 60], 10)
const cadre = m.cadre
const pays = m.pays(0.9).map(p => ({ ...p, rings: couperRect(anneaux(p.d), cadre) })).filter(p => p.rings.length)
const R = liste => pays.filter(p => liste.includes(p.unite)).flatMap(p => p.rings)
const P = m.xy

const BRIT_F = '#F9DCE1'
const BRIT_T = '#C8364F'
const FRA_F = '#DCE6FA'
const FRA_T = '#3461C9'
const AUT_F = '#E4E1DA'
// Aplat + liseré : trait dessous, aplat dessus (paint-order) ; les petits jours sont sans importance à cette échelle.
const zone = (rings, fill, stroke, sw, fermer = false) => {
  const d = dc(rings, 0.8, 0.5)
  if (!fermer) return `<path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round" paint-order="stroke"/>`
  // Trait dessous, aplat dessus avec un trait de même couleur qui referme les jours entre pays.
  return `<path d="${d}" fill="none" stroke="${stroke}" stroke-width="${sw + 1.2}" stroke-linejoin="round"/><path d="${d}" fill="${fill}" stroke="${fill}" stroke-width="1.2" stroke-linejoin="round"/>`
}

const yL = cadre[3] + 22
const svg = doc(W, yL + 44,
  "Planisphère des empires coloniaux vers 1914 : Empire britannique, Empire français, autres puissances coloniales (limites approximatives, pays actuels). Réviz, 4e histoire, conquêtes et sociétés coloniales. Généré par scripts/illustrations/cartes/empires-coloniaux-1914.mjs",
  `<rect x="${cadre[0]}" y="${cadre[1]}" width="${cadre[2] - cadre[0]}" height="${cadre[3] - cadre[1]}" fill="${C.mer}"/>
${zone(pays.flatMap(p => p.rings), '#FFFFFF', C.voisinTrait, 1.2)}
${zone(R(AUTRES), AUT_F, '#A9A293', 1.2, true)}
${zone(R(BRIT), BRIT_F, BRIT_T, 1.4, true)}
${zone(R(FRA), FRA_F, FRA_T, 1.4, true)}
${zone(R(METRO.filter(u => u !== 'FXX')), BRIT_T, BRIT_T, 1)}
${zone(R(['FXX']), FRA_T, FRA_T, 1)}
<rect x="${cadre[0]}" y="${cadre[1]}" width="${cadre[2] - cadre[0]}" height="${cadre[3] - cadre[1]}" fill="none" stroke="${C.grisTrait}" stroke-width="0.75"/>
<g font-size="11.5" font-weight="600" fill="${C.encre}">
${etiq(...P(79, 21), 'Inde', { ancre: 'middle', fond: BRIT_F })}
${etiq(...P(-4, 17), 'AOF', { ancre: 'middle', fond: FRA_F })}
${etiq(...P(17, 2), 'AEF', { ancre: 'middle', fond: FRA_F })}
${etiq(...P(3, 30.5), 'Maghreb', { ancre: 'middle', fond: FRA_F })}
${etiq(...P(58, -24), 'Madagascar')}${rappel(P(58, -24)[0] - 3, P(58, -24)[1] - 4, ...P(46.5, -20))}
${etiq(...P(112, 8), 'Indochine')}${rappel(P(112, 8)[0] + 8, P(112, 8)[1] - 11, ...P(106, 14))}
${etiq(...P(4, -27), ['Afrique', 'du Sud'], { ancre: 'end' })}${rappel(P(4, -27)[0] + 3, P(4, -27)[1] - 4, ...P(24, -29))}
${etiq(...P(54, 4), ["Afrique", "de l'Est"], { ancre: 'start' })}${rappel(P(54, 4)[0] - 3, P(54, 4)[1] - 4, ...P(37.5, 0.5))}
<rect x="14" y="${yL - 10}" width="24" height="13" fill="${BRIT_F}" stroke="${BRIT_T}" stroke-width="1.5"/>
${txt(44, yL, 'Empire britannique', { halo: false })}
<rect x="204" y="${yL - 10}" width="24" height="13" fill="${FRA_F}" stroke="${FRA_T}" stroke-width="1.5"/>
${txt(234, yL, 'Empire français', { halo: false })}
<rect x="14" y="${yL + 12}" width="24" height="13" fill="${AUT_F}" stroke="#A9A293" stroke-width="1.2"/>
${txt(44, yL + 22, 'autres empires coloniaux', { halo: false })}
<rect x="204" y="${yL + 12}" width="11" height="13" fill="${BRIT_T}"/><rect x="217" y="${yL + 12}" width="11" height="13" fill="${FRA_T}"/>
${txt(234, yL + 22, 'métropole', { halo: false })}
</g>`)

ecrireSvg('empires-coloniaux-1914', svg, '4eme/histoire')
