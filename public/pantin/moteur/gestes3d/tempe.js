/* Geste « se gratter la tête » en bras continu (méthode des grandes mains, argile3d/METHODE-GRANDES-MAINS.md).
 *
 * Pièces : bras/grandes/tempe-d-{tube,main}.png (argile3d/tempe_main.py puis bras_pose.py tempe-08-d tempe d).
 * Le bras monte par l'extérieur (coude dehors, comme la variante générée), passe devant le corps quand il
 * est levé, et la main se pose exactement où elle est sur la variante : doigts recourbés sur le haut du
 * lobe droit de l'image. Le grattage fait plier le poignet vers la tête (jamais en l'air).
 */
(window.RevizAnimExtensions = window.RevizAnimExtensions || []).push((o) => {
  if (!o.rig.mainsDispo || !o.rig.mainsDispo('d').includes('tempe')) return;
  const { e, rig, son, clignerTl, cibleExpression, gsap } = o;
  // Poignet de la pose (la coupe de la main, px HD) : bras_pose.py « poignet [208 201] » + origine de
  // poses/tempe-08-d.json (1961, 600).
  const POIGNET_HD = [2169, 801];
  const P = 'brasD';

  // Px HD (calques) -> coordonnées du moteur : la similitude du groupe des calques.
  const versMoteur = (p) => {
    const m = rig.racine.querySelector('.corps2d > g').transform.baseVal.consolidate().matrix;
    return [m.a * p[0] + m.e, m.d * p[1] + m.f];
  };
  // Mesure sur le rendu (px HD) : poignet et rotation de la grande main pour un état donné.
  const mesurer = (etat) => {
    const avant = Object.assign({}, e);
    Object.assign(e, { ressortBras: 0, [P + 'devant']: 1, [P + 'main']: 'tempe', [P + 'epais']: 1, [P + 'poignet']: 0 }, etat);
    rig.rendre();
    const tr = rig.brasEl.d.main.getAttribute('transform');
    Object.assign(e, avant); rig.rendre();
    const n = (tr.match(/-?[\d.]+/g) || []).map(Number);
    return { W: [n[0], n[1]], rot: n[2] };
  };

  // Pose finale. rig.atteindre plafonne l'étirement à 1,6 (la main s'arrête alors en chemin) ; ses angles
  // restent justes pour un bras plus long (même triangle à l'échelle) : on mesure le poignet pour deux
  // étirements (W = S + k·v) et on prend celui qui pose le poignet de la variante sur sa place.
  function poseFinale() {
    const pose = rig.atteindre('d', versMoteur(POIGNET_HD), 1, 'face', true);
    let ep = pose[P + 'epaule'];
    while (ep < 14) ep += 360; // le bras monte par l'extérieur, pas à travers le corps
    const co = pose[P + 'coude'];
    const a = mesurer({ [P + 'epaule']: ep, [P + 'coude']: co, [P + 'etire']: 1 }).W;
    const b = mesurer({ [P + 'epaule']: ep, [P + 'coude']: co, [P + 'etire']: 2 }).W;
    const v = [b[0] - a[0], b[1] - a[1]], S = [a[0] - v[0], a[1] - v[1]];
    const k = ((POIGNET_HD[0] - S[0]) * v[0] + (POIGNET_HD[1] - S[1]) * v[1]) / (v[0] * v[0] + v[1] * v[1]);
    // Poignet qui rend la main de la pose droite (rotation nulle) : la rotation est affine en poignet.
    const fin = { [P + 'epaule']: ep, [P + 'coude']: co, [P + 'etire']: k };
    const r0 = mesurer(fin).rot, r1 = mesurer(Object.assign({ [P + 'poignet']: 10 }, fin)).rot;
    const pente = (r1 - r0) / 10;
    return { ep, co, k, poignet: -r0 / pente, pente };
  }

  // Instant (fraction de la durée) où une courbe d'accélération atteint la fraction p du trajet.
  const instant = (ease, p) => { const f = gsap.parseEase(ease); let a = 0, b = 1;
    for (let i = 0; i < 30; i++) { const m = (a + b) / 2; if (f(m) < p) a = m; else b = m; } return (a + b) / 2; };

  o.GESTES.gratterTete = (tl, { cote = 'd' } = {}) => {
    if (cote !== 'd') return;
    const F = poseFinale();
    son('tic', 0.1); son('gratte', 0.6);
    // Anticipation : le corps se tasse, le bras plonge un peu ; la grande main arrive à la fin (le bras va
    // vite), à l'épaisseur du bras de repos.
    const E0 = 8;
    tl.add(clignerTl(), 0)
      .to(e, { corpsRot: 2, ecrase: 0.05, [P + 'epaule']: E0, [P + 'coude']: 18, duration: 0.14, ease: 'power2.out' }, 0)
      .set(e, { [P + 'main']: 'tempe' }, 0.13);
    // Montée par l'extérieur, sans dépasser (la main ne doit pas passer dans la tête) ; la main traîne
    // (poignet ouvert vers l'extérieur) puis se pose. Le bras passe devant le corps quand il est déjà
    // levé (épaule au bord de la silhouette) : aucun saut d'épaule.
    // (Bras très long : en 0,38 s power3.out le poignet filait à 120 px écran par image ; ici ≈ le pic du coucou.)
    const MONTE = 0.56, EASE = 'power2.inOut';
    tl.to(e, { [P + 'epaule']: F.ep, [P + 'coude']: F.co, [P + 'etire']: F.k, duration: MONTE, ease: EASE }, 0.14)
      .fromTo(e, { [P + 'poignet']: F.poignet - 30 }, { [P + 'poignet']: F.poignet, duration: 0.56, ease: 'power2.inOut', immediateRender: false }, 0.14)
      .to(e, { [P + 'epais']: 1, duration: 0.36, ease: 'power2.inOut' }, 0.14);
    tl.set(e, { [P + 'devant']: 1 }, 0.14 + MONTE * instant(EASE, (100 - E0) / (F.ep - E0)));
    tl.to(e, Object.assign(cibleExpression('reflechit'), { oeilGechelle: 1.07, oeilDechelle: 0.95, visageX: -10, visageY: -6,
      duration: 0.3, ease: 'power3.out' }), 0.14);
    // Grattage : le poignet plie vers la tête et revient au contact (les doigts appuient, ne décollent pas),
    // le coude frotte un peu en quadrature.
    let t = 0.72;
    if (!o.calme) {
      tl.to(e, { [P + 'poignet']: F.poignet + 5 / Math.abs(F.pente), duration: 0.1, yoyo: true, repeat: 9, ease: 'sine.inOut' }, t)
        .to(e, { [P + 'coude']: F.co + 2, duration: 0.1, yoyo: true, repeat: 9, ease: 'sine.inOut' }, t + 0.05);
      t += 1.05;
    }
    t += 0.08;
    // Retour : un seul tween par réglage. Le bras repasse derrière quand il est encore levé, puis la main
    // de repos revient au milieu de la descente (bras le plus rapide), une fois le bras derrière.
    const DESC = 0.56;
    tl.add(clignerTl(), t)
      .to(e, Object.assign(cibleExpression('neutre'), { visageX: 0, visageY: 0, oeilGechelle: 1, oeilDechelle: 1, duration: 0.3, ease: 'back.out(1.4)' }), t)
      .to(e, { [P + 'epaule']: 14, [P + 'coude']: -6, [P + 'etire']: 1, duration: DESC, ease: 'power2.inOut' }, t)
      .to(e, { [P + 'poignet']: 0, duration: 0.44, ease: 'power2.inOut' }, t + 0.02)
      .to(e, { [P + 'epais']: 0, duration: 0.3, ease: 'power2.in' }, t);
    const tDerriere = t + DESC * instant('power2.inOut', (F.ep - 100) / (F.ep - 14));
    tl.set(e, { [P + 'devant']: 0 }, tDerriere)
      .set(e, { [P + 'main']: 'relachee' }, Math.max(t + 0.3, tDerriere + 0.02));
  };
});
