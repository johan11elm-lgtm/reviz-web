import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Pantin } from '../../components/Pantin';
import { commandesPizzeria } from '../../data/commandesPizzeria';
import { jouer } from '../../utils/bruitages';
import { musiquePizzeria } from '../../utils/musiquePizzeria';
import './Pizzeria.css';

/**
 * La pizzeria ! (23/10) : une pizzeria en pâte à modeler et feutrine (calques générés,
 * public/jeux/pizzeria/), Réviz pizzaïolo derrière son comptoir. Un ticket de commande pend à une
 * pince (« 3/8 de pizza ») ; la pizza est déjà coupée. On touche une part (ou on la glisse) : elle
 * saute dans l'assiette ; touchée dans l'assiette, elle revient. « Servir » envoie l'assiette.
 * Juste : la main du client (une marionnette de feutrine, on ne voit qu'elle) emporte l'assiette,
 * « Perfetto ! », Réviz fait le baiser du chef. Pas assez : le client pointe l'assiette, « C'est
 * tout ?! ». Trop : Réviz croque la part en trop en cachette. Chrono écoulé : le client tapote le
 * comptoir et la pizza brûle. Trois tours : la coupe du ticket, puis des fractions qui ne tombent
 * pas juste (3/4 sur une pizza en 8), puis le coup de feu sur deux pizzas (5/4, 1/4 + 3/8, 75 %).
 *
 * Le comptoir est un plan vu de dessus (1000 × 640 unités), écrasé en hauteur pour la perspective :
 * pizzas, assiette et parts y sont posées en vue de dessus et tournent dans ce plan. Tout ce qui
 * bouge (parts, planches, assiette, main) est placé par transform sur des calques fixes, à chaque
 * image (requestAnimationFrame) ; chaque mouvement part de l'arrêt et s'y termine.
 */

// n : commandes du tour ; rythme : durée des réactions (1 = la plus lente).
export const TOURS_PIZZERIA = [
  { duree: 16, n: 4, rythme: 1, titre: 'Les commandes', annonce: 'Les commandes\u00a0!', sous: 'Sers ce que dit le ticket' },
  { duree: 16, n: 4, rythme: 0.9, titre: 'Ça ne tombe pas juste', annonce: 'Ça ne tombe pas juste\u00a0!', sous: 'La pizza est coupée autrement' },
  { duree: 15, n: 3, rythme: 0.85, titre: 'Coup de feu', annonce: 'Coup de feu\u00a0!', sous: 'Deux pizzas, commandes corsées' },
];
const TEMPOS = [112, 122, 132];

/** Un tour de la pizzeria au niveau 0, 1 ou 2 (le thème de la Partie rapide ne sert pas : les fractions sont générées). */
export function manchePizzeria(theme, niveau) {
  const t = TOURS_PIZZERIA[niveau];
  return { ...t, type: 'pizzeria', niveau, commandes: commandesPizzeria(niveau, t.n), apercu: 0 };
}
/** La pizzeria seule : 3 tours qui accélèrent. */
export const partiePizzeria = () => TOURS_PIZZERIA.map((_, i) => manchePizzeria(null, i));
export const TEMPO_PIZZERIA = niveau => TEMPOS[niveau] ?? TEMPOS.at(-1);

// ── Le plan du comptoir (unités du plan, vue de dessus) ──
const PLAN = { l: 1000, h: 640 };
const DISPOSITIONS = {
  // Le comptoir déborde de l'écran de 16 px de chaque côté sur téléphone : tout tient entre 40 et 960.
  1: { pizzas: [{ x: 310, y: 330, d: 540 }], assiette: { x: 770, y: 350, d: 360 } },
  2: { pizzas: [{ x: 205, y: 318, d: 322 }, { x: 532, y: 334, d: 322 }], assiette: { x: 828, y: 360, d: 262 } },
};
const ECRASE = 0.63; // la perspective : le plan vu en biais est écrasé en hauteur
const ECART = 6; // les parts s'écartent un peu du centre : les coupes se voient
const BORD = 16; // épaisseur de la pâte, sous chaque part (unités du plan, avant écrasement)
const DEUXIEME = { x: -12, y: -30 }; // une 2e pizza dans l'assiette se pose sur la première, décalée
const DEHORS = { gauche: -1250, droite: 1300, bas: 1500 }; // sur ordinateur, l'assiette part vers le bas
const borne = (v, a, b) => Math.max(a, Math.min(b, v));
const enDouceur = u => (u < 0.5 ? 4 * u * u * u : 1 - (-2 * u + 2) ** 3 / 2); // inOut : part et finit à l'arrêt
const angle = r => ((r + 540) % 360) - 180;

