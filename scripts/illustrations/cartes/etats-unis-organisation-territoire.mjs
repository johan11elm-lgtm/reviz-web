// -------------------------------------------------------
// Réviz — 4e géographie, « L'adaptation du territoire des États-Unis ».
// Croquis corrigé de l'organisation du territoire (méthode du chapitre),
// légende en trois parties :
//  - centres d'impulsion : mégalopole du Nord-Est (BosWash), grandes métropoles ;
//  - régions : Sun Belt dynamique, Rust Belt en reconversion, intérieur peu
//    peuplé (Grandes Plaines, Rocheuses) — régions construites à partir des
//    États (Natural Earth 1:50m), approximation de croquis ;
//  - ouvertures : façades maritimes, interface avec le Mexique et villes
//    jumelles (San Diego-Tijuana, El Paso-Ciudad Juárez), flux vers l'Europe et l'Asie.
// États-Unis contigus (sans l'Alaska ni Hawaï). Fond : Natural Earth (domaine public).
//
//   node scripts/illustrations/cartes/etats-unis-organisation-territoire.mjs
// -------------------------------------------------------
import { C, FONT, HALO, compact, fleche, intitule, titrePartie, ecrireSvg, r1 } from './_commun.mjs'
import { fondEtatsUnis, lisse, MER, TERRE, TERRE_TRAIT, FACADES_ETATS_UNIS } from './_geographie-3e-4e.mjs'

const W = 360
const MY = 12
const f = fondEtatsUnis({ x: 12, y: MY, largeur: 336 })
const xy = f.xy
const [x0, y0, x1, y1] = f.R
const ligne = pts => lisse(pts.map(([lo, la]) => xy(lo, la)))

const T_SUN = '#FBE9DD'
const T_RUST = '#DAD6CE'
const T_INT = '#EEF6E8'
const SUN = ['CA', 'NV', 'AZ', 'NM', 'TX', 'OK', 'LA', 'AR', 'MS', 'AL', 'GA', 'FL', 'SC', 'NC', 'TN']
const RUST = ['IL', 'IN', 'MI', 'OH', 'PA', 'WI']
const INT = ['MT', 'ID', 'WY', 'ND', 'SD', 'NE', 'KS', 'CO', 'UT']
const region = (codes, fill) => `<path d="${compact(f.etats(codes), { prec: 0.5 })}" fill="${fill}" stroke="${fill}" stroke-width="0.8" stroke-linejoin="round"/>`

// Mégalopole : forme foncée de Boston à Washington.
const MEGA = ligne([[-71.06, 42.36], [-71.4, 41.8], [-72.9, 41.3], [-74.0, 40.7], [-75.16, 39.95], [-76.6, 39.3], [-77.04, 38.9]])
// Métropoles : [nom, lon, lat, taille]
const METRO = [
  ['New York', -74.0, 40.7, 5.5], ['Los Angeles', -118.24, 34.05, 5], ['Chicago', -87.63, 41.88, 4.6], ['Houston', -95.37, 29.76, 4.2],
  ['Dallas', -96.8, 32.78, 4.2], ['San Francisco', -122.42, 37.77, 3.4], ['Seattle', -122.33, 47.6, 3.4], ['Atlanta', -84.39, 33.75, 3.4],
  ['Miami', -80.19, 25.77, 3.4], ['Détroit', -83.05, 42.33, 3.4],
]
const metros = METRO.map(([, lo, la, r]) => { const [x, y] = xy(lo, la); return `<circle cx="${x}" cy="${y}" r="${r}"/>` }).join('')

// Interface : bande le long de la frontière avec le Mexique ; villes jumelles.
const FRONTIERE = [[-117.1, 32.55], [-114.7, 32.7], [-111.0, 31.35], [-108.2, 31.35], [-106.5, 31.75], [-104.6, 29.7], [-103.1, 29.0], [-101.0, 29.8], [-99.5, 27.6], [-97.4, 25.95]]
const JUMELLES = [[-117.1, 32.6], [-106.45, 31.72]]
const jumelles = JUMELLES.map(([lo, la]) => { const [x, y] = xy(lo, la); return `<circle cx="${r1(x - 2.6)}" cy="${r1(y - 1.4)}" r="2.4"/><circle cx="${r1(x + 1.4)}" cy="${r1(y + 2.4)}" r="2.4"/>` }).join('')

