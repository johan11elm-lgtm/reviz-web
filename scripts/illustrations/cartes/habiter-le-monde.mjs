// -------------------------------------------------------
// Réviz — 6e géographie, « La variété des formes d'occupation spatiale ».
// Deux fichiers :
// - habiter-le-monde-fond.svg : planisphère vierge (terres et mers seulement) pour
//   réaliser le croquis ;
// - habiter-le-monde-croquis.svg : croquis de synthèse corrigé « Habiter le monde »,
//   légende en trois parties comme le demande la méthode du chapitre : espaces très
//   occupés (foyers de peuplement = surfaces, mégapoles = points, littoraux très
//   occupés = lignes), espaces peu occupés (grandes plaines agricoles mécanisées,
//   vides humains = surfaces), flux (flèches).
// Figurés schématiques (contours simplifiés, placés d'après le chapitre) : les vides
// humains et les plaines sont des cadres en latitude/longitude découpés sur les
// terres ; les foyers sont des taches lissées. Mégapoles : Tokyo, Delhi, Shanghai (citées
// par le chapitre), plus quelques autres très grandes villes non nommées.
// Fond : Natural Earth 1:50m (domaine public), via carto.mjs.
//
//   node scripts/illustrations/cartes/habiter-le-monde.mjs
// -------------------------------------------------------
import { C, FONT, couperRect, compact, hachures, fleche, ecrireSvg, r1, intitule, titrePartie } from './_commun.mjs'
import { fondMonde, nom, bordLeger } from './_geographie-5e-6e.mjs'

const W = 360
const SUD = -58
const NORD = 84
const f = fondMonde({ x: 12, y: 12, largeur: 336 }, { sud: SUD, nord: NORD, tol: 1.1, aireMin: 2.5 })
const { m } = f
const xy = m.xy
const yCarte = r1(12 + m.hauteur)
const bord = bordLeger(m, SUD, NORD)
const fond = `<path d="${bord}" fill="${C.mer}"/>
${f.terresUnies('#FFFFFF', { trait: 1 })}`

// ---- Planisphère vierge
const Hf = r1(yCarte + 12)
ecrireSvg('habiter-le-monde-fond', `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${Hf}" font-family="${FONT}">
<!-- Planisphère vierge (terres en blanc, mers en bleu clair) pour réaliser le croquis « Habiter le monde ». Réviz, 6e géographie, la variété des formes d'occupation spatiale. Fond Natural Earth (domaine public). Généré par scripts/illustrations/cartes/habiter-le-monde.mjs -->
${fond}
<path d="${bord}" fill="none" stroke="${C.encre}" stroke-width="0.75"/>
</svg>
`, '6eme/geographie')

// ---- Croquis
const terres = cont => f.pays.filter(p => cont.includes(p.continent)).flatMap(p => p.rings)
// Cadre en degrés [lonO, latN, lonE, latS] découpé sur des terres (parallèles droits, méridiens presque droits ici)
const zone = (rings, [lo0, la0, lo1, la1]) => {
  const [x0, y0] = xy(lo0, la0)
  const [x1, y1] = xy(lo1, la1)
  return couperRect(rings, [x0, y0, x1, y1])
}
const PLAINES_PTS = [[-104, 49], [-90, 48], [-88, 41], [-96, 35], [-104, 37]] // Middle West (grandes plaines)

