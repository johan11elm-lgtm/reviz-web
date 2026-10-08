// -------------------------------------------------------
// Réviz — 4e géographie, « Les migrations vers l'Europe ».
// Carte schématique de la Méditerranée (méthode du chapitre) : pays de
// départ (Afrique de l'Ouest et de l'Est, Syrie), de transit (Niger, Libye,
// Tunisie, Algérie, Maroc, Turquie) et d'arrivée (Union européenne) ; routes
// centrale (Libye, Tunisie → Lampedusa, Sicile), orientale (Turquie → Lesbos,
// Samos, puis les Balkans), occidentale (Maroc, Algérie → Espagne) et
// atlantique (→ Canaries) ; frontière extérieure de l'espace Schengen.
// Pays tirés du chapitre (section 3) ; tracés des routes schématiques.
// Fond : Natural Earth (domaine public).
//
//   node scripts/illustrations/cartes/migrations-mediterranee.mjs
// -------------------------------------------------------
import { C, FONT, HALO, fleche, intitule, titrePartie, ecrireSvg, r1 } from './_commun.mjs'
import { fondZone, lisse, MER, rondNumero } from './_geographie-3e-4e.mjs'

const W = 360
const MY = 12
const f = fondZone({ x: 12, y: MY, largeur: 336 }, [[-19, 13], [-19, 48], [42, 48], [42, 13], [12, 50], [12, 11.5]], [11, 32], { tol: 0.55, prec: 0.8, marge: 6 })
const xy = f.z.xy
const [x0, y0, x1, y1] = f.R

const T_DEP = '#F5E3DF'
const T_TRA = '#DAD6CE'
const T_ARR = '#DCE6FA'
const DEPART = ['SEN', 'GMB', 'GNB', 'GIN', 'SLE', 'LBR', 'MLI', 'CIV', 'BFA', 'GHA', 'NGA', 'MRT', 'SDN', 'SDS', 'ERI', 'ETH', 'SOM', 'SYR']
const TRANSIT = ['NER', 'LBY', 'TUN', 'DZA', 'MAR', 'SAH', 'TUR']
const UE = ['AUT', 'BEL', 'BGR', 'HRV', 'CYP', 'CZE', 'DNK', 'EST', 'FIN', 'FRA', 'DEU', 'GRC', 'HUN', 'IRL', 'ITA', 'LVA', 'LTU', 'LUX', 'MLT', 'NLD', 'POL', 'PRT', 'ROU', 'SVK', 'SVN', 'ESP', 'SWE']
// Espace Schengen (29 pays) : UE sans l'Irlande ni Chypre, plus Islande, Norvège, Suisse, Liechtenstein.
const SCHENGEN = [...UE.filter(i => !['IRL', 'CYP'].includes(i)), 'ISL', 'NOR', 'CHE', 'LIE']
// Unités : la France métropolitaine (FXX) seulement, sans les DROM.
const est = (p, liste) => liste.includes(p.iso) && (p.iso !== 'FRA' || p.unite === 'FXX') && (p.iso !== 'ESP' || true)
const couleur = p => est(p, DEPART) ? T_DEP : est(p, TRANSIT) ? T_TRA : est(p, UE) ? T_ARR : '#FFFFFF'
// Ordre : pays hors Schengen (avec leurs frontières) → trait épais autour des pays Schengen →
// pays Schengen par-dessus (sans trait) : seule reste visible la moitié extérieure du trait,
// sur les côtes et le long des frontières terrestres avec les pays hors Schengen.
const STYLE = `stroke="#B9B2A4" stroke-width="0.5" stroke-linejoin="round"`
const horsSchengen = [T_DEP, T_TRA, T_ARR, '#FFFFFF'].map(c => f.couche(p => !est(p, SCHENGEN) && couleur(p) === c, `fill="${c}" ${STYLE}`)).join('\n')
const schengenTrait = f.couche(p => est(p, SCHENGEN), `fill="none" stroke="${C.encre}" stroke-width="5" stroke-linejoin="round"`)
const schengenFond = [T_ARR, '#FFFFFF'].map(c => f.couche(p => est(p, SCHENGEN) && couleur(p) === c, `fill="${c}" ${STYLE}`)).join('\n')

