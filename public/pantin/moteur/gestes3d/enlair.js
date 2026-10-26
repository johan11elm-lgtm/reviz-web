// Bras en l'air (pantin 3D) : les deux bras continus « enlair » (tube épais + grande main tirée des poses
// en-lair-06-g / en-lair-06-d), méthode du coucou. Remplace GESTES.brasEnLair si les deux mains existent.
(window.RevizAnimExtensions = window.RevizAnimExtensions || []).push((o) => {
  const { e, rig, calme, son, clignerTl, cibleExpression, revenirRepos } = o;
  if (!rig.mainsDispo || !['g', 'd'].every((c) => rig.mainsDispo(c).includes('enlair'))) return;
  // Bras levé : l'avant-bras arrive dans l'axe de l'avant-bras de chaque pose (poignet à 0 = main de la
  // pose) ; les coudes diffèrent car les deux poses générées ne sont pas symétriques.
  // Le bras s'étire (etire 1,35) : l'épaule du moteur est bien plus bas que la racine du bras des poses,
  // sinon les mains restent à hauteur des yeux.
  const HAUT = { g: { epaule: 145, coude: 24 }, d: { epaule: 145, coude: 16 } }, ETIRE = 1.35;
  // Bras étiré : le moteur divise le pli du poignet par ~2 (plieP) ; les angles de poignet sont doublés.
  const PG = 2;
  const DECALE = { g: 0, d: 0.04 }; // le bras droit suit d'un rien : jamais deux bras parfaitement synchrones

  o.GESTES.brasEnLair = (tl) => {
    son('pop', 0.12); son('whoosh', 0.12, 0.6); son('pas', 0.54, 1.2);
    // Anticipation : il se tasse, les bras plongent un peu vers l'arrière ; les grandes mains arrivent
    // à la fin (encore à l'épaisseur du bras de repos : pas de saut).
    tl.add(clignerTl(), 0)
      .to(e, { ecrase: 0.12, flechir: 0.5, duration: 0.12, ease: 'power2.inOut' }, 0);
    for (const c of ['g', 'd']) {
      const P = 'bras' + c.toUpperCase(), d = DECALE[c];
      tl.to(e, { [P + 'epaule']: 28, [P + 'coude']: 24, duration: 0.12 + d, ease: 'power2.inOut' }, 0)
        .set(e, { [P + 'main']: 'enlair' }, 0.11 + d)
        // Montée : les bras dépassent un peu leur cible ; les mains traînent derrière (poignet cassé)
        // puis se redressent ; le tube s'épaissit jusqu'à celui de la pose.
        .to(e, { [P + 'epaule']: HAUT[c].epaule, [P + 'coude']: HAUT[c].coude, [P + 'etire']: ETIRE, duration: 0.34, ease: 'back.out(1.6)' }, 0.12 + d)
        .fromTo(e, { [P + 'poignet']: 20 * PG }, { [P + 'poignet']: 0, duration: 0.42, ease: 'power2.out' }, 0.12 + d)
        .to(e, { [P + 'epais']: 1, duration: 0.24, ease: 'power2.out' }, 0.12 + d);
    }
    // Petit saut : décollage pendant la montée, réception amortie.
    tl.to(e, Object.assign(cibleExpression('content'), { ecrase: -0.1, hauteur: 30, flechir: 0, visageY: -10, yeuxEchelle: 1.08,
      duration: 0.24, ease: 'power3.out' }), 0.12)
      .to(e, { hauteur: 0, ecrase: 0.08, visageY: -2, duration: 0.18, ease: 'power2.in' }, 0.36)
      .to(e, { ecrase: 0, visageY: -8, duration: 0.3, ease: 'power3.out' }, 0.54);
    let t = calme ? 0.84 : 0.58; // en calme, pas de battements : on attend la fin de la réception
    if (!calme) {
      // Petits battements de joie : l'avant-bras mène, la main suit avec un quart de temps de retard ;
      // l'amplitude baisse à chaque battement ; bras opposés en contretemps léger.
      const T = 0.16;
      [1, 0.8, 0.6].forEach((amp) => {
        for (const c of ['g', 'd']) {
          const P = 'bras' + c.toUpperCase(), d = DECALE[c], k = HAUT[c].coude;
          tl.to(e, { [P + 'coude']: k + 14 * amp, duration: T, ease: 'sine.inOut' }, t + d)
            .to(e, { [P + 'coude']: k - 6 * amp, duration: T, ease: 'sine.inOut' }, t + d + T)
            .to(e, { [P + 'poignet']: -13 * PG * amp, duration: T, ease: 'sine.inOut' }, t + d + T * 0.45)
            .to(e, { [P + 'poignet']: 10 * PG * amp, duration: T, ease: 'sine.inOut' }, t + d + T * 1.45);
        }
        t += 2 * T;
      });
    }
    // Retour : les bras retombent en s'amincissant ; la main de repos revient au milieu de la descente,
    // quand le bras va le plus vite. Un seul tween par articulation : revenirRepos ramène épaule, coude
    // et étirement ; le poignet du dernier battement déborde, il repart donc un peu plus tard.
    for (const c of ['g', 'd']) {
      const P = 'bras' + c.toUpperCase(), d = DECALE[c];
      tl.to(e, { [P + 'poignet']: 0, duration: 0.34, ease: 'power2.inOut' }, calme ? t : t + d + 0.11)
        .to(e, { [P + 'epais']: 0, duration: 0.24, ease: 'power2.in' }, t)
        .set(e, { [P + 'main']: 'relachee' }, t + 0.24);
    }
    revenirRepos(tl, t + DECALE.d, 0.46, 'power2.inOut');
    tl.to(e, { visageY: 0, yeuxEchelle: 1, duration: 0.4, ease: 'power2.out' }, t);
  };
});
