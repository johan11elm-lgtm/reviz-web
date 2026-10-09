// -------------------------------------------------------
// Réviz — 3e histoire, « La guerre froide ».
// Carte de l'Europe de la guerre froide (vers 1961) : pays de l'OTAN, pays du
// pacte de Varsovie (URSS comprise), pays neutres ou non alignés, RFA et RDA
// (reconstituées avec les Länder actuels), rideau de fer ; encart sur Berlin :
// les quatre secteurs de 1945, Berlin-Ouest enclavé dans la RDA, le mur (1961).
//
// APPROXIMATIONS : pays actuels de Natural Earth (domaine public) ; l'URSS, la
// Tchécoslovaquie et la Yougoslavie sont reconstituées avec leurs États actuels.
// Le rideau de fer est la limite entre le pacte de Varsovie et ses voisins
// (calculée sur le fond). Dans l'encart, le contour de Berlin vient de Natural
// Earth (Länder, très simplifié) ; la ligne entre Berlin-Ouest et Berlin-Est et
// les limites entre secteurs sont des TRACÉS SCHÉMATIQUES.
//
//   node scripts/illustrations/cartes/europe-guerre-froide.mjs
// -------------------------------------------------------
import { carteZone } from '../carto.mjs'
import { C, doc, etiq, txt, mention, dc, ville, masque, rappel } from './_histoire.mjs'
import { ecrireSvg, couperRect, anneaux, r1 } from './_commun.mjs'

const W = 360
const OTAN = ['ISL', 'NOR', 'DNK', 'ENG', 'SCT', 'WLS', 'NIR', 'FXX', 'BCR', 'BFR', 'BWR', 'NLD', 'LUX', 'PRX', 'ITA', 'GRC', 'TUR', 'SMR', 'MCO']
const VARSOVIE = ['RUS', 'UKR', 'BLR', 'MDA', 'LTU', 'LVA', 'EST', 'POL', 'CZE', 'SVK', 'HUN', 'ROU', 'BGR', 'ALB', 'GEG', 'ARM', 'AZE', 'KAZ']
const RDA = ['Mecklenburg-Vorpommern', 'Brandenburg', 'Berlin', 'Sachsen', 'Sachsen-Anhalt', 'Thüringen']

const OT_F = '#DCE6FA'
const OT_T = '#3461C9'
const VA_F = '#F9DCE1'
const VA_T = '#C8364F'

// ---- Carte principale
const z = carteZone({ x: 12, y: 12, largeur: 336 }, [[-11, 64], [36, 64], [-10, 36], [33, 36], [12, 67], [12, 35]], [12, 51])
const cadre = [12, 12, 348, 12 + z.hauteur]
const pays = z.pays(1.0).filter(p => p.unite !== 'DEU').map(p => ({ ...p, rings: couperRect(anneaux(p.d), cadre) })).filter(p => p.rings.length)
const lander = z.lander(0.8).map(l => ({ ...l, rings: couperRect(anneaux(l.d), cadre) }))
const R = liste => pays.filter(p => liste.includes(p.unite)).flatMap(p => p.rings)
const rfa = lander.filter(l => !RDA.includes(l.nom)).flatMap(l => l.rings)
const rda = lander.filter(l => RDA.includes(l.nom)).flatMap(l => l.rings)
const ouest = R(OTAN).concat(rfa)
const est = R(VARSOVIE).concat(rda)
const P = z.xy

// Rideau de fer : arêtes du bloc de l'Est qui longent un pays voisin non communiste (au sud de 56° N).
function frontiere(surfA, surfB, eps = 1.6) {
  const B = surfB
  const dSeg = (p, a, b) => {
    const dx = b[0] - a[0]
    const dy = b[1] - a[1]
    const l2 = dx * dx + dy * dy || 1e-9
    const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2))
    return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy)
  }
  const pres = m => B.some(r => r.some((a, i) => dSeg(m, a, r[(i + 1) % r.length]) < eps))
  const yMax = P(20, 56)[1]
  let d = ''
  for (const r of surfA) {
    let ouvert = false
    for (let i = 0; i < r.length; i++) {
      const a = r[i]
      const b = r[(i + 1) % r.length]
      const m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]
      if (m[1] > yMax && pres(m)) {
        if (!ouvert) d += `M${r1(a[0])},${r1(a[1])}`
        d += `L${r1(b[0])},${r1(b[1])}`
        ouvert = true
      } else ouvert = false
    }
  }
  return d
}
const autresTerres = pays.filter(p => !VARSOVIE.includes(p.unite)).flatMap(p => p.rings).concat(rfa)
const rideau = frontiere(est, autresTerres)