// Flux vers l'Europe et l'Asie (flèches épaisses vers les bords du cadre).
const F = { couleur: C.encre, epaisseur: 3, long: 9, large: 9 }
const [xNY, yNY] = xy(-75.2, 36.4)
const [xLA, yLA] = xy(-119, 33.6)
const [xSF, ySF] = xy(-123, 37.5)
const flux = [
  fleche([xNY + 6, yNY], [r1((xNY + x1) / 2), yNY + 6], [x1 - 3, yNY - 4], F),
  fleche([xLA - 6, yLA + 4], [x0 + 18, yLA + 10], [x0 + 3, yLA - 6], F),
  fleche([xSF - 6, ySF - 2], [x0 + 14, ySF - 8], [x0 + 3, ySF - 22], F),
].join('')

// Noms : [nom, lon, lat, dx, dy, ancre]
const NOMS = [
  ['New York', -74.0, 40.7, 9, 8, 'start'], ['Chicago', -87.63, 41.88, -4, -8, 'end'], ['Détroit', -83.05, 42.33, 3, -8, 'start'],
  ['Houston', -95.37, 29.76, 6, -6, 'start'], ['Los Angeles', -118.24, 34.05, 8, -2, 'start'],
]
// Villes jumelles : noms sur deux lignes, reliés à leur symbole.
const [xSD, ySD] = xy(-117.1, 32.6)
const [xEP, yEP] = xy(-106.45, 31.72)
const JUM = [
  ['San Diego', 'Tijuana', x0 + 4, r1(ySD + 30), 'start', [x0 + 30, r1(ySD + 19)], [r1(xSD - 2), r1(ySD + 2)]],
  ['El Paso', 'Ciudad Juárez', r1(xEP), r1(yEP + 24), 'middle', [r1(xEP), r1(yEP + 13)], [r1(xEP), r1(yEP + 4)]],
]
const jumNoms = JUM.map(([a, b, x, y, an]) => `<text x="${x}" y="${y}"${an !== 'start' ? ` text-anchor="${an}"` : ''}>${a}<tspan x="${x}" dy="13">${b}</tspan></text>`).join('')
const jumTraits = JUM.map(([, , , , , p, q]) => `M${p.join(',')}L${q.join(',')}`).join('')
const noms = NOMS.map(([n, lo, la, dx, dy, a]) => { const [x, y] = xy(lo, la); return `<text x="${r1(x + dx)}" y="${r1(y + dy)}"${a !== 'start' ? ` text-anchor="${a}"` : ''}>${n}</text>` }).join('')
const mers = `<text x="${x0 + 4}" y="${r1(ySF - 30)}">vers l'Asie</text><text x="${x1 - 4}" y="${r1(yNY + 18)}" text-anchor="end">vers l'Europe</text>`

