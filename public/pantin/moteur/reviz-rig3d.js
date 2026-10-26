/* Réviz 3D (argile) : le pantin en calques, avec la MÊME interface que reviz-rig.js.
 *
 * reviz-anim.js (vie, regard, expressions, gestes, parole) pilote le pantin 2D par un état
 * fait de nombres (rig.etat) et rig.rendre(). Ce fichier traduit cet état sur les calques du
 * pantin 3D (pantin3d.json + images) : le moteur marche tel quel.
 *
 *   const rig = await RevizD1_3D.creer(groupeSvg, { x, y, echelle, base: 'argile3d/pantin3d/' });
 *   const anim = RevizAnim.creer(rig, { ... });
 *
 * Il faut charger reviz-d1-pieces.js et reviz-rig.js avant (état de repos, bouches, géométrie
 * de référence en coordonnées 2D), puis ce fichier, puis reviz-anim.js.
 *
 * Repères : le moteur parle en coordonnées du pantin 2D (ancre au sol = 651,1048). Les calques
 * sont en pixels de la maîtresse HD (2508) ; une similitude les y ramène (échelle prise sur les
 * deux iris, pieds posés sur l'ancre).
 *
 * Ce qui n'existe pas encore en 3D (à venir avec les poses générées) : vues trois-quarts et
 * profil (donc marche, course, demi-tour), coude et mains (le bras tourne d'un bloc), paupière
 * basse, courbe des sourcils, glissement du visage sur le corps.
 */