// La découpe d'une part : un secteur (en % de la boîte de la pizza), de a0 à a1 degrés.
function secteur(a0, a1) {
  const pts = ['50% 50%'];
  const n = Math.max(2, Math.ceil((a1 - a0) / 8));
  for (let k = 0; k <= n; k++) {
    const a = ((a0 + ((a1 - a0) * k) / n) * Math.PI) / 180;
    pts.push(`${(50 + 53 * Math.cos(a)).toFixed(2)}% ${(50 + 53 * Math.sin(a)).toFixed(2)}%`);
  }
  return `polygon(${pts.join(', ')})`;
}

// Le ticket, la note : des morceaux (texte ou fraction [n, d]).
function Morceaux({ m }) {
  return m.map((x, i) => (Array.isArray(x)
    ? <span key={i} className="pz-frac"><span>{x[0]}</span><span>{x[1]}</span></span>
    : <span key={i} className={x.length > 6 ? 'pz-mots' : 'pz-signe'}>{x}</span>));
}

export function PlateauPizzeria({ manche, idx, total, phase, expire, onBon, onFaux, onTermine, onDemarrer, fermer, boutonSon, score, isDesktop, hauteurEcran }) {
  const pantin = useRef(null);
  const plan = useRef(null), comptoir = useRef(null), revizEl = useRef(null), mainEl = useRef(null);
  const commandes = manche.commandes;
  const [k, setK] = useState(0); // commande en cours
  const [servi, setServi] = useState(null); // { juste, id } : tampon et note sur le ticket
  const [bulle, setBulle] = useState(null); // ce que dit le client : { texte, id }
  const [main, setMain] = useState('attrape');
  const [effet, setEffet] = useState(null); // { type: baiser | miettes | plus, id }
  const [brule, setBrule] = useState(false);
  const [fete, setFete] = useState(null);
  // Le verdict, lisible d'un coup d'œil dès qu'on sert : { type: juste | peu | trop | temps, titre, sous, id }.
  const [verdict, setVerdict] = useState(null);
  const [reste, setReste] = useState(manche.duree); // secondes affichées dans le chrono
  const [decompte, setDecompte] = useState(null); // 3, 2, 1 : les dernières secondes, en grand
  const rotation = useMemo(() => commandes.map(() => Math.random() * 360), [commandes]); // la garniture tourne d'une pizza à l'autre
  const jeu = useRef({ k: 0, libre: false, fini: true, servie: false, justes: 0 });
  const minuteurs = useRef([]);
  const plus = (ms, f) => minuteurs.current.push(setTimeout(f, ms));
  const vider = () => { minuteurs.current.forEach(clearTimeout); minuteurs.current = []; };
  const r = manche.rythme;
  const kc = Math.min(k, commandes.length - 1); // k revient à 0 au tour suivant
  const c = commandes[kc];
  const dispo = DISPOSITIONS[c.pizzas];

  // ── Le moteur : l'état de chaque part et des objets, appliqué à chaque image ──
  const m = useRef(null);
  if (!m.current) m.current = { parts: new Map(), anims: [], planches: [{ x: 0 }, { x: 0 }], assiette: { x: 0, y: 0 }, main: { x: 1, y: 0, r: 0 }, echelle: 0.39 };
  const M = m.current;
  M.parBas = isDesktop;
  const sortie = () => (M.parBas ? { y: DEHORS.bas } : { x: DEHORS.droite }); // où part l'assiette
  const animer = (duree, maj, fin, ease = enDouceur) => M.anims.push({ t0: performance.now(), duree: duree * 1000, maj, fin, ease });
  const tween = (obj, vers, duree, fin) => {
    const de = { ...obj };
    animer(duree, u => { for (const cle of Object.keys(vers)) obj[cle] = de[cle] + (vers[cle] - de[cle]) * u; }, fin);
  };

  // Une part sur la pizza p, au secteur i ; sa place dans l'assiette, au rang `place`.
  const repos = () => ({ x: 0, y: 0, r: 0, s: 1 });
  const dansAssiette = (pt, place) => {
    const pz = dispo.pizzas[pt.p], as = dispo.assiette, n = c.coupe;
    const couche = Math.floor(place / n), w = place % n;
    return {
      x: as.x - pz.x + couche * DEUXIEME.x, y: as.y - pz.y + couche * DEUXIEME.y,
      r: angle((w - pt.i) * (360 / n)), s: (as.d * 0.8) / pz.d,
    };
  };
  const dansLAssiette = () => [...M.parts.values()].filter(pt => pt.place !== null && !pt.mangee);
  const placeLibre = () => { const prises = new Set(dansLAssiette().map(pt => pt.place)); let p = 0; while (prises.has(p)) p += 1; return p; };
  const voler = (pt, vers, duree, { haut = 70, fin } = {}) => {
    pt.vol = { de: { ...(pt.tire ?? pt.pos) }, vers, t0: performance.now(), duree: duree * 1000, haut, fin };
    pt.tire = null;
  };

  useEffect(() => {
    let id = 0;
    const image = maintenant => {
      M.anims = M.anims.filter(a => {
        const u = borne((maintenant - a.t0) / a.duree, 0, 1);
        a.maj(a.ease(u));
        if (u >= 1) { a.fin?.(); return false; }
        return true;
      });
      for (const pt of M.parts.values()) {
        if (!pt.el) continue;
        let q;
        if (pt.vol) {
          const v = pt.vol, u = borne((maintenant - v.t0) / v.duree, 0, 1), e = enDouceur(u), b = Math.sin(Math.PI * u);
          q = { x: v.de.x + (v.vers.x - v.de.x) * e, y: v.de.y + (v.vers.y - v.de.y) * e - v.haut * b, r: v.de.r + (v.vers.r - v.de.r) * e, s: (v.de.s + (v.vers.s - v.de.s) * e) * (1 + 0.1 * b) };
          if (u >= 1) { pt.pos = v.vers; pt.vol = null; v.fin?.(); }
        } else q = pt.tire ?? pt.pos;
        const d = pt.place === null || pt.vol || pt.tire ? M.planches[pt.p] : M.assiette;
        pt.el.style.transform = `translate(${(q.x + (d.x ?? 0)).toFixed(1)}px, ${(q.y + (d.y ?? 0)).toFixed(1)}px) rotate(${q.r.toFixed(2)}deg) scale(${q.s.toFixed(3)})`;
        // Les parts de devant passent sur celles de derrière (leur pâte dépasse vers le bas).
        const z = pt.vol || pt.tire ? 400 : (pt.place === null ? 100 : 200 + Math.floor(pt.place / c.coupe) * 60) + Math.round(Math.sin(((pt.angle + q.r) * Math.PI) / 180) * 40);
        if (pt.z !== z) { pt.el.style.zIndex = z; pt.z = z; }
      }
      M.planchesEl?.forEach((el, p) => { if (el) el.style.transform = `translate(${M.planches[p].x.toFixed(1)}px, 0)`; });
      if (M.assietteEl) M.assietteEl.style.transform = `translate(${M.assiette.x.toFixed(1)}px, ${M.assiette.y.toFixed(1)}px)`;
      // La main du client, en px d'écran : x = 1, hors de l'écran ; 0, posée à côté de l'assiette. Sur
      // téléphone, elle entre par la droite ; sur ordinateur, par le bas (tournée, les doigts en haut).
      if (mainEl.current) {
        const el = mainEl.current, s = M.echelle;
        if (M.parBas) {
          const dehors = Math.max(el.offsetWidth + 20, window.innerHeight - M.comptoirHaut - el.offsetTop + el.offsetWidth);
          el.style.transform = `translate(${(M.assiette.x * s).toFixed(1)}px, ${(M.main.x * dehors + M.main.y + M.assiette.y * s * ECRASE).toFixed(1)}px) rotate(${(90 + M.main.r).toFixed(2)}deg)`;
        } else {
          const dehors = Math.max(el.offsetWidth + 20, window.innerWidth - M.comptoirGauche - el.offsetLeft + 20);
          el.style.transform = `translate(${(M.main.x * dehors + M.assiette.x * s).toFixed(1)}px, ${(M.main.y + M.assiette.y * s * ECRASE).toFixed(1)}px) rotate(${M.main.r.toFixed(2)}deg)`;
        }
      }
      id = requestAnimationFrame(image);
    };
    id = requestAnimationFrame(image);
    return () => cancelAnimationFrame(id);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // L'échelle du plan : sa largeur à l'écran / 1000 (le plan suit la largeur du comptoir).
  const [echelle, setEchelle] = useState(0.39);
  useLayoutEffect(() => {
    const el = comptoir.current;
    if (!el) return undefined;
    const maj = () => { const s = el.offsetWidth / PLAN.l; M.echelle = s; const R = el.getBoundingClientRect(); M.comptoirGauche = R.left; M.comptoirHaut = R.top; setEchelle(s); };
    maj();
    const ro = new ResizeObserver(maj);
    ro.observe(el);
    return () => ro.disconnect();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Les parts de la commande en cours : enregistrées au montage de leur élément (un rappel stable
  // par part, sinon React le rappellerait à chaque rendu).
  const rappels = useRef(new Map());
  const enregistrer = (cle, p, i, n) => {
    if (!rappels.current.has(cle)) {
      rappels.current.set(cle, el => {
        if (!el) { M.parts.delete(cle); rappels.current.delete(cle); return; }
        M.parts.set(cle, { el, p, i, angle: (i + 0.5) * (360 / n) - 90, pos: repos(), place: null, vol: null, tire: null, mangee: false, z: null });
      });
    }
    return rappels.current.get(cle);
  };

  const terminer = useCallback(manques => {
    const j = jeu.current;
    if (j.fini) return;
    j.fini = true; j.libre = false;
    musiquePizzeria.regler({ enTension: false });
    onTermine(manques);
  }, [onTermine]);

  // Début du tour : la première commande tombe au bout de sa ficelle, le chrono part. Avant, à
  // l'annonce, on remet le comptoir en place (le tour précédent a pu finir en pleine réaction).
  useEffect(() => {
    vider();
    jeu.current = { k: 0, libre: false, fini: phase !== 'jeu', servie: false, justes: 0 };
    if (phase !== 'jeu') {
      setK(0); setServi(null); setBulle(null); setBrule(false); setFete(null); setEffet(null);
      setVerdict(null); setDecompte(null); setReste(manche.duree);
      M.anims = []; M.main = { x: 1, y: 0, r: 0 }; M.assiette.x = 0; M.assiette.y = 0;
      M.planches.forEach(pl => { pl.x = 0; });
      pantin.current?.expression('content');
      return undefined;
    }
    jeu.current.libre = true;
    // Le temps se voit (les secondes dans le chrono) et s'entend : les 3 dernières secondes, la musique
    // accélère, un tic par seconde et le chiffre en grand au milieu de l'écran.
    const debut = performance.now();
    const montre = setInterval(() => setReste(Math.max(0, Math.ceil(manche.duree - (performance.now() - debut) / 1000))), 200);
    plus((manche.duree - 3) * 1000, () => musiquePizzeria.regler({ enTension: true }));
    [3, 2, 1].forEach(n => plus((manche.duree - n) * 1000, () => { if (!jeu.current.fini) { setDecompte(n); jouer('tic'); } }));
    return () => { vider(); clearInterval(montre); musiquePizzeria.regler({ enTension: false }); };
  }, [phase, idx]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => vider(), []);

  // Commande suivante : la planche (et ce qui reste de la pizza) part à gauche, une nouvelle pizza
  // arrive, une assiette vide revient de la droite, le ticket suivant tombe.
  const suivante = useCallback(() => {
    const j = jeu.current;
    if (j.fini) return;
    if (j.k + 1 >= commandes.length) {
      if (j.justes === commandes.length) { setFete(Date.now()); jouer('bravo'); pantin.current?.geste('saut'); }
      plus(500 * r, () => terminer([]));
      return;
    }
    M.planches.forEach(pl => tween(pl, { x: DEHORS.gauche }, 0.24 * r));
    plus(250 * r, () => {
      if (j.fini) return;
      j.k += 1; j.servie = false;
      M.planches.forEach(pl => { pl.x = DEHORS.gauche; });
      Object.assign(M.assiette, { x: 0, y: 0 }, sortie());
      setK(j.k); setServi(null); setBulle(null); setBrule(false); setVerdict(null);
      jouer('planche');
      M.planches.forEach(pl => tween(pl, { x: 0 }, 0.28 * r));
      tween(M.assiette, { x: 0, y: 0 }, 0.28 * r, () => { if (!j.fini) j.libre = true; });
    });
  }, [commandes.length, r, terminer]); // eslint-disable-line react-hooks/exhaustive-deps

  // La main du client entre (x : 1 -> 0), puis repart avec ou sans l'assiette.
  const mainEntre = (image, duree = 0.24) => { setMain(image); M.main.r = 0; tween(M.main, { x: 0 }, duree * r); };
  const emporter = (avecAssiette, apres) => {
    if (avecAssiette) { jouer('emporte'); tween(M.assiette, sortie(), 0.36 * r); }
    else tween(M.assiette, sortie(), 0.4 * r);
    tween(M.main, { x: 1 }, 0.36 * r, apres);
  };

  const servir = useCallback(() => {
    const j = jeu.current;
    if (!j.libre || j.fini) return;
    j.libre = false; j.servie = true;
    const cmd = commandes[j.k];
    const servies = dansLAssiette();
    const n = servies.length;
    const ici = Date.now();
    const parts = `Il fallait ${cmd.attendu} part${cmd.attendu > 1 ? 's' : ''}`;
    if (n === cmd.attendu) {
      j.justes += 1;
      // Le verdict d'abord, d'un coup : cloche claire, éclair vert, bandeau « Juste ! » ; les petites
      // scènes (le client, Réviz) viennent après.
      jouer('ding');
      setVerdict({ type: 'juste', titre: 'Juste\u00a0!', id: ici });
      setServi({ juste: true, id: ici });
      setEffet({ type: 'plus', id: ici });
      // Le baiser du chef : la grande main du moteur vient contre la bouche (« réfléchit » : il savoure),
      // puis il l'envoie, les yeux en cœur ; il reprend son air content ensuite.
      onBon('fier');
      pantin.current?.expression('reflechit');
      plus(2100, () => pantin.current?.expression('content'));
      mainEntre('attrape', 0.2);
      plus(120 * r, () => setBulle({ texte: 'Perfetto\u00a0!', id: ici }));
      plus(220 * r, () => emporter(true));
      plus(860, () => { jouer('bisou'); setEffet({ type: 'baiser', id: Date.now() }); pantin.current?.expression('amoureux'); });
      plus(520 * r, suivante);
      return;
    }
    // Raté : le buzzer grave, éclair rouge, bandeau « Pas assez ! » ou « Trop ! » avec ce qu'il fallait.
    jouer('buzzer');
    setVerdict({ type: n < cmd.attendu ? 'peu' : 'trop', titre: n < cmd.attendu ? 'Pas assez\u00a0!' : 'Trop\u00a0!', sous: parts, id: ici });
    onFaux(cmd.erreur(n));
    setServi({ juste: false, id: ici });
    mainEntre('pointe');
    if (n < cmd.attendu) {
      plus(150 * r, () => setBulle({ texte: n ? 'C’est tout ?!' : 'C’est vide ?!', id: ici }));
      pantin.current?.expression('decu');
      pantin.current?.geste('gratterTete');
      plus(800 * r, () => emporter(false));
      plus(1000 * r, () => { pantin.current?.expression('content'); suivante(); });
      return;
    }
    // Trop : les parts en trop (les dernières posées) filent dans la main de Réviz, qui les croque.
    plus(150 * r, () => setBulle({ texte: 'Hé\u00a0! Rends ça\u00a0!', id: ici }));
    const enTrop = servies.sort((a, b) => b.place - a.place).slice(0, n - cmd.attendu);
    const R = plan.current.getBoundingClientRect(), P = revizEl.current?.getBoundingClientRect();
    enTrop.forEach((pt, i) => {
      const pz = dispo.pizzas[pt.p];
      const cible = P
        ? { x: ((P.left + P.width * 0.6 - R.left) / R.width) * PLAN.l - pz.x, y: ((P.top + P.height * 0.5 - R.top) / R.height) * PLAN.h - pz.y }
        : { x: 0, y: -600 };
      const de = { ...pt.pos };
      pt.pos = { x: de.x + M.assiette.x, y: de.y + M.assiette.y, r: de.r, s: de.s };
      plus((150 + i * 80) * r, () => voler(pt, { ...cible, r: pt.pos.r + 40, s: 0.18 }, 0.34, { haut: 40, fin: () => { pt.mangee = true; pt.el.style.opacity = '0'; } }));
    });
    // Il croque pendant que la commande suivante arrive : le jeu ne l'attend pas.
    plus(450, () => pantin.current?.croquer({ bouchee: () => { jouer('croque'); setEffet({ type: 'miettes', id: Date.now() }); } }));
    plus(950 * r, () => emporter(false));
    plus(1150 * r, suivante);
  }, [commandes, dispo, onBon, onFaux, r, suivante]); // eslint-disable-line react-hooks/exhaustive-deps

  // Chrono écoulé : le client tapote le comptoir, la pizza brûle ; la commande en cours va au récap.
  useEffect(() => {
    if (!expire) return;
    const j = jeu.current;
    if (j.fini) return;
    const cmd = commandes[j.k];
    const manque = !j.servie;
    // Temps écoulé : pas une erreur de calcul, et ça doit se voir. La sonnerie du minuteur de cuisine
    // (pas le buzzer), un bandeau sombre « Temps écoulé ! », la pizza brûle.
    jouer('minuteur');
    setDecompte(null);
    setVerdict({ type: 'temps', titre: 'Temps écoulé\u00a0!', sous: manque ? 'La pizza a brûlé' : null, id: Date.now() });
    setBrule(true);
    pantin.current?.expression('panique');
    if (manque) {
      setMain('tapote');
      tween(M.main, { x: 0 }, 0.26);
      plus(280, () => {
        jouer('tapote');
        animer(0.5, u => { M.main.r = -7 * Math.sin(u * Math.PI * 3); M.main.y = -6 * Math.abs(Math.sin(u * Math.PI * 3)); }, null, u => u);
      });
      plus(200, () => setBulle({ texte: 'Alors ?!', id: Date.now() }));
    }
    terminer(manque ? [cmd.erreur(null)] : []);
  }, [expire]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Le geste : toucher une part (elle saute dans l'assiette ou en revient), ou la glisser ──
  const geste = useRef(null);
  const versPlan = e => {
    const R = plan.current.getBoundingClientRect();
    return { x: ((e.clientX - R.left) / R.width) * PLAN.l, y: ((e.clientY - R.top) / R.height) * PLAN.h };
  };
  const basculer = (pt, depuis) => {
    if (pt.place === null) {
      pt.place = placeLibre();
      pt.el.dataset.assiette = '1';
      jouer('part');
      voler(pt, dansAssiette(pt, pt.place), depuis ? 0.2 : 0.3, { haut: depuis ? 30 : 80, fin: () => jouer('assiette') });
    } else {
      pt.place = null;
      delete pt.el.dataset.assiette;
      jouer('retour');
      voler(pt, repos(), depuis ? 0.2 : 0.28, { haut: depuis ? 30 : 70 });
    }
  };
  const appui = (e, cle) => {
    const j = jeu.current, pt = M.parts.get(cle);
    if (!j.libre || !pt || pt.vol || pt.mangee || geste.current || (e.button ?? 0) !== 0) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    geste.current = { cle, id: e.pointerId, x0: e.clientX, y0: e.clientY, p0: versPlan(e), base: { ...pt.pos }, glisse: false };
  };
  const bouge = e => {
    const g = geste.current;
    if (!g || g.id !== e.pointerId) return;
    const pt = M.parts.get(g.cle);
    if (!pt || !jeu.current.libre) return;
    if (!g.glisse && Math.hypot(e.clientX - g.x0, e.clientY - g.y0) < 10) return;
    if (!g.glisse) { g.glisse = true; jouer('part'); }
    const p = versPlan(e);
    pt.tire = { x: g.base.x + p.x - g.p0.x, y: g.base.y + p.y - g.p0.y, r: g.base.r, s: g.base.s * 1.06 };
    g.p = p;
  };
  const lache = e => {
    const g = geste.current;
    if (!g || g.id !== e.pointerId) return;
    geste.current = null;
    const pt = M.parts.get(g.cle);
    if (!pt) return;
    if (!jeu.current.libre) { if (pt.tire) voler(pt, pt.pos, 0.2, { haut: 0 }); return; }
    if (!g.glisse) { basculer(pt, false); return; }
    // Glissée : lâchée sur l'assiette, elle s'y pose ; ailleurs, elle rentre (sur la pizza).
    const as = dispo.assiette;
    const surAssiette = Math.hypot(g.p.x - as.x, g.p.y - as.y) < as.d * 0.62;
    if (surAssiette === (pt.place !== null)) voler(pt, pt.pos, 0.2, { haut: 0 });
    else basculer(pt, true);
  };

  // Au clavier : Entrée ou Espace pour servir.
  useEffect(() => {
    const touche = e => { if (!e.repeat && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); servir(); } };
    window.addEventListener('keydown', touche);
    return () => window.removeEventListener('keydown', touche);
  }, [servir]);

  // Réviz à la mesure de l'écran : il tient derrière le comptoir sous le titre et le ticket.
  const tailleReviz = Math.round(isDesktop ? Math.max(300, hauteurEcran * 0.48) : Math.min(300, Math.max(186, hauteurEcran * 0.4)));
  const enJeu = phase === 'jeu';
  const note = servi && !(c.ticket.length === 1 && Array.isArray(c.ticket[0]) && c.ticket[0][1] === c.coupe);
  const plan2d = { width: PLAN.l, height: PLAN.h, transform: `scale(${echelle}, ${echelle * ECRASE})` };
  // Un point du plan, en px depuis le haut du comptoir (le plan commence à 12,1 % de l'image).
  const haut = y => echelle * PLAN.l * (801 / 1024) * 0.121 + y * echelle * ECRASE;

  return (
    <div className={`app app--no-halo jx-page mg-page pz-page${isDesktop ? ' jx-page--large' : ''}${decompte ? ' pz-page--urgent' : ''}`}>
      <div className="pz-monde" aria-hidden="true">
        <img src={isDesktop ? '/jeux/pizzeria/fond-paysage.webp' : '/jeux/pizzeria/fond.webp'} alt="" className="pz-fond" />
        <i className="pz-feu" />
      </div>
      {verdict && verdict.type !== 'temps' && <div key={`e${verdict.id}`} className={`pz-flash pz-flash--${verdict.type === 'juste' ? 'vert' : 'rouge'}`} aria-hidden="true" />}
      {fete && (
        <div key={fete} className="mg-bravo" aria-hidden="true">
          {Array.from({ length: 18 }, (_, i) => <i key={i} style={{ '--k': i }} />)}
          <span>Service parfait !</span>
        </div>
      )}
      <div className="mg-scene pz-scene">
        <div className="jx-ligne-haut mg-hud">
          {fermer}
          <div className="mg-chrono">
            {enJeu && <span key={idx} className="mg-chrono-barre" style={{ '--duree': `${manche.duree}s`, '--attente': '0s' }} />}
            {enJeu && <span className="pz-secondes" aria-label={`${reste} secondes`}>{reste}</span>}
          </div>
          <span className="jx-score" aria-live="polite">{score}</span>
          {boutonSon}
        </div>
        <div className="mg-titre pz-titre">
          <span className="mg-titre-num">Tour {idx + 1} sur {total} · {manche.titre}</span>
          <h1>La pizzeria !</h1>
        </div>

        <div className="pz-milieu">
          {!enJeu && (
            <button type="button" key={`c${idx}`} className="pz-annonce" onClick={onDemarrer}>
              <span className="pz-annonce-titre">{manche.annonce}</span>
              <span className="pz-annonce-sous">{manche.sous} · {manche.duree} s</span>
            </button>
          )}
          {enJeu && (
            <div key={`${idx}-${k}`} className="pz-ticket" aria-live="polite">
              <div className="pz-ticket-balance">
                <img src="/jeux/pizzeria/ticket.webp" alt="" draggable="false" />
                <div className={`pz-ticket-txt${c.ticket.length > 1 ? ' pz-ticket-txt--somme' : ''}`}>
                  <span className="pz-ticket-valeur"><Morceaux m={c.ticket} /></span>
                  <span className="pz-ticket-de">de pizza</span>
                  {note && <span className={`pz-note${servi.juste ? '' : ' pz-note--rate'}`}><Morceaux m={c.note} /></span>}
                </div>
                {servi && <span key={`t${servi.id}`} className={`pz-tampon pz-tampon--${servi.juste ? 'servi' : 'rate'}`}>{servi.juste ? 'Servi' : 'Raté'}</span>}
                {effet?.type === 'plus' && <span key={`p${effet.id}`} className="pz-plus" aria-hidden="true">+100</span>}
              </div>
            </div>
          )}
          {decompte && <span key={`d${decompte}`} className="pz-decompte" aria-hidden="true">{decompte}</span>}
          <div className="pz-reviz" ref={revizEl}>
            {effet?.type === 'baiser' && (
              <svg key={effet.id} className="pz-baiser" viewBox="0 0 24 22" aria-hidden="true">
                <path d="M12 21C5 15.5 1 11.8 1 7.2 1 3.8 3.6 1.3 6.8 1.3c2.1 0 4 1.1 5.2 2.9 1.2-1.8 3.1-2.9 5.2-2.9 3.2 0 5.8 2.5 5.8 5.9 0 4.6-4 8.3-11 13.8z" />
              </svg>
            )}
            {effet?.type === 'miettes' && (
              <span key={effet.id} className="pz-miettes" aria-hidden="true">{Array.from({ length: 7 }, (_, i) => <i key={i} style={{ '--k': i }} />)}</span>
            )}
            <Pantin ref={pantin} size={tailleReviz} expression="content" repli={null} accessoire={['toque', 'tablier']} />
          </div>
        </div>

        <div className="pz-comptoir" ref={comptoir}>
          {/* Sur ordinateur, le comptoir panoramique traverse tout l'écran ; l'image du téléphone garde
              seulement la place du plan (invisible). */}
          {isDesktop && <img src="/jeux/pizzeria/comptoir-long.webp" alt="" className="pz-comptoir-long" draggable="false" />}
          <img src="/jeux/pizzeria/comptoir.webp" alt="" className="pz-comptoir-img" draggable="false" />
          <div className={`pz-plan${brule ? ' pz-plan--brule' : ''}`} ref={plan} style={plan2d}>
            {dispo.pizzas.map((pz, p) => (
              <div key={`pl${p}`} className="pz-planche" ref={el => { (M.planchesEl ??= [])[p] = el; }}
                style={{ left: pz.x - pz.d * 0.56, top: pz.y - pz.d * 0.56 * 0.82, width: pz.d * 1.12 }}>
                <img src="/jeux/pizzeria/planche.webp" alt="" draggable="false" />
              </div>
            ))}
            <div className={`pz-assiette${verdict && verdict.type !== 'temps' ? ` pz-assiette--${verdict.type === 'juste' ? 'juste' : 'faux'}` : ''}`} ref={el => { M.assietteEl = el; }}
              style={{ left: dispo.assiette.x - dispo.assiette.d / 2, top: dispo.assiette.y - dispo.assiette.d / 2, width: dispo.assiette.d, height: dispo.assiette.d }}>
              <img src="/jeux/pizzeria/assiette.webp" alt="" draggable="false" />
            </div>
            {dispo.pizzas.map((pz, p) => Array.from({ length: c.coupe }, (_, i) => {
              const a0 = (i * 360) / c.coupe - 90, a1 = a0 + 360 / c.coupe, mi = ((a0 + a1) / 2) * (Math.PI / 180);
              const cle = `${idx}-${k}-${p}-${i}`;
              const decoupe = secteur(a0, a1);
              return (
                <div key={cle} ref={enregistrer(cle, p, i, c.coupe)} className="pz-part"
                  style={{ left: pz.x - pz.d / 2, top: pz.y - pz.d / 2, width: pz.d, height: pz.d }}>
                  <div className="pz-part-in" style={{ transform: `translate(${(ECART * Math.cos(mi)).toFixed(2)}px, ${(ECART * Math.sin(mi)).toFixed(2)}px)` }}>
                    <span className="pz-part-bord" style={{ clipPath: decoupe, WebkitClipPath: decoupe, transform: `translateY(${BORD}px)` }} />
                    <span className="pz-part-dessus" style={{ clipPath: decoupe, WebkitClipPath: decoupe, '--tour': `${rotation[kc]}deg` }}
                      onPointerDown={e => appui(e, cle)} onPointerMove={bouge} onPointerUp={lache} onPointerCancel={lache} />
                  </div>
                </div>
              );
            }))}
          </div>
          {brule && <span key={`f${k}`} className="pz-fumee" aria-hidden="true"><img src="/jeux/magie/fumee.webp" alt="" /><img src="/jeux/magie/fumee.webp" alt="" /></span>}
          <img ref={mainEl} src={`/jeux/pizzeria/main-${main}.webp`} alt="" className={`pz-main pz-main--${main}`} draggable="false" aria-hidden="true"
            style={isDesktop
              ? { left: dispo.assiette.x * echelle - 110, top: haut(dispo.assiette.y) + 34 }
              : { left: (dispo.assiette.x - dispo.assiette.d * 0.28) * echelle, top: haut(dispo.assiette.y) - 34 }} />
          {verdict && (
            <div key={`v${verdict.id}`} className={`pz-verdict pz-verdict--${verdict.type}`} role="status">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                {verdict.type === 'juste' ? <path d="M5 12.5l4.5 4.5L19 7.5" />
                  : verdict.type === 'temps' ? <><circle cx="12" cy="13" r="8" /><path d="M12 9v4.5l3 2M9.5 3h5" /></>
                    : <path d="M7 7l10 10M17 7L7 17" />}
              </svg>
              <span><b>{verdict.titre}</b>{verdict.sous && <small>{verdict.sous}</small>}</span>
            </div>
          )}
          {bulle && <span key={bulle.id} className="pz-bulle" style={{ bottom: `calc(100% - ${haut(dispo.assiette.y) - 30}px)` }}>{bulle.texte}</span>}
        </div>

        <button type="button" className="pz-servir" disabled={!enJeu} onClick={servir}>Servir</button>
      </div>
    </div>
  );
}
