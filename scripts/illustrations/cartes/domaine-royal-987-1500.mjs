// -------------------------------------------------------
// Réviz — 5e histoire, « L'affirmation de l'État monarchique ».
// Deux cartes du royaume de France côte à côte, même fond :
//  - en 987, le domaine royal (autour de Paris et d'Orléans) au milieu des
//    grandes principautés (Normandie, Bretagne, Flandre, Bourgogne, Aquitaine…) ;
//  - vers 1500, le domaine royal couvre presque tout le royaume ; Calais est anglaise.
//
// LIMITES APPROXIMATIVES : chaque territoire est reconstitué avec des départements
// actuels entiers (fond Natural Earth / départements, via carto.mjs). Les limites
// réelles des fiefs ne suivent pas les départements ; le royaume de 987 s'arrête
// à l'ouest de l'Escaut, de la Meuse, de la Saône et du Rhône (le reste relève
// du royaume de Bourgogne ou de l'Empire).
//
//   node scripts/illustrations/cartes/domaine-royal-987-1500.mjs
// -------------------------------------------------------
import { carteFrance } from '../carto.mjs'
import { C, doc, etiq, txt, mention, ville, dc, rappel } from './_histoire.mjs'
import { ecrireSvg, anneaux } from './_commun.mjs'

const W = 360
const Y0 = 44

const HORS_987 = ['57', '54', '55', '88', '67', '68', '90', '25', '39', '70', '01', '73', '74', '38', '26', '05', '04', '06', '83', '13', '84', '07', '42', '69', '2A', '2B', '66']
const HORS_1500 = ['57', '54', '55', '88', '67', '68', '90', '25', '39', '70', '01', '73', '74', '06', '84', '2A', '2B', '66']

const C987 = {
  domaine: ['75', '92', '93', '94', '95', '91', '78', '60', '45'],
  fiefs: {
    Normandie: ['14', '27', '50', '61', '76'],
    Bretagne: ['22', '29', '35', '44', '56'],
    Flandre: ['59', '62'],
    Bourgogne: ['21', '71', '89', '58'],
    Aquitaine: ['79', '86', '85', '17', '16', '87', '23', '19', '24', '63', '15', '36'],
    Toulouse: ['31', '81', '82', '46', '12', '11', '34', '30', '48', '09'],
    Gascogne: ['32', '40', '64', '65', '47', '33'],
    Champagne: ['10', '51', '52', '02', '77', '08'],
    Blois: ['41', '37', '28', '18'],
    Anjou: ['49', '72', '53'],
    Auvergne: ['43', '03'],
    Ponthieu: ['80'],
  },
  hors: HORS_987,
}
const C1500 = {
  fiefs: {
    Bretagne: ['22', '29', '35', '44', '56'],
    Flandre: ['59', '62'],
    Bourbonnais: ['03', '63'],
    Bearn: ['64', '09'],
  },
  hors: HORS_1500,
}
C1500.domaine = null // tout le reste du royaume

function carte(x, cfg, largeur) {
  const f = carteFrance({ x, y: Y0, largeur })
  const deps = f.departements(1.2).map(d => ({ code: d.code, rings: anneaux(d.d) }))
  const tous = deps.map(d => d.code)
  const fiefCodes = Object.values(cfg.fiefs).flat()
  const domaine = cfg.domaine ?? tous.filter(c => !fiefCodes.includes(c) && !cfg.hors.includes(c))
  const royaume = tous.filter(c => !cfg.hors.includes(c))
  const autres = royaume.filter(c => !fiefCodes.includes(c) && !domaine.includes(c))
  const S = codes => deps.filter(d => codes.includes(d.code)).map(d => d.rings)
  // Groupe : trait épais dessous, puis aplat par-dessus (le trait de même couleur
  // que l'aplat referme les petits jours entre départements simplifiés séparément) ;
  // il reste visible, à l'extérieur du groupe, un liseré de largeur `visible`.
  const FERME = 2.4
  const groupe = (codes, fill, stroke, visible) => {
    const d = dc(S(codes).flat(), 0.5, 0.5)
    return `<path d="${d}" fill="none" stroke="${stroke}" stroke-width="${2 * (FERME / 2 + visible)}" stroke-linejoin="round"/>` +
      `<path d="${d}" fill="${fill}" stroke="${fill}" stroke-width="${FERME}" stroke-linejoin="round"/>`
  }
  const out = []
  out.push(`<path d="${dc(S(cfg.hors).flat(), 0.5, 0.5)}" fill="${C.voisin}" stroke="${C.voisin}" stroke-width="${FERME}" stroke-linejoin="round"/>`)
  // Contour du royaume : seulement le trait du dessous, recouvert par les aplats des groupes qui le composent.
  out.push(`<path d="${dc(S(royaume).flat(), 0.5, 0.5)}" fill="none" stroke="${C.encre}" stroke-width="${FERME + 5.2}" stroke-linejoin="round"/>`)
  for (const codes of [...Object.values(cfg.fiefs), autres]) if (codes.length) out.push(groupe(codes, '#FFFFFF', C.encre, 1))
  out.push(groupe(domaine, '#FBE9DD', C.accent, 1.8))
  return { f, svg: out.join('\n') }
}