(function (global) {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg';
  const RAD = Math.PI / 180;
  const f1 = (v) => (Math.round(v * 10) / 10).toString();
  const D1 = () => {
    if (!global.RevizD1) throw new Error('reviz-rig.js doit être chargé avant reviz-rig3d.js');
    return global.RevizD1;
  };

  // Bouches dessinées en 3D (images) ; les autres formes du moteur prennent la plus proche.
  const BOUCHES_3D = ['repos', 'A', 'EI', 'O', 'U', 'MBP', 'rire', 'triste', 'moue', 'fier'];
  const POIDS = { largeur: 0.5, haut: 1, bas: 1, coinG: 0.7, coinD: 0.7 };

  async function creer(parent, options = {}) {
    const R2 = D1();
    const GEO = R2.GEO;
    const base = options.base || '';
    const G = await (await fetch(base + 'pantin3d.json')).json();
    const BR = await (await fetch(base + 'bras/bras.json')).json(); // mains générées (bras3d.py)
    const CA = await (await fetch(base + 'bras/caoutchouc.json')).json(); // bras de la maîtresse (bras_caoutchouc.py)
    // Grandes mains (argile3d/bras_pose.py) : pour un geste, tube épais et grande main tirés d'une pose
    // générée, pliés en continu comme le bras caoutchouc (méthode validée sur le coucou). Une main par
    // fichier bras/grandes/<nom>-<côté>.json ; brasXmain = <nom> la choisit. Absente : ignorée.
    const GRANDES = ['coucou', 'enlair', 'tempe', 'menton', 'hanche'];
    const GM = {};
    // Index des mains présentes (écrit par exporter_app.py) : évite de demander celles qui manquent.
    const INDEX = await fetch(`${base}bras/grandes/index.json`).then((r) => (r.ok ? r.json() : null)).catch(() => null);
    await Promise.all(GRANDES.flatMap((n) => ['g', 'd'].filter((c) => !INDEX || INDEX.includes(`${n}-${c}`)).map((c) => fetch(`${base}bras/grandes/${n}-${c}.json`)
      .then((r) => (r.ok ? r.json() : null)).then((j) => { if (j) (GM[n] = GM[n] || {})[c] = j; }).catch(() => {}))));
    // Jambes articulées (argile3d/jambes3d.py) : tube plié + pied, style caoutchouc. Absentes : l'image fixe.
    const JA = await fetch(base + 'jambes/jambes.json').then((r) => (r.ok ? r.json() : null)).catch(() => null);
    // Effets flottants (repris de la marionnette des reels, même rendu 3D) : centre et hauteur en px HD
    // autour de la tête ; etat.effet<Nom> (0 -> 1) les fait apparaître (échelle + opacité).
    const EFFETS = { ampoule: { c: [1330, 240], h: 540 }, interrogation: { c: [1920, 340], h: 500 }, exclamation: { c: [1900, 350], h: 500 },
      eclair: { c: [2120, 430], h: 580 }, sueur: { c: [1980, 600], h: 340 }, coeurs: { c: [1900, 330], h: 500 }, etoiles: { c: [1254, 360], h: 470, w: 1250 } };
    const TAILLES_EFFETS = { ampoule: [444, 512], coeurs: [512, 502], eclair: [303, 512], etoiles: [512, 319], exclamation: [172, 512], interrogation: [335, 512], sueur: [371, 512] };
    const nomEffet = (n) => 'effet' + n[0].toUpperCase() + n.slice(1);
    const grandesDe = (c) => Object.keys(GM).filter((n) => GM[n][c]);
    // Poses de bras complètes générées (poses_bras.py) : désactivées par défaut (options.posesBras).
    const PO = !options.posesBras ? {} : await fetch(base + 'poses/poses.json').then((r) => (r.ok ? r.json() : {})).catch(() => ({}));
    const etat = Object.assign(R2.etatRepos(), { brasGetire: 1, brasDetire: 1, brasGepais: 0, brasDepais: 0, jambeGpointe: 0, jambeDpointe: 0,
      effetBalance: 0, effetTour: 0, yeuxEtoiles: 0, yeuxCoeurs: 0, yeuxSpirale: 0, larmes: 0 }, options.etat || {});
    for (const k of ['x', 'y', 'echelle', 'sens']) if (options[k] !== undefined) etat[k] = options[k];

    // ---------- Similitude 3D (px HD) -> 2D (coordonnées du moteur) ----------
    const iris3 = Object.fromEntries(Object.entries(G.yeux).map(([c, y]) => [c, [y.x + y.iris.centre[0], y.y + y.iris.centre[1]]]));
    const K = (iris3.d[0] - iris3.g[0]) / (GEO.yeux.d.iris[0] - GEO.yeux.g.iris[0]); // px HD par unité 2D
    const mx3 = (iris3.g[0] + iris3.d[0]) / 2, mx2 = (GEO.yeux.g.iris[0] + GEO.yeux.d.iris[0]) / 2;
    const [ax, ay] = GEO.ancre;
    // x : milieu des iris ; y : les pieds sur l'ancre.
    const M3 = `matrix(${1 / K} 0 0 ${1 / K} ${f1(mx2 - mx3 / K)} ${f1(ay - G.pieds / K)})`;
    // options.repereHD : le pantin se dessine dans les coordonnées des calques (px HD, pieds sur G.pieds),
    // pour qu'un viewBox en px HD le cadre (l'app garde le cadrage de son ancien pantin).
    if (options.repereHD) Object.assign(etat, { echelle: K, sens: 1, x: mx3 - (mx2 - ax) * K, y: G.pieds });

    // ---------- Calques ----------
    const id = 'rz3d' + Math.random().toString(36).slice(2, 7);
    const T = G.taille;
    const img = (href, extra = '') => `<image href="${base}${href}" width="${T}" height="${T}" ${extra}/>`;
    const yeux = Object.entries(G.yeux).map(([cote, y]) => ({ cote, ...y, pts: y.ouverture.map((p) => p.join(',')).join(' ') }));
    const yS = G.sourcils.y;
    // Centres des sourcils (pivot de rotation) : au-dessus de chaque iris.
    const centreSourcil = { g: [iris3.g[0], yS], d: [iris3.d[0], yS] };
    // Bras « caoutchouc » : le tube de la maîtresse, en tranches posées le long d'une courbe épaule ->
    // poignet (déformation de maillage) ; au bout, la main de la maîtresse (repos) ou une main générée.
    const NT = 30; // tranches du tube (30 : pas de rayures aux coudes très pliés)
    const pieceSvg = (nom) => { const t = BR.pieces[nom].taille;
      return `<image href="${base}bras/${nom}.webp" width="${t[0]}" height="${t[1]}"/>`; };
    const MAINS_GEN = ['ouverte', 'pointe', 'poing', 'plate', 'pouce'];
    const MIROIR_MAINS = { poing: true };
    const tranches = (c, t = CA[c].tube, fichier = `tube-${c}.webp`, nt = NT) => {
      const [w, h] = t.taille, out = [];
      // Tranche 0 : le prolongement caché sous le corps (avant l'épaule) ; puis nt tranches du tube ; ce
      // qui dépasse la longueur (bout caché sous la main) en tranches de 6 lignes.
      const bornes = [0, t.debut, ...Array.from({ length: nt }, (_, i) => t.debut + Math.round((i + 1) * t.longueur / nt))];
      for (let r = bornes[bornes.length - 1] + 6; r < h; r += 6) bornes.push(r);
      bornes[bornes.length - 1] = h;
      for (let i = 0; i < bornes.length - 1; i++) {
        const r0 = bornes[i], r1 = bornes[i + 1];
        out.push(`<g class="tr" data-r0="${r0}" data-r1="${r1}"><svg width="${w}" height="${r1 - r0}" viewBox="0 ${r0} ${w} ${r1 - r0}" overflow="hidden">
          <image href="${base}bras/${fichier}" width="${w}" height="${h}"/></svg></g>`);
      }
      return out.join('');
    };
    // Articulation du poignet (bras coucou) : quelques tranches du tube en éventail autour du pivot,
    // sous la main, pour boucher le coin entre la fin du tube et la main quand le poignet plie.
    const NJ = 5;
    const articulation = (c, n) => { const t = GM[n][c].tube, [w, h] = t.taille, r0 = t.debut + t.longueur - 40; // tranche propre (avant l'évasement de la main)
      return Array.from({ length: NJ }, () => `<g class="jt"><svg width="${w}" height="20" viewBox="0 ${r0} ${w} 20" overflow="hidden">
        <image href="${base}bras/grandes/${n}-${c}-tube.webp" width="${w}" height="${h}"/></svg></g>`).join(''); };
    // Tube de jambe : la vraie texture de la jambe en fines tranches le long de la courbe, découpée par un
    // masque qui suit la courbe (contour lisse, plus de crans à l'extérieur des pliures) et posée sur un
    // tube plein de sa couleur (il bouche les encoches à l'intérieur). Ombre du corps en haut.
    const jambeSvg = (c) => { const w = JA[c].tube.largeur;
      return `<defs><linearGradient id="${id}-ombre-j${c}" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#B9733A" stop-opacity="0.55"/><stop offset="1" stop-color="#B9733A" stop-opacity="0"/></linearGradient>
          <mask id="${id}-masque-j${c}" maskUnits="userSpaceOnUse" x="0" y="0" width="${T}" height="${T}">
            <path class="jt-masque" d="" fill="none" stroke="#fff" stroke-width="${f1(w - 1)}" stroke-linecap="round"/></mask></defs>
        <g class="j-tube">
          <path class="jt-trait" d="" fill="none" stroke="#EDBE97" stroke-width="${f1(w - 2)}" stroke-linecap="round"/>
          <g mask="url(#${id}-masque-j${c})">${tranches(c, JA[c].tube, `../jambes/${c}-tube.webp`, 36)}</g>
          <path class="jt-ombre" d="" fill="none" stroke="url(#${id}-ombre-j${c})" stroke-width="${f1(w)}" stroke-linecap="butt"/></g>`; };
    const brasSvg = (c) => `<g class="bras" data-cote="${c}">
      ${grandesDe(c).map((n) => `<g class="b-tube-gm" data-gm="${n}" display="none">${tranches(c, GM[n][c].tube, `grandes/${n}-${c}-tube.webp`, 30)}${articulation(c, n)}</g>`).join('')}
      <g class="b-main">
        <g data-main="relachee">${(() => { const m = CA[c].main; return `<image href="${base}bras/main-maitresse-${c}.webp" width="${m.taille[0]}" height="${m.taille[1]}"/>`; })()}</g>
        ${MAINS_GEN.map((m) => `<g data-main="${m}" opacity="0">${pieceSvg('main-' + m)}</g>`).join('')}
        ${grandesDe(c).map((n) => `<g data-main="${n}" opacity="0"><image href="${base}bras/grandes/${n}-${c}-main.webp" width="${GM[n][c].main.taille[0]}" height="${GM[n][c].main.taille[1]}"/></g>`).join('')}
      </g>
      <g class="b-tube">
        <defs><mask id="${id}-masque-b${c}" maskUnits="userSpaceOnUse" x="0" y="0" width="${T}" height="${T}">
          <path class="bt-masque" d="" fill="none" stroke="#fff" stroke-width="${f1(CA[c].tube.largeur - 1)}" stroke-linecap="butt"/></mask></defs>
        <path class="bt-plein" d="" fill="none" stroke="#F1C7A0" stroke-width="${f1(CA[c].tube.largeur - 4)}" stroke-linecap="butt"/>
        <g mask="url(#${id}-masque-b${c})">${tranches(c)}</g></g></g>`;
    const racine = document.createElementNS(NS, 'g');
    racine.setAttribute('class', 'reviz-3d');
    racine.innerHTML = `
      <defs>
        ${yeux.map((y) => `<clipPath id="${id}-ouv-${y.cote}"><polygon points="${y.pts}"/></clipPath>`).join('')}
        <filter id="${id}-ombre-bras" x="-30%" y="-30%" width="160%" height="160%" color-interpolation-filters="sRGB">
          <feMorphology in="SourceAlpha" operator="dilate" radius="3" result="d"/>
          <feGaussianBlur in="d" stdDeviation="5" result="f"/>
          <feOffset in="f" dx="4" dy="9" result="o"/>
          <feFlood flood-color="#A8653C" flood-opacity="0.5"/>
          <feComposite in2="o" operator="in" result="ombre"/>
          <feFlood flood-color="#E2A06E" flood-opacity="0.9"/>
          <feComposite in2="d" operator="in" result="liseré"/>
          <feMerge><feMergeNode in="ombre"/><feMergeNode in="liseré"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <clipPath id="${id}-demi-g"><rect x="0" y="0" width="${T / 2}" height="${T}"/></clipPath>
        <clipPath id="${id}-demi-d"><rect x="${T / 2}" y="0" width="${T / 2}" height="${T}"/></clipPath>
      </defs>
      <ellipse class="ombre" cx="${ax}" cy="${ay}" rx="${GEO.sol.rx}" ry="${GEO.sol.ry}" fill="rgba(120,80,40,0.14)"/>
      <g class="perso">
        <g transform="${M3}">${JA ? ['g', 'd'].map((c) => `<g class="jambe" data-cote="${c}">${jambeSvg(c)}
          <g class="j-pied"><image href="${base}jambes/${c}-pied.webp" width="${JA[c].pied.taille[0]}" height="${JA[c].pied.taille[1]}"/></g>
          ${JA[c].pointe ? `<g class="j-pointe" display="none"><image href="${base}jambes/${c}-pointe.webp" width="${JA[c].pointe.taille[0]}" height="${JA[c].pointe.taille[1]}"/></g>` : ''}</g>`).join('') : img('jambes.webp')}</g>
        <g class="corps2d"><g transform="${M3}">
          <g class="bras-fond">${Object.entries(PO).filter(([n]) => !n.startsWith('repos')).map(([n, p]) =>
            `<image class="pose" data-pose="${n}" data-cote="${p.cote}" href="${base}poses/${n}.webp" x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}" opacity="0"/>`).join('')}
            ${['g', 'd'].map((c) => brasSvg(c)).join('')}</g>
          ${yeux.map((y) => `<g transform="translate(${y.x} ${y.y})"><g clip-path="url(#${id}-ouv-${y.cote})">
            <image href="${base}${y.dossier}/globe.webp" width="${y.w}" height="${y.h}"/>
            <g class="iris" data-cote="${y.cote}"><image class="iris-normal" href="${base}${y.dossier}/iris.webp" width="${y.w}" height="${y.h}"/>
              ${Object.keys(G.speciaux || {}).map((n) => `<image class="special" data-nom="${n}" href="${base}${y.dossier}/special-${n}.webp" width="${y.w}" height="${y.h}" opacity="0"/>`).join('')}</g>
          </g></g>`).join('')}
          ${img('corps.webp')}
          ${img('sous-sourcils.webp')}
          ${yeux.map((y) => `<g transform="translate(${y.x} ${y.y})">${['p25', 'p50', 'p75', 'p100'].map((e) =>
            `<image class="paup" data-cote="${y.cote}" data-etape="${e}" href="${base}${y.dossier}/paupiere-${e}.webp" width="${y.w}" height="${y.h}" opacity="0"/>`).join('')}</g>`).join('')}
          ${['g', 'd'].map((c) => `<g class="sourcil" data-cote="${c}"><g clip-path="url(#${id}-demi-${c})">${img('sourcils.webp')}</g></g>`).join('')}
          <g class="bras-devant" filter="url(#${id}-ombre-bras)"></g>
          <g class="bouche">${BOUCHES_3D.map((n) => `<g class="vis" data-nom="${n}" opacity="${n === 'repos' ? 1 : 0}">${img('bouche-' + n + '.webp')}</g>`).join('')}</g>
          ${G.larmes ? `<g class="larmes" opacity="0"><image href="${base}larmes.webp" x="${G.larmes.x}" y="${G.larmes.y}" width="${G.larmes.w}" height="${G.larmes.h}"/></g>` : ''}
          <g class="effets">${Object.keys(EFFETS).map((n) => { const [w, h] = TAILLES_EFFETS[n];
            return `<g class="effet" data-nom="${n}" opacity="0"><image href="${base}effets/${n}.webp" width="${w}" height="${h}" x="${-w / 2}" y="${-h / 2}"/></g>`; }).join('')}</g>
        </g></g>
      </g>`;
    parent.appendChild(racine);
    const q = (s) => racine.querySelector(s), qa = (s) => [...racine.querySelectorAll(s)];
    const ombreSol = q('.ombre'), perso = q('.perso'), corps2d = q('.corps2d');
    const brasEl = Object.fromEntries(qa('.bras').map((el) => [el.dataset.cote, {
      g: el, tr: [...el.querySelectorAll('.b-tube .tr')].map((t) => ({ el: t, r0: +t.dataset.r0, r1: +t.dataset.r1 })), main: el.querySelector('.b-main'),
      tube: el.querySelector('.b-tube'), traitsTube: [...el.querySelectorAll('.bt-masque, .bt-plein')],
      gm: Object.fromEntries([...el.querySelectorAll('.b-tube-gm')].map((g) => [g.dataset.gm, { g,
        tr: [...g.querySelectorAll('.tr')].map((t) => ({ el: t, r0: +t.dataset.r0, r1: +t.dataset.r1 })), jt: [...g.querySelectorAll('.jt')] }])),
      mains: Object.fromEntries([...el.querySelectorAll('[data-main]')].map((m) => [m.dataset.main, m])), devant: false }]));
    const jambeEl = Object.fromEntries(qa('.jambe').map((el) => [el.dataset.cote, { traits: [...el.querySelectorAll('.jt-trait, .jt-masque')], ombre: el.querySelector('.jt-ombre'),
      tr: [...el.querySelectorAll('.tr')].map((t) => ({ el: t, r0: +t.dataset.r0, r1: +t.dataset.r1 })),
      grad: el.querySelector('linearGradient'), pied: el.querySelector('.j-pied'), pointe: el.querySelector('.j-pointe') }]));
    const calqueFond = q('.bras-fond'), calqueDevant = q('.bras-devant');
    const poseEl = qa('.pose');
    // Choix de la pose d'après l'angle d'épaule demandé par le moteur (côté droit de l'image, coucou) :
    // angle nominal de chaque pose ; entre deux, la pose tourne un peu autour de sa racine.
    const POSES_D = [['coucou-02', 45], ['coucou-03', 82], ['coucou-04', 120], ['coucou-06', 152]].filter(([n]) => PO[n]);
    // Fondu enchaîné entre poses voisines (selon l'angle d'épaule) : plus de saut d'une image à l'autre.
    // Chaque pose pèse selon sa proximité ; toutes pivotent vers l'angle demandé, donc elles se superposent.
    const lisseW = (x, a, b) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
    function choisirPose(c) {
      if (c !== 'd' || !POSES_D.length) return null;
      const P = 'brasD', ep = etat[P + 'epaule'];
      if (etat[P + 'devant'] > 0.5) return null;
      const global = lisseW(ep, 24, 33); // bascule courte bras caoutchouc -> poses
      if (global <= 0) return null;
      // Bascule courte (±5°) au milieu de deux poses voisines : le bras se voit en un seul exemplaire
      // presque tout le temps ; pendant l'échange, la pose dominante reste opaque (pas de bras translucide).
      const w = {};
      const n = POSES_D.length;
      for (let i = 0; i < n; i++) {
        const [nom, nominal] = POSES_D[i];
        const prev = i > 0 ? POSES_D[i - 1][1] : -Infinity, next = i < n - 1 ? POSES_D[i + 1][1] : Infinity;
        let k = 1;
        if (next !== Infinity) k *= 1 - lisseW(ep, (nominal + next) / 2 - 5, (nominal + next) / 2 + 5);
        if (prev !== -Infinity) k *= lisseW(ep, (prev + nominal) / 2 - 5, (prev + nominal) / 2 + 5);
        w[nom] = Math.min(1, 2 * k) * global;
      }
      // Coucou : la main bascule vers la tête (poignet > 0) ou vers l'extérieur, en fondu.
      if (PO['coucou-05'] && w['coucou-04']) {
        const q = lisseW(etat[P + 'poignet'], -1, 5), w4 = w['coucou-04'];
        w['coucou-05'] = w4 * Math.min(1, 2 * q); w['coucou-04'] = w4 * Math.min(1, 2 * (1 - q));
      }
      const nominaux = Object.fromEntries(POSES_D);
      nominaux['coucou-05'] = nominaux['coucou-04'];
      const out = {};
      for (const [nom, poids] of Object.entries(w)) {
        if (poids < 0.01 || !PO[nom]) continue;
        let rot = Math.max(-14, Math.min(14, (ep - nominaux[nom]) * 0.45));
        if (nom === 'coucou-04' || nom === 'coucou-05') rot += Math.max(-6, Math.min(6, (etat[P + 'coude'] - 55) * 0.2));
        out[nom] = { poids, rot: rot + etat.ressortBras * 0.4 };
      }
      return { poses: out, global };
    }
    const effetEl = qa('.effet'), larmesEl = q('.larmes');
    // Yeux spéciaux (argile3d/yeux_speciaux.py) : etat.yeux<Nom> (0 -> 1), l'objet grossit, l'iris s'efface.
    const nomYeux = (n) => 'yeux' + n[0].toUpperCase() + n.slice(1);
    const specialEl = qa('.special'), irisNormalEl = qa('.iris-normal');
    const irisEl = qa('.iris'), paupEl = qa('.paup'), sourcilEl = qa('.sourcil'), visEl = qa('.vis'), boucheEl = q('.bouche');

    // Course de l'iris : jusqu'au bord de l'ouverture dans la direction du regard (lancer de rayon).
    const course = {};
    for (const y of yeux) {
      const [ix, iy] = y.iris.centre, ir = y.iris.rayon, poly = y.ouverture;
      course[y.cote] = (a) => {
        const ux = Math.cos(a), uy = Math.sin(a); let best = Infinity;
        for (let i = 0; i < poly.length; i++) {
          const [x1, y1] = poly[i], [x2, y2] = poly[(i + 1) % poly.length];
          const ex = x2 - x1, ey = y2 - y1, wx = x1 - ix, wy = y1 - iy, den = ux * ey - uy * ex;
          if (Math.abs(den) < 1e-9) continue;
          const t = (wx * ey - wy * ex) / den, s2 = (wx * uy - wy * ux) / den;
          if (t > 0 && s2 >= 0 && s2 <= 1) best = Math.min(best, t);
        }
        return Math.max(0, best - ir * 0.82);
      };
    }

    // Bouche : l'image dont la forme est la plus proche de la forme demandée par le moteur.
    function boucheProche() {
      let mieux = 'repos', dmin = Infinity;
      for (const n of BOUCHES_3D) {
        const b = R2.BOUCHES[n]; let d = 0;
        for (const k in POIDS) d += POIDS[k] * (etat[k] - b[k]) ** 2;
        if (d < dmin) { dmin = d; mieux = n; }
      }
      return mieux;
    }

    // ---------- Corps : même écrasement « premium » que le pantin 2D ----------
    function ecrasement() {
      const e = etat.ecrase;
      return e >= 0 ? Math.min(0.1, e * 0.38) : Math.max(-0.04, e * 0.25);
    }
    // sansVie : sans la respiration ni le balancement (la hanche des jambes, voir rendreJambe3d).
    function reglagesCorps(sansVie = false) {
      const [px, py] = GEO.pivotCorps;
      const e = ecrasement(), resp = sansVie ? 0 : etat.respire;
      const sx = (1 + e * 0.4) * (1 - 0.005 * resp), sy = (1 - e) * (1 + 0.012 * resp);
      const descente = etat.flechir * 24;
      return { px, py, sx, sy, tx: px + etat.corpsX, ty: py + etat.corpsY + descente, rot: etat.corpsRot + (sansVie ? 0 : etat.balance) };
    }
    function transformCorps() {
      const r = reglagesCorps();
      return `translate(${f1(r.tx)} ${f1(r.ty)}) rotate(${f1(r.rot)}) scale(${r.sx.toFixed(4)} ${r.sy.toFixed(4)}) translate(${-r.px} ${-r.py})`;
    }
    // Un point HD du corps au repos -> où le corps l'emmène (même transformation que le calque du corps).
    const deHD = (p) => [p[0] / K + (mx2 - mx3 / K), p[1] / K + (ay - G.pieds / K)];
    function suitCorps(pHD, sansVie = false) {
      const r = reglagesCorps(sansVie), [x, y] = deHD(pHD), c = Math.cos(r.rot * RAD), s_ = Math.sin(r.rot * RAD);
      const u = (x - r.px) * r.sx, v = (y - r.py) * r.sy;
      return versHD([r.tx + u * c - v * s_, r.ty + u * s_ + v * c]);
    }

    // Bras : l'épaule et le poignet de la maîtresse ; au repos (18°, -6° pour le moteur), le bras
    // est exactement celui de la maîtresse. Longueurs : moitié épaule-poignet chacune.
    const EPAULE = { g: CA.g.S, d: CA.d.S };
    const LONG = Object.fromEntries(['g', 'd'].map((c) => [c, Math.hypot(CA[c].W[0] - CA[c].S[0], CA[c].W[1] - CA[c].S[1])]));
    const L1c = (c) => LONG[c] / 2, L2c = (c) => LONG[c] / 2;
    // Angle du bras de la maîtresse (convention du moteur, + = vers x négatif) -> décalage d'angle.
    const ANGLE0 = Object.fromEntries(['g', 'd'].map((c) => [c, Math.atan2(-(CA[c].W[0] - CA[c].S[0]), CA[c].W[1] - CA[c].S[1]) / RAD]));
    const DECALE = { g: { epaule: 18 - ANGLE0.g, coude: -6 }, d: { epaule: 14 + ANGLE0.d, coude: -6 } };
    // Quand le bras se lève ou que la main va sur le corps, l'épaule glisse au bord de la silhouette
    // (sinon le bras, court, passerait derrière ce grand corps).
    const EPAULE_BORD = { g: [374, 1330], d: [2140, 1330] };
    // Grande main à fond (brasXepais = 1) : épaisseur relative à la pose générée, et allongement du bras.
    const EPAIS_COUCOU = options.epaisCoucou ?? 1, ALLONGE_COUCOU = options.allongeCoucou ?? 1;
    const lisse01 = (v, a, b) => { const u = Math.max(0, Math.min(1, (v - a) / (b - a))); return u * u * (3 - 2 * u); };
    function epaule(c, phiAbs, devant) {
      const w = Math.max(lisse01(phiAbs, 35, 95), devant ? 1 : 0), A = EPAULE[c], Bd = EPAULE_BORD[c];
      return [A[0] + (Bd[0] - A[0]) * w, A[1] + (Bd[1] - A[1]) * w];
    }
    const dir = (phi) => [-Math.sin(phi * RAD), Math.cos(phi * RAD)];
    const versHD = (p) => [(p[0] - (mx2 - mx3 / K)) * K, (p[1] - (ay - G.pieds / K)) * K];
    // Jambes (px HD) : la hanche suit le corps ; deux os hanche -> genou -> cheville (angles du moteur,
    // 0 = jambe de la maîtresse) ou cinématique inverse (pieds posés quand le corps se tasse ou fléchit,
    // ou cible jambeXpx/py en 2D) ; la jambe caoutchouc s'étire un peu plutôt que de décoller le pied ;
    // le tube suit une courbe douce (genou rond), le pied pivote à la cheville.
    const LJ = JA && Object.fromEntries(['g', 'd'].map((c) => { const H = JA[c].H, A = JA[c].A;
      return [c, { L: Math.hypot(A[0] - H[0], A[1] - H[1]) / 2, a0: Math.atan2(-(A[0] - H[0]), A[1] - H[1]) / RAD }]; }));
    // Les gestes sont écrits pour le pantin 2D : ses angles de repos (etatRepos) = la jambe de la maîtresse.
    const REPOS_J = (() => { const r = R2.etatRepos(); return { g: [r.jambeGhanche, r.jambeGgenou], d: [r.jambeDhanche, r.jambeDgenou] }; })();
    function rendreJambe3d(c) {
      const J = JA[c], P = 'jambe' + c.toUpperCase(), s = c === 'g' ? 1 : -1, L = LJ[c].L, o = jambeEl[c];
      // La hanche suit le corps (gestes, écrasement, flexion) mais pas la vie (respiration, balancement) :
      // au repos, les jambes ne bougent pas ; le haut du tube, caché sous le corps, absorbe l'écart.
      const H = suitCorps(J.H, true);
      let l1 = L, l2 = L;
      let phi1 = s * (etat[P + 'hanche'] - REPOS_J[c][0]) + LJ[c].a0, phi2 = phi1 + s * (etat[P + 'genou'] - REPOS_J[c][1]);
      let ik = etat[P + 'ik'] || 0, cible = ik > 0 ? versHD([etat[P + 'px'], etat[P + 'py']]) : null;
      // Au sol, pieds toujours posés ; ils décollent en fondu sur les premières unités de hauteur, puis
      // les jambes pendent selon leurs angles. (Avant : pieds posés seulement si le corps se tassait, d'où
      // une bascule d'un calcul à l'autre, donc un saut du pied, chaque fois que l'écrasement frôlait 0.)
      const sol = 1 - lisse01(etat.hauteur + etat.flotte, 0, 24);
      if (ik <= 0 && sol > 0) { ik = sol; cible = J.A; }
      if (ik > 0) {
        const sensGenou = c === 'g' ? -1 : 1; // de face, le genou part vers l'extérieur
        const tx = cible[0] - H[0], ty = cible[1] - H[1];
        const etire = Math.min(1.15, Math.max(1, Math.hypot(tx, ty) / (2 * L * 0.999)));
        l1 = L * etire; l2 = L * etire;
        const d = Math.min(Math.hypot(tx, ty), l1 + l2 - 0.01);
        const base_ = Math.atan2(-tx, ty) / RAD;
        const A_ = Math.acos(Math.max(-1, Math.min(1, (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d)))) / RAD;
        const i1 = base_ - A_ * sensGenou;
        const Kx = H[0] + l1 * dir(i1)[0], Ky = H[1] + l1 * dir(i1)[1];
        const i2 = Math.atan2(-(H[0] + tx - Kx), H[1] + ty - Ky) / RAD;
        phi1 += (i1 - phi1) * ik; phi2 += (i2 - phi2) * ik;
      }
      const Kp = [H[0] + l1 * dir(phi1)[0], H[1] + l1 * dir(phi1)[1]];
      const A = [Kp[0] + l2 * dir(phi2)[0], Kp[1] + l2 * dir(phi2)[1]];
      const u1 = dir(phi1), u2 = dir(phi2), a1 = 0.55 * l1, a2 = 0.55 * l2;
      const P1 = [H[0] + u1[0] * a1, H[1] + u1[1] * a1], P2 = [A[0] - u2[0] * a2, A[1] - u2[1] * a2];
      const pt = (t) => { const v = 1 - t; return [0, 1].map((i) => v * v * v * H[i] + 3 * v * v * t * P1[i] + 3 * v * t * t * P2[i] + t * t * t * A[i]); };
      const tg = (t) => { const v = 1 - t; return [0, 1].map((i) => 3 * v * v * (P1[i] - H[i]) + 6 * v * t * (P2[i] - P1[i]) + 3 * t * t * (A[i] - P2[i])); };
      const NS_ = 32, acc = [0];
      for (let i = 1; i <= NS_; i++) { const p0 = pt((i - 1) / NS_), p1 = pt(i / NS_); acc.push(acc[i - 1] + Math.hypot(p1[0] - p0[0], p1[1] - p0[1])); }
      const Lc = acc[NS_];
      const tDe = (sv) => { let i = 1; while (i < NS_ && acc[i] < sv) i++; const f = (sv - acc[i - 1]) / Math.max(1e-6, acc[i] - acc[i - 1]); return (i - 1 + Math.max(0, Math.min(1, f))) / NS_; };
      const ang = (v) => Math.atan2(-v[0], v[1]) / RAD;
      const tube = J.tube, ech = Lc / tube.longueur;
      for (const s_ of o.tr) {
        const h = s_.r1 - s_.r0;
        if (s_.r1 <= tube.debut) {
          const a0 = ang(tg(0)), u = dir(a0), m = (tube.debut - (s_.r0 + s_.r1) / 2) * ech;
          s_.el.setAttribute('transform', `translate(${f1(H[0] - u[0] * m)} ${f1(H[1] - u[1] * m)}) rotate(${f1(a0)}) scale(1 ${(ech * 1.08).toFixed(3)}) translate(${-tube.taille[0] / 2} ${-h / 2})`);
          continue;
        }
        const sm = ((s_.r0 + s_.r1) / 2 - tube.debut) * ech, t = tDe(Math.min(Lc, sm));
        const p = sm > Lc ? (() => { const q2 = pt(1), u = dir(ang(tg(1))); return [q2[0] + u[0] * (sm - Lc), q2[1] + u[1] * (sm - Lc)]; })() : pt(t);
        s_.el.setAttribute('transform', `translate(${f1(p[0])} ${f1(p[1])}) rotate(${f1(ang(tg(t)))}) scale(1.06 ${(ech * 1.6).toFixed(3)}) translate(${-tube.taille[0] / 2} ${-h / 2})`);
      }
      // Courbe : prolongée sous le corps (dans l'axe de la cuisse) et sous le pied (dans l'axe du tibia).
      const q = (v) => f1(v[0]) + ' ' + f1(v[1]);
      const H0 = [H[0] - u1[0] * 70, H[1] - u1[1] * 70], A1 = [A[0] + u2[0] * 14, A[1] + u2[1] * 14];
      const d = `M${q(H0)}L${q(H)}C${q(P1)} ${q(P2)} ${q(A)}L${q(A1)}`;
      for (const el of o.traits) el.setAttribute('d', d);
      // Ombre du corps : le haut de la jambe, sur 55 px sous la hanche.
      const H2 = [H[0] + u1[0] * 55, H[1] + u1[1] * 55];
      o.ombre.setAttribute('d', `M${q(H0)}L${q(H2)}`);
      o.grad.setAttribute('x1', f1(H[0])); o.grad.setAttribute('y1', f1(H[1] - 8));
      o.grad.setAttribute('x2', f1(H2[0])); o.grad.setAttribute('y2', f1(H2[1]));
      // Pied pointé (en l'air, jambeXpointe > 0,5) : la pièce de la variante, tournée avec le tibia.
      const pointe = !!(o.pointe && etat[P + 'pointe'] > 0.5);
      o.pied.setAttribute('display', pointe ? 'none' : '');
      if (o.pointe) o.pointe.setAttribute('display', pointe ? '' : 'none');
      if (pointe) {
        const pp = J.pointe;
        o.pointe.setAttribute('transform', `translate(${f1(A[0])} ${f1(A[1])}) rotate(${f1(ang(tg(1)) - pp.angle + s * (etat[P + 'pied'] || 0))}) translate(${f1(-pp.cheville[0])} ${f1(-pp.cheville[1])})`);
      }
      const pc = J.pied.cheville;
      o.pied.setAttribute('transform', `translate(${f1(A[0])} ${f1(A[1])}) rotate(${f1(s * (etat[P + 'pied'] || 0))}) translate(${f1(-pc[0])} ${f1(-pc[1])})`);
    }
    function rendre() {
      const k = etat.echelle;
      racine.setAttribute('transform', `translate(${f1(etat.x)} ${f1(etat.y)}) scale(${(k * etat.sens).toFixed(4)} ${k.toFixed(4)}) translate(${-ax} ${-ay})`);
      const hauteur = etat.hauteur + etat.flotte, ks = 1 / (1 + Math.max(0, hauteur) / 420);
      ombreSol.setAttribute('rx', f1(GEO.sol.rx * ks));
      ombreSol.setAttribute('ry', f1(GEO.sol.ry * ks));
      ombreSol.setAttribute('opacity', (Math.max(0, etat.ombre * (0.35 + 0.65 * ks))).toFixed(3));
      perso.setAttribute('transform', `translate(0 ${f1(-hauteur)}) rotate(${f1(etat.inclinaison)} ${ax} ${ay})`);
      corps2d.setAttribute('transform', transformCorps());
      if (JA) for (const c of ['g', 'd']) rendreJambe3d(c);

      // Visage : le glissement (tête qui tourne) passe dans le regard, les sourcils et la bouche.
      const vx = (etat.visageX + etat.visageVieX + etat.ressortX) * K, vy = (etat.visageY + etat.visageVieY + etat.ressortY) * K;
      // Yeux : l'iris va jusqu'au bord de l'ouverture.
      const rx = etat.regardX + etat.regardVieX + etat.saccadeX, ry = etat.regardY + etat.regardVieY + etat.saccadeY;
      const m = Math.min(1, Math.hypot(rx, ry)), a = Math.atan2(ry, rx);
      for (const el of irisEl) {
        const y = G.yeux[el.dataset.cote], [ix, iy] = y.iris.centre;
        const t = m > 1e-3 ? course[el.dataset.cote](a) * m : 0;
        const s = etat.iris;
        el.setAttribute('transform', `translate(${f1(t * Math.cos(a) + vx * 0.4)} ${f1(t * Math.sin(a) + vy * 0.4)}) translate(${ix} ${iy}) scale(${s.toFixed(3)}) translate(${-ix} ${-iy})`);
      }
      let vSpecial = 0;
      for (const el of specialEl) {
        const v = Math.max(0, etat[nomYeux(el.dataset.nom)] || 0); vSpecial = Math.max(vSpecial, v);
        el.setAttribute('opacity', Math.min(1, v * 3).toFixed(3));
        const y = G.yeux[el.closest('.iris').dataset.cote], [ix, iy] = y.iris.centre;
        el.setAttribute('transform', `translate(${ix} ${iy}) scale(${Math.max(0.001, v).toFixed(3)}) translate(${-ix} ${-iy})`);
      }
      for (const el of irisNormalEl) el.setAttribute('opacity', (1 - Math.min(1, vSpecial * 2)).toFixed(3));
      // Larmes : elles coulent depuis le bas des yeux (étirement vers le bas depuis leur haut).
      if (larmesEl) {
        const v = Math.max(0, etat.larmes || 0), L = G.larmes;
        larmesEl.setAttribute('opacity', Math.min(1, v * 2.5).toFixed(3));
        larmesEl.setAttribute('transform', `translate(${f1(vx * 0.9)} ${f1(vy * 0.9 + L.y)}) scale(1 ${Math.max(0.001, Math.min(1, v)).toFixed(3)}) translate(0 ${-L.y})`);
      }
      // Effets : apparition (échelle avec l'ease du tween, opacité rapide), léger flottement commun.
      for (const el of effetEl) {
        const n = el.dataset.nom, E = EFFETS[n], [w, h] = TAILLES_EFFETS[n], v = Math.max(0, etat[nomEffet(n)] || 0);
        el.setAttribute('opacity', Math.min(1, v * 3).toFixed(3));
        if (v <= 0.001) continue;
        const ky = E.h / h, kx = E.w ? E.w / w : ky, b = etat.effetBalance;
        let tr = `translate(${f1(E.c[0] + vx * 0.5)} ${f1(E.c[1] + vy * 0.5 - b * 14)})`;
        if (n === 'etoiles') tr += ` rotate(${f1(Math.sin(etat.effetTour * RAD) * 7)}) scale(${(kx * v * (0.96 + 0.04 * Math.cos(etat.effetTour * RAD))).toFixed(3)} ${(ky * v).toFixed(3)})`;
        else tr += ` rotate(${f1(b * 6)}) scale(${(kx * v).toFixed(3)} ${(ky * v).toFixed(3)})`;
        el.setAttribute('transform', tr);
      }
      // Paupières : étapes générées (25, 50, 75, 100 %).
      for (const cote of ['g', 'd']) {
        const f = Math.min(1, etat['paup' + cote.toUpperCase()] + etat.clin + etat.rieurs);
        const etape = f < 0.125 ? null : f < 0.375 ? 'p25' : f < 0.625 ? 'p50' : f < 0.875 ? 'p75' : 'p100';
        for (const el of paupEl) if (el.dataset.cote === cote) el.setAttribute('opacity', el.dataset.etape === etape ? 1 : 0);
      }
      // Sourcils : chacun monte, descend et tourne autour de son centre.
      for (const el of sourcilEl) {
        const c = el.dataset.cote, Kc = c.toUpperCase();
        const dy = (etat['sourcil' + Kc + 'y'] + etat.regardY * 4 + etat.clin * 1.5 + etat.ressortSourcil) * K + vy * 1.2;
        const dx = etat.regardX * 6 * K + vx * 1.15;
        const rot = etat['sourcil' + Kc + 'rot'] * (c === 'g' ? 1 : -1);
        const [cx, cy] = centreSourcil[c];
        el.setAttribute('transform', `translate(${f1(dx)} ${f1(dy)}) rotate(${f1(rot)} ${f1(cx)} ${f1(cy)})`);
      }
      // Bouche : image la plus proche, déplacée et mise à l'échelle comme le veut le moteur.
      const nom = boucheProche();
      for (const el of visEl) el.setAttribute('opacity', el.dataset.nom === nom ? 1 : 0);
      const { cx: bx, cy: by } = G.bouche, kb = etat.boucheEchelle;
      boucheEl.setAttribute('transform', `translate(${f1(etat.boucheX * K + vx * 1.1)} ${f1(etat.boucheY * K + vy * 0.8)}) translate(${bx} ${by}) scale(${kb.toFixed(3)}) translate(${-bx} ${-by})`);
      // Bras caoutchouc (px HD) : épaule -> coude -> poignet donnent une courbe lisse (la courbe passe
      // par le coude) ; le tube de la maîtresse est posé dessus en tranches, étiré si besoin.
      const poses = { g: choisirPose('g'), d: choisirPose('d') };
      for (const el of poseEl) {
        const ch = poses[el.dataset.cote], v = ch && ch.poses[el.dataset.pose];
        el.setAttribute('opacity', v ? v.poids.toFixed(3) : 0);
        if (v) { const [rx_, ry_] = PO[el.dataset.pose].racine; el.setAttribute('transform', `rotate(${f1(-v.rot)} ${f1(rx_)} ${f1(ry_)})`); }
      }
      for (const c of ['g', 'd']) {
        const P = 'bras' + c.toUpperCase(), o = brasEl[c], sg = c === 'g' ? 1 : -1, D = DECALE[c];
        // Le bras caoutchouc s'efface en fondu quand les poses prennent le relais.
        o.g.style.display = poses[c] && poses[c].global >= 1 ? 'none' : '';
        o.g.setAttribute('opacity', poses[c] ? (1 - poses[c].global).toFixed(3) : 1);
        if (poses[c] && poses[c].global >= 1) continue;
        const devant = etat[P + 'devant'] > 0.5;
        if (o.devant !== devant) { o.devant = devant; (devant ? calqueDevant : calqueFond).appendChild(o.g); }
        const phi1 = sg * (etat[P + 'epaule'] - D.epaule + etat.ressortBras);
        const phi2 = phi1 + sg * (etat[P + 'coude'] - D.coude);
        // Grande main (coucou, enlair…) : épaisseur et longueur progressives (brasXepais 0 -> 1).
        const gm = GM[etat[P + 'main']] && GM[etat[P + 'main']][c], og = gm && o.gm[etat[P + 'main']];
        const coucou = !!(gm && og);
        const epa = coucou ? Math.max(0, Math.min(1, etat[P + 'epais'] || 0)) : 0;
        const k = Math.max(1, etat[P + 'etire'] || 1) * (1 + (ALLONGE_COUCOU - 1) * epa);
        const S = epaule(c, Math.abs(phi1), devant);
        const E = [S[0] + L1c(c) * k * dir(phi1)[0], S[1] + L1c(c) * k * dir(phi1)[1]];
        const W = [E[0] + L2c(c) * k * dir(phi2)[0], E[1] + L2c(c) * k * dir(phi2)[1]];
        // Bézier cubique : part dans l'axe du haut du bras, arrive dans l'axe de l'avant-bras (la main
        // suit donc l'avant-bras, comme sur le pantin 2D) ; le coude devient une courbe douce.
        const u1 = dir(phi1), u2 = dir(phi2), a1 = 0.7 * L1c(c) * k, a2 = 0.7 * L2c(c) * k;
        const P1 = [S[0] + u1[0] * a1, S[1] + u1[1] * a1], P2 = [W[0] - u2[0] * a2, W[1] - u2[1] * a2];
        const pt = (t) => { const v = 1 - t; return [0, 1].map((i) => v * v * v * S[i] + 3 * v * v * t * P1[i] + 3 * v * t * t * P2[i] + t * t * t * W[i]); };
        const tg = (t) => { const v = 1 - t; return [0, 1].map((i) => 3 * v * v * (P1[i] - S[i]) + 6 * v * t * (P2[i] - P1[i]) + 3 * t * t * (W[i] - P2[i])); };
        // Abscisse curviligne -> t.
        const NS_ = 48, acc = [0];
        for (let i = 1; i <= NS_; i++) { const p0 = pt((i - 1) / NS_), p1 = pt(i / NS_); acc.push(acc[i - 1] + Math.hypot(p1[0] - p0[0], p1[1] - p0[1])); }
        const Lc = acc[NS_];
        const tDe = (sv) => { let i = 1; while (i < NS_ && acc[i] < sv) i++; const f = (sv - acc[i - 1]) / Math.max(1e-6, acc[i] - acc[i - 1]); return (i - 1 + Math.max(0, Math.min(1, f))) / NS_; };
        const ang = (v) => Math.atan2(-v[0], v[1]) / RAD;
        // Main : dans le prolongement de la fin de la courbe (+ poignet du moteur) ; au repos, la main
        // de la maîtresse est exactement à sa place.
        // Cible hors de portée (bras étiré) : le poignet plie bien moins, sinon la main, restée à la
        // hauteur de la joue, se retourne vers le bas au lieu de viser la tête.
        const plieP = 1 - 0.7 * lisse01(k, 1.15, 1.45);
        const phiFin = ang(tg(1));
        let phiM = phiFin + sg * etat[P + 'poignet'] * plieP;
        // Main posée sur le corps avec le bras étiré (menton, joue, tête hors de portée) : les doigts
        // pointent toujours vers le haut (jamais retournés vers le bas). 0° = bas, 90° = gauche, 180° = haut.
        if (devant && etat[P + 'main'] !== 'relachee') { // pas les mains à plat sur les hanches
          const p0 = ((phiM % 360) + 360) % 360, pc = p0 < 110 ? 110 : p0 > 250 ? 250 : p0;
          phiM += (pc - p0) * lisse01(k, 1.1, 1.35);
        }
        // Jeu de pièces : bras de la maîtresse, ou grande main (tube épais + main de la pose générée). Le
        // tube part à l'épaisseur de celui de la maîtresse et s'épaissit avec brasXepais (0 -> 1) :
        // aucun saut d'épaisseur au changement de pièces.
        for (const [n, x] of Object.entries(o.gm)) x.g.setAttribute('display', x === og ? '' : 'none');
        o.tube.setAttribute('display', coucou ? 'none' : '');
        const tube = coucou ? gm.tube : CA[c].tube, ech = Lc / tube.longueur; // px de courbe par ligne du tube
        const ep0 = CA[c].tube.largeur / (coucou ? gm.tube.largeur : CA[c].tube.largeur);
        const sx = (ep0 + (EPAIS_COUCOU - ep0) * epa);
        const sxT = coucou ? sx : 1;
        // Bras de repos : contour lisse (masque) sur un tube plein, comme les jambes : aux coudes très
        // pliés, les tranches seules laissaient une frange de rayures côté extérieur.
        if (!coucou) {
          const q = (v) => f1(v[0]) + ' ' + f1(v[1]), u0 = dir(ang(tg(0))), u9 = dir(ang(tg(1))), m0 = tube.debut * ech;
          const d = `M${q([S[0] - u0[0] * m0, S[1] - u0[1] * m0])}L${q(S)}C${q(P1)} ${q(P2)} ${q(W)}L${q([W[0] + u9[0] * 2, W[1] + u9[1] * 2])}`;
          for (const el of o.traitsTube) el.setAttribute('d', d);
        }
        for (const s_ of coucou ? og.tr : o.tr) {
          const h = s_.r1 - s_.r0;
          if (s_.r1 <= tube.debut) {
            // Prolongement sous le corps : tout droit, dans l'axe du départ de la courbe.
            const a0 = ang(tg(0)), u = dir(a0), m = (tube.debut - (s_.r0 + s_.r1) / 2) * ech;
            s_.el.setAttribute('transform', `translate(${f1(S[0] - u[0] * m)} ${f1(S[1] - u[1] * m)}) rotate(${f1(a0)}) scale(${sxT.toFixed(3)} ${(ech * 1.08).toFixed(3)}) translate(${-tube.taille[0] / 2} ${-h / 2})`);
            continue;
          }
          const sm = ((s_.r0 + s_.r1) / 2 - tube.debut) * ech, t = tDe(Math.min(Lc, sm));
          // Au-delà du bout de la courbe (bout de tube caché sous la main) : dans l'axe de la fin.
          // Au-delà, ce bout suit la main (même angle) : il reste dans son bout d'avant-bras.
          const dela = sm > Lc, aT = dela ? phiM : ang(tg(t));
          const p = dela ? (() => { const q = pt(1), u = dir(phiM); return [q[0] + u[0] * (sm - Lc), q[1] + u[1] * (sm - Lc)]; })() : pt(t);
          // Le tube d'une grande main se plie plus fort : tranches plus chevauchantes, sinon l'extérieur du
          // coude laisse voir des rayures.
          s_.el.setAttribute('transform', `translate(${f1(p[0])} ${f1(p[1])}) rotate(${f1(aT)}) scale(${sxT.toFixed(3)} ${(ech * (coucou ? 1.6 : 1.5)).toFixed(3)}) translate(${-tube.taille[0] / 2} ${-h / 2})`);
        }
        let forme = etat[P + 'main'];
        if (forme === 'relachee' && devant) forme = 'plate';
        if (!o.mains[forme]) forme = 'relachee';
        for (const [m, el] of Object.entries(o.mains)) el.setAttribute('opacity', m === forme ? 1 : 0);
        if (coucou && og.jt.length) {
          // Éventail centré sur le pivot, de l'angle de fin du tube à celui de la main.
          const q = pt(1), w = gm.tube.taille[0];
          og.jt.forEach((el, i) => { const a = phiFin + (phiM - phiFin) * (i + 0.5) / og.jt.length;
            el.setAttribute('transform', `translate(${f1(q[0])} ${f1(q[1])}) rotate(${f1(a)}) scale(${(sx * 0.95).toFixed(3)} 1) translate(${-w / 2} -10)`); });
        }
        if (coucou && forme === etat[P + 'main']) {
          // Grande main de la pose (dessinée par-dessus son tube, bord fondu) : pivot au poignet, angle
          // d'origine = l'avant-bras de la pose ; elle grandit avec le tube (même échelle).
          const mm = gm.main;
          o.main.setAttribute('transform', `translate(${f1(W[0])} ${f1(W[1])}) rotate(${f1(phiM - mm.angle)}) scale(${sx.toFixed(3)}) translate(${f1(-mm.poignet[0])} ${f1(-mm.poignet[1])})`);
        } else if (forme === 'relachee') {
          const mm = CA[c].main;
          o.main.setAttribute('transform', `translate(${f1(W[0])} ${f1(W[1])}) rotate(${f1(phiM - ANGLE0[c])}) translate(${-mm.poignet[0]} ${-mm.poignet[1]})`);
        } else {
          const pm = BR.pieces['main-' + forme].poignet;
          // Le poing généré a le pouce du mauvais côté : miroir inverse (de face, pouces vers l'intérieur).
          const mir = MIROIR_MAINS[forme] ? -sg : sg;
          o.main.setAttribute('transform', `translate(${f1(W[0])} ${f1(W[1])}) rotate(${f1(phiM + 180)}) scale(${mir} 1) translate(${-pm[0]} ${-pm[1]})`);
        }
      }
      etat.bouche3d = nom;
    }

    // Cinématique inverse à deux os (comme le pantin 2D) avec les longueurs du bras 3D : la cible
    // vient du moteur en coordonnées 2D, on la ramène en px HD.
    function atteindre(cote, cible, plie = 1, vue, devant = false) {
      const P = 'bras' + cote.toUpperCase(), sg = cote === 'g' ? 1 : -1;
      const t = versHD(cible);
      // Épaule : au bord du corps si la main monte ou se pose sur le corps (comme au rendu).
      const S = (devant || t[1] < EPAULE[cote][1] - 60) ? EPAULE_BORD[cote] : EPAULE[cote];
      const L1 = L1c(cote), L2 = L2c(cote), D = DECALE[cote];
      const dx = t[0] - S[0], dy = t[1] - S[1];
      // Trop loin : le bras s'étire un peu (1,6 fois au plus) ; au-delà, la main s'arrête en chemin
      // (joue, côté de la tête) plutôt que de traverser le visage. Le bras garde toujours une
      // courbe (jamais tendu comme un bâton).
      const etire = Math.min(1.6, Math.max(1, Math.hypot(dx, dy) / (0.85 * (L1 + L2))));
      const l1 = L1 * etire, l2 = L2 * etire;
      const d = Math.min(Math.hypot(dx, dy), 0.85 * (l1 + l2));
      const base = Math.atan2(-dx, dy) / RAD;
      const A = Math.acos(Math.max(-1, Math.min(1, (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d)))) / RAD;
      const B = 180 - Math.acos(Math.max(-1, Math.min(1, (l1 * l1 + l2 * l2 - d * d) / (2 * l1 * l2)))) / RAD;
      const phi1 = base + plie * A, phi2 = phi1 - plie * B;
      return { [P + 'epaule']: sg * phi1 + D.epaule, [P + 'coude']: sg * (phi2 - phi1) + D.coude, [P + 'etire']: etire };
    }
    function reposVue(vue) {
      return { vue: 'face', jambeGhanche: 0, jambeGgenou: 0, jambeDhanche: 0, jambeDgenou: 0, jambeGpied: 0, jambeDpied: 0,
        brasGepaule: 18, brasGcoude: -6, brasDepaule: 14, brasDcoude: -6, brasGetire: 1, brasDetire: 1 };
    }

    rendre();
    const mainsDispo = (c) => Object.keys(brasEl[c].mains);
    return { brasEl, etat, rendre, racine, atteindre, reposVue, mainsDispo, articulations: {}, calques: {}, GEO, VUES_GEO: {}, id, K, boucheProche };
  }

  global.RevizD1_3D = { creer, BOUCHES_3D };
})(typeof window !== 'undefined' ? window : globalThis);
