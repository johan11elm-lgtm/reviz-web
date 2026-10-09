// -------------------------------------------------------
// Réviz — Appareil reproducteur masculin en coupe de profil (schéma simplifié de manuel, personne
// tournée vers la droite) : vessie en haut (repère), prostate sous la vessie autour de l'urètre,
// urètre qui descend puis traverse le pénis (dirigé vers l'avant et le bas), testicule dans le scrotum
// sous et derrière le pénis, spermiducte qui monte du testicule, passe au-dessus puis derrière la
// vessie et rejoint l'urètre dans la prostate, vésicule séminale derrière la vessie sur le spermiducte.
// 4e SVT, appareils reproducteurs.
//   node scripts/illustrations/svt/appareil-reproducteur-masculin.mjs
// -------------------------------------------------------
import { C, document, ecrire, etiquette, rappel, mention } from './_svt.mjs'

let s = '', leg = ''
const lab = (x, y, t, ancre, cx, cy) => {
  const e = etiquette(x, y, t, { ancre })
  leg += e.svg
  const bx = ancre === 'start' ? e.boite.x + e.boite.w : e.boite.x
  s += rappel(bx, e.boite.y + 7.5, cx, cy)
}
const T = `stroke="${C.encre}" stroke-width="1.75"`
// Spermiducte (dessiné d'abord : il passe derrière la racine du pénis)
const sperm = 'M178,164 Q198,146 205,116 Q210,94 207,64 Q204,30 172,29 Q142,29 133,50 Q127,68 134,84 Q140,98 158,104'
s += `<path d="${sperm}" fill="none" stroke="${C.encre}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`
// Vessie (repère)
s += `<ellipse cx="170" cy="62" rx="32" ry="27" fill="${C.grisClair}" stroke="${C.grisTrait}" stroke-width="1.75"/>`
s += mention(172, 66, 'vessie', 'middle')
// Vésicule séminale : derrière la vessie, sur le spermiducte
s += `<path d="M132,92 Q118,88 118,74 Q118,62 126,64 Q128,76 138,82 Q144,88 140,94 Z" fill="${C.accentClair}" stroke="${C.accent}" stroke-width="2.25" stroke-linejoin="round"/>`
// Scrotum et testicule (sous et derrière le pénis, à sa racine)
s += `<circle cx="180" cy="176" r="27" fill="${C.ocreRose}" ${T}/>`
s += `<ellipse cx="182" cy="180" rx="13" ry="17" fill="#FFFFFF" ${T}/>`
s += `<path d="M171,166 Q162,180 172,195" fill="none" stroke="${C.encre}" stroke-width="3.5" stroke-linecap="round"/>`
// Pénis : tube courbé vers l'avant et le bas, terminé par le gland (contour calculé autour de l'axe)
const P0 = [176, 124], P1 = [222, 136], P2 = [250, 184]
const bez = t => [0, 1].map(k => (1 - t) ** 2 * P0[k] + 2 * t * (1 - t) * P1[k] + t * t * P2[k])
const tan = t => { const v = [0, 1].map(k => 2 * (1 - t) * (P1[k] - P0[k]) + 2 * t * (P2[k] - P1[k])); const n = Math.hypot(...v); return v.map(c => c / n) }
const demi = t => 11 + (t > 0.78 ? 2.5 * Math.sin(Math.PI * Math.min(1, (t - 0.78) / 0.22) / 2) : 0)
const haut = [], bas = []
for (let i = 0; i <= 24; i++) {
  const t = i / 24, [x, y] = bez(t), [tx, ty] = tan(t), w = demi(t)
  haut.push([x + ty * w, y - tx * w]); bas.push([x - ty * w, y + tx * w])
}
const [ex, ey] = bez(1), [tx1, ty1] = tan(1)
const f = ([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`
const [tx0, ty0] = tan(0)
s += `<path d="M${haut.map(f).join(' L')} C${f([haut[24][0] + tx1 * 16, haut[24][1] + ty1 * 16])} ${f([bas[24][0] + tx1 * 16, bas[24][1] + ty1 * 16])} ${f(bas[24])} L${bas.slice().reverse().map(f).join(' L')} C${f([bas[0][0] - tx0 * 14, bas[0][1] - ty0 * 14])} ${f([haut[0][0] - tx0 * 14, haut[0][1] - ty0 * 14])} ${f(haut[0])} Z" fill="${C.ocreRose}" ${T} stroke-linejoin="round"/>`
// sillon du gland
{ const t = 0.8, [x, y] = bez(t), [tx, ty] = tan(t), w = demi(t); s += `<path d="M${f([x + ty * w, y - tx * w])} Q${f([x + tx * 4, y + ty * 4])} ${f([x - ty * w, y + tx * w])}" fill="none" stroke="${C.encre}" stroke-width="1.2"/>` }
// Prostate (autour de l'urètre, sous la vessie)
s += `<ellipse cx="170" cy="104" rx="16" ry="12" fill="${C.accentClair}" stroke="${C.accent}" stroke-width="2.25"/>`
// Urètre : de la vessie, à travers la prostate, puis tout le pénis
const ur = []
for (let i = 0; i <= 24; i++) ur.push(f(bez(i / 24)))
ur.push(f([ex + tx1 * 13, ey + ty1 * 13]))
s += `<path d="M170,89 V112 Q170,122 ${ur.join(' L')}" fill="none" stroke="${C.encre}" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"/>`
// Étiquettes
lab(6, 34, 'Spermiducte', 'start', 136, 36)
lab(6, 84, ['Vésicule', 'séminale'], 'start', 121, 76)
lab(6, 196, 'Testicule', 'start', 176, 186)
lab(354, 100, 'Prostate', 'end', 185, 104)
lab(354, 140, 'Urètre', 'end', 226, 147)
lab(354, 214, 'Pénis', 'end', 247, 200)
s += `<g font-size="11.5" font-weight="600" fill="${C.encre}">${leg}</g>`

ecrire('4eme/svt/appareil-reproducteur-masculin.svg', document(228,
  'Appareil reproducteur masculin en coupe de profil, schéma simplifié (la personne regarde vers la droite). Réviz, 4e SVT, appareils reproducteurs.', s))