// Foyers de peuplement : taches lissées (courbe fermée passant par les milieux)
const tache = pts => {
  const P = pts.map(([lo, la]) => xy(lo, la))
  const mid = (a, b) => `${r1((a[0] + b[0]) / 2)},${r1((a[1] + b[1]) / 2)}`
  let s = `M${mid(P[P.length - 1], P[0])}`
  for (let i = 0; i < P.length; i++) s += `Q${P[i][0]},${P[i][1]} ${mid(P[i], P[(i + 1) % P.length])}`
  return s + 'Z'
}
const FOYERS = [
  [[103, 40], [118, 41], [125, 38], [142, 40], [140, 33], [122, 24], [108, 21], [100, 28]], // Asie de l'Est
  [[67, 32], [78, 33], [92, 27], [90, 21], [80, 11], [74, 14], [69, 23]], // Asie du Sud
  [[-6, 54], [12, 57], [25, 52], [22, 45], [12, 42], [-2, 43], [-6, 49]], // Europe
  [[-90, 44], [-74, 45], [-70, 42], [-77, 37], [-88, 38]], // Nord-Est des États-Unis
]
const foyers = FOYERS.map(tache).join('')
// Vides humains : taches lissées
const VIDES = [
  [[-14, 27], [0, 31], [20, 31], [32, 26], [30, 19], [12, 17], [-10, 18]], // Sahara
  [[-160, 70], [-120, 72], [-80, 74], [-62, 64], [-95, 60], [-140, 62]], // Grand Nord américain
  [[-50, 80], [-25, 81], [-22, 70], [-45, 63], [-55, 72]], // Groenland
  [[62, 70], [100, 76], [140, 72], [170, 67], [150, 60], [110, 60], [70, 62]], // Sibérie
  [[-74, 0], [-62, 2], [-51, -2], [-56, -10], [-70, -10]], // Amazonie
  [[118, -22], [130, -19], [141, -24], [136, -30], [122, -30]], // désert australien
]
const vides = VIDES.map(tache).join('')
const plainesTache = tache(PLAINES_PTS)
// Hachures des plaines : dans la tache (anneau échantillonné)
const anneauTache = pts => pts.map(([lo, la]) => xy(lo, la))
const hPlaines = hachures([anneauTache(PLAINES_PTS)], { angle: 45, pas: 3 })

// Mégapoles
const MEGA = [[139.7, 35.7, 'Tokyo', -4, -7, 'end'], [77.2, 28.6, 'Delhi', -5, -5, 'end'], [121.5, 31.2, 'Shanghai', 6, 10, 'start'],
  [-74, 40.7], [-99.1, 19.4], [-46.6, -23.5], [31.2, 30], [3.4, 6.5], [72.9, 19.1], [90.4, 23.8], [-0.1, 51.5], [2.35, 48.86]]
const points = MEGA.map(([lo, la]) => { const [x, y] = xy(lo, la); return `<circle cx="${x}" cy="${y}" r="2.8"/>` }).join('')
const nomsVilles = MEGA.filter(v => v[2]).map(([lo, la, s, dx, dy, an]) => { const [x, y] = xy(lo, la); return nom(x + dx, y + dy, s, { ancre: an, taille: 11 }) }).join('')

// Littoraux très occupés : traits épais le long des côtes (tracé schématique, au large)
const LITTORAUX = [
  [[121.5, 39], [122, 36.5], [122.2, 31], [119.5, 25.5], [114, 22]], // Chine orientale
  [[-70, 42.5], [-73, 40], [-75.5, 37], [-79.5, 33]], // côte est des États-Unis
  [[-1, 38.5], [0.5, 40.5], [3.5, 43], [7.5, 43.6], [10.5, 43], [13, 41.5]], // littoral méditerranéen (Espagne, France, Italie)
]
const littoraux = LITTORAUX.map(l => 'M' + l.map(([lo, la]) => xy(lo, la).join(',')).join('L')).join('')

// Flux : flèches courbes entre les grands pôles (échanges de marchandises et de personnes)
const F = (a, c, b) => fleche(xy(...a), xy(...c), xy(...b), { couleur: C.encre, epaisseur: 1.75, long: 6, large: 6 })
const flux = [
  F([146, 36], [162, 40], [179, 40]), // Asie de l'Est → Amérique du Nord (vers l'est, à travers le Pacifique)…
  F([-178, 40], [-150, 40], [-126, 40]), // … et arrivée sur la côte ouest
  F([110, 12], [75, 0], [36, 26]), // Asie de l'Est → Europe (océan Indien, Suez)
  F([-60, 42], [-35, 50], [-12, 48]), // Amérique du Nord ↔ Europe (Atlantique Nord)
].join('')

