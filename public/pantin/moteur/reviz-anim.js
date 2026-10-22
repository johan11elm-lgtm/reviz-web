/* Réviz D1 : les animations du pantin (GSAP).
 *
 * Tout passe par l'état du pantin (rig.etat) : expressions, gestes, marche et
 * parole sont des timelines GSAP qui animent des nombres. Deux façons de jouer :
 *
 *  - en direct (app, page de démo) : chaque action se joue tout de suite,
 *    gsap.ticker redessine le pantin ;
 *  - en vidéo (HyperFrames, capture image par image) : options.video = true.
 *    Les actions s'ajoutent à une timeline maîtresse en pause, qu'on positionne
 *    avec anim.temps(t). Le hasard (clignements, regards) est tiré d'une graine,
 *    donc deux rendus donnent les mêmes images.
 *
 * prefers-reduced-motion : pas de boucle de vie, pas de rebonds ni de
 * déplacements animés ; les expressions changent en fondu court, la parole
 * reste (la bouche bouge, le corps non).
 */
(function (global) {
  'use strict';

  const B = () => global.RevizD1.BOUCHES;

  // ---------- Expressions : seulement ce qui change par rapport au neutre ----------
  const NEUTRE = {
    regardX: 0, regardY: 0, paupG: 0, paupD: 0, paupBasG: 0, paupBasD: 0, paupPenteG: 0, paupPenteD: 0,
    rieurs: 0, pupille: 1, iris: 1,
    sourcilGy: 0, sourcilDy: 0, sourcilGrot: 0, sourcilDrot: 0, sourcilGcourbe: 0, sourcilDcourbe: 0,
    boucheX: 0, boucheY: 0, boucheEchelle: 1, corpsRot: 0, ecrase: 0,
  };
  const EXPRESSIONS = {
    neutre: { bouche: 'repos' },
    content: {
      bouche: { largeur: 108, coinG: -12, coinD: -12, haut: 34, bas: 74, langue: 0.5, dents: 0, dentsBas: 0 },
      paupBasG: 0.32, paupBasD: 0.32, sourcilGy: -10, sourcilDy: -10, sourcilGcourbe: 6, sourcilDcourbe: 6,
    },
    reflechit: {
      bouche: 'moue', regardX: -0.55, regardY: -0.75, paupG: 0.12, paupD: 0.12,
      sourcilGy: -16, sourcilGrot: -8, sourcilDy: 4, sourcilDrot: 6, corpsRot: -3,
    },
    choque: {
      bouche: 'choc', iris: 0.9, pupille: 0.9, sourcilGy: -26, sourcilDy: -26, sourcilGcourbe: 10, sourcilDcourbe: 10,
      ecrase: -0.06,
    },
    decu: {
      bouche: 'triste', paupG: 0.34, paupD: 0.34, paupPenteG: -14, paupPenteD: -14, regardY: 0.45,
      sourcilGrot: -16, sourcilDrot: -16, sourcilGy: -4, sourcilDy: -4, ecrase: 0.035,
    },
    fier: {
      bouche: 'fier', paupG: 0.34, paupD: 0.34, paupBasG: 0.22, paupBasD: 0.22, regardX: 0.25, regardY: -0.15,
      sourcilGy: -6, sourcilDy: -12, sourcilGrot: 4, sourcilDrot: -6, corpsRot: 3,
    },
    mortDeRire: {
      bouche: 'rire', rieurs: 1, sourcilGy: -12, sourcilDy: -12, sourcilGcourbe: 8, sourcilDcourbe: 8,
    },
    endormi: {
      bouche: { largeur: 40, coinG: 6, coinD: 6, haut: 10, bas: 26, langue: 0, dents: 0, dentsBas: 0 },
      paupG: 1, paupD: 1, sourcilGy: 8, sourcilDy: 8, sourcilGrot: -4, sourcilDrot: -4, regardY: 0.4, corpsRot: 4,
    },
    inquiet: {
      bouche: { largeur: 62, coinG: 8, coinD: 4, haut: 6, bas: 6, langue: 0, dents: 0, dentsBas: 0 },
      paupG: 0.1, paupD: 0.1, paupPenteG: -12, paupPenteD: -12, paupBasG: 0.12, paupBasD: 0.12, sourcilGy: -16, sourcilDy: -16,
      sourcilGrot: -22, sourcilDrot: -22, sourcilGcourbe: -6, sourcilDcourbe: -6, pupille: 0.94, iris: 0.96, regardY: 0.15,
    },
    determine: {
      bouche: { largeur: 84, coinG: 3, coinD: 3, haut: 4, bas: 4, langue: 0, dents: 0, dentsBas: 0 },
      paupG: 0.3, paupD: 0.3, paupPenteG: 14, paupPenteD: 14, sourcilGy: 8, sourcilDy: 8,
      sourcilGrot: 18, sourcilDrot: 18, ecrase: 0.03,
    },
  };

  // ---------- Parole : phonèmes français -> bouches ----------
  // Notation simple : une syllabe = consonnes + voyelle, séparées par des tirets.
  // Voyelles : a e i o u (ou), é è, an on in eu. Consonnes : m b p f v l t d n s z k g r ch j.
  const VISEME = {
    a: 'A', 'â': 'A', an: 'A', e: 'EI', 'é': 'EI', 'è': 'EI', i: 'EI', in: 'EI', eu: 'O', o: 'O', on: 'O', u: 'U', ou: 'U',
    m: 'MBP', b: 'MBP', p: 'MBP', f: 'FV', v: 'FV', l: 'L', t: 'EI', d: 'EI', n: 'EI', s: 'EI', z: 'EI',
    k: 'A', g: 'A', r: 'A', ch: 'U', j: 'U', w: 'U', y: 'EI', _: 'repos',
  };

  // Générateur pseudo-aléatoire à graine (mulberry32) : rendus vidéo identiques.
  function hasard(graine) {
    let a = graine >>> 0;
    return () => {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function creer(rig, options = {}) {
    const gsap = options.gsap || global.gsap;
    if (!gsap) throw new Error('GSAP est requis pour reviz-anim.js');
    const e = rig.etat;
    const video = !!options.video;
    const calme = options.calme !== undefined ? options.calme
      : !!(global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches);
    const alea = hasard(options.graine || 1789);
    const maitre = gsap.timeline({ paused: video });

    // ---------- Ressorts (mouvement secondaire) ----------
    // Deux ressorts amortis suivent le corps (vertical, horizontal). L'écart entre le
    // corps et son ressort fait traîner le visage, les sourcils et les bras.
    const R = { y: null, vy: 0, x: null, vx: 0 };
    const cibleY = () => e.hauteur + e.flotte - e.ecrase * 140;
    const cibleX = () => e.x / e.echelle + e.corpsRot * 5 + e.balance * 5;
    const borne = (v, m) => Math.max(-m, Math.min(m, v));
    function ressorts(dt) {
      if (calme) { e.ressortX = e.ressortY = e.ressortSourcil = e.ressortBras = 0; return; }
      const ty = cibleY(), tx = cibleX();
      if (R.y === null || dt <= 0 || dt > 0.5) { R.y = ty; R.x = tx; R.vy = R.vx = 0; dt = 0; }
      const k = 170, c = 24; // raideur, amortissement (conseil Codex : 22-26 ; on se cale en 6-8 images)
      for (let t = 0; t < dt; t += 1 / 240) {
        const h = Math.min(1 / 240, dt - t);
        R.vy += (k * (ty - R.y) - c * R.vy) * h; R.y += R.vy * h;
        R.vx += (k * (tx - R.x) - c * R.vx) * h; R.x += R.vx * h;
      }
      const ly = ty - R.y, lx = tx - R.x;
      e.ressortY = borne(ly * 0.16, 12);      // le corps monte : le visage reste un peu en bas (≤ 2 % du corps)
      e.ressortSourcil = borne(ly * 0.1, 7);
      e.ressortBras = borne(-ly * 0.12, 14);  // le corps monte : les bras traînent vers le bas
      e.ressortX = borne(-lx * 0.08, 10);     // il démarre : le visage traîne en arrière
    }
    let dernier = null;
    const tic = (temps) => { ressorts(dernier === null ? 0 : temps - dernier); dernier = temps; rig.rendre(); };
    if (!video) {
      gsap.ticker.add(tic);
    } else {
      maitre.eventCallback('onUpdate', () => {
        const t = maitre.time();
        ressorts(dernier === null ? 0 : t - dernier);
        dernier = t;
        rig.rendre();
      });
    }

    // ---------- Outils ----------
    const cibleExpression = (nom) => {
      const x = EXPRESSIONS[nom] || EXPRESSIONS.neutre;
      const bouche = typeof x.bouche === 'string' ? B()[x.bouche] : x.bouche;
      const out = Object.assign({}, NEUTRE, B().repos, bouche || {});
      for (const k in x) if (k !== 'bouche') out[k] = x[k];
      return out;
    };
    let curseur = 0; // en vidéo : où la prochaine action se place sur la timeline maîtresse
    // Bruitages : en vidéo, chaque action note ses sons (instant absolu, nom) ; la vidéo
    // les mixe ensuite avec la voix. En direct, options.son(nom) peut les jouer.
    const sons = [];
    let tAction = 0;
    function son(nom, decalage = 0, volume = 1) {
      if (video) sons.push({ t: +(tAction + decalage).toFixed(3), nom, volume });
      else if (options.son) gsap.delayedCall(decalage, () => options.son(nom, volume));
    }
    // garderMaintien : l'action (la parole) ne touche que la bouche, le corps continue de jouer.
    function jouer(construire, { a, garderMaintien, coupable } = {}) {
      const t = a !== undefined ? a : curseur;
      // En vidéo, on amène d'abord la timeline à l'instant visé : l'action se
      // construit à partir de l'état du pantin à ce moment-là (position, vue…).
      tAction = t;
      if (video) { if (!garderMaintien) poserMaintien(t); maitre.time(Math.min(t, maitre.duration()), false); }
      else if (maintienCourant && !garderMaintien) { maintienCourant.kill(); maintienCourant = null; }
      const tl = gsap.timeline();
      construire(tl);
      if (video) {
        if (coupable) actionEnAttente = { tl, debut: t };
        else maitre.add(tl, t);
        curseur = t + tl.duration();
        finActions = Math.max(finActions, curseur);
        if (maintienEnAttente) {
          maintienPose = { M: maintienEnAttente.M, debut: t + maintienEnAttente.decalage };
          maintienEnAttente = null;
        }
      }
      return tl;
    }

    // ---------- Vie : respiration, balancement, clignements, regards ----------
    // Tout passe par une couche « vie » (balance, regardVie…, visageVie…) qui s'ajoute
    // aux poses : la boucle de repos ne se bat jamais avec une expression.
    const vie = { boucles: [], actif: false, regardLibre: true };
    function regardVieTl() {
      // Les yeux partent d'un coup (saccade), le visage suit un peu après : la tête tourne.
      const cibles = [[0, 0], [0.55, -0.15], [-0.6, 0.1], [0.35, 0.35], [0, 0], [-0.35, -0.3], [0.7, 0.05]];
      const [x, y] = cibles[Math.floor(alea() * cibles.length)];
      return gsap.timeline()
        .to(e, { regardVieX: x, regardVieY: y, duration: 0.05, ease: 'power2.out' }, 0)
        .to(e, { visageVieX: x * 14, visageVieY: y * 10, duration: 0.42, ease: 'power2.inOut' }, 0.04);
    }
    // Micro-saccades : l'œil ne reste jamais parfaitement immobile.
    function saccadeTl() {
      return gsap.to(e, { saccadeX: (alea() - 0.5) * 0.16, saccadeY: (alea() - 0.5) * 0.2, duration: 0.033, ease: 'power2.out' });
    }
    function demarrerVie({ flotter = false } = {}) {
      arreterVie();
      vie.actif = true;
      if (calme) return;
      // En vidéo, pas de répétition infinie : la timeline maîtresse doit avoir une fin.
      const rep = (d) => (video ? Math.ceil((options.dureeVideo || 30) / d) : -1);
      vie.boucles.push(gsap.to(e, { respire: 1, duration: 1.7, ease: 'sine.inOut', yoyo: true, repeat: rep(1.7) }));
      vie.boucles.push(gsap.fromTo(e, { balance: -1.3 }, { balance: 1.3, duration: 2.7, ease: 'sine.inOut', yoyo: true, repeat: rep(2.7) }));
      if (flotter) vie.boucles.push(gsap.to(e, { flotte: 16, duration: 1.9, ease: 'sine.inOut', yoyo: true, repeat: rep(1.9) }));
      if (video) { vie.boucles.forEach((b) => maitre.add(b, 0)); return; }
      const cligne = () => {
        if (!vie.actif) return;
        clignerTl(alea() < 0.06 ? 2 : 1);
        vie.boucles.push(gsap.delayedCall(3 + alea() * 4, cligne));
      };
      const regarde = () => {
        if (!vie.actif) return;
        if (vie.regardLibre) regardVieTl();
        vie.boucles.push(gsap.delayedCall(1.2 + alea() * 2.3, regarde));
      };
      const sacc = () => {
        if (!vie.actif) return;
        saccadeTl();
        vie.boucles.push(gsap.delayedCall(0.8 + alea() * 1.7, sacc));
      };
      vie.boucles.push(gsap.delayedCall(1.2, cligne), gsap.delayedCall(1.6, regarde), gsap.delayedCall(0.5, sacc));
    }
    function arreterVie() {
      vie.actif = false;
      vie.boucles.forEach((b) => b.kill());
      vie.boucles = [];
    }
    // Pause (pantin hors de l'écran, dans l'app) : plus de rendu ni de vie ; reprendre() relance.
    let enPause = false;
    function pause() {
      if (video || enPause) return;
      enPause = true;
      gsap.ticker.remove(tic);
      vie.boucles.forEach((b) => b.pause());
    }
    function reprendre() {
      if (video || !enPause) return;
      enPause = false;
      dernier = null;
      vie.boucles.forEach((b) => b.resume());
      gsap.ticker.add(tic);
    }
    // Arrêt complet (le pantin quitte l'écran, dans l'app) : vie, maintien, rendu à chaque image.
    function detruire() {
      arreterVie();
      if (maintienCourant) { maintienCourant.kill(); maintienCourant = null; }
      gsap.killTweensOf(e);
      if (!video) gsap.ticker.remove(tic);
    }
    // En vidéo, clignements et regards semés à l'avance (graine) sur [debut, fin].
    function semerClignements(debut, fin, { regards = [] } = {}) {
      if (calme) return;
      let t = debut + 0.8;
      while (t < fin) {
        maitre.add(clignerTl(alea() < 0.06 ? 2 : 1), t);
        t += 3 + alea() * 4;
      }
      for (let u = debut + 0.2; u < fin; u += 0.8 + alea() * 1.7) maitre.add(saccadeTl(), u);
      for (const [a, b] of regards) {
        let u = a + 0.3;
        while (u < b - 0.4) { maitre.add(regardVieTl(), u); u += 1.2 + alea() * 2.3; }
        maitre.add(gsap.to(e, { regardVieX: 0, regardVieY: 0, visageVieX: 0, visageVieY: 0, duration: 0.3 }), b - 0.3);
      }
    }

    // ---------- Yeux ----------
    // Clignement de 200 ms réglé image par image à 60 i/s (conseil Codex) : 4 images pour
    // fermer, 1 de tenue, 7 pour rouvrir, sans rebond. Double clignement espacé de ~230 ms.
    const CLIGNEMENT = [0.1, 0.35, 0.7, 1, 1, 0.63, 0.36, 0.19, 0.08, 0.02, 0.003, 0];
    function clignerTl(fois = 1, lent = 1) {
      const tl = gsap.timeline();
      for (let i = 0; i < fois; i++) {
        if (i > 0) tl.to({}, { duration: 0.03 });
        for (const v of CLIGNEMENT) tl.to(e, { clin: v, duration: lent / 60, ease: 'none' });
      }
      return tl;
    }
    function cligner(fois = 1) {
      if (video) { const t = clignerTl(fois); maitre.add(t, curseur); return t; }
      return clignerTl(fois);
    }

    // Regarder un point de la scène (coordonnées du SVG parent).
    function regardVers(x, y) {
      const k = e.echelle, ax = e.x, ay = e.y;
      const ox = ax + (640 - 651.2) * k * e.sens, oy = ay + (545 - 1048) * k - (e.hauteur + e.flotte) * k;
      const dx = (x - ox) * e.sens, dy = y - oy;
      const portee = 520 * k;
      const rx = Math.max(-1, Math.min(1, dx / portee)), ry = Math.max(-1, Math.min(1, dy / (portee * 0.8)));
      return { regardX: rx, regardY: ry, visageX: rx * 16, visageY: ry * 12 };
    }
    function regarder(x, y, duree = 0.25) {
      vie.regardLibre = false;
      const c = regardVers(x, y);
      const tl = gsap.timeline();
      tl.to(e, { regardX: c.regardX, regardY: c.regardY, regardVieX: 0, regardVieY: 0, duration: calme ? 0 : Math.min(0.09, duree), ease: 'power3.out', overwrite: 'auto' }, 0)
        .to(e, { visageX: c.visageX, visageY: c.visageY, visageVieX: 0, visageVieY: 0, duration: calme ? 0 : duree * 1.6, ease: 'power2.out', overwrite: 'auto' }, 0.03);
      return tl;
    }
    // Suivre le pointeur (ou n'importe quel point qui bouge) ; renvoie la fonction d'arrêt.
    function suivre(svg) {
      const pt = svg.createSVGPoint();
      const bouger = (ev) => {
        pt.x = ev.clientX; pt.y = ev.clientY;
        const p = pt.matrixTransform(svg.getScreenCTM().inverse());
        regarder(p.x, p.y, 0.18);
      };
      svg.addEventListener('pointermove', bouger);
      return () => { svg.removeEventListener('pointermove', bouger); vie.regardLibre = true; };
    }

    // ---------- Expressions : de petites scènes jouées par tout le corps ----------
    // Chaque expression : un clignement au changement d'idée, une anticipation (on part
    // dans l'autre sens), l'action avec dépassement, puis un maintien vivant qui ne se
    // fige jamais (en direct, il tourne jusqu'à l'expression suivante).
    let maintienCourant = null, maintienEnAttente = null, maintienPose = null, actionEnAttente = null;
    // Pose sur la timeline maîtresse un morceau de timeline, coupé pile à la bonne longueur.
    function poserCoupe(tl, debut, duree) {
      if (duree < 0.02) return;
      const enveloppe = gsap.timeline({ paused: true }).add(tl.paused(false), 0);
      maitre.add(enveloppe.tweenFromTo(0, duree, { ease: 'none' }), debut);
    }
    // En vidéo, une expression (et son maintien) s'arrête quand l'action suivante commence.
    function poserMaintien(jusqua) {
      if (actionEnAttente) {
        const { tl, debut } = actionEnAttente;
        actionEnAttente = null;
        poserCoupe(tl, debut, Math.min(tl.duration(), jusqua - debut));
      }
      if (!maintienPose) return;
      const { M, debut } = maintienPose;
      maintienPose = null;
      poserCoupe(M, debut, jusqua - debut);
    }
    // Réglages de réaction du pantin 3D (effets flottants, yeux spéciaux, larmes) : remis à 0 au repos.
    const reposReactions = () => Object.fromEntries(Object.keys(e).filter((k) => /^(effet[A-Z]|yeux(Etoiles|Coeurs|Spirale)$|larmes$)/.test(k)).map((k) => [k, 0]));
    const repos = () => Object.assign({}, NEUTRE, B().repos, brasRepos(), reposReactions(), {
      visageX: 0, visageY: 0, yeuxEchelle: 1, yeuxEtire: 1, oeilGechelle: 1, oeilDechelle: 1,
      hauteur: 0, corpsX: 0, brasGpoignet: 0, brasDpoignet: 0, brasGdevant: 0, brasDdevant: 0, bulle: 0, flechir: 0,
    });
    const face = () => e.vue === 'face' || !rig.VUES_GEO[e.vue];
    // Bras par cinématique inverse (vue de face) : main posée sur un point du corps.
    // devant : le bras passe devant les lobes du bas, l'épaule glisse au bord du corps.
    // coudeDehors : le coude part vers l'extérieur (poings sur les hanches).
    const main = (cote, cible, devant = true, coudeDehors = false) => (face() ? Object.assign(
      rig.atteindre(cote, cible, (cote === 'd' ? 1 : -1) * (coudeDehors ? -1 : 1), 'face', devant),
      { ['bras' + cote.toUpperCase() + 'devant']: devant ? 1 : 0 }) : {});
    const brasAngles = (g, d) => (face() ? Object.assign({},
      g ? { brasGepaule: g[0], brasGcoude: g[1] } : {}, d ? { brasDepaule: d[0], brasDcoude: d[1] } : {}) : {});
    const mains = (tl, forme, at) => tl.set(e, { brasGmain: forme, brasDmain: forme }, at);
    const visageDe = (nom) => cibleExpression(nom);

    const SCENES = {
      neutre(tl) {
        tl.add(clignerTl(), 0)
          .to(e, Object.assign(repos(), { duration: 0.34, ease: 'back.out(1.4)' }), 0.03);
        mains(tl, 'relachee', 0.15);
      },
      content(tl, M) {
        tl.add(clignerTl(), 0)
          .to(e, { ecrase: 0.07, sourcilGy: 3, sourcilDy: 3, duration: 0.083, ease: 'power2.inOut' }, 0)
          .to(e, Object.assign(visageDe('content'), brasAngles([62, 30], [62, 30]),
            { yeuxEchelle: 1.06, ecrase: -0.04, hauteur: 16, visageY: -8, duration: 0.2, ease: 'power3.out' }), 0.083)
          .to(e, { hauteur: 0, ecrase: 0.06, flechir: 0.4, duration: 0.14, ease: 'power2.in' })
          .to(e, { ecrase: 0, flechir: 0, duration: 0.2, ease: 'power3.out' });
        mains(tl, 'ouverte', 0.1);
        M.to(e, { ecrase: 0.025, duration: 0.42, ease: 'sine.inOut', yoyo: true, repeat: -1 }, 0)
          .to(e, { corpsRot: 2.5, visageX: 6, duration: 0.84, ease: 'sine.inOut', yoyo: true, repeat: -1 }, 0);
      },
      reflechit(tl, M) {
        tl.add(clignerTl(), 0.04)
          .to(e, { visageY: 6, regardY: 0.3, duration: 0.1, ease: 'power2.out' }, 0)
          .to(e, Object.assign(visageDe('reflechit'), main('d', [742, 724]),
            { brasDpoignet: 20, visageX: -16, visageY: -14, corpsRot: -5, oeilGechelle: 1.07, oeilDechelle: 0.95,
              boucheX: -10, duration: 0.38, ease: 'power3.out' }), 0.1);
        tl.set(e, { brasDmain: 'ouverte' }, 0.12);
        M.to(e, { brasDpoignet: 34, duration: 0.15, ease: 'sine.inOut', yoyo: true, repeat: -1 }, 0)
          .to(e, { regardX: -0.3, boucheX: -15, duration: 0.95, ease: 'sine.inOut', yoyo: true, repeat: -1 }, 0.3);
      },
      choque(tl, M) {
        tl.to(e, { ecrase: 0.09, flechir: 0.35, yeuxEchelle: 0.88, paupG: 0.35, paupD: 0.35, sourcilGy: 6, sourcilDy: 6, duration: 0.083, ease: 'power2.inOut' }, 0)
          .to(e, Object.assign(visageDe('choque'), brasAngles([128, -28], [128, -28]),
            { yeuxEchelle: 1.22, ecrase: -0.08, flechir: 0, hauteur: 22, visageY: -10, duration: 0.067, ease: 'power2.out' }), 0.083)
          .to(e, { hauteur: 0, ecrase: 0, yeuxEchelle: 1.16, duration: 0.25, ease: 'power3.out' }, '+=0.1');
        mains(tl, 'ouverte', 0.1);
        M.to(e, { corpsX: 2, duration: 0.04, ease: 'none', yoyo: true, repeat: 9 }, 0)
          .to(e, { pupille: 0.86, duration: 0.4, ease: 'sine.inOut', yoyo: true, repeat: -1 }, 0);
      },
      decu(tl, M) {
        tl.add(clignerTl(1, 1.8), 0)
          .to(e, { ecrase: -0.04, sourcilGy: -6, sourcilDy: -6, duration: 0.18, ease: 'sine.out' }, 0)
          .to(e, Object.assign(visageDe('decu'), brasAngles([3, 0], [3, 0]),
            { ecrase: 0.1, visageY: 20, visageX: 4, corpsRot: 3, regardY: 0.6, duration: 0.6, ease: 'power2.inOut' }), 0.18)
          .to(e, { ecrase: 0.13, duration: 0.4, ease: 'sine.inOut' })
          .to(e, { ecrase: 0.09, duration: 0.6, ease: 'sine.inOut' });
        mains(tl, 'relachee', 0.2);
        M.to(e, { corpsRot: 1.5, visageX: 1, duration: 1.8, ease: 'sine.inOut', yoyo: true, repeat: -1 }, 0);
      },
      fier(tl, M) {
        tl.to(e, { ecrase: 0.06, duration: 0.1, ease: 'power2.out' }, 0)
          .to(e, Object.assign(visageDe('fier'), main('g', [300, 800], true, true), main('d', [982, 800], true, true),
            { ecrase: -0.07, corpsRot: -4, visageY: -12, visageX: 8, oeilDechelle: 0.95, duration: 0.32, ease: 'back.out(1.6)' }), 0.1)
          .to(e, { sourcilDy: -20, duration: 0.12, ease: 'power2.out', yoyo: true, repeat: 3 }, 0.5);
        mains(tl, 'relachee', 0.1);
        M.to(e, { visageY: -6, duration: 0.5, ease: 'sine.inOut', yoyo: true, repeat: -1 }, 0);
      },
      mortDeRire(tl, M) {
        // Il se plie en arrière, les bras s'ouvrent et battent, tout le corps rebondit.
        tl.to(e, { ecrase: 0.14, paupG: 0.55, paupD: 0.55, visageY: 6, brasGepaule: 20, brasDepaule: 20, duration: 0.1, ease: 'power2.out' }, 0)
          .to(e, Object.assign(visageDe('mortDeRire'), brasAngles([48, 70], [48, 70]),
            { corpsRot: -8, visageY: -16, visageX: -4, hauteur: 26, ecrase: -0.08, yeuxEchelle: 1.04, duration: 0.16, ease: 'back.out(2.4)' }), 0.1)
          .to(e, { hauteur: 0, ecrase: 0.08, duration: 0.14, ease: 'power2.in' });
        mains(tl, 'ouverte', 0.1);
        M.to(e, { hauteur: 16, duration: 0.15, ease: 'power1.out', yoyo: true, repeat: -1 }, 0)
          .to(e, { ecrase: -0.04, duration: 0.15, ease: 'sine.inOut', yoyo: true, repeat: -1 }, 0)
          .to(e, { corpsRot: -4, duration: 0.3, ease: 'sine.inOut', yoyo: true, repeat: -1 }, 0)
          .to(e, { brasGcoude: 92, brasDcoude: 92, duration: 0.15, ease: 'sine.inOut', yoyo: true, repeat: -1 }, 0.05)
          .to(e, { largeur: 114, bas: 116, duration: 0.15, ease: 'sine.inOut', yoyo: true, repeat: -1 }, 0);
      },
      endormi(tl, M) {
        const v = Object.assign(visageDe('endormi'), {
          // Petite bouche ronde entrouverte, sourcils bas et détendus.
          largeur: 44, coinG: 8, coinD: 8, haut: -10, bas: 40, langue: 0,
          sourcilGy: 28, sourcilDy: 28, sourcilGrot: -6, sourcilDrot: -6, sourcilGcourbe: -10, sourcilDcourbe: -10,
        });
        // Il lutte : les paupières tombent, se relèvent, retombent.
        tl.to(e, { paupG: 0.6, paupD: 0.6, sourcilGy: 6, sourcilDy: 6, duration: 0.45, ease: 'sine.inOut' }, 0)
          .to(e, { paupG: 0.25, paupD: 0.25, sourcilGy: -8, sourcilDy: -8, duration: 0.16, ease: 'power2.out' })
          .to(e, { paupG: 0.85, paupD: 0.85, sourcilGy: 10, sourcilDy: 10, duration: 0.5, ease: 'sine.inOut' })
          .to(e, Object.assign({}, v, { paupG: 1, paupD: 1, duration: 0.4, ease: 'sine.in' }))
          .to(e, Object.assign(brasAngles([6, 4], [6, 4]), { ecrase: 0.07, corpsRot: 8, visageY: 4, visageX: 12, duration: 1.3, ease: 'sine.inOut' }), 0.2)
          .to(e, { bulle: 0.75, duration: 0.7, ease: 'sine.out' }, '-=0.5');
        mains(tl, 'relachee', 0.2);
        // Respiration lente : la bulle gonfle à l'inspiration, la bouche s'ouvre un peu.
        M.to(e, { ecrase: 0.11, bas: 50, bulle: 1, duration: 1.6, ease: 'sine.inOut', yoyo: true, repeat: -1 }, 0)
          .to(e, { corpsRot: 10, duration: 1.6, ease: 'sine.inOut', yoyo: true, repeat: -1 }, 0);
      },
      inquiet(tl, M) {
        tl.add(clignerTl(), 0)
          .to(e, Object.assign(visageDe('inquiet'), main('g', [338, 668]), main('d', [944, 668]),
            { ecrase: 0.05, yeuxEchelle: 1.08, visageY: 4, duration: 0.26, ease: 'power3.out' }), 0.04);
        mains(tl, 'ouverte', 0.06);
        M.to(e, { regardX: -0.5, duration: 0.06, ease: 'power3.out' }, 0.1)
          .to(e, { visageX: -8, duration: 0.25, ease: 'power2.out' }, 0.13)
          .to(e, { regardX: 0.5, duration: 0.06, ease: 'power3.out' }, 0.5)
          .to(e, { visageX: 8, duration: 0.25, ease: 'power2.out' }, 0.53)
          .to(e, { regardX: 0, visageX: 0, duration: 0.12, ease: 'power2.out' }, 0.9)
          .to(e, { coinG: 2, coinD: 8, duration: 0.12, ease: 'sine.inOut', yoyo: true, repeat: 7 }, 0)
          .to(e, { corpsX: 1.6, duration: 0.05, ease: 'none', yoyo: true, repeat: 23 }, 0);
        M.repeat(-1).repeatDelay(0.6);
      },
      determine(tl, M) {
        tl.to(e, { ecrase: -0.06, visageY: -6, sourcilGy: -4, sourcilDy: -4, duration: 0.18, ease: 'sine.out' }, 0)
          .to(e, Object.assign(visageDe('determine'), brasAngles([28, 96], [52, 112]),
            { ecrase: 0.07, visageY: 8, duration: 0.18, ease: 'power4.out' }), 0.18)
          .to(e, { brasDcoude: 128, hauteur: 12, duration: 0.12, ease: 'power2.out', yoyo: true, repeat: 1 }, 0.42);
        mains(tl, 'relachee', 0.18);
        M.to(e, { hauteur: 8, ecrase: 0.04, duration: 0.22, ease: 'sine.inOut', yoyo: true, repeat: -1 }, 0);
      },
    };

    // ---------- Transitions : une étape intermédiaire qui raconte le changement ----------
    let expressionCourante = 'neutre';
    const TRANSITIONS = {
      // Réveil en sursaut : les yeux s'ouvrent d'un coup, petit bond.
      'endormi>*': (tl) => tl
        .to(e, { paupG: 0, paupD: 0, bulle: 0, yeuxEchelle: 1.24, hauteur: 34, ecrase: -0.1, sourcilGy: -22, sourcilDy: -22,
          corpsRot: 0, visageX: 0, visageY: -8, largeur: 46, coinG: 12, coinD: 12, haut: -28, bas: 60, duration: 0.12, ease: 'back.out(3)' })
        .to(e, { hauteur: 0, ecrase: 0.06, duration: 0.14, ease: 'power2.in' })
        .add(clignerTl(2, 0.8)),
      // Bâillement avant de s'endormir : grande bouche, yeux plissés, bras qui s'étirent.
      '*>endormi': (tl) => tl
        .add(clignerTl(1, 1.4))
        .to(e, Object.assign(brasAngles([60, 40], [60, 40]), { largeur: 70, coinG: 10, coinD: 10, haut: -30, bas: 130, langue: 0.5,
          paupG: 0.8, paupD: 0.8, sourcilGy: -14, sourcilDy: -14, ecrase: -0.08, visageY: -10, rieurs: 0, duration: 0.45, ease: 'sine.inOut' }))
        .to(e, Object.assign(brasAngles([10, 0], [10, 0]), { largeur: 44, haut: -10, bas: 40, langue: 0, ecrase: 0.04, visageY: 0, duration: 0.35, ease: 'sine.inOut' })),
      // Petit « oh » de surprise avant la déception.
      'content>decu': (tl) => TRANSITIONS.oh(tl), 'fier>decu': (tl) => TRANSITIONS.oh(tl), 'mortDeRire>decu': (tl) => TRANSITIONS.oh(tl),
      'choque>decu': (tl) => TRANSITIONS.oh(tl),
      oh: (tl) => tl
        .to(e, Object.assign(B().petit, { largeur: 40, haut: -16, bas: 46, sourcilGy: -18, sourcilDy: -18, yeuxEchelle: 1.12, ecrase: -0.04,
          rieurs: 0, regardY: 0, duration: 0.14, ease: 'back.out(2)' }))
        .to({}, { duration: 0.16 }),
      // Eurêka en sortant de la réflexion : les sourcils sautent, petit bond, regard en face.
      'reflechit>content': (tl) => TRANSITIONS.eureka(tl), 'reflechit>fier': (tl) => TRANSITIONS.eureka(tl), 'reflechit>determine': (tl) => TRANSITIONS.eureka(tl),
      eureka: (tl) => tl
        .to(e, { sourcilGy: -24, sourcilDy: -24, yeuxEchelle: 1.14, regardX: 0, regardY: 0, visageX: 0, visageY: -10, hauteur: 20, ecrase: -0.07, duration: 0.12, ease: 'back.out(3)' })
        .to(e, { hauteur: 0, ecrase: 0.05, duration: 0.12, ease: 'power2.in' }),
      // Il se redresse (inspiration) avant de reprendre du poil de la bête.
      'decu>content': (tl) => TRANSITIONS.redresse(tl), 'decu>fier': (tl) => TRANSITIONS.redresse(tl), 'decu>determine': (tl) => TRANSITIONS.redresse(tl),
      'inquiet>determine': (tl) => TRANSITIONS.redresse(tl),
      redresse: (tl) => tl
        .add(clignerTl(), 0)
        .to(e, { ecrase: -0.09, visageY: -12, visageX: 0, regardY: -0.2, corpsRot: 0, sourcilGy: -8, sourcilDy: -8, duration: 0.22, ease: 'sine.out' }, 0),
      // Après un choc : il secoue la tête pour reprendre ses esprits.
      'choque>*': (tl) => tl
        .add(clignerTl(2, 0.9), 0)
        .to(e, { visageX: 12, duration: 0.07, ease: 'sine.inOut', yoyo: true, repeat: 3 }, 0)
        .to(e, { yeuxEchelle: 1, visageX: 0, duration: 0.1 }),
    };

    const SONS_EXPRESSION = { choque: [['boing', 0.1]], decu: [['glisse', 0.25]], mortDeRire: [['pop', 0.1], ['pop', 0.4, 0.6], ['pop', 0.7, 0.5]],
      content: [['pop', 0.1]], fier: [['pop', 0.12, 0.7]], determine: [['pop', 0.2]], reflechit: [['tic', 0.15]], inquiet: [['tic', 0.05]], endormi: [['blop', 1.3, 0.7]] };
    function expressionTl(nom, duree = 0.28, opts = {}) {
      const de = expressionCourante;
      let dt = 0;
      if (de === 'endormi' && nom !== 'endormi') { son('boing', 0.02, 0.7); dt = 0.5; }
      if (nom === 'endormi' && de !== 'endormi') { son('baille', 0.15); dt = 0.85; }
      if (de === 'choque' && nom !== 'choque') dt = 0.38;
      if (['content', 'fier', 'mortDeRire', 'choque'].includes(de) && nom === 'decu') dt = 0.3;
      if (de === 'reflechit' && ['content', 'fier', 'determine'].includes(nom)) { son('pop', 0.05); dt = 0.24; }
      for (const [n, d, v] of SONS_EXPRESSION[nom] || []) son(n, dt + d, v || 1);
      expressionCourante = nom;
      const transition = !calme && de !== nom && (TRANSITIONS[`${de}>${nom}`] || TRANSITIONS[`${de}>*`] || TRANSITIONS[`*>${nom}`]);
      if (transition) {
        // La transition joue d'abord, la scène de l'expression enchaîne ensuite.
        const avant = gsap.timeline();
        transition(avant);
        const tlT = gsap.timeline();
        tlT.add(avant, 0).add(expressionScene(nom, duree, opts), '>');
        if (maintienEnAttente) maintienEnAttente.decalage += avant.duration();
        return tlT;
      }
      return expressionScene(nom, duree, opts);
    }

    function expressionScene(nom, duree = 0.28, opts = {}) {
      vie.regardLibre = nom === 'neutre' || !('regardX' in (EXPRESSIONS[nom] || {}));
      const tl = gsap.timeline();
      if (calme) {
        tl.to(e, Object.assign(repos(), visageDe(nom), { duration: 0.12, ease: 'power2.out', overwrite: 'auto' }), 0);
        return tl;
      }
      const M = gsap.timeline({ paused: true });
      (SCENES[nom] || SCENES.neutre)(tl, M);
      // On repart de la pose de repos, mais seulement pour ce que la scène ne touche pas
      // (sinon ce retour, plus long qu'un geste rapide, l'écraserait).
      const touche = new Set();
      for (const c of tl.getChildren(true, true, false)) for (const k in c.vars) touche.add(k);
      const base = repos();
      for (const k of touche) delete base[k];
      tl.to(e, Object.assign(base, { duration: 0.3, ease: 'power2.out' }), 0);
      if (M.getChildren().length) {
        if (video) {
          // En vidéo, le maintien dure jusqu'à la prochaine action : on le pose quand
          // on la connaît (voir jouer()), découpé pile à la bonne longueur.
          tl.call(() => {}, null, '>');
          maintienEnAttente = { M, decalage: tl.duration() };
        } else {
          tl.call(() => { if (maintienCourant) maintienCourant.kill(); maintienCourant = M; M.play(0); }, null, '>');
        }
      }
      return tl;
    }
    function expression(nom, duree = 0.28, opts = {}) {
      return jouer((tl) => tl.add(expressionTl(nom, duree, opts), 0), Object.assign({ coupable: true }, opts));
    }

    // ---------- Parole ----------
    // minutage : [{ t, v }] (secondes, nom de bouche) ou syllabes + temps des voyelles.
    function bouchePour(v) { return Object.assign({}, B()[v] || B().repos); }
    function parler(minutage, opts = {}) {
      const debut = opts.decalage || 0;
      opts = Object.assign({ garderMaintien: true }, opts);
      return jouer((tl) => {
        let precedent = -1;
        minutage.forEach((m, i) => {
          const t = debut + m.t;
          const suivant = minutage[i + 1];
          // Coarticulation : on arrive sur la bouche un peu avant le son, en 60 ms.
          const vers = bouchePour(m.v);
          const duree = Math.max(0.04, Math.min(0.09, (suivant ? suivant.t - m.t : 0.1) * 0.6));
          tl.to(e, Object.assign(vers, { duration: duree, ease: 'power1.out' }), Math.max(0, t - duree * 0.5, precedent));
          precedent = t - duree * 0.5;
        });
        const fin = debut + (minutage.length ? minutage[minutage.length - 1].t : 0) + 0.12;
        tl.to(e, Object.assign(bouchePour('repos'), { duration: 0.14, ease: 'power1.out' }), fin);
        if (!calme && opts.sourcils !== false) {
          // Les sourcils se lèvent un peu sur les débuts de phrase.
          (opts.accents || [debut]).forEach((ta) => {
            tl.to(e, { sourcilGy: -9, sourcilDy: -9, duration: 0.12, ease: 'power2.out' }, ta)
              .to(e, { sourcilGy: 0, sourcilDy: 0, duration: 0.3, ease: 'power2.inOut' }, ta + 0.35);
          });
        }
      }, opts);
    }
    // Syllabes « s-a-l », « u » ... + temps (s) de chaque voyelle -> minutage.
    function minutageSyllabes(syllabes) {
      const out = [];
      for (const { t, s, fin } of syllabes) {
        const sons = s.split('-').filter(Boolean);
        const voyelle = sons.findIndex((x) => /^(a|â|an|e|é|è|i|in|eu|o|on|u|ou)$/.test(x));
        const avant = voyelle < 0 ? sons : sons.slice(0, voyelle);
        const apres = voyelle < 0 ? [] : sons.slice(voyelle + 1);
        avant.forEach((c, i) => out.push({ t: t - 0.07 * (avant.length - i), v: VISEME[c] || 'EI' }));
        if (voyelle >= 0) out.push({ t, v: VISEME[sons[voyelle]] });
        apres.forEach((c, i) => out.push({ t: t + 0.08 * (i + 1), v: VISEME[c] || 'EI' }));
        if (fin) out.push({ t: fin, v: 'repos' });
      }
      return out.sort((a, b) => a.t - b.t);
    }
    // Secours : l'amplitude d'un fichier audio (enveloppe précalculée, 100 valeurs/s).
    function parlerAmplitude(enveloppe, opts = {}) {
      opts = Object.assign({ garderMaintien: true }, opts);
      const pas = opts.pas || 0.01, debut = opts.decalage || 0;
      const max = Math.max(1e-6, ...enveloppe);
      const lisse = [];
      let v = 0;
      for (const a of enveloppe) { v = v * 0.55 + (a / max) * 0.45; lisse.push(v); }
      return jouer((tl) => {
        const proxy = { i: 0 };
        const formes = ['EI', 'A', 'O', 'EI', 'A', 'U'];
        tl.to(proxy, {
          i: lisse.length - 1, duration: lisse.length * pas, ease: 'none',
          onUpdate: () => {
            const i = Math.floor(proxy.i), a = lisse[i] || 0;
            const ouvre = Math.max(0, Math.min(1, (a - 0.08) / 0.7));
            // On varie la forme toutes les ~120 ms pour ne pas faire « marionnette à clapet ».
            const f = B()[formes[Math.floor((i * pas) / 0.12) % formes.length]];
            const r = B().repos;
            for (const k of global.RevizD1.CLES_BOUCHE) e[k] = r[k] + (f[k] - r[k]) * ouvre;
          },
        }, debut);
        tl.to(e, Object.assign(bouchePour('repos'), { duration: 0.12 }));
      }, opts);
    }
    // Enveloppe d'amplitude d'un fichier audio (navigateur).
    async function enveloppeAudio(url, pas = 0.01) {
      const ctx = new (global.OfflineAudioContext || global.webkitOfflineAudioContext)(1, 44100, 44100);
      const buf = await ctx.decodeAudioData(await (await fetch(url)).arrayBuffer());
      const d = buf.getChannelData(0), n = Math.floor(buf.sampleRate * pas), out = [];
      for (let i = 0; i < d.length; i += n) {
        let s = 0;
        for (let j = i; j < Math.min(d.length, i + n); j++) s += d[j] * d[j];
        out.push(Math.sqrt(s / n));
      }
      return out;
    }

    // ---------- Gestes ----------
    const brasRepos = (vue = e.vue) => {
      const p = rig.reposVue(vue);
      const out = {};
      for (const k in p) if (k.startsWith('bras')) out[k] = p[k];
      return out;
    };
    function revenirRepos(tl, pos = '>', duree = 0.45, ease = 'power2.out') {
      tl.to(e, Object.assign(brasRepos(), { brasGdevant: 0, brasDdevant: 0, ecrase: 0, flechir: 0, corpsRot: 0, hauteur: 0, inclinaison: 0, duration: calme ? 0.1 : duree, ease }), pos);
    }
    const GESTES = {
      coucou(tl, { cote = 'd' } = {}) {
        const P = 'bras' + cote.toUpperCase(), sg = cote === 'd' ? 1 : -1;
        // Pantin 3D : bras « coucou » continu (tube épais + grande main) qui s'épaissit en montant.
        const grand = !!(rig.mainsDispo && rig.mainsDispo(cote).includes('coucou'));
        son('pop', 0.16);
        // Anticipation : le corps part du côté opposé et se tasse, le bras plonge un peu.
        tl.add(clignerTl(), 0)
          .to(e, { corpsRot: -3 * sg, [P + 'epaule']: 6, [P + 'coude']: 26, ecrase: 0.06, duration: 0.14, ease: 'power2.out' }, 0)
          .set(e, { [P + 'main']: grand ? 'coucou' : 'ouverte' }, 0.13);
        // Montée : le bras passe au-dessus en dépassant un peu sa cible ; la main traîne derrière
        // (poignet cassé vers l'arrière) puis se redresse ; le visage se tourne vers elle.
        tl.to(e, { [P + 'epaule']: 122, [P + 'coude']: 34, duration: 0.34, ease: 'back.out(1.6)' }, 0.14)
          .fromTo(e, { [P + 'poignet']: 28 }, { [P + 'poignet']: -6, duration: 0.4, ease: 'power2.out' }, 0.14)
          .to(e, Object.assign(cibleExpression('content'), { corpsRot: 5 * sg, ecrase: -0.05, visageX: 12 * sg, visageY: -6, yeuxEchelle: 1.05,
            duration: 0.3, ease: 'back.out(2)' }), 0.14)
          .to(e, { ecrase: 0, duration: 0.3, ease: 'power3.out' }, 0.44);
        if (grand) tl.to(e, { [P + 'epais']: 1, duration: 0.24, ease: 'power2.out' }, 0.14);
        let t = 0.5;
        if (!calme) {
          // Battements : l'avant-bras mène, la main suit avec un quart de temps de retard et un peu plus
          // d'amplitude (chevauchement) ; l'amplitude baisse un peu à chaque battement ; le corps
          // accompagne à moitié vitesse.
          const T = 0.19;
          [1, 0.9, 0.75].forEach((amp, i) => {
            tl.to(e, { [P + 'coude']: 34 + 24 * amp, duration: T, ease: 'sine.inOut' }, t)
              .to(e, { [P + 'coude']: 34 - 10 * amp, duration: T, ease: 'sine.inOut' }, t + T)
              .to(e, { [P + 'poignet']: -22 * amp, duration: T, ease: 'sine.inOut' }, t + T * 0.45)
              .to(e, { [P + 'poignet']: 16 * amp, duration: T, ease: 'sine.inOut' }, t + T * 1.45)
              .to(e, { corpsRot: (i % 2 ? 5 : 2.5) * sg, duration: 2 * T, ease: 'sine.inOut' }, t);
            t += 2 * T;
          });
        }
        // Descente : le bras retombe en se raccourcissant (la main reprend sa taille) ; on rend la main
        // de repos au milieu du mouvement, quand il va le plus vite.
        // (Un seul tween par articulation : revenirRepos ramène épaule et coude, sinon deux tweens du même
        // réglage se marchent dessus quand la vidéo saute dans la timeline.)
        // Le poignet du dernier battement finit un peu après : il repart de là.
        tl.to(e, { [P + 'poignet']: 0, duration: 0.36, ease: 'power2.inOut' }, calme ? t : t + 0.09);
        if (grand) tl.to(e, { [P + 'epais']: 0, duration: 0.24, ease: 'power2.in' }, t);
        tl.set(e, { [P + 'main']: 'relachee' }, t + (grand ? 0.24 : 0.12));
        revenirRepos(tl, t, 0.46, 'power2.inOut');
        tl.to(e, { visageX: 0, visageY: 0, yeuxEchelle: 1, duration: 0.4, ease: 'power2.out' }, t);
      },
      brasEnLair(tl) {
        son('pop', 0.12); son('whoosh', 0.1, 0.6); son('pas', 0.54, 1.2);
        tl.add(clignerTl(), 0)
          .set(e, { brasGmain: 'ouverte', brasDmain: 'ouverte' }, 0)
          .to(e, { ecrase: 0.12, flechir: 0.5, brasGepaule: 30, brasDepaule: 30, duration: 0.12, ease: 'power2.inOut' }, 0)
          .to(e, Object.assign(cibleExpression('content'), { brasGepaule: 135, brasGcoude: 20, brasDepaule: 135, brasDcoude: 20, ecrase: -0.1,
            hauteur: 30, flechir: 0, visageY: -10, yeuxEchelle: 1.08, duration: 0.24, ease: 'power3.out' }), 0.12)
          .to(e, { hauteur: 0, ecrase: 0.08, visageY: -2, duration: 0.18, ease: 'power2.in' })
          .to(e, { ecrase: 0, visageY: -8, duration: 0.3, ease: 'power3.out' });
        if (!calme) tl.to(e, { brasGcoude: 44, brasDcoude: 44, duration: 0.15, yoyo: true, repeat: 3, ease: 'sine.inOut' }, 0.55);
        tl.set(e, { brasGmain: 'relachee', brasDmain: 'relachee' }, '+=0.2');
        revenirRepos(tl, '<');
        tl.to(e, { visageY: 0, yeuxEchelle: 1, duration: 0.4 }, '<');
      },
      gratterTete(tl, { cote = 'd' } = {}) {
        son('tic', 0.1); son('gratte', 0.4);
        const P = 'bras' + cote.toUpperCase();
        const sommet = cote === 'd' ? [905, 300] : [375, 300];
        const pose = Object.assign(rig.atteindre(cote, sommet, cote === 'd' ? 1 : -1, 'face', true), { [P + 'devant']: 1 });
        tl.add(clignerTl(), 0)
          .set(e, { [P + 'main']: 'ouverte' }, 0)
          .to(e, Object.assign({}, pose, { [P + 'poignet']: 60, corpsRot: cote === 'd' ? 4 : -4, visageX: cote === 'd' ? -10 : 10, visageY: -6, duration: 0.4, ease: 'back.out(1.4)' }), 0)
          .to(e, Object.assign(cibleExpression('reflechit'), { oeilGechelle: 1.07, oeilDechelle: 0.95, duration: 0.3, ease: 'power3.out' }), 0);
        if (!calme) tl.to(e, { [P + 'poignet']: 88, duration: 0.1, yoyo: true, repeat: 9, ease: 'sine.inOut' }, 0.4);
        tl.add(clignerTl(), '+=0.1')
          .to(e, Object.assign(cibleExpression('neutre'), { visageX: 0, visageY: 0, oeilGechelle: 1, oeilDechelle: 1, duration: 0.3, ease: 'back.out(1.4)' }), '<');
        tl.set(e, { [P + 'main']: 'relachee' }, '<');
        revenirRepos(tl, '<');
      },
      saut(tl, { hauteur = 260 } = {}) {
        if (calme) { tl.to(e, Object.assign(cibleExpression('content'), { duration: 0.12 }), 0); return; }
        son('whoosh', 0.25); son('boing', 1.03, 0.8); son('pas', 1.03, 1.4);
        const pointes = e.jambeGpointe !== undefined;
        // Appel : 8 images de descente (genoux qui plient), 2 de pose, 4 de poussée.
        // Bras relâchés d'abord : une main posée (menton, joue) laisse un bras étiré et passé devant,
        // qui resterait démesuré une fois levé.
        tl.to(e, { ecrase: 0.16, flechir: 1, brasGepaule: 30, brasDepaule: 30, visageY: 6, brasGetire: 1, brasDetire: 1,
          brasGdevant: 0, brasDdevant: 0, brasGpoignet: 0, brasDpoignet: 0, duration: 0.133, ease: 'power2.inOut' }, 0)
          .add(clignerTl(), 0.05)
          .set(e, cibleExpression('content'), 0.12)
          .to(e, { ecrase: -0.12, flechir: 0, hauteur: 30, brasGepaule: 120, brasDepaule: 120, visageY: 4, duration: 0.067, ease: 'power2.out' }, 0.166)
          .to(e, { hauteur: hauteur * 0.85, ecrase: -0.05, brasGepaule: 155, brasDepaule: 155, brasGcoude: 8, brasDcoude: 8,
            jambeGgenou: 10, jambeDgenou: -10, jambeGhanche: -6, jambeDhanche: 8, visageY: 2, duration: 0.24, ease: 'power3.out' })
          .to(e, { ecrase: 0, hauteur, visageY: -4, jambeGgenou: -26, jambeDgenou: 26, duration: 0.14, ease: 'sine.out' })
          .to(e, { hauteur: 0, brasGepaule: 70, brasDepaule: 70, jambeGgenou: 0, jambeDgenou: 0, jambeGhanche: 4, jambeDhanche: 0, duration: 0.26, ease: 'power2.in' })
          // Pantin 3D : pieds pointés pendant le vol, remis à plat juste avant de toucher le sol.
          .set(e, pointes ? { jambeGpointe: 1, jambeDpointe: 1 } : {}, 0.2)
          .set(e, pointes ? { jambeGpointe: 0, jambeDpointe: 0 } : {}, '-=0.07')
          // Réception : 4 images d'absorption dans les jambes, 1 de pose, 10 de retour. Aucun rebond.
          .to(e, { ecrase: 0.145, flechir: 0.8, visageY: 6, brasGepaule: 46, brasDepaule: 46, duration: 0.067, ease: 'power2.out' })
          .to({}, { duration: 0.017 })
          .to(e, { ecrase: 0, flechir: 0, visageY: 0, duration: 0.17, ease: 'power3.out' });
        revenirRepos(tl, '<');
      },
      chute(tl, { depuis = 900 } = {}) {
        // Arrivée par le haut : impact absorbé par les jambes, un seul petit rebond, il se remet.
        if (calme) { tl.set(e, { hauteur: 0 }); return; }
        son('chute', 0); son('boum', 0.5); son('pas', 0.83, 0.9);
        tl.set(e, { hauteur: depuis, ecrase: -0.12, brasGepaule: 160, brasDepaule: 160, brasGcoude: 0, brasDcoude: 0, visageY: 6 }, 0)
          .set(e, Object.assign(cibleExpression('choque'), { yeuxEchelle: 1.2 }), 0)
          .to(e, { hauteur: 0, duration: 0.5, ease: 'power2.in' }, 0)
          // Impact : 3 images de compression, 2 de pose ; les bras continuent de descendre.
          .to(e, { ecrase: 0.21, flechir: 1, visageY: 8, brasGepaule: 70, brasDepaule: 70, duration: 0.05, ease: 'power2.out' }, 0.5)
          .to(e, { clin: 1, duration: 0.033, ease: 'power2.in' }, 0.5)
          .to(e, { clin: 0, duration: 0.066, ease: 'power2.out' }, 0.56)
          .to(e, { brasGepaule: 48, brasDepaule: 48, duration: 0.05, ease: 'power2.out' }, 0.55)
          // Un seul rebond : 8 % de la hauteur du corps, sur 12 images.
          .to(e, { hauteur: 52, ecrase: -0.06, flechir: 0, visageY: -2, duration: 0.1, ease: 'power2.out' }, 0.583)
          .to(e, { hauteur: 0, ecrase: 0, duration: 0.1, ease: 'power2.in' })
          .to(e, { ecrase: 0.08, flechir: 0.45, visageY: 4, duration: 0.067, ease: 'power2.out' })
          .to(e, { ecrase: 0, flechir: 0, visageY: 0, duration: 0.2, ease: 'power3.out' })
          .to(e, Object.assign(cibleExpression('content'), { yeuxEchelle: 1.04, duration: 0.25, ease: 'power3.out' }), '-=0.15');
        revenirRepos(tl, '<');
      },
    };
    function geste(nom, opts = {}) { return jouer((tl) => GESTES[nom](tl, opts), opts); }

    // ---------- Déplacement ----------
    // Petit saut sur place pendant lequel on change de vue ou de sens (le demi-tour).
    function sautillerVers(tl, { vue, sens }, pos = '>') {
      const t = tl.duration();
      const at = pos === '>' ? t : pos;
      if (calme) { tl.set(e, Object.assign({}, { vue, sens }, rig.reposVue(vue)), at); return; }
      // Le changement de vue se fait en l'air, les yeux fermés : on ne voit pas la bascule.
      son('pop', (typeof at === 'number' ? at : tl.duration()) + 0.1, 0.5); son('pas', (typeof at === 'number' ? at : tl.duration()) + 0.4, 0.8);
      tl.to(e, { ecrase: 0.12, flechir: 0.6, visageY: 4, duration: 0.1, ease: 'power2.inOut' }, at)
        .to(e, { hauteur: 40, ecrase: -0.08, flechir: 0, clin: 1, duration: 0.14, ease: 'power2.out' })
        .set(e, Object.assign({ vue, sens }, rig.reposVue(vue), { hauteur: 40, ecrase: -0.08 }))
        .to(e, { hauteur: 0, ecrase: 0, visageY: 0, clin: 0, duration: 0.14, ease: 'power2.in' })
        .to(e, { ecrase: 0.1, flechir: 0.5, duration: 0.067, ease: 'power2.out' })
        .to(e, { ecrase: 0, flechir: 0, duration: 0.2, ease: 'power3.out' });
    }
    function demiTour(opts = {}) {
      return jouer((tl) => {
        const vue = opts.vue || (e.vue === 'face' ? 'tq' : e.vue);
        sautillerVers(tl, { vue, sens: -e.sens }, 0);
      }, opts);
    }
    function tourner(vue, sens, opts = {}) { return jouer((tl) => sautillerVers(tl, { vue, sens: sens || e.sens }, 0), opts); }

    // Cycle de marche ou de course, vue de profil. phase : 0 -> 1 = deux pas.
    // Les pieds sont posés par cinématique inverse : le pied d'appui reste planté au sol
    // pendant que le corps avance ; l'autre se lève et passe devant. Pas de glissade.
    const ALLURES = {
      marche: { cycle: 0.74, hanche: 26, appui: 0.55, lever: 30, bras: 30, coude: -12, penche: 3, rebond: 7, ecrase: 0.03, pied: 16 },
      course: { cycle: 0.5, hanche: 50, appui: 0.36, lever: 70, bras: 52, coude: -75, penche: 9, rebond: 26, ecrase: 0.07, pied: 24 },
    };
    const GEOP = () => rig.VUES_GEO.profil;
    const lisse = (t) => t * t * (3 - 2 * t);
    function piedCycle(q, A, S, amp, H) {
      // q : phase propre à la jambe (0 = le pied se pose devant). y = hauteur au-dessus du sol.
      if (q < A.appui) {
        const u = q / A.appui;
        return { x: H[0] + S / 2 - S * u, haut: 0, pied: 0, appui: true };
      }
      const u = (q - A.appui) / (1 - A.appui);
      return {
        x: H[0] - S / 2 + S * lisse(u), haut: A.lever * amp * Math.sin(Math.PI * u), appui: false,
        pied: (u < 0.35 ? A.pied * 0.7 : -A.pied * 0.6) * amp, // pointe en bas au décollage, levée à l'attaque
      };
    }
    function poseCycle(phase, allure, amp, foulee = null) {
      const A = ALLURES[allure], w = 2 * Math.PI * phase;
      const S = (foulee !== null ? foulee : 2 * 134 * Math.sin(A.hanche * Math.PI / 180)) * (allure === 'course' ? 0.7 : 1) * amp;
      const geo = GEOP().jambes;
      const pieds = [['g', 0], ['d', 0.5]].map(([cote, decal]) => [cote, piedCycle((phase + decal) % 1, A, S, amp, geo[cote].H)]);
      // Le corps descend juste ce qu'il faut pour que le pied d'appui touche le sol (jambes
      // courtes : pied loin devant ou derrière = hanche plus basse) ; en course, il décolle
      // entre deux appuis.
      const L = 0.995 * (rig.GEO.jambes.g.L1 + rig.GEO.jambes.g.L2), hanche0 = 1000 - geo.g.H[1];
      let h = allure === 'course' ? A.rebond * amp * Math.max(0, Math.sin(2 * w)) : 2 * amp;
      for (const [cote, f] of pieds) {
        if (!f.appui) continue;
        const dx = f.x - geo[cote].H[0];
        h = Math.min(h, Math.sqrt(Math.max(0, L * L - dx * dx)) - hanche0);
      }
      e.hauteur = h;
      e.ecrase = A.ecrase * amp * Math.max(0, -h) / 14;
      e.corpsRot = (A.penche + 2 * Math.sin(2 * w - 0.6)) * amp;
      for (const [cote, f] of pieds) {
        const P = 'jambe' + cote.toUpperCase();
        // Repère du personnage : il est décalé de -hauteur, le sol y est donc à 1000 + h.
        e[P + 'ik'] = 1; e[P + 'px'] = f.x; e[P + 'py'] = 1000 + h - f.haut; e[P + 'pied'] = f.pied;
      }
      // Bras en opposition avec les jambes.
      const sb = Math.sin(w);
      e.brasGepaule = 8 - A.bras * sb * amp; e.brasDepaule = 8 - A.bras * sb * amp;
      e.brasGcoude = A.coude * amp; e.brasDcoude = -A.coude * amp;
    }
    // Aller de la position actuelle à x (coordonnées de scène), en marchant ou en courant.
    function allerA(x, opts = {}) {
      const allure = opts.allure || 'marche';
      const A = ALLURES[allure];
      return jouer((tl) => {
        const sens = x >= e.x ? 1 : -1;
        const distance = Math.abs(x - e.x);
        if (distance < 1) return;
        if (calme) { tl.set(e, { x }); return; }
        const vueDepart = e.vue;
        if (e.vue !== 'profil' || e.sens !== sens) sautillerVers(tl, { vue: 'profil', sens }, 0);
        // Nombre de pas, puis foulée ajustée pour tomber pile sur x. La vitesse du corps
        // suit exactement le recul du pied d'appui (rampes de départ et d'arrivée comprises).
        const fouleeType = 2 * 134 * Math.sin(A.hanche * Math.PI / 180) * e.echelle;
        const cycles = Math.max(1, Math.round(distance / (2 * fouleeType) * 2) / 2);
        const r = Math.min(0.4, cycles / 3);
        const ampA = (p) => lisse(Math.max(0, Math.min(1, p / r))) * lisse(Math.max(0, Math.min(1, (cycles - p) / r)));
        const N = 400, cumul = [0];
        for (let i = 1; i <= N; i++) cumul.push(cumul[i - 1] + ampA((i - 0.5) * cycles / N) * cycles / N);
        const integrale = cumul[N];
        const foulee = distance / e.echelle / (2 * integrale); // en unités du personnage
        const duree = cycles * A.cycle;
        const proxy = { phase: 0 };
        const x0Ref = { v: null };
        tl.to(e, { corpsRot: -A.penche * 0.6, ecrase: 0.05, duration: 0.12, ease: 'power2.out' }, tl.duration());
        const t0 = tl.duration();
        tl.to(proxy, {
          phase: cycles, duration: duree, ease: 'none',
          onStart: () => { x0Ref.v = e.x; },
          onUpdate: () => {
            if (x0Ref.v === null) x0Ref.v = e.x;
            const p = proxy.phase, amp = ampA(p);
            const k = Math.min(N, Math.max(0, Math.floor((p / cycles) * N)));
            poseCycle(p % 1, allure, amp, foulee);
            e.x = x0Ref.v + sens * 2 * foulee * e.echelle * cumul[k];
          },
          onComplete: () => { e.x = x; },
        }, t0);
        // Un petit bruit de pas à chaque pose de pied.
        for (let k = 0; k < cycles * 2; k++) if (ampA(k / 2) > 0.15) son('pas', t0 + (k / 2) * A.cycle, allure === 'course' ? 1 : 0.75);
        tl.set(e, { jambeGik: 0, jambeDik: 0, x }, '>');
        // Arrêt : l'élan le fait pencher en avant, puis il se rattrape.
        tl.to(e, { corpsRot: A.penche * 1.8, ecrase: -0.04, duration: 0.12, ease: 'power2.out' }, '>')
          .to(e, { corpsRot: -2, ecrase: 0.04, duration: 0.16, ease: 'power2.inOut' })
          .to(e, { corpsRot: 0, ecrase: 0, duration: 0.3, ease: 'power3.out' });
        if (opts.finir !== false) sautillerVers(tl, { vue: opts.vueArrivee || (vueDepart === 'profil' ? 'face' : vueDepart), sens: 1 }, '-=0.25');
      }, opts);
    }

    // ---------- Vidéo ----------
    // ---------- Extensions : un fichier par geste (pantin3d/gestes3d/*.js) ----------
    // Chaque fichier pousse dans window.RevizAnimExtensions une fonction (outils) => { … } qui remplace un
    // geste (outils.GESTES.brasEnLair = …) ou une expression (outils.SCENES.fier = (tl, M) => …), en
    // général seulement si le pantin a sa grande main (outils.rig.mainsDispo('d').includes('enlair')).
    const OUTILS = { e, rig, calme, gsap, son, clignerTl, cibleExpression, visageDe, main, mains, brasAngles, brasRepos, revenirRepos, GESTES, SCENES };
    for (const ext of global.RevizAnimExtensions || []) ext(OUTILS);

    function temps(t) {
      // Les ressorts avancent image par image : on les remet à zéro si on saute en arrière.
      if (dernier !== null && t < dernier) dernier = null;
      maitre.time(t, false);
      if (dernier === null || Math.abs(maitre.time() - dernier) > 1e-6) { ressorts(dernier === null ? 0 : t - dernier); dernier = t; }
      rig.rendre();
    }
    function duree() { return maitre.duration(); }
    function placer(t) { curseur = t; }
    let finActions = 0;
    function fin() { return finActions; } // fin de la dernière action posée (hors boucles de vie)
    function cloturer(t) { poserMaintien(t); } // vidéo : arrête le dernier maintien à t

    return {
      etat: e, rig, maitre, calme, EXPRESSIONS, GESTES, ALLURES, VISEME,
      demarrerVie, arreterVie, detruire, pause, reprendre, semerClignements, cligner, regarder, regardVers, suivre,
      expression, expressionTl, geste, demiTour, tourner, allerA, poseCycle,
      parler, minutageSyllabes, parlerAmplitude, enveloppeAudio,
      temps, duree, placer, fin, cloturer, sons,
    };
  }

  global.RevizAnim = { creer, EXPRESSIONS };
})(typeof window !== 'undefined' ? window : globalThis);
