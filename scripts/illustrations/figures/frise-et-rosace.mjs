// Réviz, maths : frise (motif répété par translation) et rosace (motif répété par rotation
// autour du centre O). Deux versions :
//  - 3eme/maths/frise-et-rosace-8-motifs.svg : rosace de 8 motifs, rotation de 360° ÷ 8 = 45°
//    (3e, transformations et homothéties, section 5) ;
//  - 4eme/maths/frise-et-rosace-6-motifs.svg : rosace de 6 motifs, rotation de 360° ÷ 6 = 60°
//    (4e, translations et rotations, section 3).
// Les motifs sont calculés : translation d'un vecteur fixe, rotations exactes autour de O.
// Chaque pétale reste dans un secteur angulaire plus étroit que 360° ÷ n : pas de chevauchement.
// node scripts/illustrations/figures/frise-et-rosace.mjs
import { C, doc, ecrire, trait, aplat, point, add, sub, mul, rot, arcPts, pointe, etiquette, mention, verifierBoites, n } from './_maths-3e-4e.mjs'

function figure(nb, dossier, fichier, chapitre) {
  const angle = 360 / nb
  const boites = []
  const lab = e => { boites.push(e.boite); return e.svg }

  // --- Frise : 6 drapeaux, vecteur de translation (48 ; 0). ---
  const drapeau = [[0, 44], [0, 2], [27, 15], [11, 22], [11, 44]]
  const x0 = 42, y0 = 30, pas = 48
  const frise = []
  for (let i = 0; i < 6; i++) {
    const m = drapeau.map(p => add(p, [x0 + i * pas, y0]))
    if (i === 0) frise.push(aplat(m))
    frise.push(trait(m, { ferme: true }))
  }
  // Ligne de base de la frise (encre légère) et flèche de translation sous les deux premiers motifs.
  const yb = y0 + 44
  const base = trait([[x0 - 12, yb], [x0 + 5 * pas + 40, yb]], { ep: 1, extra: ' opacity="0.35"' })
  const ya = yb + 12
  const fA = [x0, ya], fB = [x0 + pas, ya]
  const flecheT = trait([fA, sub(fB, [5, 0])], { couleur: C.accent, ep: 2.25 }) + pointe(fA, fB, { couleur: C.accent, long: 8, large: 7 })

  // --- Rosace : centre O, n pétales. ---
  const O = [156, 210]
  const R = 80
  const pol = (r, a) => [O[0] + r * Math.cos(a * Math.PI / 180), O[1] - r * Math.sin(a * Math.PI / 180)]
  const k = angle / 45 // pétale dessiné dans le secteur [-6°, 30°] pour 45°, élargi pour 60°
  const petale = [pol(10, 12 * k), pol(R * 0.5, -6 * k), pol(R, 4 * k), pol(R * 0.66, 30 * k)]
  const rosace = []
  for (let i = 0; i < nb; i++) {
    const m = petale.map(p => rot(p, O, i * angle))
    if (i === 0) rosace.push(aplat(m))
    rosace.push(trait(m, { ferme: true }))
  }
  // Arc de rotation de la pointe du pétale 0 à celle du pétale 1.
  const rA = R + 9
  const a0 = 4 * k + 2, a1 = 4 * k + angle - 2
  const arc = arcPts(O, rA, a0, a1 - 4)
  const fin = pol(rA, a1)
  const avant = arc[arc.length - 1]
  const flecheR = trait(arc, { couleur: C.accent, ep: 2.25 }) + pointe(avant, fin, { couleur: C.accent, long: 8, large: 7 })
  // Rayons pointillés du centre vers les deux pointes (angle de la rotation).
  const rayons = trait([O, pol(R, 4 * k)], { ep: 1, tirets: '3 3', couleur: C.accent }) + trait([O, pol(R, 4 * k + angle)], { ep: 1, tirets: '3 3', couleur: C.accent })

  const am = (a0 + a1) / 2
  const pLab = pol(rA + 12, am)
  const contenu = [
    lab(mention(x0 - 3, 18, 'frise')),
    base, ...frise, flecheT,
    lab(etiquette(fB[0] + 14, ya + 4, 'translation')),
    lab(mention(x0 - 3, 128, 'rosace')),
    ...rosace, rayons, flecheR,
    point(O),
    lab(etiquette(pLab[0] + 2, pLab[1] + 4, `rotation de ${n(angle)}°`)),
  ]
  verifierBoites(boites, fichier)
  const svg = doc(302, `Frise : un drapeau répété six fois par translation (flèche). Rosace de ${nb} motifs identiques autour d'un centre : on passe d'un motif au suivant par une rotation de 360° ÷ ${nb} = ${n(angle)}°. Réviz, ${chapitre}.`, contenu)
  ecrire(dossier, fichier, svg)
}

figure(8, '3eme/maths', 'frise-et-rosace-8-motifs', '3e maths, transformations et homothéties')
figure(6, '4eme/maths', 'frise-et-rosace-6-motifs', '4e maths, translations et rotations')
