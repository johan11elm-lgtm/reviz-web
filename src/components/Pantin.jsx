import { useEffect, useImperativeHandle, useRef, useState, forwardRef } from 'react';
import { Mascot } from './Mascot';
import './Pantin.css';

/**
 * Réviz en pâte à modeler, animé : le vrai moteur du pantin 3D (celui de la démo).
 * Sources : assets-src/mascot-2d/rig-d1 (reviz-anim.js, reviz-rig.js) et argile3d/pantin3d
 * (reviz-rig3d.js, gestes3d/, pièces 2508 px). argile3d/exporter_app.py copie le moteur et les
 * pièces (WebP réduits) dans public/pantin/ ; on ne modifie rien ici à la main.
 *
 * Bras et jambes continus (grandes mains : coucou, bras en l'air, tête, menton, hanches), pieds
 * posés quand il se tasse, réactions (étoiles, cœurs, spirale dans les yeux, effets flottants,
 * larmes). Le moteur est chargé une seule fois, à la demande ; <Mascot> s'affiche en attendant.
 */
const BASE = '/pantin/';
const SCRIPTS = [
  'reviz-d1-pieces.js', 'reviz-rig.js', 'reviz-rig3d.js',
  'gestes3d/enlair.js', 'gestes3d/tempe.js', 'gestes3d/menton.js', 'gestes3d/hanche.js', 'gestes3d/reactions.js',
  'reviz-anim.js',
];

function chargerScript(src) {
  return new Promise((ok, ko) => {
    const deja = document.querySelector(`script[data-pantin="${src}"]`);
    if (deja) {
      if (deja.dataset.charge) ok();
      else { deja.addEventListener('load', ok); deja.addEventListener('error', ko); }
      return;
    }
    const s = document.createElement('script');
    s.src = src;
    s.async = false;
    s.dataset.pantin = src;
    s.onload = () => { s.dataset.charge = '1'; ok(); };
    s.onerror = ko;
    document.head.appendChild(s);
  });
}

let moteur = null;
function chargerMoteur() {
  if (!moteur) {
    moteur = Promise.all([
      import('gsap').then(m => m.gsap),
      SCRIPTS.reduce((p, s) => p.then(() => chargerScript(BASE + 'moteur/' + s)), Promise.resolve()),
    ]).then(([gsap]) => gsap);
    moteur.catch(() => { moteur = null; });
  }
  return moteur;
}

// Humeurs de l'app -> expressions du moteur (les autres noms passent tels quels :
// content, fier, determine, reflechit, inquiet, endormi, et les réactions emerveille,
// amoureux, etourdi, idee, panique, question, surpris, pleure, enerve).
const ALIAS = { triste: 'decu', concentre: 'determine', fatigue: 'decu' };
const versMoteur = nom => ALIAS[nom] || nom || 'content';

// Un geste finit bras au repos : on revient ensuite à l'humeur tenue (fier : mains sur les hanches).
// Une suite de gestes (['chute', 'coucou']) s'enchaîne ; un geste peut porter ses réglages
// ({ nom: 'chute', depuis: 2600 }). La chute se joue aussi en mouvement réduit (il est déjà posé).
function jouerGeste(a, gestes, humeur, fini) {
  const [g, ...suite] = [].concat(gestes);
  const { nom, ...opts } = typeof g === 'string' ? { nom: g } : g || {};
  if (!a || !a.GESTES[nom] || (a.calme && nom !== 'chute')) { fini?.(); return; }
  a.geste(nom, opts)?.eventCallback('onComplete', () => {
    a.expression(versMoteur(humeur()));
    if (suite.length) jouerGeste(a, suite, humeur, fini);
    else fini?.();
  });
}

