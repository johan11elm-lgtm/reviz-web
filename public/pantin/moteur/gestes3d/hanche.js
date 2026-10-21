/* Expression « fier » en bras continus : les deux poings sur les hanches, coudes dehors (méthode des grandes
 * mains, argile3d/METHODE-GRANDES-MAINS.md).
 *
 * Pièces : bras/grandes/hanche-{g,d}-{tube,main}.png. Poses générées hanche-13-d / hanche-13-g, main posée
 * sur le lobe extraite par argile3d/hanche_main.py (contour tracé au zoom), pièces par hanche_pose.py (copie
 * de bras_pose.py, axe = squelette), angles par hanche_angles.py (EPINGLE=1).
 *
 * Deux choses que le moteur ne sait pas faire, faites ici autour de rig.rendre (à intégrer au moteur) :
 *  - la main posée sur le corps passe DEVANT lui, le tube reste derrière (brasXdevant passe tout le bras
 *    devant : racine visible sur le corps, et il force les doigts vers le haut) ;
 *  - l'épaule de la pose est bien plus haut que celle du moteur : le bras entier glisse de DEC (px HD)
 *    à mesure que brasXhanche passe de 0 à 1.
 */
(window.RevizAnimExtensions = window.RevizAnimExtensions || []).push((o) => {
  const { e, rig, calme, clignerTl, visageDe, SCENES, GESTES } = o;
  if (!rig.mainsDispo || !['g', 'd'].every((c) => rig.mainsDispo(c).includes('hanche'))) return;
  // Bras sur la hanche (hanche_angles.py) : le tube reposé sur l'axe de la pose, la main à sa place.
  const POSE = {
    g: { epaule: 31.4, coude: -98.7, etire: 1.183, poignet: 0.6, dec: [-65.7, -162.9] },
    d: { epaule: 63.6, coude: -108.9, etire: 1.391, poignet: 0.7, dec: [40.5, -175.1] },
  };
  const COTES = ['g', 'd'], Pde = (c) => 'bras' + c.toUpperCase();
  for (const c of COTES) if (e[Pde(c) + 'hanche'] === undefined) e[Pde(c) + 'hanche'] = 0;

  // ---------- Calque des mains posées (devant le corps, sans le liseré du calque « bras-devant ») ----------
  const NS = 'http://www.w3.org/2000/svg';
  const devant = rig.racine.querySelector('.bras-devant');
  const calque = document.createElementNS(NS, 'g');
  calque.setAttribute('class', 'mains-hanche');
  devant.parentNode.insertBefore(calque, devant.nextSibling);
  const porte = Object.fromEntries(COTES.map((c) => { const g = document.createElementNS(NS, 'g'); calque.appendChild(g); return [c, g]; }));
  // Coude très plié : l'extérieur du pli laisse de fines fentes entre les tranches du tube. Un flou dont
  // l'alpha est seuillé à 0,5 les bouche avec la couleur voisine, sans halo hors du bras.
  const idF = rig.id + '-joints-hanche';
  rig.racine.querySelector('defs').insertAdjacentHTML('beforeend', `<filter id="${idF}" x="-10%" y="-10%" width="120%" height="120%" color-interpolation-filters="sRGB">
    <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="b"/>
    <feComponentTransfer in="b" result="c"><feFuncA type="linear" slope="3" intercept="-1.6"/></feComponentTransfer>
    <feMerge><feMergeNode in="c"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`);
  for (const c of COTES) rig.brasEl[c].gm.hanche.g.setAttribute('filter', `url(#${idF})`);
  const rendre0 = rig.rendre;
  rig.rendre = function () {
    rendre0.apply(this, arguments);
    for (const c of COTES) {
      const b = rig.brasEl[c], P = Pde(c), k = Math.max(0, Math.min(1, e[P + 'hanche'] || 0));
      const tr = k > 0 ? `translate(${(POSE[c].dec[0] * k).toFixed(1)} ${(POSE[c].dec[1] * k).toFixed(1)})` : '';
      if (tr) b.g.setAttribute('transform', tr); else b.g.removeAttribute('transform');
      const posee = e[P + 'main'] === 'hanche' && !(e[P + 'devant'] > 0.5);
      if (posee) {
        porte[c].setAttribute('transform', tr);
        if (b.main.parentNode !== porte[c]) porte[c].appendChild(b.main);
      } else if (b.main.parentNode !== b.g) b.g.insertBefore(b.main, b.tube);
    }
  };

  // ---------- Fier : poings sur les hanches ----------
  SCENES.fier = (tl, M) => {
    // Anticipation : il se tasse, les bras s'écartent un peu ; les poings arrivent dès l'anticipation, à
    // l'épaisseur du bras de repos (pas de saut), puis le tube grossit en montant.
    tl.to(e, { ecrase: 0.06, duration: 0.1, ease: 'power2.out' }, 0);
    for (const c of COTES) {
      const P = Pde(c), B = POSE[c], d = c === 'd' ? 0.03 : 0; // jamais deux bras parfaitement synchrones
      tl.to(e, { [P + 'epaule']: 26, [P + 'coude']: -14, duration: 0.1, ease: 'power2.out' }, 0)
        .set(e, { [P + 'main']: 'hanche', [P + 'devant']: 0 }, 0.08)
        .to(e, { [P + 'epaule']: B.epaule, [P + 'coude']: B.coude, [P + 'etire']: B.etire, duration: 0.3, ease: 'back.out(1.2)' }, 0.1 + d)
        .fromTo(e, { [P + 'poignet']: B.poignet - 22 }, { [P + 'poignet']: B.poignet, duration: 0.36, ease: 'power2.out' }, 0.1 + d)
        .to(e, { [P + 'epais']: 1, [P + 'hanche']: 1, duration: 0.3, ease: 'power2.out' }, 0.1 + d);
    }
    tl.to(e, Object.assign(visageDe('fier'), { ecrase: -0.07, corpsRot: -4, visageY: -12, visageX: 8, oeilDechelle: 0.95,
      duration: 0.32, ease: 'back.out(1.6)' }), 0.1)
      .to(e, { sourcilDy: -20, duration: 0.12, ease: 'power2.out', yoyo: true, repeat: 3 }, 0.5);
    M.to(e, { visageY: -6, duration: 0.5, ease: 'sine.inOut', yoyo: true, repeat: -1 }, 0);
  };

  // ---------- Sortie : toute autre expression ou geste qui suit ----------
  // Les poings quittent les hanches en continu : l'épaule redescend (brasXhanche -> 0), le tube s'amincit,
  // et la main suivante arrive au milieu du retour, quand le bras va le plus vite. Un seul tween par réglage :
  //  - expression suivante (prendre) : ses tweens de ces bras (back.out de 0,34 s : presque tout le trajet
  //    en deux images) sont retirés et remplacés par un retour plus doux vers les mêmes valeurs ;
  //  - geste suivant : on ne règle que ce que le geste ne règle pas lui-même.
  const RETOUR = 0.45, MI = 0.2;
  function sortie(tl, prendre) {
    const quitte = COTES.filter((c) => e[Pde(c) + 'main'] === 'hanche' || e[Pde(c) + 'hanche'] > 0);
    if (!quitte.length) return;
    const cles = (c) => ['epaule', 'coude', 'etire', 'poignet', 'main', 'epais', 'devant'].map((k) => Pde(c) + k);
    const cible = {}, retires = new Set();
    if (prendre) {
      const tout = quitte.flatMap(cles), enfants = tl.getChildren(true, true, false).filter((t) => t.targets && t.targets().includes(e));
      for (const t of enfants.sort((a, b) => a.startTime() - b.startTime())) for (const k of tout) if (k in t.vars && !(k in cible)) cible[k] = t.vars[k];
      for (const t of enfants) t.kill(e, tout.join(','));
      tout.forEach((k) => retires.add(k));
    }
    const touche = new Set();
    for (const t of tl.getChildren(true, true, false)) for (const k in t.vars) if (!retires.has(k)) touche.add(k);
    const repos = rig.reposVue('face');
    for (const c of quitte) {
      const P = Pde(c), d = c === 'd' ? 0.03 : 0;
      tl.to(e, { [P + 'hanche']: 0, duration: calme ? 0.1 : RETOUR, ease: 'power2.inOut' }, d);
      if (!touche.has(P + 'epais')) tl.to(e, { [P + 'epais']: 0, duration: calme ? 0.1 : MI, ease: 'power2.in' }, d);
      const bras = {};
      const vers = (k, v) => { if (!touche.has(P + k)) bras[P + k] = P + k in cible ? cible[P + k] : v; };
      for (const k of ['epaule', 'coude', 'etire']) vers(k, repos[P + k]);
      vers('poignet', 0); vers('devant', 0);
      if (Object.keys(bras).length) tl.to(e, Object.assign(bras, { duration: calme ? 0.1 : RETOUR, ease: 'power2.inOut' }), d);
      if (!touche.has(P + 'main')) tl.set(e, { [P + 'main']: cible[P + 'main'] || 'relachee' }, calme ? 0 : d + MI);
    }
  }
  for (const nom of Object.keys(SCENES)) {
    if (nom === 'fier') continue;
    const f = SCENES[nom];
    SCENES[nom] = (tl, M) => { const avant = COTES.some((c) => e[Pde(c) + 'main'] === 'hanche'); f(tl, M); if (avant) sortie(tl, true); };
  }
  for (const nom of Object.keys(GESTES)) {
    const f = GESTES[nom];
    GESTES[nom] = (tl, opts) => { const avant = COTES.some((c) => e[Pde(c) + 'main'] === 'hanche'); f(tl, opts); if (avant) sortie(tl, false); };
  }
});