const FERME = 1
const zone = (rings, fill, stroke, visible) => {
  const d = dc(rings, 1.5, 1)
  return `<path d="${d}" fill="none" stroke="${stroke}" stroke-width="${FERME + 2 * visible}" stroke-linejoin="round"/>` +
    `<path d="${d}" fill="${fill}" stroke="${fill}" stroke-width="${FERME}" stroke-linejoin="round"/>`
}

// ---- Encart : Berlin
const yE = cadre[3] + 14
const LE = 168
const xE = 348 - LE
const b = carteZone({ x: xE, y: yE, largeur: LE }, [[13.08, 52.68], [13.77, 52.68], [13.08, 52.33], [13.77, 52.33]], [13.4, 52.5])
const cE = [xE, yE, 348, yE + b.hauteur]
const berlin = anneaux(b.lander(0.1).find(l => l.nom === 'Berlin').d)
// Limite schématique Ouest / Est (du nord au sud), puis bandes convexes à l'ouest.
const LIGNE = [[13.31, 52.70], [13.355, 52.58], [13.385, 52.545], [13.377, 52.516], [13.40, 52.505], [13.445, 52.495], [13.48, 52.46], [13.52, 52.37]]
const bandes = LIGNE.slice(0, -1).map((p, i) => [p, LIGNE[i + 1], [12.9, LIGNE[i + 1][1]], [12.9, p[1]]])
const ouestB = bandes.flatMap(q => masque(berlin, q, b.xy))
const secteur = (lat0, lat1) => masque(ouestB, [[12.9, lat1], [13.9, lat1], [13.9, lat0], [12.9, lat0]], b.xy)
const fr = secteur(52.555, 52.75)
const gb = secteur(52.495, 52.555)
const us = secteur(52.3, 52.495)
const ligneMur = 'M' + LIGNE.map(([lo, la]) => b.xy(lo, la).join(',')).join('L')
// Contour de Berlin-Ouest (le mur) : bord de l'union des bandes.
// (le contour de l'union des bandes : trait épais dessous, aplats des secteurs dessus)
const murOuest = dc(ouestB, 0.5, 0.5)
// Limites entre secteurs occidentaux : horizontales schématiques, du bord ouest de Berlin à la ligne Ouest/Est.
function limite(lat) {
  const y = b.xy(13.3, lat)[1]
  const xs = []
  for (const r of berlin) for (let i = 0; i < r.length; i++) {
    const [x1, y1] = r[i]
    const [x2, y2] = r[(i + 1) % r.length]
    if ((y1 <= y && y2 > y) || (y2 <= y && y1 > y)) xs.push(x1 + ((y - y1) * (x2 - x1)) / (y2 - y1))
  }
  const k = LIGNE.findIndex((p, i) => i < LIGNE.length - 1 && p[1] >= lat && LIGNE[i + 1][1] <= lat)
  const [a, c] = [LIGNE[k], LIGNE[k + 1]]
  const lon = a[0] + ((lat - a[1]) * (c[0] - a[0])) / (c[1] - a[1])
  return `M${r1(Math.min(...xs))},${r1(y)}L${b.xy(lon, lat)[0]},${r1(y)}`
}
const limitesSecteurs = limite(52.555) + limite(52.495)