// ---- Légende en trois parties
const yL = y1 + 24
const X2 = 186
const L = []
const T = []
const case_ = (x, y, fill, extra = '') => `<rect x="${x}" y="${y - 11}" width="26" height="14" fill="${fill}" stroke="${C.encre}" stroke-width="0.75"${extra}/>`
L.push(titrePartie(12, yL, 'Les centres d\'impulsion'))
const a = [yL + 22, yL + 43]
L.push(`<path d="M14,${a[0] - 4}H40" stroke="${C.encre}" stroke-width="7" stroke-linecap="round"/>`)
L.push(`<circle cx="22" cy="${a[1] - 4}" r="5"/><circle cx="35" cy="${a[1] - 4}" r="3.4"/>`)
T.push(intitule(48, a[0], 'Mégalopole (BosWash)'), intitule(48, a[1], 'Grande métropole'))
const yR = a[1] + 30
L.push(titrePartie(12, yR, 'Les régions'))
const b = [yR + 22, yR + 43, yR + 64]
L.push(case_(14, b[0], T_SUN), case_(14, b[1], T_RUST), case_(14, b[2], T_INT))
T.push(intitule(48, b[0], 'Sun Belt dynamique'), intitule(48, b[1], 'Rust Belt en reconversion'), intitule(48, b[2], 'Intérieur peu peuplé'))
L.push(titrePartie(X2, yL, 'Les ouvertures'))
const c = [yL + 22, yL + 43, yL + 77, yL + 98]
L.push(`<path d="M${X2 + 2},${c[0] - 4}H${X2 + 28}" stroke="${C.bleu}" stroke-width="4.5" stroke-linecap="round" opacity="0.85"/>`)
L.push(`<path d="M${X2 + 2},${c[1] - 4}H${X2 + 28}" stroke="${C.accent}" stroke-width="7" stroke-linecap="round" opacity="0.45"/>`)
L.push(`<g fill="${C.accent}" stroke="#FFFFFF" stroke-width="0.6"><circle cx="${X2 + 12}" cy="${c[2] - 5.4}" r="2.4"/><circle cx="${X2 + 16}" cy="${c[2] - 1.6}" r="2.4"/></g>`)
L.push(fleche([X2 + 2, c[3] - 4], [X2 + 14, c[3] - 4], [X2 + 28, c[3] - 4], F))
T.push(intitule(X2 + 36, c[0], 'Façade maritime'), intitule(X2 + 36, c[1], ['Interface avec', 'le Mexique']), intitule(X2 + 36, c[2], 'Villes jumelles'), intitule(X2 + 36, c[3], 'Échanges mondiaux'))
const H = Math.max(b[2], c[3]) + 12

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" font-family="${FONT}">
<!-- Croquis de l'organisation du territoire des États-Unis : mégalopole BosWash, métropoles, Sun Belt, Rust Belt, intérieur peu peuplé, façades maritimes, interface avec le Mexique, villes jumelles, flux vers l'Europe et l'Asie. Réviz, 4e géographie, l'adaptation du territoire des États-Unis. Généré par scripts/illustrations/cartes/etats-unis-organisation-territoire.mjs -->
<rect x="${x0}" y="${y0}" width="${r1(x1 - x0)}" height="${r1(y1 - y0)}" fill="${MER}"/>
${f.couche(p => p.iso !== 'USA', `fill="${TERRE}" stroke="${TERRE_TRAIT}" stroke-width="0.6" stroke-linejoin="round"`)}
${f.couche(p => p.iso === 'USA', 'fill="#FFFFFF"')}
${region(SUN, T_SUN)}
${region(RUST, T_RUST)}
${region(INT, T_INT)}
${f.couche(p => p.iso === 'USA', `fill="none" stroke="${C.encre}" stroke-width="1.2" stroke-linejoin="round"`)}
<path d="${f.lacs}" fill="${MER}" stroke="${C.bleu}" stroke-width="0.7"/>
<path d="${FACADES_ETATS_UNIS.map(ligne).join('')}" fill="none" stroke="${C.bleu}" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round" opacity="0.85"/>
<path d="${ligne(FRONTIERE)}" fill="none" stroke="${C.accent}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" opacity="0.45"/>
<path d="${MEGA}" fill="none" stroke="${C.encre}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
<g fill="${C.encre}" stroke="#FFFFFF" stroke-width="0.8">${metros}</g>
<g fill="${C.accent}" stroke="#FFFFFF" stroke-width="0.6">${jumelles}</g>
${flux}
<rect x="${x0}" y="${y0}" width="${r1(x1 - x0)}" height="${r1(y1 - y0)}" fill="none" stroke="${C.encre}" stroke-width="1" opacity="0.5"/>
<g font-size="11" font-weight="600" fill="${C.gris}" ${HALO}>${mers}</g>
<g font-size="11.5" font-weight="600" fill="${C.encre}">
<g ${HALO}>${noms}${jumNoms}</g>
<path d="${jumTraits}" stroke="${C.encre}" stroke-width="1" opacity="0.6"/>
${L.join('\n')}
${T.join('\n')}
</g>
</svg>
`
ecrireSvg('etats-unis-organisation-territoire', svg, '4eme/geographie')