// Routes maritimes (accent, épaisses) et terrestres (tirets).
const FR = { couleur: C.accent, epaisseur: 2.75, long: 8, large: 8 }
const FT = { couleur: C.accent, epaisseur: 1.75, long: 7, large: 7, tirets: '4 3' }
const P = (lo, la) => xy(lo, la)
const routes = [
  fleche(P(13.2, 32.7), P(12.4, 34.2), P(12.6, 35.4), FR), // Libye → Lampedusa
  fleche(P(11.0, 34.6), P(13.0, 36.0), P(14.2, 37.0), FR), // Tunisie → Sicile
  fleche(P(27.0, 38.5), P(26.6, 39.2), P(26.2, 39.25), FR), // Turquie → Lesbos
  fleche(P(23.0, 40.8), P(21.0, 43.5), P(19.5, 46.6), FR), // Grèce → Balkans
  fleche(P(-5.6, 35.4), P(-5.4, 35.9), P(-5.0, 36.6), FR), // Maroc → Espagne
  fleche(P(-0.6, 35.8), P(-1.2, 36.6), P(-1.8, 37.2), FR), // Algérie → Espagne
  fleche(P(-16.8, 19.5), P(-17.3, 24.5), P(-15.8, 27.4), FR), // Afrique de l'Ouest → Canaries
].join('')
const terrestres = [
  fleche(P(-1.5, 14.0), P(5.5, 15.0), P(8.0, 17.0), FT), // Afrique de l'Ouest → Niger (Agadez)
  fleche(P(8.0, 17.0), P(11.5, 22.5), P(13.8, 26.8), FT), // Niger → Libye
  fleche(P(26.0, 15.5), P(23.5, 24.0), P(17.0, 29.0), FT), // Afrique de l'Est → Libye
  fleche(P(37.2, 36.2), P(33.0, 37.6), P(28.6, 38.4), FT), // Syrie → Turquie
  fleche(P(-3.0, 15.0), P(-7.0, 25.0), P(-5.6, 33.8), FT), // Afrique de l'Ouest → Maroc
].join('')

// Numéros des routes : [n°, nom, lon, lat]
const ROUTES = [[1, 'Route centrale', 17.6, 36.2], [2, 'Route orientale', 24.0, 40.3], [3, 'Route occidentale', -8.2, 35.0], [4, 'Route atlantique', -18.6, 23.0]]
const numeros = ROUTES.map(([n, , lo, la]) => { const [x, y] = xy(lo, la); return rondNumero(x, y, n, { fill: C.accent, r: 6.5 }) }).join('')

// Lieux d'arrivée (points) et noms.
const LIEUX = [['Lampedusa', 12.6, 35.5, 4, 17, 'start'], ['Sicile', 14.4, 37.6, 6, -2, 'start'], ['Lesbos', 26.3, 39.2, 9, 0, 'start'], ['Samos', 26.8, 37.7, 8, 5, 'start'], ['Canaries', -15.6, 28.1, 0, 14, 'middle']]
const points = LIEUX.map(([, lo, la]) => { const [x, y] = xy(lo, la); return `<circle cx="${x}" cy="${y}" r="2.4"/>` }).join('')
const lieux = LIEUX.map(([n, lo, la, dx, dy, a]) => { const [x, y] = xy(lo, la); return `<text x="${r1(x + dx)}" y="${r1(y + dy)}"${a !== 'start' ? ` text-anchor="${a}"` : ''}>${n}</text>` }).join('')
const PAYS = [
  ['Libye', 17.5, 27], ['Tunisie', 8.7, 32.8], ['Algérie', 2.5, 29], ['Maroc', -6.2, 31.8], ['Niger', 9.5, 16.8], ['Mali', -2.5, 18.5],
  ['Turquie', 33.0, 41.2], ['Syrie', 40.2, 33.4], ['Soudan', 30, 17],
]
const pays = PAYS.map(([n, lo, la]) => { const [x, y] = xy(lo, la); return `<text x="${x}" y="${y}" text-anchor="middle">${n}</text>` }).join('')
const MERS = [['Méditerranée', 29.2, 32.8], ['Océan', -16.6, 38.6], ['Atlantique', -16.6, 37.6]]
const mers = MERS.map(([n, lo, la]) => { const [x, y] = xy(lo, la); return `<text x="${x}" y="${y}" text-anchor="middle">${n}</text>` }).join('')