// Texte -> bouche : une forme par lettre qui compte, au rythme de la frappe de la bulle
// (même minutage que tempsLettres). Les autres lettres gardent la bouche précédente.
const PAS_LETTRE = 0.045;
const PAUSE = { ',': 0.18, '.': 0.3, '?': 0.3, '!': 0.3, '…': 0.3 };
const FORMES = { a: 'A', 'à': 'A', 'â': 'A', e: 'EI', 'é': 'EI', 'è': 'EI', 'ê': 'EI', i: 'EI', y: 'EI', o: 'O', u: 'U', m: 'MBP', b: 'MBP', p: 'MBP', f: 'FV', v: 'FV', l: 'L' };
export function tempsLettres(texte) {
  let t = 0;
  return [...texte].map(c => { const ici = t; t += PAS_LETTRE + (PAUSE[c] || 0); return ici; });
}
function minutageTexte(texte) {
  const temps = tempsLettres(texte);
  const out = [];
  [...texte.toLowerCase()].forEach((c, i) => {
    if (FORMES[c]) out.push({ t: temps[i], v: FORMES[c] });
    else if (PAUSE[c]) out.push({ t: temps[i], v: 'repos' });
  });
  return out;
}

// Cadrage en px des calques (2508 px) : celui de l'ancien pantin, les pages en dépendent.
// Les effets au-dessus de la tête débordent (overflow visible).
const VUE = '180 330 2148 2148';

// Accessoires portés sur la tête, en px des calques. Le calque vit dans le corps, juste sous
// les bras de devant : il suit sauts, écrasements et chute. Sources : assets-src/accessoires/
// (Réviz généré coiffé, chapeau découpé puis calé sur la largeur de la tête et les sourcils).
// ombre : celle que l'accessoire jette sur le front (<nom>-ombre.webp, déjà découpée à la tête).
// Objets tenus (main) : le bras se plie devant le ventre (bras : angles du moteur) et l'objet se
// glisse sous les doigts de la main relâchée, dans son repère : prise = point tenu (px de la main),
// ancre = ce point dans l'image de l'objet (fractions). Redressé à chaque image, il reste droit
// (ou penché de angle degrés, et balancé de ± balance degrés : le drapeau qu'on agite).
// derriere : une seconde image (<nom>-derriere.webp, même cadre) passe sous le corps (l'arceau du
// casque : on n'en voit que ce qui dépasse de la tête). enfile : posé sur le visage au lieu de tomber.
const ACCESSOIRES = {
  explorateur: { x: 301, y: -38, w: 1919, h: 948, ombre: { x: 358, y: 370, w: 1804, h: 712 } },
  casque: { x: 53, y: 264, w: 2414, h: 1015, derriere: true },
  lunettes: { x: 622, y: 809, w: 1297, h: 512, enfile: true },
  labo: { x: 484, y: 671, w: 1572, h: 704, enfile: true },
  plante: { main: 'g', bras: { epaule: -20, coude: -30 }, prise: [110, 160], ancre: [0.49, 0.57], w: 512, h: 696 },
  equerre: { main: 'g', bras: { epaule: -20, coude: -30 }, prise: [104, 150], ancre: [0.09, 0.75], w: 640, h: 634, angle: -12 },
  carte: { main: 'g', bras: { epaule: -20, coude: -30 }, prise: [104, 150], ancre: [0.1, 0.62], w: 580, h: 415, angle: -6 },
  ordi: { main: 'g', bras: { epaule: -5, coude: -35 }, prise: [104, 150], ancre: [0.1, 0.6], w: 470, h: 442, angle: -6 },
  drapeau: { main: 'g', bras: { epaule: -20, coude: -30 }, prise: [104, 150], ancre: [0.951, 0.85], w: 500, h: 760, angle: -20, balance: 6 },
  // Réviz Games, le tour de magie : haut-de-forme et baguette du magicien.
  chapeau: { x: 578, y: -277, w: 1365, h: 802 },
  baguette: { main: 'g', bras: { epaule: -20, coude: -30 }, prise: [104, 150], ancre: [0.47, 0.8], w: 300, h: 849, angle: -25 },
  // Réviz lance : bandeau de sport en éponge (calé par les yeux sur Réviz généré coiffé) et boule
  // de papier tenue bras levé, prête à partir (le lancer part de cette pose : Pantin.lancer).
  bandeau: { x: 451, y: 480, w: 1621, h: 349 },
  boule: { main: 'g', bras: { epaule: 140, coude: 55, etire: 1.3 }, prise: [110, 120], ancre: [0.5, 0.5], w: 460, h: 463 },
  // Réviz se trompe ? : le présentateur, micro levé vers la bouche et nœud papillon sous le sourire.
  micro: { main: 'g', bras: { epaule: 20, coude: -70 }, prise: [104, 150], ancre: [0.5, 0.72], w: 282, h: 600, angle: 15 },
  noeud: { x: 1018, y: 1344, w: 520, h: 315, enfile: true },
  // La pizzeria : toque et tablier à bavette, découpés sur Réviz généré en pizzaïolo et calés par
  // les pupilles (assets-src/jeux/pizzeria/decouper.py) ; la part de pizza qu'il croque (Pantin.croquer).
  toque: { x: 677, y: -238, w: 1162, h: 725 },
  tablier: { x: 738, y: 1485, w: 1038, h: 568, enfile: true },
  part: { main: 'g', bras: { epaule: 60, coude: -125 }, prise: [104, 150], ancre: [0.5, 0.16], w: 620, h: 705, angle: 160 },
  // Le ninja des fautes : bandeau noir noué, les pans flottent à gauche (calé par les yeux, comme le
  // bandeau de sport), et sabre en carton tenu en garde, pointe en l'air (le coup : Pantin.trancher).
  ninja: { x: -64, y: 423, w: 2111, h: 562 },
  sabre: { main: 'g', bras: { epaule: 40, coude: 80 }, prise: [104, 150], ancre: [0.5, 0.79], w: 245, h: 1400, angle: 8 },
  // Fin de partie : la médaille d'or (ruban en U coupé sur le contour du corps, ses brins passent derrière :
  // assets-src/jeux/fin/medaille.py), ou la coupe du sans-faute brandie bras levé.
  medaille: { x: 358, y: 1246, w: 1798, h: 790, enfile: true },
  coupe: { main: 'g', bras: { epaule: 150, coude: 40, etire: 1.3 }, prise: [110, 120], ancre: [0.5, 0.8], w: 600, h: 513, angle: -6 },
  // Tape-taupe ! : le jardinier, chapeau de paille et salopette découpés sur Réviz généré en
  // jardinier et calés par les pupilles (assets-src/jeux/taupe/decouper.py), et le gros maillet en
  // mousse brandi au-dessus de la tête (le coup : Pantin.frapper).
  paille: { x: 234, y: -28, w: 2085, h: 941 },
  salopette: { x: 622, y: 1377, w: 1300, h: 600, enfile: true },
  maillet: { main: 'g', bras: { epaule: 130, coude: 40 }, prise: [104, 150], ancre: [0.5, 0.86], w: 652, h: 1050, angle: -10 },
};
const NS = 'http://www.w3.org/2000/svg';
function imageSvg(href, { x, y, w, h }) {
  const im = document.createElementNS(NS, 'image');
  im.setAttribute('href', href);
  Object.entries({ x, y, width: w, height: h }).forEach(([k, v]) => im.setAttribute(k, v));
  return im;
}