// ---- Légende : surfaces, points et lignes, en trois parties
const yL = yCarte + 24
const X2 = 186
const r = [yL + 22, yL + 42, yL + 62]
const t = [yL + 22, yL + 42]
const y3 = yL + 84
const caseH = (x, y, contenu) => `<rect x="${x}" y="${y - 11}" width="26" height="14" ${contenu}/>`
const hLeg = hachures([[[X2 + 2, t[1] - 11], [X2 + 28, t[1] - 11], [X2 + 28, t[1] + 3], [X2 + 2, t[1] + 3]]], { angle: 45, pas: 3 })
const legende = `${titrePartie(12, yL, 'Des espaces très occupés')}
${caseH(14, r[0], `fill="${C.accent}" fill-opacity="0.45" rx="5"`)}
<circle cx="27" cy="${r[1] - 4}" r="2.8" fill="${C.encre}"/>
<path d="M14,${r[2] - 4}h26" stroke="${C.bleu}" stroke-width="3" stroke-linecap="round"/>
${titrePartie(X2, yL, 'Des espaces peu occupés')}
${caseH(X2 + 2, t[0], `fill="${C.grisClair}" rx="5"`)}
${caseH(X2 + 2, t[1], `fill="#FFFFFF" stroke="${C.vert}" stroke-width="0.75"`)}<path d="${hLeg}" stroke="${C.vert}" stroke-width="1.1"/>
${titrePartie(X2, y3, 'Des flux')}
${fleche([X2 + 2, y3 + 18], [X2 + 15, y3 + 12], [X2 + 28, y3 + 18], { couleur: C.encre, epaisseur: 1.75, long: 6, large: 6 })}
<g font-size="11.5" font-weight="600" fill="${C.encre}">
${intitule(48, r[0], 'Foyer de peuplement')}
${intitule(48, r[1], 'Mégapole')}
${intitule(48, r[2], 'Littoral très occupé')}
${intitule(X2 + 36, t[0], 'Vide humain')}
${intitule(X2 + 36, t[1], ['Grande plaine', 'agricole mécanisée'])}
${intitule(X2 + 36, y3 + 22, 'Flux d’échanges')}
</g>`
const H = y3 + 34

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" font-family="${FONT}">
<!-- Croquis de synthèse « Habiter le monde » : foyers de peuplement (surfaces orangées), mégapoles (points), littoraux très occupés (traits bleus), vides humains (surfaces grises), grandes plaines agricoles mécanisées (hachures vertes, Middle West), flux d'échanges (flèches). Légende en trois parties : surfaces, points, lignes. Réviz, 6e géographie, la variété des formes d'occupation spatiale. Fond Natural Earth (domaine public). Généré par scripts/illustrations/cartes/habiter-le-monde.mjs -->
${fond}
<path d="${vides}" fill="${C.grisClair}" opacity="0.9"/>
<path d="${plainesTache}" fill="#FFFFFF" stroke="${C.vert}" stroke-width="0.75"/>
<path d="${hPlaines}" stroke="${C.vert}" stroke-width="1.1"/>
<path d="${foyers}" fill="${C.accent}" fill-opacity="0.45"/>
<path d="${littoraux}" fill="none" stroke="${C.bleu}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
${flux}
<g fill="${C.encre}" stroke="#FFFFFF" stroke-width="1">${points}</g>
<path d="${bord}" fill="none" stroke="${C.encre}" stroke-width="0.75"/>
<g font-size="11.5" font-weight="600" fill="${C.encre}">${nomsVilles}</g>
${legende}
</svg>
`
ecrireSvg('habiter-le-monde-croquis', svg, '6eme/geographie')
