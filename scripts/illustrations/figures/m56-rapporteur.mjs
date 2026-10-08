// Réviz — 6e maths, « Angles », section 3 : rapporteur posé sur un angle xÔy de 50°.
// Centre du rapporteur sur le sommet O, zéro de la graduation extérieure sur le côté [Ox).
// Graduation extérieure : 0 à droite, croissante dans le sens direct (on lit θ) ;
// graduation intérieure : en sens inverse (on lit 180 − θ). Le côté [Oy) passe à 50
// (extérieure) et à 130 (intérieure) : la bonne lecture, 50, est entourée. Calculée.
import { C, P, pol, seg, arc, secteur, noms, ecrire, f } from './_m56.mjs'

const ANGLE = 50
const S = P(180, 170), R = 146
const corps = []
// côtés de l'angle (sous le rapporteur, qui est transparent)
const finX = P(S.x + R + 18, S.y), finY = pol(S, R + 24, ANGLE)
corps.push(`<path d="${seg(S, finX)} ${seg(S, finY)}" fill="none" stroke="${C.encre}" stroke-width="1.75" stroke-linecap="round"/>`)
// corps du rapporteur : demi-disque
const bord = `M${f(S.x - R)},${f(S.y)} A${R} ${R} 0 0 1 ${f(S.x + R)},${f(S.y)} Z`
corps.push(`<path d="${bord}" fill="#FFFFFF" fill-opacity="0.78" stroke="${C.encre}" stroke-width="1.3"/>`)
corps.push(`<path d="${arc(S, 66, 0, 180)}" fill="none" stroke="${C.encre}" stroke-width="0.8" opacity="0.5"/>`)
// graduations : tous les degrés
const t1 = [], t5 = [], t10 = []
for (let d = 0; d <= 180; d++) {
  const long = d % 10 === 0 ? 11 : d % 5 === 0 ? 7 : 4
  ;(d % 10 === 0 ? t10 : d % 5 === 0 ? t5 : t1).push(seg(pol(S, R, d), pol(S, R - long, d)))
}
corps.push(`<path d="${t1.join(' ')}" stroke="${C.encre}" stroke-width="0.5"/>`)
corps.push(`<path d="${t5.join(' ')} ${t10.join(' ')}" stroke="${C.encre}" stroke-width="0.9"/>`)
// repère du centre
corps.push(`<path d="M${f(S.x)},${f(S.y - 10)} V${f(S.y)}" stroke="${C.encre}" stroke-width="1"/>`)
// nombres : extérieure (θ) et intérieure (180 − θ), droits ; 0 et 180 un peu relevés
const nombres = (rr, val, taille) => {
  const out = []
  for (let d = 0; d <= 180; d += 10) {
    const p = pol(S, rr, d === 0 ? 3.5 : d === 180 ? 176.5 : d)
    out.push(`<text x="${f(p.x)}" y="${f(p.y + taille * 0.36)}">${val(d)}</text>`)
  }
  return `<g font-size="${taille}" font-weight="600" text-anchor="middle">${out.join('')}</g>`
}
corps.push(nombres(R - 23, d => d, 10))
corps.push(nombres(R - 44, d => 180 - d, 9))
// angle de 50° et lecture entourée
corps.push(`<path d="${secteur(S, 28, 0, ANGLE)}" fill="${C.aplat}"/>`)
corps.push(`<path d="${seg(S, pol(S, 40, 0))} ${seg(S, pol(S, 40, ANGLE))}" fill="none" stroke="${C.encre}" stroke-width="1.75"/>`)
corps.push(`<path d="${arc(S, 28, 0, ANGLE)}" fill="none" stroke="${C.accent}" stroke-width="2.25"/>`)
const lecture = pol(S, R - 23, ANGLE)
corps.push(`<circle cx="${f(lecture.x)}" cy="${f(lecture.y)}" r="10.5" fill="none" stroke="${C.accent}" stroke-width="2"/>`)
corps.push(`<circle cx="${f(S.x)}" cy="${f(S.y)}" r="2.4"/>`)
corps.push(noms([[S.x, S.y + 17, 'O'], [finX.x - 2, finX.y + 17, 'x'], [finY.x + 10, finY.y + 4, 'y']]))

ecrire('6eme/maths/rapporteur-angle-50.svg', 196,
  "Rapporteur posé sur un angle xÔy de 50° : son centre est sur le sommet O, le zéro de la graduation extérieure est sur le côté [Ox). Le côté [Oy) passe devant 50 sur la graduation extérieure et devant 130 sur la graduation intérieure ; la bonne lecture, 50°, est entourée. Réviz, 6e maths, angles.",
  corps)