/**
 * @param {string} [expression='content']  humeur tenue (voir ALIAS)
 * @param {string|object|Array} [entree]  geste(s) joué(s) à l'apparition : 'coucou', 'saut',
 *   { nom: 'chute', depuis } ou une suite ['chute', 'coucou']
 * @param {number} [size=240]
 * @param {string|null} [repli='hello'] pose de <Mascot> affichée pendant le chargement ;
 *   null : rien tant que le moteur n'est pas prêt (la pose revient si le chargement échoue)
 * @param {Function} [onEntree] appelé quand l'entrée est finie (ou tout de suite sans entrée)
 * @param {string|string[]|null} [accessoire] nom(s) dans ACCESSOIRES ; en changer le fait tomber sur la tête
 * ref : { geste(nom), expression(nom), dire(texte) }
 */
export const Pantin = forwardRef(function Pantin(
  { expression = 'content', entree, size = 240, repli = 'hello', className = '', onClick, label, onEntree, accessoire = null },
  ref,
) {
  const hote = useRef(null);
  const boite = useRef(null);
  const anim = useRef(null);
  const gsapRef = useRef(null);
  const rigRef = useRef(null);
  const calqueAcc = useRef(null);
  const calqueDerriere = useRef(null);
  const accPose = useRef(false);
  const accActuel = useRef(null); // { cle, items: [{ retirer(anime) }] }
  const tenu = useRef(null); // objet tenu : { p, el, k } (k : 0 -> 1, bras plié)
  const [pret, setPret] = useState(false);
  const [echec, setEchec] = useState(false);
  const exprRef = useRef(expression);
  exprRef.current = expression;
  const entreeRef = useRef(entree);
  const entreeFinie = useRef(onEntree);
  const enEntree = useRef(false);
  entreeFinie.current = onEntree;

  useEffect(() => {
    let vivant = true;
    let a = null;
    let obs = null;
    const appels = [];
    const h = hote.current;
    chargerMoteur().then(async gsap => {
      if (!vivant || !h) return;
      const calme = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      const rig = await window.RevizD1_3D.creer(h, { base: BASE, repereHD: true });
      if (!vivant) { h.replaceChildren(); return; }
      a = window.RevizAnim.creer(rig, { gsap, calme });
      anim.current = a;
      gsapRef.current = gsap;
      rigRef.current = rig;
      // Objet tenu : le temps de dessiner l'image, le bras qui tient prend sa pose (dosée par k),
      // puis on rend au moteur ses propres valeurs ; l'objet est ensuite redressé.
      const rendre = rig.rendre;
      rig.rendre = () => {
        const t = tenu.current;
        if (!t?.k) { rendre(); return; }
        const e = rig.etat, P = 'bras' + t.p.main.toUpperCase();
        const garde = {};
        const pose = { epaule: t.pose.epaule, coude: t.pose.coude, poignet: 0, etire: t.pose.etire ?? 1 };
        for (const [n, v] of Object.entries(pose)) { garde[P + n] = e[P + n]; e[P + n] = (e[P + n] ?? v) + (v - (e[P + n] ?? v)) * t.k; }
        for (const n of ['devant', 'main', 'epais']) garde[P + n] = e[P + n];
        Object.assign(e, { [P + 'devant']: t.k, [P + 'main']: 'tient', [P + 'epais']: 0 });
        rendre();
        Object.assign(e, garde);
        const r = rig.brasEl[t.p.main].main.getAttribute('transform')?.match(/rotate\(([-\d.]+)/);
        const balance = t.p.balance && !anim.current?.calme ? t.p.balance * Math.sin(performance.now() / 260) : 0;
        // t.tourne : l'objet tenu suit le coup (le sabre : Pantin.trancher, le maillet : Pantin.frapper).
        if (r) t.el.setAttribute('transform', `rotate(${(t.p.angle || 0) + balance + (t.tourne || 0) - r[1]} ${t.p.prise[0]} ${t.p.prise[1]})`);
      };
      const devant = h.querySelector('.bras-devant');
      if (devant) {
        const g = document.createElementNS(NS, 'g');
        g.setAttribute('class', 'accessoire');
        devant.parentNode.insertBefore(g, devant);
        calqueAcc.current = g;
      }
      const corps = h.querySelector(`.corps2d image[href="${BASE}corps.webp"]`);
      if (corps) {
        const g = document.createElementNS(NS, 'g');
        g.setAttribute('class', 'accessoire-derriere');
        corps.parentNode.insertBefore(g, corps);
        calqueDerriere.current = g;
      }
      a.demarrerVie();
      const g = entreeRef.current;
      const chute = [].concat(g)[0] === 'chute' || [].concat(g)[0]?.nom === 'chute';
      // Pendant la chute, pas d'humeur : ses petits sauts (déterminé…) partent de la hauteur
      // du moment et le feraient remonter après l'atterrissage. Elle arrive à la fin du geste.
      if (!chute) a.expression(versMoteur(exprRef.current));
      // Hors de l'écran (page qui défile) : le pantin se met en pause, il ne coûte plus rien.
      if ('IntersectionObserver' in window && boite.current) {
        obs = new IntersectionObserver(([v]) => (v.isIntersecting ? a.reprendre() : a.pause()));
        obs.observe(boite.current);
      }
      const fini = () => { enEntree.current = false; entreeFinie.current?.(); };
      // La chute part tout de suite (il apparaît déjà en l'air) ; les autres gestes attendent un peu.
      enEntree.current = chute;
      if (chute) jouerGeste(a, g, () => exprRef.current, fini);
      else if (g) appels.push(gsap.delayedCall(0.35, () => jouerGeste(a, g, () => exprRef.current, fini)));
      else fini();
      setPret(true);
    }).catch(() => { if (vivant) setEchec(true); });
    return () => {
      vivant = false;
      obs?.disconnect();
      appels.forEach(c => c.kill());
      a?.detruire();
      anim.current = null;
      rigRef.current = null;
      calqueAcc.current = null;
      calqueDerriere.current = null;
      accPose.current = false;
      accActuel.current = null;
      tenu.current = null;
      h?.replaceChildren();
    };
  }, []);

  useEffect(() => {
    if (pret && !enEntree.current) anim.current?.expression(versMoteur(expression));
  }, [expression, pret]);

  // Le premier accessoire est déjà là ; ensuite l'ancien s'en va et le nouveau arrive : un chapeau
  // s'envole et tombe (son ombre n'apparaît sur le front qu'à l'atterrissage), un objet tenu
  // rapetisse pendant que le bras retombe, ou surgit dans la main qui se plie. Une liste en pose
  // plusieurs à la fois (le haut-de-forme et la baguette du magicien).
  const cleAcc = [].concat(accessoire ?? []).filter(n => ACCESSOIRES[n]).join('+');
  useEffect(() => {
    const g = calqueAcc.current, gsap = gsapRef.current, rig = rigRef.current;
    if (!pret || !g || !rig) return;
    const anime = accPose.current && !anim.current?.calme;
    accPose.current = true;
    const anciens = accActuel.current;
    if ((anciens?.cle ?? '') === cleAcc) return;
    anciens?.items.forEach(a => a.retirer(anime));
    accActuel.current = null;
    if (!cleAcc) return;
    const delai = anciens ? 0.15 : 0;
    const placer = accessoire => {
      const p = ACCESSOIRES[accessoire];
      const objet = imageSvg(`${BASE}accessoires/${accessoire}.webp`, p.main
        ? { x: p.prise[0] - p.ancre[0] * p.w, y: p.prise[1] - p.ancre[1] * p.h, w: p.w, h: p.h } : p);

      if (p.main) {
        // Sous les doigts : premier enfant de la main relâchée (même repère, même visibilité). La main
        // passe au-dessus du tube du bras, sinon le haut du bras recouvre l'objet (le drapeau).
        const el = document.createElementNS(NS, 'g');
        el.appendChild(objet);
        const bras = rig.brasEl[p.main];
        const main = bras.mains.relachee;
        main.insertBefore(el, main.firstChild);
        bras.g.appendChild(bras.main);
        const t = { p, el, k: anime ? 0 : 1, pose: { ...p.bras } };
        tenu.current = t;
        const origine = `${p.prise[0]} ${p.prise[1]}`;
        if (anime) {
          gsap.to(t, { k: 1, duration: 0.35, delay: delai, ease: 'power2.out' });
          gsap.from(objet, { scale: 0, svgOrigin: origine, duration: 0.45, delay: delai + 0.15, ease: 'back.out(2)' });
        }
        return { retirer: (an) => {
          const fin = () => {
            el.remove();
            if (tenu.current !== t) return; // un autre objet a déjà pris la main
            tenu.current = null;
            bras.g.insertBefore(bras.main, bras.g.querySelector('.b-tube'));
          };
          if (!an) { fin(); return; }
          gsap.to(objet, { scale: 0, svgOrigin: origine, duration: 0.2, ease: 'power2.in' });
          gsap.to(t, { k: 0, duration: 0.3, delay: 0.1, ease: 'power2.inOut', onComplete: fin });
        } };
      }

      const acc = document.createElementNS(NS, 'g');
      const ombre = p.ombre && imageSvg(`${BASE}accessoires/${accessoire}-ombre.webp`, p.ombre);
      const fond = p.derriere && calqueDerriere.current && imageSvg(`${BASE}accessoires/${accessoire}-derriere.webp`, p);
      if (ombre) acc.appendChild(ombre);
      acc.appendChild(objet);
      g.appendChild(acc);
      if (fond) calqueDerriere.current.appendChild(fond);
      const pieces = fond ? [objet, fond] : [objet];
      if (anime) {
        if (p.enfile) gsap.from(objet, { scale: 1.4, opacity: 0, svgOrigin: `${p.x + p.w / 2} ${p.y + p.h / 2}`, duration: 0.35, delay: delai, ease: 'back.out(1.6)' });
        else gsap.from(pieces, { y: -700, opacity: 0, duration: 0.6, delay: delai, ease: 'bounce.out' });
        if (ombre) gsap.from(ombre, { opacity: 0, duration: 0.25, delay: delai + 0.3 });
      }
      return { retirer: (an) => {
        const fin = () => { acc.remove(); fond?.remove(); };
        if (!an) { fin(); return; }
        if (ombre) gsap.to(ombre, { opacity: 0, duration: 0.1 });
        gsap.to(pieces, { y: -500, opacity: 0, duration: 0.25, ease: 'power2.in', onComplete: fin });
      } };
    };
    accActuel.current = { cle: cleAcc, items: cleAcc.split('+').map(placer) };
  }, [cleAcc, pret]);

  useImperativeHandle(ref, () => ({
    geste: nom => jouerGeste(anim.current, nom, () => exprRef.current),
    expression: nom => anim.current?.expression(versMoteur(nom)),
    dire: texte => anim.current?.parler(minutageTexte(texte)),
    // Réviz lance : l'objet tenu (la boule de papier), sa place à l'écran, le lancer, une nouvelle boule.
    objet: () => tenu.current?.el.getBoundingClientRect() ?? null,
    lancer: ({ lacher, sens = 0 } = {}) => lancer(sens, lacher),
    // Le ninja des fautes : un coup de sabre, de haut en bas (vers = 1) ou de bas en haut (-1).
    trancher: (vers = 1) => trancher(vers),
    // Tape-taupe ! : un coup de maillet, à gauche ou devant ; impact quand la tête du maillet touche.
    frapper: ({ vers = 'devant', impact } = {}) => frapper(vers, impact),
    montrerObjet: () => {
      const t = tenu.current, gsap = gsapRef.current;
      if (!t || !gsap) return;
      t.el.style.opacity = '';
      if (!anim.current?.calme) gsap.fromTo(t.el, { scale: 0 }, { scale: 1, svgOrigin: `${t.p.prise[0]} ${t.p.prise[1]}`, duration: 0.3, ease: 'back.out(2.2)' });
    },
    // La pizzeria : la part en trop qu'il croque en cachette (bouchee : à chaque coup de dents).
    croquer: ({ bouchee, fini } = {}) => aLaBouche('part', { bouchee, fini }),
  }), []);

  // Un objet porté à la bouche le temps d'un geste (la part de pizza) : le bras prend la pose de
  // l'objet (dosée par k), l'objet rapetisse à chaque bouchée pendant qu'il mâche, puis le bras
  // retombe. Chaque étape part de l'arrêt et s'y termine (inOut) : pas d'à-coup.
  function aLaBouche(nom, { bouchee, fini } = {}) {
    const gsap = gsapRef.current, a = anim.current, rig = rigRef.current;
    if (!gsap || !a || !rig || tenu.current || a.calme) { fini?.(); return; }
    const p = ACCESSOIRES[nom];
    const el = document.createElementNS(NS, 'g');
    const objet = imageSvg(`${BASE}accessoires/${nom}.webp`, { x: p.prise[0] - p.ancre[0] * p.w, y: p.prise[1] - p.ancre[1] * p.h, w: p.w, h: p.h });
    el.appendChild(objet);
    const bras = rig.brasEl[p.main];
    const main = bras.mains.relachee;
    main.insertBefore(el, main.firstChild);
    bras.g.appendChild(bras.main);
    const t = { p, el, k: 0, pose: { ...p.bras } };
    tenu.current = t;
    const origine = `${p.prise[0]} ${p.prise[1]}`;
    const tl = gsap.timeline({ onComplete: () => {
      el.remove();
      if (tenu.current === t) { tenu.current = null; bras.g.insertBefore(bras.main, bras.g.querySelector('.b-tube')); }
      fini?.();
    } });
    tl.to(t, { k: 1, duration: 0.24, ease: 'power2.inOut' }, 0);
    tl.fromTo(objet, { scale: 0 }, { scale: 1, svgOrigin: origine, duration: 0.24, ease: 'power2.out' }, 0);
    // Trois bouchées : la main pousse la part vers la bouche, il mâche, elle a rapetissé.
    [0.62, 0.32, 0].forEach((reste, i) => {
      const t0 = 0.3 + i * 0.34;
      tl.to(t.pose, { coude: p.bras.coude - 12, duration: 0.12, ease: 'sine.inOut' }, t0)
        .to(t.pose, { coude: p.bras.coude, duration: 0.16, ease: 'sine.inOut' }, t0 + 0.12)
        .to(objet, { scale: reste, svgOrigin: origine, duration: 0.1, ease: 'power2.inOut' }, t0 + 0.1)
        .to(a.etat, { ecrase: 0.05, duration: 0.12, ease: 'sine.inOut', yoyo: true, repeat: 1 }, t0 + 0.06)
        .call(() => { bouchee?.(i); a.parler(minutageTexte('mmm')); }, null, t0 + 0.1);
    });
    tl.to(t, { k: 0, duration: 0.34, ease: 'power2.inOut' }, 1.38);
  }

  // Le lancer, bras armé au-dessus de la tête (pose de l'objet tenu) : le coude se replie en arrière
  // pendant que le corps se tasse, puis l'avant-bras fouette vers l'avant ; la boule part au sommet du
  // fouet (lacher), le bras accompagne vers la cible (sens : -1 à gauche, 0 au centre, 1 à droite)
  // puis revient armé, la main vide. Chaque étape repart de la vitesse de la précédente : pas d'à-coup.
  function lancer(sens, lacher) {
    const t = tenu.current, gsap = gsapRef.current, a = anim.current;
    if (!t || !gsap || !a || a.calme) { if (t) t.el.style.opacity = '0'; lacher?.(); return; }
    const p = t.p.bras, e = a.etat;
    gsap.killTweensOf(t.pose);
    gsap.timeline()
      .to(t.pose, { epaule: p.epaule - 12, coude: p.coude + 38, duration: 0.1, ease: 'sine.inOut' }, 0)
      .to(e, { ecrase: 0.08, corpsRot: -4, duration: 0.1, ease: 'sine.inOut' }, 0)
      .to(t.pose, { epaule: p.epaule + 18, coude: -12, duration: 0.1, ease: 'power2.in' }, 0.1)
      .to(e, { ecrase: -0.05, corpsRot: 3 + 3 * sens, duration: 0.12, ease: 'power2.out' }, 0.1)
      .call(() => { t.el.style.opacity = '0'; lacher?.(); }, null, 0.2)
      .to(t.pose, { epaule: 95 - 25 * sens, coude: -8, duration: 0.2, ease: 'power2.out' }, 0.2)
      .to(e, { ecrase: 0, corpsRot: 0, duration: 0.35, ease: 'power2.inOut' }, 0.22)
      .to(t.pose, { epaule: p.epaule, coude: p.coude, duration: 0.32, ease: 'power2.inOut' }, 0.46);
  }

  // Le coup de sabre, depuis la garde (pose de l'objet tenu) : le bras s'arme d'un côté pendant que le
  // corps se tasse, puis fend l'air de l'autre côté ; la lame tourne avec le poignet (t.tourne) et le
  // corps suit le coup, puis tout revient en garde. Un coup en cours est repris là où il en est.
  function trancher(vers) {
    const t = tenu.current, gsap = gsapRef.current, a = anim.current;
    if (!t || !gsap || !a || a.calme) return;
    const p = t.p.bras, e = a.etat;
    const haut = { epaule: 135, coude: 25, tourne: -35 }, bas = { epaule: -35, coude: -15, tourne: 110 };
    const [arme, fin] = vers > 0 ? [haut, bas] : [bas, haut];
    gsap.killTweensOf(t);
    gsap.killTweensOf(t.pose);
    gsap.timeline()
      .to(t.pose, { epaule: arme.epaule, coude: arme.coude, duration: 0.07, ease: 'power2.out' }, 0)
      .to(t, { tourne: arme.tourne, duration: 0.07, ease: 'power2.out' }, 0)
      .to(e, { ecrase: 0.06, corpsRot: -5 * vers, duration: 0.07, ease: 'power2.out' }, 0)
      .to(t.pose, { epaule: fin.epaule, coude: fin.coude, duration: 0.11, ease: 'power3.in' }, 0.07)
      .to(t, { tourne: fin.tourne, duration: 0.11, ease: 'power3.in' }, 0.07)
      .to(e, { ecrase: -0.05, corpsRot: 7 * vers, duration: 0.11, ease: 'power2.in' }, 0.07)
      .to(t.pose, { epaule: p.epaule, coude: p.coude, duration: 0.34, ease: 'power2.inOut' }, 0.26)
      .to(t, { tourne: 0, duration: 0.34, ease: 'power2.inOut' }, 0.26)
      .to(e, { ecrase: 0, corpsRot: 0, duration: 0.4, ease: 'power2.inOut' }, 0.22);
  }

  // Le coup de maillet, depuis la pose brandie (pose de l'objet tenu) : le bras s'arme un peu plus en
  // arrière pendant que le corps se tasse, puis s'abat d'un coup, le maillet tourne avec le poignet
  // (t.tourne) et le corps plonge avec lui ; impact au bout du coup, puis tout revient brandi. Deux
  // coups : à gauche (le bras le long du corps, la tête du maillet au sol à côté de lui) ou devant (le
  // bras en travers, la tête du maillet à ses pieds). Un coup en cours est repris là où il en est.
  const COUPS = {
    gauche: { epaule: 10, coude: -10, tourne: -140, rot: -5, arme: 25 },
    devant: { epaule: -30, coude: -15, tourne: 140, rot: 3, arme: -25 },
  };
  function frapper(vers, impact) {
    const t = tenu.current, gsap = gsapRef.current, a = anim.current;
    if (!t || !gsap || !a || a.calme) { impact?.(); return; }
    const p = t.p.bras, e = a.etat, c = COUPS[vers] ?? COUPS.devant;
    gsap.killTweensOf(t);
    gsap.killTweensOf(t.pose);
    gsap.timeline()
      .to(t.pose, { epaule: p.epaule + 15, coude: p.coude + 20, duration: 0.06, ease: 'power2.out' }, 0)
      .to(t, { tourne: c.arme, duration: 0.06, ease: 'power2.out' }, 0)
      .to(e, { ecrase: 0.07, corpsRot: -c.rot / 2, duration: 0.06, ease: 'power2.out' }, 0)
      .to(t.pose, { epaule: c.epaule, coude: c.coude, duration: 0.09, ease: 'power3.in' }, 0.06)
      .to(t, { tourne: c.tourne, duration: 0.09, ease: 'power3.in' }, 0.06)
      .to(e, { ecrase: -0.06, corpsRot: c.rot, duration: 0.09, ease: 'power2.in' }, 0.06)
      .call(() => impact?.(), null, 0.15)
      .to(t.pose, { epaule: p.epaule, coude: p.coude, duration: 0.3, ease: 'power2.inOut' }, 0.26)
      .to(t, { tourne: 0, duration: 0.3, ease: 'power2.inOut' }, 0.26)
      .to(e, { ecrase: 0, corpsRot: 0, duration: 0.34, ease: 'power2.inOut' }, 0.22);
  }

  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      ref={boite}
      type={onClick ? 'button' : undefined}
      className={`pantin${pret ? ' pantin--pret' : ''} ${className}`.trim()}
      style={{ width: size, height: size }}
      onClick={onClick}
      aria-label={onClick ? label : undefined}
      aria-hidden={onClick ? undefined : 'true'}
    >
      <svg viewBox={VUE} className="pantin-svg" aria-hidden="true">
        <g ref={hote} />
      </svg>
      {!pret && (repli || echec) && <Mascot pose={repli || 'hello'} size={size} priority alt="" aria-hidden="true" className="pantin-repli" />}
    </Tag>
  );
});
