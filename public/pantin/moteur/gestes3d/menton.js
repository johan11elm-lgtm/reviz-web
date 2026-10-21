// Réfléchit (pantin 3D) : bras droit de l'image continu « menton » (tube épais + grande main tirée de la pose
// menton-11-d : index replié contre la joue, à côté de la bouche), méthode du coucou. Remplace
// SCENES.reflechit si la main existe, et prend en charge la sortie de l'expression (le bras repasse sur le
// côté avant de redescendre).
(window.RevizAnimExtensions = window.RevizAnimExtensions || []).push((o) => {
  const { e, rig, gsap, clignerTl, visageDe } = o;
  if (!rig.mainsDispo || !rig.mainsDispo('d').includes('menton')) return;

  // ---------- Poses-clés du bras ----------
  // Bras devant le corps : le moteur met alors l'épaule au bord de la silhouette (EPAULE_BORD) et redresse
  // la main dès que le bras s'étire. On ne bascule donc devant / derrière que bras levé sur le côté
  // (|phi1| > 95° : l'épaule y est déjà au bord, et tout le bras est hors du corps).
  // Angles absolus du moteur (0 = bas, + = vers la gauche de l'image) -> réglages du bras droit
  // (reviz-rig3d.js : phi1 = -(epaule - 4,96), phi2 = phi1 - (coude + 6)).
  // Le coude plie toujours du même côté (phi2 - phi1 de +80 à +123°) : pris par le haut (avant-bras levé),
  // il devrait passer par une épingle à cheveux, et les tranches du tube s'y effilochent. Et tant que la
  // main pointe vers le bas, le bras reste court (etire <= 1,08) : au-delà, bras devant, le moteur la
  // retourne vers le haut.
  const angles = (phi1, phi2, k) => ({ brasDepaule: 4.96 - phi1, brasDcoude: phi1 - phi2 - 6, brasDetire: k });
  // Coude sorti sur le côté (bras à l'horizontale), avant-bras qui pend : tout le bras est hors du corps.
  const LEVE = angles(-106, -20, 1);
  // Passage : le coude est revenu sous l'épaule, la main remontée par-devant au bord du lobe, tournée vers
  // le visage. Coude peu plié (100°) tant que le bras est court : plié serré, ses tranches laissent voir
  // des rayures à l'extérieur du coude.
  const PASSAGE = angles(5, 105, 1.08);
  // Pose (menton-11-d) : coude au bas du lobe droit, avant-bras vers la joue, poignet à 0 = main de la
  // pose. Le bras s'étire beaucoup (×5) : la main de la pose est loin de l'épaule du moteur.
  const POSE = angles(7.66, 131.1, 4.96);
  const CLES = ['brasDepaule', 'brasDcoude', 'brasDetire'];
  // Bras étiré : le moteur ne garde que 30 % du pli du poignet ; les angles de poignet sont amplifiés.
  const PG = 1 / 0.3;

  // Courbe douce (Hermite monotone, Fritsch-Carlson) par réglage à travers les poses-clés : pas d'arrêt
  // ni de coin aux poses intermédiaires, pas de dépassement.
  function courbe(us, vs) {
    const n = us.length, d = [], m = new Array(n).fill(0);
    for (let i = 0; i < n - 1; i++) d.push((vs[i + 1] - vs[i]) / (us[i + 1] - us[i]));
    m[0] = d[0]; m[n - 1] = d[n - 2];
    for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
    for (let i = 0; i < n - 1; i++) {
      if (d[i] === 0) { m[i] = m[i + 1] = 0; continue; }
      const a = m[i] / d[i], b = m[i + 1] / d[i], h = a * a + b * b;
      if (h > 9) { const t = 3 / Math.sqrt(h); m[i] = t * a * d[i]; m[i + 1] = t * b * d[i]; }
    }
    return (u) => {
      let i = 0;
      while (i < n - 2 && u > us[i + 1]) i++;
      const h = us[i + 1] - us[i], t = Math.max(0, Math.min(1, (u - us[i]) / h)), t2 = t * t, t3 = t2 * t;
      return (2 * t3 - 3 * t2 + 1) * vs[i] + (t3 - 2 * t2 + t) * h * m[i] + (-2 * t3 + 3 * t2) * vs[i + 1] + (t3 - t2) * h * m[i + 1];
    };
  }
  // Parcours du bras sur la timeline : poses [{…}], paramètre us (0 -> 1), durée, courbe de vitesse.
  // Renvoie l'instant (relatif) où le parcours passe un paramètre u (pour y placer bascules et mains).
  function parcours(tl, poses, us, debut, duree, ease) {
    const f = Object.fromEntries(CLES.map((k) => [k, courbe(us, poses.map((p) => p[k]))]));
    const proxy = { u: 0 }, ez = gsap.parseEase(ease);
    tl.fromTo(proxy, { u: 0 }, { u: 1, duration: duree, ease: 'none', immediateRender: false,
      onUpdate: () => { const u = ez(proxy.u); for (const k of CLES) e[k] = f[k](u); } }, debut);
    // Le moteur ne repart du repos que pour ce que la scène ne touche pas : le dernier point est posé en
    // clair (mêmes valeurs que la fin du parcours, donc aucun saut).
    tl.set(e, Object.assign({}, poses[poses.length - 1]), debut + duree);
    return (u) => { let a = 0, b = 1; for (let i = 0; i < 40; i++) { const c = (a + b) / 2; if (ez(c) < u) a = c; else b = c; } return debut + duree * a; };
  }

  o.SCENES.reflechit = (tl, M) => {
    envelopperSorties();
    const dejaLa = e.brasDmain === 'menton';
    // Visage : comme l'expression d'origine (yeux en l'air, moue de côté, tête qui penche).
    tl.add(clignerTl(), 0.04)
      .to(e, { visageY: 6, regardY: 0.3, duration: 0.1, ease: 'power2.out' }, 0)
      .to(e, Object.assign(visageDe('reflechit'), { visageX: -16, visageY: -14, corpsRot: -5, oeilGechelle: 1.07, oeilDechelle: 0.95,
        boucheX: -10, duration: 0.38, ease: 'power3.out' }), 0.1);
    if (dejaLa) {
      tl.to(e, Object.assign({}, POSE, { brasDpoignet: 0, duration: 0.3, ease: 'power2.inOut' }), 0); // il reprend la pose
    } else {
      // Anticipation : le bras plonge un peu. Puis un seul parcours repos -> levé -> passage -> pose.
      const A = { brasDepaule: 8, brasDcoude: 18, brasDetire: 1 };
      tl.to(e, Object.assign({}, A, { duration: 0.1, ease: 'power2.out' }), 0);
      const a = parcours(tl, [A, LEVE, PASSAGE, POSE], [0, 0.3, 0.62, 1], 0.1, 0.7, 'power1.inOut');
      // La grande main arrive en pleine montée (encore à l'épaisseur du bras de repos) ; le bras passe
      // devant une fois levé (épaule au bord, bras hors du corps).
      tl.set(e, { brasDmain: 'menton' }, a(0.2))
        .to(e, { brasDepais: 1, duration: 0.42, ease: 'power2.inOut' }, a(0.2))
        .set(e, { brasDdevant: 1 }, a(0.3))
        // La main arrive un peu cassée et se pose (petit retard du poignet).
        .fromTo(e, { brasDpoignet: 0 }, { brasDpoignet: 14, duration: 0.2, ease: 'sine.inOut', immediateRender: false }, a(0.5))
        .to(e, { brasDpoignet: 0, duration: 0.26, ease: 'power2.out' }, a(0.5) + 0.2);
    }
    // Maintien : petits tapotements de l'index (poignet), deux coups puis une pause ; le regard cherche.
    const tap = gsap.timeline({ repeat: -1, repeatDelay: 0.55 });
    for (let i = 0; i < 2; i++) {
      tap.to(e, { brasDpoignet: 7 * PG, duration: 0.08, ease: 'sine.out' }, i * 0.2)
        .to(e, { brasDpoignet: 0, duration: 0.12, ease: 'sine.in' }, i * 0.2 + 0.08);
    }
    M.add(tap, 0.15)
      .to(e, { regardX: -0.3, boucheX: -15, duration: 0.95, ease: 'sine.inOut', yoyo: true, repeat: -1 }, 0.3);
  };

  // ---------- Sortie : toute expression jouée bras « menton » ----------
  // Le bras de l'expression suivante est mis de côté (ses réglages brasD… retirés de ses tweens) ; le bras
  // refait le chemin à l'envers jusqu'au côté, repasse derrière, puis rejoint ce que l'expression voulait.
  // Le reste de l'expression (visage, corps, bras gauche) joue tout de suite, sans attendre.
  // Enveloppé au premier « réfléchit » : toutes les extensions sont chargées (d'autres gestes peuvent
  // remplacer leur scène après ce fichier).
  const ENV = '__sortieMenton';
  function envelopperSorties() {
    for (const nom of Object.keys(o.SCENES)) {
      const f = o.SCENES[nom];
      if (nom === 'reflechit' || f[ENV]) continue;
      const g = (tl, M) => {
        if (e.brasDmain !== 'menton') return f(tl, M);
        const sous = gsap.timeline();
        f(sous, M);
        const voulu = {};
        let mainVoulue = null;
        const enfants = sous.getChildren(true, true, false).sort((a, b) => a.startTime() - b.startTime());
        for (const c of enfants) {
          for (const k of Object.keys(c.vars)) {
            if (!/^brasD/.test(k)) continue;
            if (k === 'brasDmain') mainVoulue = c.vars[k]; else voulu[k] = c.vars[k];
            delete c.vars[k]; // pas encore rendu : le tween ne touchera plus le bras droit
          }
        }
        tl.add(sous, 0);
        sortie(tl, voulu, mainVoulue);
      };
      g[ENV] = true;
      o.SCENES[nom] = g;
    }
  }
  function sortie(tl, voulu, mainVoulue) {
    const repos = rig.reposVue('face');
    const fin = { brasDepaule: voulu.brasDepaule ?? repos.brasDepaule, brasDcoude: voulu.brasDcoude ?? repos.brasDcoude,
      brasDetire: voulu.brasDetire ?? repos.brasDetire };
    const ici = Object.fromEntries(CLES.map((k) => [k, e[k]]));
    const devantApres = (voulu.brasDdevant ?? 0) > 0.5;
    // Le chemin d'entrée à l'envers (la main se décolle de la joue, le coude remonte sur le côté), puis le
    // bras de l'expression suivante.
    const a = parcours(tl, [ici, PASSAGE, LEVE, fin], [0, 0.38, 0.7, 1], 0, 0.72, 'power1.inOut');
    tl.to(e, { brasDpoignet: 6 * PG, duration: 0.14, ease: 'power2.out' }, 0)
      .to(e, { brasDpoignet: voulu.brasDpoignet ?? 0, duration: 0.36, ease: 'power2.inOut' }, 0.14)
      .to(e, { brasDepais: 0, duration: a(0.62) - 0.04, ease: 'power2.inOut' }, 0.04);
    // Derrière une fois sur le côté ; la main d'origine revient en plein mouvement, bras déjà derrière et
    // revenu à l'épaisseur de repos (main de repos + devant = main « plate »).
    if (!devantApres) tl.set(e, { brasDdevant: 0 }, a(0.7));
    tl.set(e, { brasDmain: mainVoulue || 'relachee' }, a(0.8));
    if (devantApres) tl.set(e, { brasDdevant: 1 }, a(0.8));
  }
});