// ---- Légende en quatre parties (départ, transit, arrivée, obstacles) regroupées.
const yL = y1 + 24
const X2 = 200
const L = []
const T = []
const case_ = (x, y, fill) => `<rect x="${x}" y="${y - 11}" width="26" height="14" fill="${fill}" stroke="${C.encre}" stroke-width="0.75"/>`
L.push(titrePartie(12, yL, 'Les pays'))
const a = [yL + 22, yL + 43, yL + 64]
L.push(case_(14, a[0], T_DEP), case_(14, a[1], T_TRA), case_(14, a[2], T_ARR))
T.push(intitule(48, a[0], 'Pays de départ'), intitule(48, a[1], 'Pays de transit'), intitule(48, a[2], 'Pays d\'arrivée (UE)'))
const yO = a[2] + 30
L.push(titrePartie(12, yO, 'Les obstacles'))
const o = yO + 22
L.push(`<path d="M14,${o - 4}H40" stroke="${C.encre}" stroke-width="2.5"/>`)
T.push(intitule(48, o, ['Frontière extérieure de', 'Schengen (Frontex)']))
L.push(titrePartie(X2, yL, 'Les routes'))
const c = [yL + 22, yL + 43]
L.push(fleche([X2 + 2, c[0] - 4], [X2 + 14, c[0] - 4], [X2 + 28, c[0] - 4], FR))
L.push(fleche([X2 + 2, c[1] - 4], [X2 + 14, c[1] - 4], [X2 + 28, c[1] - 4], FT))
T.push(intitule(X2 + 36, c[0], 'Traversée maritime'), intitule(X2 + 36, c[1], 'Trajet terrestre'))
ROUTES.forEach(([n, nom], i) => {
  const y = c[1] + 22 + i * 19
  L.push(rondNumero(X2 + 9, y - 4, n, { fill: C.accent, r: 6.5 }))
  T.push(intitule(X2 + 22, y, nom))
})
const H = Math.max(o + 13, c[1] + 22 + 3 * 19) + 12

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" font-family="${FONT}">
<!-- Carte schématique des routes migratoires vers l'Europe : pays de départ, de transit et d'arrivée, routes centrale, orientale, occidentale et atlantique, frontière extérieure de Schengen. Réviz, 4e géographie, les migrations vers l'Europe. Généré par scripts/illustrations/cartes/migrations-mediterranee.mjs -->
<rect x="${x0}" y="${y0}" width="${r1(x1 - x0)}" height="${r1(y1 - y0)}" fill="${MER}"/>
${horsSchengen}
${schengenTrait}
${schengenFond}
${terrestres}
${routes}
<g fill="${C.encre}" stroke="#FFFFFF" stroke-width="0.8">${points}</g>
${numeros}
${f.passePartout(W, H)}
<rect x="${x0}" y="${y0}" width="${r1(x1 - x0)}" height="${r1(y1 - y0)}" fill="none" stroke="${C.encre}" stroke-width="1" opacity="0.5"/>
<g font-size="11" font-weight="600" fill="${C.gris}" ${HALO}>${pays}${mers}</g>
<g font-size="11.5" font-weight="600" fill="${C.encre}">
<g ${HALO}>${lieux}</g>
${L.join('\n')}
${T.join('\n')}
</g>
</svg>
`
ecrireSvg('migrations-mediterranee', svg, '4eme/geographie')
