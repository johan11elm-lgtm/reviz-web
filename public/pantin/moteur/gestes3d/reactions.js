// Réactions du pantin 3D (comme la marionnette des reels) : yeux spéciaux, effets flottants, larmes.
// Chaque réaction est une expression (anim.expression('emerveille')…) : une entrée qui pop, puis un
// maintien en boucle (M) ; le retour au repos remet effets, yeux et larmes à 0 (reposReactions).
(window.RevizAnimExtensions = window.RevizAnimExtensions || []).push((o) => {
  const { e, son, clignerTl, visageDe, brasAngles, mains } = o;
  if (!('effetAmpoule' in e) && !('yeuxEtoiles' in e)) return; // pantin sans réactions (2D)
  // Apparition : le réglage passe de 0 à 1 avec un dépassement (pop), après un petit délai.
  const pop = (tl, cle, at, duree = 0.32) => tl.fromTo(e, { [cle]: 0 }, { [cle]: 1, duration: duree, ease: 'back.out(2.6)' }, at);
  const flotte = (M, periode = 0.9) => M.fromTo(e, { effetBalance: -1 }, { effetBalance: 1, duration: periode, ease: 'sine.inOut', yoyo: true, repeat: -1, immediateRender: false }, 0);
  const S = o.SCENES;

  // Émerveillé : les iris deviennent des étoiles, grand sourire, petit bond, bras ouverts.
  S.emerveille = (tl, M) => {
    son('pop', 0.08); son('ding', 0.12);
    tl.to(e, { ecrase: 0.08, duration: 0.08, ease: 'power2.out' }, 0)
      .to(e, Object.assign(visageDe('content'), brasAngles([60, 20], [60, 20]), { hauteur: 26, ecrase: -0.08, yeuxEchelle: 1.12, sourcilGy: -18, sourcilDy: -18,
        duration: 0.22, ease: 'back.out(2)' }), 0.08)
      .to(e, { hauteur: 0, ecrase: 0, duration: 0.2, ease: 'power2.in' }, 0.3);
    mains(tl, 'ouverte', 0.1);
    pop(tl, 'yeuxEtoiles', 0.1, 0.36);
    M.to(e, { yeuxEtoiles: 1.12, duration: 0.35, ease: 'sine.inOut', yoyo: true, repeat: -1 }, 0)
      .to(e, { corpsRot: 2, duration: 0.7, ease: 'sine.inOut', yoyo: true, repeat: -1 }, 0);
  };

  // Amoureux : iris en cœurs qui battent, cœurs qui flottent au-dessus, il se dandine.
  S.amoureux = (tl, M) => {
    son('pop', 0.1);
    tl.to(e, Object.assign(visageDe('content'), brasAngles([10, 70], [10, 70]), { visageY: -6, sourcilGy: -14, sourcilDy: -14, corpsRot: -3, duration: 0.3, ease: 'back.out(1.6)' }), 0);
    pop(tl, 'yeuxCoeurs', 0.06, 0.34);
    pop(tl, 'effetCoeurs', 0.2, 0.4);
    M.to(e, { yeuxCoeurs: 1.15, duration: 0.18, ease: 'power2.out', yoyo: true, repeat: -1, repeatDelay: 0.42 }, 0)
      .to(e, { corpsRot: 3, duration: 0.6, ease: 'sine.inOut', yoyo: true, repeat: -1 }, 0);
    flotte(M, 0.8);
  };

  // Étourdi : spirales dans les yeux, couronne d'étoiles qui tourne, il tangue.
  S.etourdi = (tl, M) => {
    son('boing', 0.02); son('etoiles', 0.2);
    tl.to(e, Object.assign(visageDe('decu'), brasAngles([24, -10], [24, -10]), { ecrase: 0.06, visageY: 6, duration: 0.25, ease: 'power2.out' }), 0);
    pop(tl, 'yeuxSpirale', 0.04, 0.3);
    pop(tl, 'effetEtoiles', 0.12, 0.4);
    M.to(e, { effetTour: 360, duration: 1.4, ease: 'none', repeat: -1 }, 0)
      .fromTo(e, { corpsRot: -5 }, { corpsRot: 5, duration: 0.7, ease: 'sine.inOut', yoyo: true, repeat: -1, immediateRender: false }, 0)
      .to(e, { visageX: 8, duration: 0.7, ease: 'sine.inOut', yoyo: true, repeat: -1 }, 0.2);
  };

  // Idée : l'ampoule s'allume au-dessus de la tête, sourcils qui sautent, index levé.
  S.idee = (tl, M) => {
    son('ding', 0.12);
    tl.to(e, { ecrase: 0.06, visageY: 4, duration: 0.08, ease: 'power2.out' }, 0)
      .to(e, Object.assign(visageDe('content'), brasAngles(null, [150, 30]), { sourcilGy: -26, sourcilDy: -26, yeuxEchelle: 1.14, hauteur: 18, ecrase: -0.06, visageY: -10,
        duration: 0.16, ease: 'back.out(3)' }), 0.08)
      .to(e, { hauteur: 0, ecrase: 0, duration: 0.18, ease: 'power2.in' }, 0.24);
    tl.set(e, { brasDmain: 'pointe' }, 0.1);
    pop(tl, 'effetAmpoule', 0.12, 0.38);
    flotte(M, 1);
  };

  // Panique : goutte de sueur, toutes petites pupilles, il tremble.
  S.panique = (tl, M) => {
    son('tic', 0.05);
    tl.to(e, Object.assign(visageDe('inquiet'), brasAngles([40, 60], [40, 60]), { iris: 0.55, yeuxEchelle: 1.12, ecrase: -0.04, sourcilGy: -20, sourcilDy: -20,
      duration: 0.12, ease: 'back.out(2)' }), 0);
    mains(tl, 'ouverte', 0.06);
    pop(tl, 'effetSueur', 0.1, 0.3);
    M.to(e, { corpsX: 3, duration: 0.04, ease: 'none', yoyo: true, repeat: -1 }, 0)
      .fromTo(e, { effetBalance: 0 }, { effetBalance: -1.6, duration: 0.9, ease: 'power1.in', repeat: -1, immediateRender: false }, 0);
  };

  // Question : point d'interrogation, tête penchée, il se gratte… la tempe du regard.
  S.question = (tl, M) => {
    son('tic', 0.1);
    tl.to(e, Object.assign(visageDe('reflechit'), { corpsRot: 7, visageX: 10, duration: 0.3, ease: 'back.out(1.6)' }), 0);
    pop(tl, 'effetInterrogation', 0.1, 0.36);
    flotte(M, 1.1);
    M.to(e, { corpsRot: 5, duration: 1.1, ease: 'sine.inOut', yoyo: true, repeat: -1 }, 0);
  };

  // Surpris : point d'exclamation, sursaut, yeux ronds.
  S.surpris = (tl, M) => {
    son('boing', 0.05);
    tl.to(e, { ecrase: 0.08, duration: 0.06, ease: 'power2.out' }, 0)
      .to(e, Object.assign(visageDe('choque'), brasAngles([110, -20], [110, -20]), { hauteur: 30, ecrase: -0.1, yeuxEchelle: 1.2, duration: 0.1, ease: 'power2.out' }), 0.06)
      .to(e, { hauteur: 0, ecrase: 0, yeuxEchelle: 1.14, duration: 0.2, ease: 'power3.out' }, 0.2);
    mains(tl, 'ouverte', 0.06);
    pop(tl, 'effetExclamation', 0.06, 0.28);
    flotte(M, 0.7);
  };

  // Pleure : les larmes coulent, il sanglote.
  S.pleure = (tl, M) => {
    son('glisse', 0.2);
    tl.add(clignerTl(1, 1.4), 0)
      .to(e, Object.assign(visageDe('decu'), brasAngles([6, 10], [6, 10]), { ecrase: 0.08, visageY: 12, regardY: 0.4, duration: 0.45, ease: 'power2.inOut' }), 0)
      .fromTo(e, { larmes: 0 }, { larmes: 1, duration: 0.7, ease: 'power2.out' }, 0.25);
    M.to(e, { ecrase: 0.12, visageY: 16, duration: 0.18, ease: 'sine.inOut', yoyo: true, repeat: -1, repeatDelay: 0.35 }, 0);
  };

  // Déterminé (« allez, on y va ! ») : l'original 2D (paupières à 30 %, mains relâchées) donne en 3D un
  // air blasé qui hausse les épaules. Ici : yeux grands ouverts, sourcils froncés mais remontés, sourire
  // en coin (bouche « fier »), poings serrés coudes pliés ; un coup de poing, puis un rebond discret.
  S.determine = (tl, M) => {
    son('pop', 0.2);
    tl.to(e, { ecrase: -0.04, visageY: -6, duration: 0.16, ease: 'sine.out' }, 0)
      .to(e, Object.assign(visageDe('fier'), brasAngles([28, 96], [52, 112]), {
        paupG: 0, paupD: 0, paupBasG: 0, paupBasD: 0, regardX: 0, regardY: 0, corpsRot: 0,
        sourcilGrot: 14, sourcilDrot: 14, sourcilGy: 0, sourcilDy: 0, ecrase: 0.05, visageY: 4, duration: 0.18, ease: 'power4.out' }), 0.16)
      .to(e, { brasDcoude: 124, hauteur: 6, duration: 0.12, ease: 'power2.out', yoyo: true, repeat: 1 }, 0.4);
    mains(tl, 'poing', 0.16);
    M.to(e, { hauteur: 3, ecrase: 0.015, duration: 0.45, ease: 'sine.inOut', yoyo: true, repeat: -1, repeatDelay: 0.25 }, 0);
  };

  // Énervé : éclair à côté de la tête, sourcils froncés, il tremble de rage.
  S.enerve = (tl, M) => {
    son('boing', 0.05, 0.6);
    // Sourcils froncés (rotation positive = bouts intérieurs vers le bas), yeux grands ouverts, moue.
    tl.to(e, Object.assign(visageDe('reflechit'), brasAngles([20, 80], [20, 80]), { regardX: 0, regardY: 0, paupG: 0, paupD: 0,
      sourcilGrot: 22, sourcilDrot: 22, sourcilGy: 14, sourcilDy: 14, iris: 0.9, ecrase: 0.08, corpsRot: 0, duration: 0.16, ease: 'power3.out' }), 0);
    mains(tl, 'poing', 0.06);
    pop(tl, 'effetEclair', 0.1, 0.26);
    M.to(e, { corpsX: 2.5, duration: 0.05, ease: 'none', yoyo: true, repeat: -1 }, 0)
      .to(e, { effetEclair: 1.15, duration: 0.12, ease: 'power2.out', yoyo: true, repeat: -1, repeatDelay: 0.5 }, 0);
  };
});
