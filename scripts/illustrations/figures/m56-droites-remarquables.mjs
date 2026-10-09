// Réviz — 5e maths, « Droites remarquables du triangle » : un même triangle ABC (non
// isocèle) avec la médiatrice de [BC] (perpendiculaire en son milieu I), la hauteur
// issue de A (perpendiculaire à (BC), pied H) et la médiane issue de A, [AI].
// Trois couleurs, celles de la carte mentale du chapitre (orange, bleu, vert). Calculée.
import { C, P, seg, angleDroit, codeLongueur, projete, mil, noms, etiquette, ecrire, f } from './_m56.mjs'

const BLEU = '#3461C9', VERT = '#2E8B57'
const B = P(36, 204), Cc = P(312, 204), A = P(268, 52)
const I = mil(B, Cc), H = projete(A, B, Cc)
const legende = [[C.accent, 'Médiatrice', 34], [BLEU, 'Hauteur', 58], [VERT, 'Médiane', 82]]

ecrire('5eme/maths/droites-remarquables-triangle.svg', 232,
  "Triangle ABC avec la médiatrice de [BC] (perpendiculaire à [BC] en son milieu I), la hauteur issue de A (perpendiculaire à (BC), de pied H) et la médiane [AI]. Réviz, 5e maths, droites remarquables du triangle.",
  [
    `<path d="${seg(B, Cc)} ${seg(Cc, A)} ${seg(A, B)}" fill="none" stroke="${C.encre}" stroke-width="1.75" stroke-linejoin="round"/>`,
    `<path d="${codeLongueur(B, I, 2)} ${codeLongueur(I, Cc, 2)}" fill="none" stroke="${C.encre}" stroke-width="1.4"/>`,
    `<path d="${seg(P(I.x, 20), P(I.x, 224))}" fill="none" stroke="${C.accent}" stroke-width="2.25" stroke-linecap="round"/>`,
    `<path d="${angleDroit(I, 180, 90)}" fill="none" stroke="${C.accent}" stroke-width="1.4"/>`,
    `<path d="${seg(P(A.x, 26), P(A.x, 222))}" fill="none" stroke="${BLEU}" stroke-width="2.25" stroke-linecap="round"/>`,
    `<path d="${angleDroit(H, 0, 90)}" fill="none" stroke="${BLEU}" stroke-width="1.4"/>`,
    `<path d="${seg(A, I)}" fill="none" stroke="${VERT}" stroke-width="2.25" stroke-linecap="round"/>`,
    `<g>${[A, B, Cc, I, H].map(p => `<circle cx="${f(p.x)}" cy="${f(p.y)}" r="2.2"/>`).join('')}</g>`,
    noms([[A.x + 11, A.y - 3, 'A'], [B.x - 3, B.y + 17, 'B'], [Cc.x + 3, Cc.y + 17, 'C'], [I.x - 9, I.y + 17, 'I'], [H.x - 9, H.y + 17, 'H']]),
    ...legende.map(([c, t, y]) => `<path d="M16,${y - 4} H36" stroke="${c}" stroke-width="2.25" stroke-linecap="round"/>` + etiquette(43, y, t)),
  ])
