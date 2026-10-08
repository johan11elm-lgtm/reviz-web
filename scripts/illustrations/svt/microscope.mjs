// -------------------------------------------------------
// Réviz — Microscope optique légendé (vu de profil, schéma simplifié) : oculaire, objectifs,
// platine, valets, vis de mise au point, source lumineuse. 6e sciences et technologie, la cellule.
//   node scripts/illustrations/svt/microscope.mjs
// -------------------------------------------------------
import { C, document, ecrire, etiquette, rappel } from './_svt.mjs'

const GRIS = C.grisClair, T = `stroke="${C.encre}" stroke-width="1.75" stroke-linejoin="round"`
let s = '', leg = ''
// Pied
s += `<path d="M96,300 Q96,290 108,290 H242 Q254,290 254,300 V308 H96 Z" fill="${GRIS}" ${T}/>`
// Potence
s += `<path d="M206,290 V198 Q206,166 186,142 L172,128 H160 V104 H176 L198,126 Q230,162 230,198 V290 Z" fill="${GRIS}" ${T}/>`
// Faisceau de lumière (au-dessus de la source)
s += `<path d="M144,250 L146,226 M156,250 L154,226" stroke="${C.accent}" stroke-width="1.5" stroke-dasharray="3 2"/>`
// Source lumineuse
s += `<rect x="136" y="252" width="28" height="18" rx="3" fill="${C.accentClair}" stroke="${C.accent}" stroke-width="2.25"/>`
s += `<path d="M144,270 V290 M156,270 V290" stroke="${C.encre}" stroke-width="1.5"/>`
// Platine (fixée à la potence), lame et valets
s += `<rect x="96" y="222" width="114" height="8" rx="2" fill="${GRIS}" ${T}/>`
s += `<rect x="116" y="218" width="68" height="4" fill="#FFFFFF" stroke="${C.encre}" stroke-width="1"/>`
s += `<path d="M104,222 V216 H126 M196,222 V216 H174" fill="none" stroke="${C.encre}" stroke-width="2.25" stroke-linecap="round"/>`
// Tube et oculaire
s += `<rect x="139" y="56" width="22" height="120" fill="#FFFFFF" ${T}/>`
s += `<rect x="134" y="30" width="32" height="28" rx="3" fill="${C.violet}" ${T}/>`
// Revolver et objectifs
s += `<path d="M128,176 H172 L178,188 H122 Z" fill="${GRIS}" ${T}/>`
s += `<rect x="144" y="188" width="12" height="22" rx="2" fill="${C.violet}" ${T}/>`
s += `<rect x="129" y="187" width="10" height="16" rx="2" transform="rotate(25 134 187)" fill="${C.violet}" ${T}/>`
s += `<rect x="161" y="187" width="10" height="16" rx="2" transform="rotate(-25 166 187)" fill="${C.violet}" ${T}/>`
// Vis de mise au point
s += `<circle cx="218" cy="250" r="12" fill="#FFFFFF" ${T}/><circle cx="218" cy="250" r="5" fill="${GRIS}" ${T}/>`
// Étiquettes
const L = (x, y, t, o, to) => { const e = etiquette(x, y, t, o); leg += e.svg; s += rappel(o.ancre === 'end' ? e.boite.x : e.boite.x + e.boite.w, e.boite.y + 7.5, ...to) }
L(6, 48, 'Oculaire', {}, [134, 44])
L(6, 204, 'Objectifs', {}, [130, 200])
L(6, 228, 'Valet', {}, [104, 218])
L(6, 254, 'Platine', {}, [98, 230])
L(6, 280, ['Source', 'lumineuse'], {}, [136, 264])
L(354, 246, ['Vis de mise', 'au point'], { ancre: 'end' }, [230, 250])
s += `<g font-size="11.5" font-weight="600" fill="${C.encre}">${leg}</g>`

ecrire('6eme/sciences-et-technologie/microscope.svg', document(318,
  'Microscope optique légendé : oculaire, objectifs, platine, valet, vis de mise au point, source lumineuse. Réviz, 6e sciences, la cellule.', s))