const A = carte(12, C987, 200)
const B = carte(222, C1500, 126)
const yL = Y0 + A.f.hauteur + 24
const pa = (lo, la) => A.f.xy(lo, la)
const pb = (lo, la) => B.f.xy(lo, la)

const svg = doc(W, yL + 44,
  "Deux cartes du royaume de France : le domaine royal en 987 (autour de Paris et d'Orléans, entouré des grandes principautés) et vers 1500 (presque tout le royaume, Calais anglaise). Limites approximatives par départements actuels. Réviz, 5e histoire, l'affirmation de l'État monarchique. Généré par scripts/illustrations/cartes/domaine-royal-987-1500.mjs",
  `${A.svg}
${B.svg}
${ville(...pa(2.35, 48.86))}${ville(...pa(1.91, 47.9))}${ville(...pb(2.35, 48.86))}
<rect x="${pb(1.86, 50.95)[0] - 3}" y="${pb(1.86, 50.95)[1] - 3}" width="6" height="6" fill="${C.encre}" stroke="#FFFFFF" stroke-width="1"/>
${mention(12, 14, '987', { halo: false })}
${mention(222, 14, 'vers 1500', { halo: false })}
<g font-size="11.5" font-weight="600" fill="${C.encre}">
${txt(pa(2.35, 48.86)[0] + 5, pa(2.35, 48.86)[1] - 2, 'Paris')}
${txt(pa(1.91, 47.9)[0] - 4, pa(1.91, 47.9)[1] + 11, 'Orléans', { ancre: 'end' })}
${txt(pb(2.35, 48.86)[0] + 5, pb(2.35, 48.86)[1] - 3, 'Paris')}
${txt(pb(1.86, 50.95)[0] + 6, pb(1.86, 50.95)[1] - 2, 'Calais')}
${txt(...pa(-1.0, 48.85), 'Normandie', { ancre: 'middle' })}
${txt(...pa(-3.0, 48.0), 'Bretagne', { ancre: 'middle' })}
${txt(...pa(3.1, 50.5), 'Flandre', { ancre: 'middle' })}
${txt(...pa(4.9, 46.75), 'Bourgogne', { ancre: 'middle' })}
${txt(...pa(0.9, 45.75), 'Aquitaine', { ancre: 'middle' })}
${txt(...pb(-3.0, 48.0), 'Bretagne', { ancre: 'middle' })}
${etiq(...pb(0.9, 44.9), ['domaine', 'royal'], { ancre: 'middle', fond: '#FBE9DD' })}
${etiq(15, 34, 'domaine royal')}${rappel(70, 38, ...pa(1.75, 48.75))}
<rect x="14" y="${yL - 10}" width="24" height="13" fill="#FBE9DD" stroke="${C.accent}" stroke-width="1.75"/>
${txt(44, yL, 'domaine royal', { halo: false })}
<rect x="184" y="${yL - 10}" width="24" height="13" fill="#FFFFFF" stroke="${C.encre}" stroke-width="1.4"/>
${txt(214, yL, 'grand fief', { halo: false })}
<path d="M14,${yL + 18}h24" stroke="${C.encre}" stroke-width="3.2"/>
${txt(44, yL + 22, 'royaume de France', { halo: false })}
<rect x="184" y="${yL + 12}" width="24" height="13" fill="${C.voisin}" stroke="${C.voisinTrait}" stroke-width="1.2"/>
${txt(214, yL + 22, 'hors du royaume', { halo: false })}
</g>`)

ecrireSvg('domaine-royal-987-1500', svg, '5eme/histoire')