const yL = cadre[3] + 30
const svg = doc(W, cE[3] + 12,
  "Carte de l'Europe de la guerre froide vers 1961 : OTAN, pacte de Varsovie, neutres, RFA et RDA, rideau de fer ; encart sur Berlin avec les quatre secteurs, Berlin-Ouest enclavé dans la RDA et le mur de 1961 (limites approximatives et schématiques). Réviz, 3e histoire, la guerre froide. Généré par scripts/illustrations/cartes/europe-guerre-froide.mjs",
  `<rect x="${cadre[0]}" y="${cadre[1]}" width="${cadre[2] - cadre[0]}" height="${cadre[3] - cadre[1]}" fill="${C.mer}"/>
<path d="${dc(pays.flatMap(p => p.rings).concat(rfa, rda), 1.5, 1)}" fill="#FFFFFF" stroke="${C.voisinTrait}" stroke-width="1.4" stroke-linejoin="round" paint-order="stroke"/>
${zone(ouest, OT_F, OT_T, 0.7)}
${zone(est, VA_F, VA_T, 0.7)}
<path d="${rideau}" fill="none" stroke="${C.accent}" stroke-width="3.2" stroke-linejoin="round" stroke-linecap="round"/>
<rect x="${cadre[0]}" y="${cadre[1]}" width="${cadre[2] - cadre[0]}" height="${cadre[3] - cadre[1]}" fill="none" stroke="${C.grisTrait}" stroke-width="0.75"/>
${ville(...P(13.4, 52.52), { r: 3 })}
<rect x="${cE[0]}" y="${cE[1]}" width="${cE[2] - cE[0]}" height="${cE[3] - cE[1]}" fill="${VA_F}"/>
<path d="${dc(berlin, 0.5, 0.5)}" fill="#FCEEF1" stroke="${VA_T}" stroke-width="1" stroke-dasharray="3 2"/>
<path d="${murOuest}" fill="none" stroke="${C.accent}" stroke-width="5" stroke-linejoin="round"/>
${[[fr, '#E9EFFC'], [gb, '#DCE6FA'], [us, '#C9D7F5']].map(([r, f]) => `<path d="${dc(r, 0.5, 0.5)}" fill="${f}" stroke="${f}" stroke-width="1.2" stroke-linejoin="round"/>`).join('')}
<path d="${limitesSecteurs}" stroke="#FFFFFF" stroke-width="1.5"/>
<rect x="${cE[0]}" y="${cE[1]}" width="${cE[2] - cE[0]}" height="${cE[3] - cE[1]}" fill="none" stroke="${C.grisTrait}" stroke-width="0.75"/>
<g font-size="11.5" font-weight="600" fill="${C.encre}">
${txt(...P(13.4, 52.52).map((v, i) => i ? v - 5 : v + 4), 'Berlin')}
${etiq(...P(8.0, 49.4), 'RFA', { ancre: 'middle', fond: OT_F })}
${etiq(...P(14.6, 51.2), 'RDA', { ancre: 'middle', fond: VA_F })}
${etiq(...P(30, 55), 'URSS', { ancre: 'middle', fond: VA_F })}
${etiq(...P(-1, 60.5), 'rideau de fer', { ancre: 'middle' })}${rappel(P(-1, 60.5)[0] + 30, P(-1, 60.5)[1] + 4, ...P(10.9, 53.6))}
${etiq(...b.xy(13.2, 52.6), 'FR', { ancre: 'middle', fond: '#E9EFFC' })}
${etiq(...b.xy(13.22, 52.525), 'GB', { ancre: 'middle', fond: '#DCE6FA' })}
${etiq(...b.xy(13.27, 52.44), 'US', { ancre: 'middle', fond: '#C9D7F5' })}
${etiq(...b.xy(13.6, 52.52), 'URSS', { ancre: 'middle', fond: '#FCEEF1' })}
<rect x="14" y="${yL - 10}" width="24" height="13" fill="${OT_F}" stroke="${OT_T}" stroke-width="1.2"/>
${txt(44, yL, 'OTAN', { halo: false })}
<rect x="14" y="${yL + 10}" width="24" height="13" fill="${VA_F}" stroke="${VA_T}" stroke-width="1.2"/>
${txt(44, yL + 20, 'pacte de Varsovie', { halo: false })}
<rect x="14" y="${yL + 30}" width="24" height="13" fill="#FFFFFF" stroke="${C.voisinTrait}" stroke-width="1.2"/>
${txt(44, yL + 40, 'hors des deux alliances', { halo: false })}
<path d="M14,${yL + 56}h24" stroke="${C.accent}" stroke-width="3"/>
${txt(44, yL + 60, 'rideau de fer, mur', { halo: false })}
${etiq(cE[2] - 6, cE[3] - 8, 'RDA', { ancre: 'end', fond: VA_F })}
</g>
${mention(cE[2] - 5, cE[1] + 14, 'Berlin', { ancre: 'end' })}`)

ecrireSvg('europe-guerre-froide', svg, '3eme/histoire')
