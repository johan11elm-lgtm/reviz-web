/* Réviz D1 : le pantin 2D.
 *
 * Aucune dépendance. Le pantin est un objet d'état fait de nombres (angles,
 * ouvertures, positions) ; rendre() recopie cet état dans le SVG. GSAP ou
 * n'importe quel autre moteur anime l'état, jamais le DOM directement : c'est ce
 * qui rend le même pantin utilisable dans l'app et dans les vidéos (timeline
 * GSAP en pause, positionnée image par image).
 *
 * Toutes les coordonnées sont celles de l'image de référence m1-d1-net.png
 * (1254 × 1254). Le point d'ancrage du personnage est le centre de son ombre au
 * sol (651, 1048).
 *
 * Usage :
 *   const r = RevizD1.creer(svgOuGroupe, { x: 600, y: 1000, echelle: 0.5 });
 *   r.etat.regardX = 0.6; r.rendre();
 */
(function (global) {
  'use strict';

  const NS = 'http://www.w3.org/2000/svg';
  const RAD = Math.PI / 180;
  const D = global.REVIZ_D1_PIECES;
  if (!D) throw new Error('reviz-d1-pieces.js doit être chargé avant reviz-rig.js');
  const C = Object.assign({}, D.couleurs, { langue: '#F0857A', dents: '#FFFDF8', ligne: '#552410', flanc: '#FCDAB4',
    contour: '#EDB585', reflet: '#FFF4E4', dessous: '#F7CC9E', paupiere: '#FBE1BE' }); // paupière proche de la peau (conseil Codex)

  // ---------- Géométrie mesurée sur l'image de référence ----------
  const GEO = {
    ancre: [651.2, 1048],
    sol: { rx: 310.7, ry: 33 },
    pivotCorps: [640, 896],
    yeux: {
      g: {
        blanc: [486, 542.2, 104.9, 106.5, 121], iris: [510.3, 541.5, 81.4], pupille: [515, 537, 41],
        reflets: [[478, 512.8, 22.9], [552.9, 570.5, 11.8]], doux: [552.1, 494.5, 19.6, 52.5, -49.6],
      },
      d: {
        blanc: [832, 547.3, 104, 106, 17.4], iris: [806.4, 546.5, 80.4], pupille: [811, 542, 40],
        reflets: [[774, 521.8, 22.7], [849.9, 579.1, 11.7]], doux: [843.3, 498.9, 22.5, 57.6, -48.5],
      },
    },
    // Sourcils : extrémité intérieure... extérieure, point de contrôle (courbe du 2e degré).
    sourcils: {
      g: { a: [444, 423.4], c: [510.5, 395.1], b: [577, 440.9] },
      d: { a: [741, 453.4], c: [806, 402.6], b: [871, 420.3] },
      ep: 29.1,
    },
    bouche: { o: [656.5, 639.75], ep: 17.9 },
    bras: {
      g: { S: [247.7, 682.3], E: [169.4, 623.4], W: [132, 533], ep: 42.8 },
      d: { S: [1040.8, 672.9], E: [1022.1, 769.2], W: [1047, 864], ep: 41.6 },
    },
    // Épaules quand le bras passe devant le corps : au bord de la silhouette, à hauteur d'épaule.
    epaulesDevant: { g: [212, 662], d: [1070, 662] },
    jambes: {
      g: { H: [527.3, 866], K: [521.5, 945], A: [516.5, 1000], ep: 44.5,
        bandes: [[C.ombre, 56, 60], [C.creux, 44, 48]] },
      d: { H: [755.5, 866], K: [755.5, 945], A: [755.5, 1000], ep: 44,
        bandes: [[C.ombre, 55, 53]] },
    },
    // Lobes avant (cercles ajustés sur les bords visibles) : ils passent devant
    // le bas des yeux et devant les épaules.
    // Chaque lobe : [cx, cy, r, plancher] ; le plancher (y minimal, fonction de x)
    // empêche un lobe de passer devant ce qui est au-dessus de lui sur l'image.
    avant: [
      [354.5, 692.9, 107.2, (x) => (x <= 352 ? 626 : x >= 392 ? 572 : 626 - ((x - 352) / 40) * 54)],
      [446.6, 753.2, 161.9], [656.7, 702.8, 133.1], [862.2, 769.8, 166.6],
      [963.4, 693.1, 117.3, () => 660], // épaule droite : seulement sa moitié basse, pour ne pas couper l'œil
    ],
  };

  // Vues de côté (trois-quarts B, profil B), déjà ramenées à l'échelle de la vue
  // de face par construire_vues.py. Mêmes bras et mêmes jambes que de face ;
  // seuls changent les points d'attache, les mains et les pieds décalqués.
  // En profil, « g » est le bras / la jambe du fond, « d » ceux de devant.
  const VUES_GEO = {
    tq: {
      bras: { g: { S: [374.8, 693.3], main: 'mainG', W: [267.7, 858.7], phi: 12.5 },
        d: { S: [918, 668], main: 'mainD', W: [960.9, 858.7], phi: -40.9 } },
      jambes: { g: { H: [531, 866] }, d: { H: [730, 866] } },
      pieds: { g: { src: 'piedG', A: [512.3, 999], rot: 0, semelle: 75.7 },
        d: { src: 'piedD', A: [723.3, 999], rot: 0, semelle: 70.9 } },
    },
    profil: {
      bras: { g: { S: [262, 600], main: 'mainG', W: [182.1, 751.7], phi: 45.3 },
        d: { S: [830, 752], main: 'mainD', W: [1003.6, 807], phi: -72.7 } },
      jambes: { g: { H: [580, 866] }, d: { H: [690, 866] } },
      pieds: { g: { src: 'piedD', A: [799.2, 968.2], rot: 19.5, semelle: 92.8 },
        d: { src: 'piedD', A: [799.2, 968.2], rot: 19.5, semelle: 92.8 } },
    },
  };
  const SEMELLE_FACE = 48; // cheville -> sol, vue de face

  const OMBRE_BRAS = [3, 9]; // décalage de l'ombre portée des bras (px)
  const longueur = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);
  // Angle d'un segment, convention SVG : 0 = vers le bas, positif = sens horaire.
  const angle = (a, b) => Math.atan2(-(b[0] - a[0]), b[1] - a[1]) / RAD;
  const dir = (phi) => [-Math.sin(phi * RAD), Math.cos(phi * RAD)];
  const f1 = (v) => (Math.round(v * 10) / 10).toString();

  // Longueurs et angles de la pose de référence, déduits des points mesurés.
  for (const cote of ['g', 'd']) {
    const s = cote === 'g' ? 1 : -1;
    const b = GEO.bras[cote];
    b.L1 = longueur(b.S, b.E); b.L2 = longueur(b.E, b.W);
    b.phi1 = angle(b.S, b.E); b.phi2 = angle(b.E, b.W);
    const j = GEO.jambes[cote];
    j.L1 = longueur(j.H, j.K); j.L2 = longueur(j.K, j.A);
    j.phi1 = angle(j.H, j.K); j.phi2 = angle(j.K, j.A);
    b.s = s; j.s = s;
  }

  // ---------- Bouches : une bouche = quelques nombres, interpolables ----------
  // largeur, coinG / coinD (hauteur des coins), haut / bas (creux des lèvres,
  // point de contrôle), langue (0-1), dents (0-1, haut), dentsBas (0-1).
  const BOUCHES = {
    repos: { largeur: 99, coinG: 1.1, coinD: -1.1, haut: 52.3, bas: 52.3, langue: 0, dents: 0, dentsBas: 0 },
    A: { largeur: 74, coinG: 0, coinD: 0, haut: 12, bas: 96, langue: 0.75, dents: 0, dentsBas: 0 },
    EI: { largeur: 96, coinG: -6, coinD: -6, haut: 22, bas: 60, langue: 0.25, dents: 1, dentsBas: 0 },
    O: { largeur: 52, coinG: 12, coinD: 12, haut: -34, bas: 82, langue: 0.4, dents: 0, dentsBas: 0 },
    U: { largeur: 34, coinG: 14, coinD: 14, haut: -10, bas: 40, langue: 0, dents: 0, dentsBas: 0 },
    MBP: { largeur: 70, coinG: 8, coinD: 8, haut: 14, bas: 14, langue: 0, dents: 0, dentsBas: 0 },
    FV: { largeur: 80, coinG: 2, coinD: 2, haut: 18, bas: 40, langue: 0, dents: 1, dentsBas: 0 },
    L: { largeur: 78, coinG: 0, coinD: 0, haut: 10, bas: 74, langue: 1.6, dents: 0.6, dentsBas: 0 },
    rire: { largeur: 124, coinG: -14, coinD: -14, haut: 26, bas: 128, langue: 0.85, dents: 1, dentsBas: 0 },
    cri: { largeur: 84, coinG: 10, coinD: 10, haut: -40, bas: 122, langue: 0.6, dents: 0.4, dentsBas: 0.4 },
    triste: { largeur: 70, coinG: 22, coinD: 22, haut: -22, bas: -22, langue: 0, dents: 0, dentsBas: 0 },
    petit: { largeur: 46, coinG: 4, coinD: 4, haut: 24, bas: 24, langue: 0, dents: 0, dentsBas: 0 },
    moue: { largeur: 58, coinG: 2, coinD: -10, haut: 10, bas: 10, langue: 0, dents: 0, dentsBas: 0 },
    choc: { largeur: 46, coinG: 12, coinD: 12, haut: -28, bas: 66, langue: 0.3, dents: 0, dentsBas: 0 },
    serre: { largeur: 82, coinG: 4, coinD: 4, haut: 10, bas: 30, langue: 0, dents: 1, dentsBas: 1 },
    fier: { largeur: 104, coinG: -10, coinD: -16, haut: 40, bas: 40, langue: 0, dents: 0, dentsBas: 0 },
  };
  const CLES_BOUCHE = Object.keys(BOUCHES.repos);

  // ---------- État : la pose de repos (bras le long du corps) ----------
  function etatRepos() {
    return {
      // Placement dans la scène
      x: GEO.ancre[0], y: GEO.ancre[1], echelle: 1, sens: 1,
      vue: 'face',          // 'face', 'tq' (trois-quarts) ou 'profil' ; sens = -1 pour regarder à gauche
      // Corps
      hauteur: 0,          // saut, en px au-dessus du sol
      flotte: 0,           // flottement de la boucle de vie (s'ajoute à la hauteur)
      inclinaison: 0,      // bascule de tout le personnage autour des pieds (degrés)
      corpsX: 0, corpsY: 0, // décalage du corps par rapport aux hanches
      corpsRot: 0,          // rotation du corps (degrés)
      ecrase: 0,            // > 0 écrasé, < 0 étiré (squash & stretch)
      respire: 0,           // 0-1, ajouté par la boucle de vie
      ombre: 1,             // opacité de l'ombre au sol
      // Yeux
      regardX: 0, regardY: 0,           // -1 à 1
      paupG: 0, paupD: 0,               // paupière haute : 0 ouverte, 1 fermée
      paupBasG: 0, paupBasD: 0,         // paupière basse : 0 en bas, 1 remontée
      paupPenteG: 0, paupPenteD: 0,     // pente de la paupière haute (degrés, + = coin intérieur bas)
      clin: 0,                          // clignement en cours (0-1), s'ajoute aux paupières
      rieurs: 0,                        // yeux fermés en arc (fou rire, fierté)
      pupille: 1,                       // taille de la pupille
      yeuxEchelle: 1, yeuxEtire: 1,     // yeux agrandis (choc) ou écrasés ; étirement vertical
      oeilGechelle: 1, oeilDechelle: 1, // un œil plus grand que l'autre (doute, sourcil levé)
      visageX: 0, visageY: 0,           // le visage glisse sur le corps (tête qui tourne, qui se penche)
      // Couche « vie » qui s'ajoute aux poses (balancement, regards qui traînent) :
      // la boucle de repos ne se bat jamais avec les expressions.
      balance: 0, regardVieX: 0, regardVieY: 0, visageVieX: 0, visageVieY: 0,
      saccadeX: 0, saccadeY: 0, // micro-saccades : de tout petits sauts d'yeux permanents
      // Couche « ressorts » (calculée par reviz-anim.js) : visage, sourcils et bras traînent
      // derrière le corps puis se calent, comme s'ils avaient du poids.
      ressortX: 0, ressortY: 0, ressortSourcil: 0, ressortBras: 0,
      flechir: 0,           // 0-1 : le bassin descend et les genoux plient (impacts, appels de saut)
      iris: 1,                          // taille de l'iris (choc : plus petit)
      // Sourcils (dy en px, rot en degrés, courbe en px)
      sourcilGy: 0, sourcilDy: 0, sourcilGrot: 0, sourcilDrot: 0, sourcilGcourbe: 0, sourcilDcourbe: 0,
      // Bouche
      ...BOUCHES.repos, boucheX: 0, boucheY: 0, boucheEchelle: 1,
      bulle: 0,             // bulle de sommeil (0-1)
      // Bras (angles en degrés, positif = vers l'extérieur)
      brasGepaule: 18, brasGcoude: -6, brasGpoignet: 0, brasGmain: 'relachee', brasGflanc: 0,
      brasDepaule: 14, brasDcoude: -6, brasDpoignet: 0, brasDmain: 'relachee', brasDflanc: 1,
      brasGdevant: 0, brasDdevant: 0, // 1 : le bras passe devant les lobes du bas (main posée sur le corps)
      brasStyle: 'contour', // sur le corps : 'contour' (retenu), 'ombre', 'deuxTons' ou 'complet'
      // Jambes
      jambeGhanche: 4.2, jambeGgenou: 1, jambeGpied: 0,
      jambeDhanche: 0, jambeDgenou: 0, jambeDpied: 0,
      // Jambes en cinématique inverse (marche) : la cheville va sur un point du sol.
      // ik : 0 = angles ci-dessus, 1 = cible ; px/py en coordonnées du personnage.
      jambeGik: 0, jambeGpx: 0, jambeGpy: 0, jambeDik: 0, jambeDpx: 0, jambeDpy: 0,
    };
  }

  // La pose exacte de l'image de référence (coucou du bras gauche).
  function poseReference() {
    const p = {};
    const bg = GEO.bras.g, bd = GEO.bras.d;
    p.brasGepaule = bg.phi1; p.brasGcoude = bg.phi2 - bg.phi1; p.brasGpoignet = 0; p.brasGmain = 'ouverte';
    p.brasDepaule = -bd.phi1; p.brasDcoude = -(bd.phi2 - bd.phi1); p.brasDpoignet = 0; p.brasDmain = 'relachee';
    const jg = GEO.jambes.g, jd = GEO.jambes.d;
    p.jambeGhanche = jg.phi1; p.jambeGgenou = jg.phi2 - jg.phi1;
    p.jambeDhanche = -jd.phi1; p.jambeDgenou = -(jd.phi2 - jd.phi1);
    return p;
  }

  // ---------- Aides SVG ----------
  function el(nom, attrs, parent) {
    const e = document.createElementNS(NS, nom);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  let compteur = 0;

  // Mat. 2D [a b c d e f] (comme SVG)
  const mul = (m, n) => [
    m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1],
    m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3],
    m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5],
  ];
  const T = (x, y) => [1, 0, 0, 1, x, y];
  const R = (deg) => { const c = Math.cos(deg * RAD), s = Math.sin(deg * RAD); return [c, s, -s, c, 0, 0]; };
  const S = (sx, sy) => [sx, 0, 0, sy, 0, 0];
  const app = (m, p) => [m[0] * p[0] + m[2] * p[1] + m[4], m[1] * p[0] + m[3] * p[1] + m[5]];
  const inv = (m) => {
    const d = m[0] * m[3] - m[1] * m[2];
    return [m[3] / d, -m[1] / d, -m[2] / d, m[0] / d, (m[2] * m[5] - m[3] * m[4]) / d, (m[1] * m[4] - m[0] * m[5]) / d];
  };
  const matStr = (m) => `matrix(${m.map((v) => +v.toFixed(4)).join(' ')})`;

  // ---------- Matière « argile » : filtres de lumière ----------
  // Le relief vient de la silhouette floutée (bords arrondis) et de la luminosité du
  // dessin (les bandes d'ombre du bas des lobes deviennent des creux) : chaque lobe
  // se bombe. Lumière en haut à gauche, reflet satiné doux, grain de pâte très fin.
  // Les ombres portées restent nettes (décalage sans flou).
  function construireFiltresArgile(defs, id, force) {
    const az = 235, el2 = 48;
    const f = (nom, attrs, enfants) => {
      const filtre = el('filter', Object.assign({ id: `${id}-${nom}`, filterUnits: 'userSpaceOnUse', x: -400, y: -400, width: 2100, height: 2100, 'color-interpolation-filters': 'sRGB' }, attrs), defs);
      filtre.innerHTML = enfants;
      return filtre;
    };
    // Le facteur de lumière est borné : les creux s'assombrissent (jusqu'à -22 %), les
    // bosses ne gagnent que +5 % : la couleur crème reste chaude, rien ne blanchit.
    const pente = 0.3 * force, lumPlat = Math.sin(el2 * RAD);
    const fact = (nom) => `<feComponentTransfer in="${nom}" result="${nom}F">
        <feFuncR type="linear" slope="${pente.toFixed(3)}" intercept="${(1 - pente * lumPlat).toFixed(3)}"/>
        <feFuncG type="linear" slope="${(pente * 1.08).toFixed(3)}" intercept="${(1 - pente * 1.08 * lumPlat).toFixed(3)}"/>
        <feFuncB type="linear" slope="${(pente * 1.25).toFixed(3)}" intercept="${(1 - pente * 1.25 * lumPlat).toFixed(3)}"/>
        <feFuncA type="linear" slope="0" intercept="1"/></feComponentTransfer>`;
    f('argile', {}, `
      <feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  2.1 3.3 0.6 0 -5.1" result="lum"/>
      <feComposite in="lum" in2="SourceAlpha" operator="in" result="lumA"/>
      <feGaussianBlur in="lumA" stdDeviation="8" result="h1"/>
      <feGaussianBlur in="SourceAlpha" stdDeviation="22" result="h2"/>
      <feComposite in="h1" in2="h2" operator="arithmetic" k2="1.1" k3="0.5" result="haut"/>
      <feDiffuseLighting in="haut" surfaceScale="${10 * force}" diffuseConstant="1" lighting-color="#ffffff" result="diff">
        <feDistantLight azimuth="${az}" elevation="${el2}"/></feDiffuseLighting>
      ${fact('diff')}
      <feSpecularLighting in="haut" surfaceScale="${10 * force}" specularConstant="${0.32 * force}" specularExponent="24" lighting-color="#fff1df" result="spec">
        <feDistantLight azimuth="${az}" elevation="${el2}"/></feSpecularLighting>
      <feComposite in="spec" in2="SourceAlpha" operator="in" result="specA"/>
      <feComposite in="SourceGraphic" in2="diffF" operator="arithmetic" k1="1" result="ombre"/>
      <feComposite in="specA" in2="ombre" operator="arithmetic" k2="${(0.16 * force).toFixed(3)}" k3="1" result="brille"/>
      <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="7" result="bruit"/>
      <feColorMatrix in="bruit" type="saturate" values="0" result="bruitG"/>
      <feComposite in="brille" in2="bruitG" operator="arithmetic" k1="${(0.06 * force).toFixed(3)}" k2="${(1 - 0.03 * force).toFixed(3)}" result="grain"/>
      <feComposite in="grain" in2="SourceAlpha" operator="in"/>`);
    // Petits boudins en relief (vaisseaux, sourcils) : arrondi, reflet, ombre portée nette.
    const relief = (nom, flou, hauteur, dx, dy) => f(nom, {}, `
      <feGaussianBlur in="SourceAlpha" stdDeviation="${flou}" result="b"/>
      <feDiffuseLighting in="b" surfaceScale="${hauteur * force}" diffuseConstant="1" result="d"><feDistantLight azimuth="${az}" elevation="50"/></feDiffuseLighting>
      <feSpecularLighting in="b" surfaceScale="${hauteur * force}" specularConstant="${0.7 * force}" specularExponent="18" lighting-color="#ffffff" result="s"><feDistantLight azimuth="${az}" elevation="50"/></feSpecularLighting>
      <feComposite in="s" in2="SourceAlpha" operator="in" result="sA"/>
      ${fact('d')}
      <feComposite in="SourceGraphic" in2="dF" operator="arithmetic" k1="1" result="o"/>
      <feComposite in="sA" in2="o" operator="arithmetic" k2="${(0.3 * force).toFixed(3)}" k3="1" result="r"/>
      <feComposite in="r" in2="SourceAlpha" operator="in" result="r2"/>
      <feOffset in="SourceAlpha" dx="${dx * force}" dy="${dy * force}" result="off"/>
      <feFlood flood-color="#B9744A" flood-opacity="${(0.28 * force).toFixed(3)}"/>
      <feComposite in2="off" operator="in" result="portee"/>
      <feMerge><feMergeNode in="portee"/><feMergeNode in="r2"/></feMerge>`);
    relief('relief', 3.5, 4, 2, 4);
    // Bras et jambes : des tubes de pâte, plus épais.
    f('membre', {}, `
      <feGaussianBlur in="SourceAlpha" stdDeviation="9" result="b"/>
      <feDiffuseLighting in="b" surfaceScale="${6 * force}" diffuseConstant="1" result="d"><feDistantLight azimuth="${az}" elevation="${el2}"/></feDiffuseLighting>
      <feSpecularLighting in="b" surfaceScale="${6 * force}" specularConstant="${0.45 * force}" specularExponent="14" lighting-color="#fff4e6" result="s"><feDistantLight azimuth="${az}" elevation="${el2}"/></feSpecularLighting>
      <feComposite in="s" in2="SourceAlpha" operator="in" result="sA"/>
      ${fact('d')}
      <feComposite in="SourceGraphic" in2="dF" operator="arithmetic" k1="1" result="o"/>
      <feComposite in="sA" in2="o" operator="arithmetic" k2="${(0.14 * force).toFixed(3)}" k3="1" result="r"/>
      <feComposite in="r" in2="SourceAlpha" operator="in"/>`);
  }

  // ---------- Construction ----------
  function creer(parent, options = {}) {
    const id = 'rz' + (++compteur);
    const etat = Object.assign(etatRepos(), options.etat || {});
    for (const k of ['x', 'y', 'echelle', 'sens']) if (options[k] !== undefined) etat[k] = options[k];

    const racine = el('g', { class: 'reviz-d1' }, parent);
    const defs = el('defs', {}, racine);

    // Matière : 'plat' (dessin d'origine) ou 'argile' (lumière de pâte à modeler, comme
    // l'ancienne mascotte 3D). L'argile passe par des filtres de lumière SVG.
    const argile = options.matiere === 'argile';
    const force = options.force !== undefined ? options.force : 1;
    if (argile) construireFiltresArgile(defs, id, force);

    // Corps décalqué (servira deux fois : arrière, puis lobes avant par-dessus).
    const contenu = el('g', { id: id + '-corps' }, defs);
    el('clipPath', { id: id + '-silh' }, defs).appendChild(el('path', { d: D.corps.silhouette }));
    const base = el('g', {}, contenu);
    if (argile && global.REVIZ_D1_ARGILE) {
      // Corps modelé : volume et lumière précalculés (outils/argile.py), une seule image.
      el('image', { href: global.REVIZ_D1_ARGILE, x: 0, y: 0, width: 1254, height: 1254, 'clip-path': `url(#${id}-silh)` }, base);
    } else {
      el('path', { d: D.corps.silhouette, fill: C.creme }, base);
      const ombres = el('g', { 'clip-path': `url(#${id}-silh)` }, base);
      el('path', { d: D.corps.ombre, fill: C.ombre }, ombres);
      el('path', { d: D.corps.creux, fill: C.creux }, ombres);
    }
    el('path', { d: D.corps.vaisseaux, fill: C.vaisseau, ...(argile ? { filter: `url(#${id}-relief)` } : {}) }, contenu);

    const clipAvant = el('clipPath', { id: id + '-avant' }, defs);
    for (const [cx, cy, r, plancher] of GEO.avant) {
      if (!plancher) { el('circle', { cx, cy, r }, clipAvant); continue; }
      const pts = [];
      for (let i = 0; i < 96; i++) {
        const a = (i / 96) * 2 * Math.PI, x = cx + r * Math.cos(a);
        pts.push([x, Math.max(plancher(x), cy + r * Math.sin(a))]);
      }
      el('path', { d: 'M' + pts.map((p) => p.map(f1).join(' ')).join('L') + 'Z' }, clipAvant);
    }

    // Yeux : clips (forme du blanc) en coordonnées du corps.
    const yeux = {};
    for (const cote of ['g', 'd']) {
      const g = GEO.yeux[cote];
      const [cx, cy, rx, ry, rot] = g.blanc;
      el('clipPath', { id: `${id}-oeil-${cote}` }, defs).appendChild(el('ellipse', { cx, cy, rx, ry, transform: `rotate(${rot} ${cx} ${cy})` }));
      const [ix, iy, ir] = g.iris;
      el('clipPath', { id: `${id}-iris-${cote}` }, defs).appendChild(el('circle', { cx: ix, cy: iy, r: ir }));
      // Les cils ne débordent pas de l'œil quand la paupière est penchée (marge de 7 px).
      el('clipPath', { id: `${id}-cils-${cote}` }, defs).appendChild(el('ellipse', { cx, cy, rx: rx + 7, ry: ry + 7, transform: `rotate(${rot} ${cx} ${cy})` }));
    }

    // Calques, de l'arrière vers l'avant.
    const ombreSol = el('ellipse', { cx: GEO.ancre[0], cy: GEO.ancre[1], rx: GEO.sol.rx, ry: GEO.sol.ry, fill: C.sol }, racine);
    const perso = el('g', {}, racine);
    const calqueJambes = el('g', {}, perso);
    const gCorps = el('g', {}, perso);
    el('use', { href: `#${id}-corps` }, gCorps);
    const gYeux = el('g', {}, perso);
    const gSourcils = el('g', {}, perso);
    const calqueBras = el('g', {}, perso);
    // Le clip des lobes avant suit le corps : il est posé dans le groupe transformé.
    const gAvant = el('g', {}, perso);
    const gAvantInterne = el('g', { 'clip-path': `url(#${id}-avant)` }, gAvant);
    el('use', { href: `#${id}-corps` }, gAvantInterne);
    const gBouche = el('g', {}, perso);
    if (argile) { gSourcils.setAttribute('filter', `url(#${id}-relief)`); gBouche.setAttribute('filter', `url(#${id}-relief)`); }
    // Bras « devant » : quand la main se pose sur le corps, tout le bras passe devant les
    // lobes du bas (sinon il disparaît derrière eux), avec son ombre portée.
    const calqueBrasDevant = el('g', {}, perso);

    // Jambes et pieds
    const jambes = {};
    for (const cote of ['g', 'd']) {
      const j = GEO.jambes[cote];
      const g = el('g', argile ? { filter: `url(#${id}-membre)` } : {}, calqueJambes);
      const cuisse = el('path', { fill: 'none', stroke: C.creme, 'stroke-width': j.ep, 'stroke-linecap': 'round' }, g);
      const tibia = el('path', { fill: 'none', stroke: C.creme, 'stroke-width': j.ep, 'stroke-linecap': 'round' }, g);
      const bandes = j.bandes.map(([couleur]) => el('path', { fill: couleur }, g));
      const pied = el('path', { d: D['pied' + cote.toUpperCase()].forme, fill: C.creme }, g);
      jambes[cote] = { cuisse, tibia, bandes, pied };
    }

    // Yeux
    for (const cote of ['g', 'd']) {
      const g = GEO.yeux[cote];
      const [cx, cy, rx, ry, rotB] = g.blanc;
      // Groupe parent : on peut agrandir / étirer tout l'œil (clip compris) autour de son centre.
      const oeilP = el('g', {}, gYeux);
      const oeil = el('g', { 'clip-path': `url(#${id}-oeil-${cote})` }, oeilP);
      el('rect', { x: cx - rx - 10, y: cy - ry - 10, width: 2 * rx + 20, height: 2 * ry + 20, fill: C.blanc }, oeil);
      if (argile) {
        // Argile : le globe s'arrondit, un peu plus sombre sous la paupière et sur les bords.
        const gid = `${id}-globe-${cote}`;
        const grad = el('radialGradient', { id: gid, cx: '0.42', cy: '0.62', r: '0.62' }, defs);
        el('stop', { offset: '0.55', 'stop-color': '#FFFFFF', 'stop-opacity': 0 }, grad);
        el('stop', { offset: '1', 'stop-color': '#D9BFA3', 'stop-opacity': 0.55 * force }, grad);
        el('rect', { x: cx - rx - 10, y: cy - ry - 10, width: 2 * rx + 20, height: 2 * ry + 20, fill: `url(#${gid})` }, oeil);
      }
      // L'iris (et son clip) bouge avec le regard ; les reflets, eux, restent presque
      // en place : ce sont des reflets de lumière sur l'œil, pas des taches sur l'iris.
      const iris = el('g', {}, oeil);
      const [ix, iy, ir] = g.iris;
      el('circle', { cx: ix, cy: iy, r: ir, fill: C.iris }, iris);
      const dansIris = el('g', { 'clip-path': `url(#${id}-iris-${cote})` }, iris);
      el('path', { d: D['irisClair_' + cote], fill: C.irisClair }, dansIris);
      const pupille = el('circle', { cx: g.pupille[0], cy: g.pupille[1], r: g.pupille[2], fill: C.pupille }, dansIris);
      const reflets = el('g', {}, dansIris);
      const [dx, dy, dw, dh, da] = g.doux;
      el('rect', {
        x: f1(dx - dw / 2), y: f1(dy - dh / 2), width: dw, height: dh, rx: dw / 2,
        fill: '#EBCFB9', transform: `rotate(${da} ${dx} ${dy})`,
      }, reflets);
      for (const [hx, hy, hr] of g.reflets) el('circle', { cx: hx, cy: hy, r: hr, fill: '#FFFFFF' }, reflets);
      // Paupières : un ton à elles, plus soutenu que la peau. Fermé, l'œil garde sa
      // forme (une paupière bombée) au lieu de disparaître dans le visage.
      const paupBas = el('path', { fill: C.paupiere }, oeil);
      const paupHaut = el('path', { fill: C.paupiere }, oeil);
      const bord = el('ellipse', { cx, cy, rx, ry, transform: `rotate(${rotB} ${cx} ${cy})`, fill: 'none', stroke: C.paupiere, 'stroke-width': 4, opacity: 0 }, oeilP);
      // Les cils : un trait arrondi posé sur le bord de la paupière, hors du clip
      // (pas de bouts coupés net), et une petite virgule au coin extérieur.
      // Ombre nette et légère sous le bord de la paupière, dans l'œil seulement.
      const ombrePaup = el('path', { fill: 'none', stroke: C.ligne, 'stroke-width': 3, 'stroke-opacity': 0.1 }, oeil);
      oeil.insertBefore(ombrePaup, paupBas);
      const cil = el('path', { fill: C.ligne, 'clip-path': `url(#${id}-cils-${cote})` }, oeilP);
      const virgule = el('path', { fill: 'none', stroke: C.ligne, 'stroke-width': 4, 'stroke-linecap': 'round', opacity: 0 }, oeilP);
      const rieur = el('path', { fill: 'none', stroke: C.ligne, 'stroke-width': 9, 'stroke-linecap': 'round', opacity: 0 }, oeilP);
      yeux[cote] = { oeilP, iris, reflets, pupille, paupHaut, paupBas, ombrePaup, cil, virgule, rieur, bord, ix, iy, ir };
    }

    // Sourcils
    const sourcils = {};
    for (const cote of ['g', 'd']) {
      sourcils[cote] = el('path', { fill: 'none', stroke: C.brun, 'stroke-width': GEO.sourcils.ep, 'stroke-linecap': 'round' }, gSourcils);
    }

    // Ombre portée des bras sur le corps : sans elle, un bras crème devant le
    // corps crème disparaît. Nette (pas de flou), découpée par la silhouette.
    const gOmbreBras = el('g', {}, calqueBras);
    const gOmbreBrasClip = el('g', { 'clip-path': `url(#${id}-silh)` }, gOmbreBras);
    const gOmbreBrasInv = el('g', {}, gOmbreBrasClip);
    const gOmbreDevant = el('g', {}, calqueBrasDevant);
    const gOmbreDevantInv = el('g', {}, el('g', { 'clip-path': `url(#${id}-silh)` }, gOmbreDevant));
    const ombresBras = {};

    // Bras et mains
    const bras = {};
    for (const cote of ['g', 'd']) {
      const b0 = GEO.bras[cote];
      const og = el('g', {}, gOmbreBrasInv);
      const otrait = el('path', { fill: 'none', stroke: C.ombre, 'stroke-width': b0.ep, 'stroke-linecap': 'round' }, og);
      const omain = el('g', {}, og);
      const oformes = {};
      for (const [nom, src] of [['ouverte', 'mainG'], ['relachee', 'mainD']]) {
        oformes[nom] = el('path', { d: D[src].forme, fill: C.ombre }, omain);
      }
      // Pas de contour autour de l'épaule : le bras y sort de derrière le corps.
      const mid = `${id}-masque-${cote}`;
      const masque = el('mask', { id: mid, maskUnits: 'userSpaceOnUse', x: -3000, y: -3000, width: 7000, height: 7000 }, defs);
      el('rect', { x: -3000, y: -3000, width: 7000, height: 7000, fill: '#FFF' }, masque);
      const trou = el('circle', { r: 62, fill: '#000' }, masque);
      og.setAttribute('mask', `url(#${mid})`);
      ombresBras[cote] = { og, otrait, omain, oformes, trou };
      const b = GEO.bras[cote];
      const g = el('g', argile ? { filter: `url(#${id}-membre)` } : {}, calqueBras);
      const trait = el('path', { fill: 'none', stroke: C.creme, 'stroke-width': b.ep, 'stroke-linecap': 'round' }, g);
      const flanc = el('path', { fill: C.flanc }, g);
      // Bras en deux tons : un dessous plus foncé, un dessus éclairé (lumière en haut à gauche).
      const dessous = el('path', { fill: 'none', stroke: C.dessous, 'stroke-width': 13, 'stroke-linecap': 'round' }, g);
      const reflet = el('path', { fill: 'none', stroke: C.reflet, 'stroke-width': 10, 'stroke-linecap': 'round' }, g);
      const main = el('g', {}, g);
      const formes = {};
      for (const [nom, src] of [['ouverte', 'mainG'], ['relachee', 'mainD']]) {
        const m = el('g', {}, main);
        el('path', { d: D[src].forme, fill: C.creme }, m);
        if (D[src].ombre) el('path', { d: D[src].ombre, fill: C.ombre }, m);
        formes[nom] = m;
      }
      bras[cote] = { g, trait, flanc, dessous, reflet, main, formes };
    }

    // Bouche : un tracé rempli + bordé (le trait donne l'épaisseur des lèvres).
    const clipBouche = el('clipPath', { id: id + '-bouche' }, defs);
    const formeClip = el('path', {}, clipBouche);
    const bouche = el('path', {
      fill: C.bouche, stroke: C.bouche, 'stroke-width': GEO.bouche.ep,
      'stroke-linecap': 'round', 'stroke-linejoin': 'round',
    }, gBouche);
    const interieur = el('g', { 'clip-path': `url(#${id}-bouche)` }, gBouche);
    const dents = el('rect', { fill: C.dents, rx: 6 }, interieur);
    const dentsBas = el('rect', { fill: C.dents, rx: 6 }, interieur);
    const langue = el('ellipse', { fill: C.langue }, interieur);
    // Bulle de sommeil au coin de la bouche (endormi).
    const gBulle = el('g', { opacity: 0 }, gBouche);
    const bulle = el('circle', { fill: '#FFFFFF', 'fill-opacity': 0.75, stroke: '#C9DFF2', 'stroke-width': 5 }, gBulle);
    const bulleReflet = el('circle', { fill: '#FFFFFF' }, gBulle);

    // ---------- Vues de côté ----------
    const V = global.REVIZ_D1_VUES || {};
    const calqueBrasArriere = el('g', {}, perso);
    perso.insertBefore(calqueBrasArriere, gCorps);
    const vues = {};
    for (const nom of Object.keys(V)) {
      const v = V[nom];
      const g = el('g', { style: 'display:none' }, perso);
      perso.insertBefore(g, gCorps);
      const cid = `${id}-silh-${nom}`;
      el('clipPath', { id: cid }, defs).appendChild(el('path', { d: v.corps.silhouette }));
      el('path', { d: v.corps.silhouette, fill: C.creme }, g);
      el('path', { d: v.corps.ombre, fill: C.ombre, 'clip-path': `url(#${cid})` }, g);
      el('path', { d: v.corps.vaisseaux, fill: C.vaisseau }, g);
      const oeils = v.yeux.map((e, i) => {
        const zid = `${id}-zone-${nom}-${i}`;
        el('clipPath', { id: zid }, defs).appendChild(el('path', { d: e.zone }));
        const og = el('g', { 'clip-path': `url(#${zid})` }, g);
        el('rect', { x: e.gauche - 10, y: e.haut - 10, width: e.droite - e.gauche + 20, height: e.bas - e.haut + 20, fill: C.blanc }, og);
        const iris = el('g', {}, og);
        el('path', { d: e.iris, fill: C.iris }, iris);
        el('path', { d: e.irisClair, fill: C.irisClair }, iris);
        el('path', { d: e.reflets, fill: '#FFFFFF' }, iris);
        const paup = el('path', { fill: C.creme }, og);
        const cil = el('path', { fill: 'none', stroke: C.ligne, 'stroke-width': 9, 'stroke-linecap': 'round' }, og);
        return { e, iris, paup, cil };
      });
      const sourcilsV = v.sourcils.map((sc) => ({ sc, p: el('path', { d: sc.d, fill: C.brun }, g) }));
      const boucheV = v.bouche ? el('path', { d: v.bouche.d, fill: C.bouche }, g) : null;
      vues[nom] = { g, oeils, sourcilsV, boucheV };
      // Mains et pieds de la vue, rangés avec les autres formes.
      for (const cote of ['g', 'd']) {
        const vb = VUES_GEO[nom].bras[cote];
        const m = el('g', { style: 'display:none' }, bras[cote].main);
        el('path', { d: v.mains[vb.main].forme, fill: C.creme }, m);
        if (v.mains[vb.main].ombre) el('path', { d: v.mains[vb.main].ombre, fill: C.ombre }, m);
        bras[cote].formes[nom + ':main'] = m;
        const vp = VUES_GEO[nom].pieds[cote];
        jambes[cote]['pied_' + nom] = el('path', { d: v.pieds[vp.src].forme, fill: C.creme, style: 'display:none' }, jambes[cote].pied.parentNode);
      }
    }
    const groupesFace = [gCorps, gYeux, gSourcils, gAvant, gBouche, gOmbreBras, gOmbreDevant];
    let vueAffichee = null;
    function changerVue(vue) {
      if (vue === vueAffichee) return;
      vueAffichee = vue;
      const face = vue === 'face' || !vues[vue];
      for (const g of groupesFace) g.style.display = face ? '' : 'none';
      for (const nom in vues) vues[nom].g.style.display = nom === vue ? '' : 'none';
      // De face, les bras passent devant le haut du corps ; de côté, derrière.
      for (const cote of ['g', 'd']) {
        (face ? calqueBras : calqueBrasArriere).appendChild(bras[cote].g);
        gOmbreBrasInv.appendChild(ombresBras[cote].og);
        bras[cote].devant = false;
      }
      for (const cote of ['g', 'd']) {
        jambes[cote].pied.style.display = face ? '' : 'none';
        for (const nom in vues) jambes[cote]['pied_' + nom].style.display = nom === vue ? '' : 'none';
      }
    }

    function rendreVue(nom, M) {
      const o = vues[nom], ms = matStr(M);
      o.g.setAttribute('transform', ms);
      const ferme = (k) => Math.min(1, etat['paup' + k] + etat.clin + etat.rieurs);
      o.oeils.forEach((x, i) => {
        const k = o.oeils.length === 1 ? 'D' : i === 0 ? 'G' : 'D';
        x.iris.setAttribute('transform', `translate(${f1(etat.regardX * 8)} ${f1(etat.regardY * 8)})`);
        const f = ferme(k), e = x.e;
        const yl = e.haut - 8 + (e.bas - e.haut) * 0.92 * f;
        const x0 = e.gauche - 12, x1 = e.droite + 12, cx = (x0 + x1) / 2;
        x.paup.setAttribute('d', `M${f1(x0)} ${f1(e.haut - 60)}L${f1(x1)} ${f1(e.haut - 60)}L${f1(x1)} ${f1(yl)}Q${f1(cx)} ${f1(yl + 22 * f)} ${f1(x0)} ${f1(yl)}Z`);
        x.cil.setAttribute('d', `M${f1(x1)} ${f1(yl)}Q${f1(cx)} ${f1(yl + 22 * f)} ${f1(x0)} ${f1(yl)}`);
        x.cil.setAttribute('opacity', f > 0.04 ? Math.min(1, f * 6) : 0);
      });
      const dy = (etat.sourcilGy + etat.sourcilDy) / 2 + etat.regardY * 5;
      for (const sv of o.sourcilsV) sv.p.setAttribute('transform', `translate(0 ${f1(dy)})`);
      if (o.boucheV) {
        const [bx, by] = V[nom].bouche.centre;
        const ouvert = Math.max(0, etat.bas - etat.haut);
        const sy = 1 + ouvert / 45, sx = 0.55 + 0.45 * (etat.largeur / 99);
        o.boucheV.setAttribute('transform', `translate(${bx} ${by}) scale(${f1(sx * 100) / 100} ${f1(sy * 100) / 100}) translate(${-bx} ${-by})`);
      }
    }

    // ---------- Rendu ----------
    // Écrasement « premium » (conseil Codex, 19/10) : l'animation garde des valeurs
    // expressives, mais le corps ne se déforme que de 3 à 10 % (étirement 4 % au plus),
    // à peine plus large ; le poids passe dans les jambes (flechir) et le visage ne s'aplatit pas.
    function ecrasement() {
      const e = etat.ecrase;
      return e >= 0 ? Math.min(0.1, e * 0.38) : Math.max(-0.04, e * 0.25);
    }
    function echellesCorps() {
      const e = ecrasement(), resp = etat.respire;
      return [(1 + e * 0.4) * (1 - 0.005 * resp), (1 - e) * (1 + 0.012 * resp)];
    }
    function matCorps() {
      const [px, py] = GEO.pivotCorps;
      const [sx, sy] = echellesCorps();
      const descente = etat.flechir * 24; // le bassin descend, les genoux plient
      return mul(T(px + etat.corpsX, py + etat.corpsY + descente), mul(R(etat.corpsRot + etat.balance), mul(S(sx, sy), T(-px, -py))));
    }
    // Le visage suit la place du corps mais garde ses proportions (contre-déformation).
    function matVisage(M, dx, dy) {
      const [sx, sy] = echellesCorps();
      const [cx, cy] = [658, 545];
      return matStr(mul(M, mul(T(dx, dy), mul(T(cx, cy), mul(S(1 / sx, 1 / sy), T(-cx, -cy))))));
    }

    // Bras : courbe lisse épaule → coude → poignet (Catmull-Rom en deux cubiques).
    function controlesBras(Sx, E, W) {
      return [
        [Sx, [Sx[0] + (E[0] - Sx[0]) / 3, Sx[1] + (E[1] - Sx[1]) / 3], [E[0] - (W[0] - Sx[0]) / 6, E[1] - (W[1] - Sx[1]) / 6], E],
        [E, [E[0] + (W[0] - Sx[0]) / 6, E[1] + (W[1] - Sx[1]) / 6], [W[0] - (W[0] - E[0]) / 3, W[1] - (W[1] - E[1]) / 3], W],
      ];
    }
    function cheminBras(Sx, E, W) {
      const [a, b] = controlesBras(Sx, E, W);
      const p = (q) => f1(q[0]) + ' ' + f1(q[1]);
      return `M${p(a[0])}C${p(a[1])} ${p(a[2])} ${p(a[3])}C${p(b[1])} ${p(b[2])} ${p(b[3])}`;
    }
    // Ombre du flanc côté corps : un biseau qui s'amincit jusqu'au poignet.
    function cheminFlanc(Sx, E, W, ep, s, force) {
      if (force <= 0.01) return '';
      const segs = controlesBras(Sx, E, W);
      const bord = [], dedans = [];
      const N = 10;
      for (let k = 0; k <= 2 * N; k++) {
        const seg = segs[k < N ? 0 : 1], t = k < N ? k / N : (k - N) / N;
        const [p0, p1, p2, p3] = seg, u = 1 - t;
        const pt = [0, 1].map((i) => u * u * u * p0[i] + 3 * u * u * t * p1[i] + 3 * u * t * t * p2[i] + t * t * t * p3[i]);
        const dv = [0, 1].map((i) => 3 * u * u * (p1[i] - p0[i]) + 6 * u * t * (p2[i] - p1[i]) + 3 * t * t * (p3[i] - p2[i]));
        const l = Math.hypot(dv[0], dv[1]) || 1;
        const n = [(dv[1] / l) * s, (-dv[0] / l) * s]; // vers le corps
        const T = k / (2 * N);
        const largeur = Math.min(ep * 0.9, 54 * (1 - T)) * force;
        bord.push([pt[0] + n[0] * ep / 2, pt[1] + n[1] * ep / 2]);
        dedans.push([pt[0] + n[0] * (ep / 2 - largeur), pt[1] + n[1] * (ep / 2 - largeur)]);
      }
      const p = (q) => f1(q[0]) + ' ' + f1(q[1]);
      return 'M' + bord.map(p).join('L') + 'L' + dedans.reverse().map(p).join('L') + 'Z';
    }

    // Une ligne parallèle au bras, décalée vers la lumière (d < 0) ou vers l'ombre (d > 0).
    function cheminDecale(Sx, E, W, d, t0 = 0.07, t1 = 0.93) {
      const segs = controlesBras(Sx, E, W);
      const pts = [], N = 16;
      const echant = (T) => {
        const seg = segs[T < 0.5 ? 0 : 1], t = T < 0.5 ? T * 2 : (T - 0.5) * 2, u = 1 - t;
        const [p0, p1, p2, p3] = seg;
        const pt = [0, 1].map((i) => u * u * u * p0[i] + 3 * u * u * t * p1[i] + 3 * u * t * t * p2[i] + t * t * t * p3[i]);
        const dv = [0, 1].map((i) => 3 * u * u * (p1[i] - p0[i]) + 6 * u * t * (p2[i] - p1[i]) + 3 * t * t * (p3[i] - p2[i]));
        const l = Math.hypot(dv[0], dv[1]) || 1;
        return [pt, [-dv[1] / l, dv[0] / l]];
      };
      const [, nm] = echant(0.5);
      const versLumiere = nm[0] * -0.6 + nm[1] * -0.8 > 0 ? 1 : -1; // la lumière vient d'en haut à gauche
      for (let k = 0; k <= N; k++) {
        const [pt, n] = echant(t0 + (t1 - t0) * (k / N));
        pts.push([pt[0] - n[0] * d * versLumiere, pt[1] - n[1] * d * versLumiere]);
      }
      return 'M' + pts.map((q) => f1(q[0]) + ' ' + f1(q[1])).join('L');
    }

    function rendreBras(cote, M) {
      const b = GEO.bras[cote], s = b.s, P = 'bras' + cote.toUpperCase();
      const vg = vues[etat.vue] ? VUES_GEO[etat.vue].bras[cote] : null;
      const dv = vg ? 0 : Math.max(0, Math.min(1, etat[P + 'devant']));
      const SD = GEO.epaulesDevant[cote];
      const S0 = vg ? vg.S : [b.S[0] + (SD[0] - b.S[0]) * dv, b.S[1] + (SD[1] - b.S[1]) * dv];
      const Sw = app(M, S0);
      const devant = dv > 0.5;
      if (bras[cote].devant !== devant && !vg) {
        bras[cote].devant = devant;
        (devant ? calqueBrasDevant : calqueBras).appendChild(bras[cote].g);
        (devant ? gOmbreDevantInv : gOmbreBrasInv).appendChild(ombresBras[cote].og);
      }
      const phi1 = s * (etat[P + 'epaule'] + etat.ressortBras) + etat.corpsRot + etat.balance;
      const phi2 = phi1 + s * etat[P + 'coude'];
      const E = [Sw[0] + b.L1 * dir(phi1)[0], Sw[1] + b.L1 * dir(phi1)[1]];
      const W = [E[0] + b.L2 * dir(phi2)[0], E[1] + b.L2 * dir(phi2)[1]];
      const o = bras[cote];
      o.trait.setAttribute('d', cheminBras(Sw, E, W));
      const style = etat.brasStyle;
      const deuxTons = style === 'deuxTons' || style === 'complet';
      o.flanc.setAttribute('d', vg || deuxTons ? '' : cheminFlanc(Sw, E, W, b.ep, s, etat[P + 'flanc']));
      o.dessous.setAttribute('d', deuxTons ? cheminDecale(Sw, E, W, b.ep / 2 - 7, 0.04, 0.97) : '');
      o.reflet.setAttribute('d', deuxTons ? cheminDecale(Sw, E, W, -(b.ep / 2 - 9), 0.1, 0.9) : '');
      const phiMain = phi2 + s * etat[P + 'poignet'];
      if (vg) {
        const cle = etat.vue + ':main';
        for (const nom in o.formes) o.formes[nom].style.display = nom === cle ? '' : 'none';
        o.main.setAttribute('transform', `translate(${f1(W[0])} ${f1(W[1])}) rotate(${f1(phiMain - vg.phi)}) translate(${-vg.W[0]} ${-vg.W[1]})`);
        return { S: Sw, E, W };
      }
      const forme = etat[P + 'main'] === 'ouverte' ? 'ouverte' : 'relachee';
      // La main dessinée est celle du bras gauche (ouverte) ou droit (relâchée) de
      // l'image ; de l'autre côté, on la retourne.
      const source = forme === 'ouverte' ? GEO.bras.g : GEO.bras.d;
      const miroir = (forme === 'ouverte') === (cote === 'g') ? 1 : -1;
      const phiSrc = source.phi2;
      for (const nom in o.formes) o.formes[nom].style.display = nom === forme ? '' : 'none';
      const tMain = `translate(${f1(W[0])} ${f1(W[1])}) rotate(${f1(phiMain)}) scale(${miroir} 1) rotate(${f1(-phiSrc)}) translate(${-source.W[0]} ${-source.W[1]})`;
      o.main.setAttribute('transform', tMain);
      const ob = ombresBras[cote];
      ob.otrait.setAttribute('d', o.trait.getAttribute('d'));
      ob.trou.setAttribute('cx', f1(Sw[0])); ob.trou.setAttribute('cy', f1(Sw[1]));
      ob.omain.setAttribute('transform', tMain);
      for (const nom in ob.oformes) ob.oformes[nom].style.display = nom === forme ? '' : 'none';
      // Sur le corps : ombre portée décalée (« ombre ») ou contour chaud tout autour (« contour »).
      const contour = style === 'contour' || style === 'complet';
      if (ob.style !== style) {
        ob.style = style;
        ob.otrait.setAttribute('stroke', contour ? C.contour : C.ombre);
        ob.otrait.setAttribute('stroke-width', contour ? b.ep + 12 : b.ep);
        for (const nom in ob.oformes) {
          ob.oformes[nom].setAttribute('fill', contour ? C.contour : C.ombre);
          ob.oformes[nom].setAttribute('stroke', contour ? C.contour : 'none');
          ob.oformes[nom].setAttribute('stroke-width', contour ? 12 : 0);
          ob.oformes[nom].setAttribute('stroke-linejoin', 'round');
        }
        ob.og.setAttribute('transform', contour ? '' : `translate(${OMBRE_BRAS[0]} ${OMBRE_BRAS[1]})`);
      }
      return { S: Sw, E, W };
    }

    function rendreJambe(cote, M) {
      const j = GEO.jambes[cote], s = j.s, P = 'jambe' + cote.toUpperCase();
      const vv = vues[etat.vue] ? VUES_GEO[etat.vue] : null;
      const H = app(M, vv ? vv.jambes[cote].H : j.H);
      let phi1 = s * etat[P + 'hanche'];
      let phi2 = phi1 + s * etat[P + 'genou'];
      let ik = etat[P + 'ik'], cx = etat[P + 'px'], cy = etat[P + 'py'];
      if (ik <= 0 && etat.flechir > 0.001) {
        // Flexion à l'impact : les pieds restent où ils sont, le bassin descend, les genoux plient.
        const H0 = vv ? vv.jambes[cote].H : j.H;
        const A0 = vv ? [H0[0], H0[1] + j.L1 + j.L2 - 0.5] : j.A;
        ik = 1; cx = A0[0]; cy = A0[1];
      }
      if (ik > 0) {
        // Deux os. De profil le genou part vers l'avant (+x) ; de face, vers l'extérieur.
        const sensGenou = vv && etat.vue === 'profil' ? 1 : (cote === 'g' ? -1 : 1);
        const tx = cx - H[0], ty = cy - H[1];
        const d = Math.min(Math.hypot(tx, ty), j.L1 + j.L2 - 0.01);
        const base = Math.atan2(-tx, ty) / RAD;
        const cosA = (j.L1 * j.L1 + d * d - j.L2 * j.L2) / (2 * j.L1 * d);
        const A = Math.acos(Math.max(-1, Math.min(1, cosA))) / RAD;
        const i1 = base - A * sensGenou;
        const Kx = H[0] + j.L1 * dir(i1)[0], Ky = H[1] + j.L1 * dir(i1)[1];
        const i2 = Math.atan2(-(H[0] + tx - Kx), H[1] + ty - Ky) / RAD;
        phi1 += (i1 - phi1) * ik; phi2 += (i2 - phi2) * ik;
      }
      const K = [H[0] + j.L1 * dir(phi1)[0], H[1] + j.L1 * dir(phi1)[1]];
      const A = [K[0] + j.L2 * dir(phi2)[0], K[1] + j.L2 * dir(phi2)[1]];
      const o = jambes[cote];
      const p = (q) => f1(q[0]) + ' ' + f1(q[1]);
      o.cuisse.setAttribute('d', `M${p(H)}L${p(K)}`);
      o.tibia.setAttribute('d', `M${p(K)}L${p(A)}`);
      // Bandes d'ombre en haut de la cuisse (ombre portée du corps) ; le bas de
      // chaque bande est un peu penché (fin côté gauche, fin côté droit de l'image).
      const u = dir(phi1), n = [-u[1], u[0]], w = j.ep / 2;
      const a = (d, k) => [H[0] + u[0] * d + n[0] * k, H[1] + u[1] * d + n[1] * k];
      j.bandes.forEach(([, finG, finD], i) => {
        const q = [a(-40, w), a(-40, -w), a(finD, -w), a(finG, w)];
        o.bandes[i].setAttribute('d', 'M' + q.map(p).join('L') + 'Z');
      });
      if (vv) {
        const vp = vv.pieds[cote];
        // En profil, l'angle du pied est donné tel quel (positif : pointe vers le bas).
        const rot = (etat.vue === 'profil' ? etat[P + 'pied'] : s * etat[P + 'pied']) + vp.rot;
        o['pied_' + etat.vue].setAttribute('transform',
          `translate(${f1(A[0])} ${f1(A[1])}) rotate(${f1(rot)}) translate(${-vp.A[0]} ${f1(-vp.A[1] - (vp.semelle - SEMELLE_FACE))})`);
      } else {
        o.pied.setAttribute('transform',
          `translate(${f1(A[0])} ${f1(A[1])}) rotate(${f1(s * etat[P + 'pied'])}) translate(${-j.A[0]} ${-j.A[1]})`);
      }
      return { H, K, A };
    }

    function rendreYeux() {
      const cles = { g: 'G', d: 'D' };
      for (const cote of ['g', 'd']) {
        const g = GEO.yeux[cote], o = yeux[cote], K = cles[cote];
        const [cx, cy, rx, ry] = g.blanc;
        const exterieur = cote === 'g' ? -1 : 1; // le coin extérieur de l'œil
        const ke = etat.yeuxEchelle * (cote === 'g' ? etat.oeilGechelle : etat.oeilDechelle);
        const ety = etat.yeuxEtire * (1 - 0.015 * etat.clin); // à peine tassé en clignant (1,5 %)
        o.oeilP.setAttribute('transform', ke === 1 && ety === 1 ? '' :
          `translate(${cx} ${cy}) scale(${f1(ke * 1000) / 1000} ${f1(ke * ety * 1000) / 1000}) translate(${-cx} ${-cy})`);
        // Le regard (conseil Codex) : ±20 px en x, ±12 en y (jusqu'à 30 / 22 pour un regard
        // appuyé, valeurs > 1), iris aplati de 4 % sur le côté, reflets qui bougent 4 fois moins.
        const rgx = etat.regardX + etat.regardVieX + etat.saccadeX, rgy = etat.regardY + etat.regardVieY + etat.saccadeY;
        const gx = rgx * 20, gy = rgy * 12;
        const ki = etat.iris, ecr = 1 - 0.04 * Math.min(1, Math.abs(rgx));
        o.iris.setAttribute('transform',
          `translate(${f1(gx + o.ix)} ${f1(gy + o.iy)}) scale(${f1(ki * ecr * 1000) / 1000} ${ki}) translate(${-o.ix} ${-o.iy})`);
        o.reflets.setAttribute('transform', `translate(${f1(-gx * 0.75 / ki)} ${f1(-gy * 0.75)})`);
        o.pupille.setAttribute('r', f1(g.pupille[2] * etat.pupille));
        // Paupière haute : elle suit 20 % du regard vers le bas.
        const ferme = Math.max(0, Math.min(1, etat['paup' + K] + etat.clin + Math.max(0, rgy) * 0.2));
        const pente = etat['paupPente' + K] * (cote === 'g' ? 1 : -1);
        // Fermée : coins à +24 px sous le centre, milieu à +38 (creux de 14 px).
        const yHaut = cy - ry - 10, yFerme = cy + 24;
        const yl = yHaut + (yFerme - yHaut) * ferme;
        const x0 = cx - rx - 16, x1 = cx + rx + 16;
        const dy = Math.tan(pente * RAD) * (rx + 16);
        // Bord en cubique : bombé de 8-12 px en chemin, 14 px fermé, raccords latéraux arrondis.
        const k = (10 + 4 * ferme) / 0.75;
        const yg = yl - dy, yd = yl + dy;
        const bordPaup = (u) => { // point du bord, u de 0 (gauche) à 1 (droite), bézier cubique
          const v = 1 - u, P0 = [x0, yg], P1 = [cx - rx * 0.62, yl + k - dy * 0.5], P2 = [cx + rx * 0.62, yl + k + dy * 0.5], P3 = [x1, yd];
          return [0, 1].map((i) => v * v * v * P0[i] + 3 * v * v * u * P1[i] + 3 * v * u * u * P2[i] + u * u * u * P3[i]);
        };
        const cub = `C${f1(cx + rx * 0.62)} ${f1(yl + k + dy * 0.5)} ${f1(cx - rx * 0.62)} ${f1(yl + k - dy * 0.5)} ${f1(x0)} ${f1(yg)}`;
        o.paupHaut.setAttribute('d', `M${f1(x0)} ${f1(cy - ry - 80)}L${f1(x1)} ${f1(cy - ry - 80)}L${f1(x1)} ${f1(yd)}${cub}Z`);
        o.ombrePaup.setAttribute('d', `M${f1(x1)} ${f1(yd + 2.5)}${cub.replace(/(-?[\d.]+) (-?[\d.]+)/g, (m, a, b2) => `${a} ${f1(+b2 + 2.5)}`)}`);
        o.ombrePaup.setAttribute('opacity', ferme > 0.03 && ferme < 0.97 ? 1 : 0);
        // Cils : une forme pleine effilée aux deux bouts (4-6 px en chemin, 7-8 px fermé), qui
        // n'apparaît qu'une fois la paupière bien entrée dans l'œil (pas de fil qui flotte).
        const entree = Math.max(0, Math.min(1, (yl - (cy - ry * 0.75)) / 40));
        const visible = entree > 0.01 && etat.rieurs < 0.05;
        const epais = (4.5 + 3 * ferme) * entree;
        // Les bouts du trait : là où le bord de la paupière croise l'œil (on cherche sur la courbe).
        let ua = 0, ub = 1;
        const dansOeil = (q) => ((q[0] - cx) / (rx + 2)) ** 2 + ((q[1] - cy) / (ry + 2)) ** 2 <= 1;
        for (let i = 0; i <= 60; i++) { if (dansOeil(bordPaup(i / 60))) { ua = i / 60; break; } }
        for (let i = 60; i >= 0; i--) { if (dansOeil(bordPaup(i / 60))) { ub = i / 60; break; } }
        if (visible && ub > ua) {
          const haut = [], bas = [];
          for (let i = 0; i <= 18; i++) {
            const u = ua + (ub - ua) * (i / 18);
            const [px, py] = bordPaup(u);
            const t = epais * Math.pow(Math.sin(Math.PI * (i / 18)), 0.55) + 0.6;
            haut.push([px, py - t * 0.35]); bas.push([px, py + t * 0.65]);
          }
          o.cil.setAttribute('d', 'M' + haut.map((q) => f1(q[0]) + ' ' + f1(q[1])).join('L') + 'L' + bas.reverse().map((q) => f1(q[0]) + ' ' + f1(q[1])).join('L') + 'Z');
          o.cil.setAttribute('opacity', 1);
        } else {
          o.cil.setAttribute('opacity', 0);
        }
        // Virgule de cil au coin extérieur, fine (4 px) et courte, seulement œil presque fermé.
        const fin = Math.max(0, Math.min(1, (ferme - 0.8) / 0.18));
        const [ex, ey] = bordPaup(exterieur < 0 ? ua : ub);
        o.virgule.setAttribute('d', `M${f1(ex)} ${f1(ey)}q${f1(exterieur * 8)} ${f1(-1)} ${f1(exterieur * 13)} ${f1(-9)}`);
        o.virgule.setAttribute('opacity', visible ? f1(fin) : 0);
        // Paupière basse : remonte depuis le bas (sourire des yeux) ; quand l'œil se ferme,
        // elle rejoint la paupière haute, aucun bout d'iris ne dépasse.
        const ybOuvert = cy + ry + 6 - etat['paupBas' + K] * ry * 1.05;
        const yb = ybOuvert + (Math.min(ybOuvert, yl + k * 0.75 - 2) - ybOuvert) * ferme;
        const bombe = 22 * etat['paupBas' + K] * (1 - ferme), bout = 10 * (1 - ferme);
        o.paupBas.setAttribute('d', `M${f1(x0)} ${f1(cy + ry + 60)}L${f1(x0)} ${f1(yb + bout)}Q${f1(cx)} ${f1(yb - bombe)} ${f1(x1)} ${f1(yb + bout)}L${f1(x1)} ${f1(cy + ry + 60)}Z`);
        o.bord.setAttribute('opacity', f1(Math.max(0, (Math.max(ferme, etat.rieurs) - 0.8) / 0.2)));
        // Yeux rieurs (^ ^) : paupière fermée et un arc franc par-dessus.
        const r = etat.rieurs;
        o.rieur.setAttribute('opacity', r > 0.02 ? Math.min(1, r * 1.5) : 0);
        o.rieur.setAttribute('d', `M${f1(cx - 48)} ${f1(cy + 26)}Q${f1(cx)} ${f1(cy - 24)} ${f1(cx + 48)} ${f1(cy + 26)}`);
        if (r > 0.02) {
          o.paupHaut.setAttribute('d', `M${f1(x0)} ${f1(cy - ry - 80)}L${f1(x1)} ${f1(cy - ry - 80)}L${f1(x1)} ${f1(cy + ry + 80)}L${f1(x0)} ${f1(cy + ry + 80)}Z`);
          o.paupHaut.setAttribute('opacity', Math.min(1, r * 3));
        } else {
          o.paupHaut.setAttribute('opacity', 1);
        }
      }
    }

    function rendreSourcils() {
      for (const cote of ['g', 'd']) {
        const K = cote === 'g' ? 'G' : 'D';
        const s = GEO.sourcils[cote];
        const dy = etat['sourcil' + K + 'y'] + etat.regardY * 4 + etat.clin * 1.5 + etat.ressortSourcil;
        const rot = etat['sourcil' + K + 'rot'] * (cote === 'g' ? 1 : -1);
        const courbe = etat['sourcil' + K + 'courbe'];
        const cx = (s.a[0] + s.b[0]) / 2, cy = (s.a[1] + s.b[1]) / 2;
        sourcils[cote].setAttribute('d',
          `M${s.a[0]} ${s.a[1]}Q${s.c[0]} ${f1(s.c[1] - courbe)} ${s.b[0]} ${s.b[1]}`);
        sourcils[cote].setAttribute('transform', `translate(${f1(etat.regardX * 6)} ${f1(dy)}) rotate(${f1(rot)} ${f1(cx)} ${f1(cy)})`);
      }
    }

    function rendreBouche() {
      const [ox, oy] = GEO.bouche.o;
      const w = etat.largeur / 2, k = etat.boucheEchelle;
      const X = (x) => ox + etat.boucheX + x * k, Y = (y) => oy + etat.boucheY + y * k;
      const g = [X(-w), Y(etat.coinG)], d = [X(w), Y(etat.coinD)];
      const ym = (etat.coinG + etat.coinD) / 2;
      const haut = [X(0), Y(ym + etat.haut)], bas = [X(0), Y(ym + Math.max(etat.bas, etat.haut))];
      const p = (q) => f1(q[0]) + ' ' + f1(q[1]);
      const dPath = `M${p(g)}Q${p(haut)} ${p(d)}Q${p(bas)} ${p(g)}Z`;
      bouche.setAttribute('d', dPath);
      formeClip.setAttribute('d', dPath);
      const ouvert = Math.max(0, etat.bas - etat.haut) * k / 2; // hauteur de l'ouverture au centre
      const yHaut = Y(ym + etat.haut / 2), yBas = Y(ym + Math.max(etat.bas, etat.haut) / 2);
      const largeur = etat.largeur * k;
      dents.setAttribute('x', f1(X(-w * 0.8))); dents.setAttribute('width', f1(largeur * 0.8));
      dents.setAttribute('y', f1(yHaut - 30)); dents.setAttribute('height', f1(30 + Math.min(16, ouvert * 0.35) * etat.dents));
      dents.setAttribute('opacity', etat.dents > 0.02 ? Math.min(1, etat.dents) : 0);
      dentsBas.setAttribute('x', f1(X(-w * 0.7))); dentsBas.setAttribute('width', f1(largeur * 0.7));
      dentsBas.setAttribute('y', f1(yBas - Math.min(12, ouvert * 0.3) * etat.dentsBas)); dentsBas.setAttribute('height', 40);
      dentsBas.setAttribute('opacity', etat.dentsBas > 0.02 ? Math.min(1, etat.dentsBas) : 0);
      const l = etat.langue;
      // La langue remonte vers le palais au-delà de 1 (le L).
      const montee = Math.max(0, l - 1);
      langue.setAttribute('cx', f1(X(0)));
      langue.setAttribute('cy', f1(yBas + 10 - Math.min(1, l) * ouvert * 0.45 - montee * ouvert * 0.9));
      langue.setAttribute('rx', f1(largeur * 0.34));
      langue.setAttribute('ry', f1(16 + ouvert * 0.3));
      langue.setAttribute('opacity', l > 0.02 && ouvert > 3 ? 1 : 0);
      const rb = etat.bulle * 58;
      gBulle.setAttribute('opacity', etat.bulle > 0.03 ? 1 : 0);
      if (etat.bulle > 0.03) {
        const bx = X(w) + 6 + rb * 0.7, by = Y(etat.coinD) + 4 - rb * 0.2;
        bulle.setAttribute('cx', f1(bx)); bulle.setAttribute('cy', f1(by)); bulle.setAttribute('r', f1(rb));
        bulleReflet.setAttribute('cx', f1(bx - rb * 0.35)); bulleReflet.setAttribute('cy', f1(by - rb * 0.35)); bulleReflet.setAttribute('r', f1(rb * 0.18));
      }
    }

    const articulations = {};
    function rendre() {
      const [ax, ay] = GEO.ancre;
      const k = etat.echelle;
      racine.setAttribute('transform', matStr(mul(T(etat.x, etat.y), mul(S(k * etat.sens, k), T(-ax, -ay)))));
      // Ombre au sol : rétrécit et pâlit quand Réviz s'élève.
      const hauteur = etat.hauteur + etat.flotte;
      const h = Math.max(0, hauteur);
      const ks = 1 / (1 + h / 420);
      ombreSol.setAttribute('rx', f1(GEO.sol.rx * ks));
      ombreSol.setAttribute('ry', f1(GEO.sol.ry * ks));
      ombreSol.setAttribute('opacity', f1(Math.max(0, etat.ombre * (0.35 + 0.65 * ks))));
      perso.setAttribute('transform', `translate(0 ${f1(-hauteur)}) rotate(${f1(etat.inclinaison)} ${ax} ${ay})`);
      changerVue(etat.vue);
      const M = matCorps();
      const ms = matStr(M);
      if (vues[etat.vue]) rendreVue(etat.vue, M);
      gCorps.setAttribute('transform', ms);
      gAvant.setAttribute('transform', ms);
      // Le visage glisse un peu sur le corps : la tête « tourne » et « se penche ».
      const vx = etat.visageX + etat.visageVieX + etat.ressortX, vy = etat.visageY + etat.visageVieY + etat.ressortY;
      gYeux.setAttribute('transform', matVisage(M, vx, vy));
      gSourcils.setAttribute('transform', matVisage(M, vx * 1.15, vy * 1.2));
      gBouche.setAttribute('transform', matVisage(M, vx * 1.1, vy * 0.8));
      // L'ombre des bras est découpée par la silhouette (repère du corps), mais
      // ses tracés sont dans le repère du personnage : on annule la matrice dedans.
      gOmbreBras.setAttribute('transform', ms);
      gOmbreBrasInv.setAttribute('transform', matStr(inv(M)));
      gOmbreDevant.setAttribute('transform', ms);
      gOmbreDevantInv.setAttribute('transform', matStr(inv(M)));
      articulations.jambeG = rendreJambe('g', M); articulations.jambeD = rendreJambe('d', M);
      articulations.brasG = rendreBras('g', M); articulations.brasD = rendreBras('d', M);
      articulations.corps = app(M, GEO.pivotCorps);
      if (!vues[etat.vue]) { rendreYeux(); rendreSourcils(); rendreBouche(); }
    }

    // Cinématique inverse à deux os : place le poignet sur une cible (repère du corps au repos).
    function atteindre(cote, cible, plie = 1, vue = etat.vue, devant = false) {
      const b = GEO.bras[cote], s = b.s, P = 'bras' + cote.toUpperCase();
      const S0 = VUES_GEO[vue] ? VUES_GEO[vue].bras[cote].S : devant ? GEO.epaulesDevant[cote] : b.S;
      const dx = cible[0] - S0[0], dy = cible[1] - S0[1];
      const d = Math.min(Math.hypot(dx, dy), b.L1 + b.L2 - 0.01);
      const base = Math.atan2(-dx, dy) / RAD;
      const cosA = (b.L1 * b.L1 + d * d - b.L2 * b.L2) / (2 * b.L1 * d);
      const A = Math.acos(Math.max(-1, Math.min(1, cosA))) / RAD;
      const cosB = (b.L1 * b.L1 + b.L2 * b.L2 - d * d) / (2 * b.L1 * b.L2);
      const B = 180 - Math.acos(Math.max(-1, Math.min(1, cosB))) / RAD;
      const phi1 = base + plie * A;
      const phi2 = phi1 - plie * B;
      return { [P + 'epaule']: s * phi1, [P + 'coude']: s * (phi2 - phi1) };
    }

    // Pose de repos d'une vue : les mains là où l'image de la vue les montre.
    function reposVue(vue) {
      const p = { vue, jambeGhanche: 0, jambeGgenou: 0, jambeDhanche: 0, jambeDgenou: 0, jambeGpied: 0, jambeDpied: 0 };
      if (!VUES_GEO[vue]) return Object.assign(p, { brasGepaule: 18, brasGcoude: -6, brasDepaule: 14, brasDcoude: -6 });
      for (const cote of ['g', 'd']) {
        const vb = VUES_GEO[vue].bras[cote];
        Object.assign(p, atteindre(cote, vb.W, cote === 'g' ? -1 : 1, vue));
        p['bras' + cote.toUpperCase() + 'poignet'] = 0;
      }
      return p;
    }

    rendre();
    // Calques nommés (pour colorer les pièces sur la planche, ou les masquer).
    const calques = { ombreSol, jambes: calqueJambes, corps: gCorps, yeux: gYeux, sourcils: gSourcils,
      bras: calqueBras, lobesAvant: gAvant, bouche: gBouche };
    return { etat, rendre, racine, atteindre, reposVue, articulations, calques, GEO, VUES_GEO, id };
  }

  global.RevizD1 = { creer, etatRepos, poseReference, BOUCHES, CLES_BOUCHE, GEO, C };
})(typeof window !== 'undefined' ? window : globalThis);
