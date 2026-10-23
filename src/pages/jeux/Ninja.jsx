import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Pantin } from '../../components/Pantin';
import { TOURS_NINJA, voleeNinja } from '../../data/fautesNinja';
import { jouer } from '../../utils/bruitages';
import { musiqueNinja } from '../../utils/musiqueNinja';
import './Ninja.css';

/**
 * Le ninja des fautes (23/10) : un dojo en feutrine la nuit (calques générés, public/jeux/ninja/),
 * Réviz ninja au centre, bandeau noir et sabre en carton. Des fruits en pâte à modeler montent en
 * arc depuis le bas, chacun avec un mot sur une étiquette ; on tranche d'un geste du doigt ceux qui
 * sont mal écrits, on laisse retomber les bons. Réviz donne un coup de sabre avec chaque geste.
 *
 * Le verdict se voit et s'entend tout de suite : une faute tranchée gicle (tchac, jus, éclair vert,
 * la correction s'envole) ; un bon mot tranché, ou une faute qui retombe sans avoir été tranchée,
 * arrête le tour (buzzer, éclair rouge, bandeau qui dit lequel des deux et la bonne orthographe).
 * Toutes les fautes tranchées : le tour s'arrête aussitôt, gagné. Le chrono finit avant que la
 * dernière salve retombe : une faute encore en l'air quand il sonne, c'est « Temps écoulé ! » (gong,
 * bandeau sombre), distinct d'une erreur. Trois tours : pluriels, homophones, accords.
 *
 * Le moteur place fruits, moitiés et traînée à chaque image (requestAnimationFrame) dans le repère
 * de l'aire de jeu (px) ; React ne rend que ce qui change d'état (tranché, verdict, jus).
 */

const TEMPOS = [128, 138, 148];
const GRAVITE = 2600; // px/s² pour les moitiés qui retombent
const RAYON = 0.42; // le fruit qu'on touche : un disque de RAYON × sa taille

/** Un tour du ninja au niveau 0, 1 ou 2 (le thème de la Partie rapide ne sert pas : la banque est à part). */
export function mancheNinja(theme, niveau) {
  const t = TOURS_NINJA[niveau];
  return { ...t, type: 'ninja', niveau, fruits: voleeNinja(niveau), annonce: `${t.titre} !`, apercu: 0 };
}
/** Le ninja seul : 3 tours qui accélèrent. */
/**
 * Une erreur du ninja pour le récap (format de src/data/erreursJeux.js). Faute ratée : la question est
 * le mot mal écrit du fruit et la bonne réponse son orthographe ; bon mot tranché : il était bien écrit.
 */
function erreurNinja(f, donnee, bonTranche = false) {
  const theme = TOURS_NINJA[f.niveau ?? 0]?.titre ?? '';
  return bonTranche
    ? { jeu: 'ninja', theme, question: f.bon, donnee, bonne: 'le laisser', libelles: { donnee: 'Tu l’as', bonne: 'Il fallait' }, explication: `« ${f.bon} » était bien écrit. ${f.regle}` }
    : { jeu: 'ninja', theme, question: f.faux, donnee, bonne: f.bon, libelles: { donnee: 'Tu l’as', bonne: 'Ça s’écrit' }, explication: f.regle };
}
export const partieNinja = () => TOURS_NINJA.map((_, i) => mancheNinja(null, i));
export const TEMPO_NINJA = niveau => TEMPOS[niveau] ?? TEMPOS.at(-1);

const borne = (v, a, b) => Math.max(a, Math.min(b, v));
// Distance d'un point (px, py) au segment [a, b].
function distanceSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
  const u = l2 ? borne(((px - ax) * dx + (py - ay) * dy) / l2, 0, 1) : 0;
  return Math.hypot(px - (ax + u * dx), py - (ay + u * dy));
}

export function PlateauNinja({ manche, idx, total, phase, expire, onBon, onFaux, onTermine, onDemarrer, fermer, boutonSon, score, isDesktop, hauteurEcran }) {
  const pantin = useRef(null);
  const aire = useRef(null), toile = useRef(null);
  const fruits = manche.fruits;
  const [tranches, setTranches] = useState({}); // id -> 'faute' | 'bon' : le fruit est en deux
  const [jus, setJus] = useState([]); // { id, x, y, fruit, r } : éclaboussures (animées en CSS)
  const [corrections, setCorrections] = useState([]); // { id, x, y, faux, bon } : la correction s'envole
  const [verdict, setVerdict] = useState(null); // { type: gagne | bon | echappe | temps, titre, sous, id }
  const [flash, setFlash] = useState(null); // { couleur, id }
  const [fete, setFete] = useState(null);
  const [reste, setReste] = useState(manche.duree);
  const [decompte, setDecompte] = useState(null);
  const [taille, setTaille] = useState(110); // diamètre d'un fruit (px)
  const jeu = useRef({ fini: true, debut: 0, tranchees: 0 });
  const minuteurs = useRef([]);
  const plus = (ms, f) => minuteurs.current.push(setTimeout(f, ms));
  const vider = () => { minuteurs.current.forEach(clearTimeout); minuteurs.current = []; };

  // ── Le moteur ──
  const m = useRef(null);
  if (!m.current) m.current = { W: 390, H: 664, D: 110, fruits: new Map(), moities: [], trace: [], geste: null };
  const M = m.current;

  // L'aire de jeu : sa taille (px), celle des fruits.
  useLayoutEffect(() => {
    const el = aire.current;
    if (!el) return undefined;
    const maj = () => {
      M.W = el.clientWidth; M.H = el.clientHeight;
      M.D = Math.round(borne(Math.min(M.W * 0.29, M.H * 0.19), 92, 150));
      setTaille(M.D);
      const c = toile.current, r = Math.min(2, window.devicePixelRatio || 1);
      if (c) { c.width = M.W * r; c.height = M.H * r; c.getContext('2d').setTransform(r, 0, 0, r, 0, 0); }
    };
    maj();
    const ro = new ResizeObserver(maj);
    ro.observe(el);
    return () => ro.disconnect();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Où est le fruit f, `tau` secondes après son départ (centre, px de l'aire) ?
  const position = (f, tau) => {
    const u = tau / f.vol, bas = M.H + M.D * 0.6, sommet = f.haut * M.H;
    return { x: (f.x0 + (f.x1 - f.x0) * u) * M.W, y: bas - (bas - sommet) * 4 * u * (1 - u), u };
  };

  const terminer = useCallback((manques, delai) => {
    const j = jeu.current;
    if (j.fini) return;
    j.fini = true;
    M.geste = null;
    musiqueNinja.regler({ enTension: false });
    setDecompte(null);
    plus(delai, () => onTermine(manques));
  }, [onTermine]); // eslint-disable-line react-hooks/exhaustive-deps

  // Les fautes pas encore tranchées (sauf `sauf`) : au récap.
  const restantes = sauf => fruits.filter(f => f.faute && f.id !== sauf && !M.fruits.get(f.id)?.tranche)
    .map(f => erreurNinja(f, null));

  // Les fautes réglées (tranchées ou retombées) : quand il n'en reste plus, le tour est fini.
  const toutesReglees = () => fruits.filter(x => x.faute).every(x => M.fruits.get(x.id)?.tranche || jeu.current.echappees.has(x.id));
  // Le chrono est écoulé pendant que des fautes étaient encore en l'air : on les laisse finir (on
  // peut encore les trancher), puis le tour se termine. Voir l'effet « Chrono écoulé ».
  const finSiPlusRien = () => { if (jeu.current.prolonge && toutesReglees()) finChrono.current?.(); };

  // Une faute retombe sans avoir été tranchée : une erreur, mais le tour continue (Johan, 23/10 :
  // frustrant que le jeu s'arrête alors qu'on avait les réponses suivantes).
  const echappee = useCallback(f => {
    const j = jeu.current;
    if (j.fini || j.echappees.has(f.id)) return;
    j.echappees.add(f.id);
    jouer('ploc');
    plus(90, () => jouer('buzzer'));
    setFlash({ couleur: 'rouge', id: Date.now() });
    setVerdict({ type: 'echappe', titre: 'Une faute t’a échappé !', sous: { barre: f.faux, juste: f.bon }, id: Date.now() });
    plus(1300, () => setVerdict(v => (v?.type === 'echappe' ? null : v)));
    onFaux(erreurNinja(f, 'laissé passer'));
    pantin.current?.expression('decu');
    plus(700, () => { if (!jeu.current.fini) pantin.current?.expression('content'); });
    if (j.prolonge) finSiPlusRien();
    else if (toutesReglees()) terminer([], 1300);
  }, [fruits, onFaux, terminer]); // eslint-disable-line react-hooks/exhaustive-deps
  const echappeeRef = useRef(echappee);
  echappeeRef.current = echappee;

  // Chaque image : les fruits en vol, les moitiés qui tombent, la traînée du sabre.
  useEffect(() => {
    let id = 0;
    const image = maintenant => {
      const j = jeu.current;
      const t = (maintenant - j.debut) / 1000;
      for (const [cle, F] of M.fruits) {
        const f = fruits[cle];
        if (!F.el || !f) continue;
        if (F.tranche || !j.debut) { F.el.style.visibility = 'hidden'; continue; }
        const tau = t - f.t;
        if (tau < 0 || tau > f.vol) {
          F.el.style.visibility = 'hidden';
          if (tau > f.vol && !F.parti) {
            F.parti = true;
            if (f.faute && !j.fini) echappeeRef.current(f);
          }
          continue;
        }
        const p = position(f, tau);
        F.x = p.x; F.y = p.y;
        F.el.style.visibility = 'visible';
        F.el.style.transform = `translate(${(p.x - M.D / 2).toFixed(1)}px, ${(p.y - M.D / 2).toFixed(1)}px)`;
        if (F.img) F.img.style.transform = `rotate(${(f.tourne * tau).toFixed(1)}deg)`;
        if (F.mot) F.mot.style.transform = `rotate(${(7 * Math.sin(tau * 2.4 + f.id)).toFixed(1)}deg)`;
      }
      // Les moitiés : elles s'écartent de la coupe, tournent un peu et tombent.
      const dt = Math.min(0.05, (maintenant - (M.avant ?? maintenant)) / 1000);
      M.avant = maintenant;
      M.moities = M.moities.filter(h => {
        h.vy += GRAVITE * dt; h.x += h.vx * dt; h.y += h.vy * dt; h.r += h.vr * dt;
        h.el.style.transform = `translate(${(h.x - M.D / 2).toFixed(1)}px, ${(h.y - M.D / 2).toFixed(1)}px) rotate(${h.r.toFixed(1)}deg)`;
        if (h.y > M.H + M.D) { h.el.style.visibility = 'hidden'; return false; }
        return true;
      });
      dessinerTrace(maintenant);
      id = requestAnimationFrame(image);
    };
    id = requestAnimationFrame(image);
    return () => cancelAnimationFrame(id);
  }, [fruits]); // eslint-disable-line react-hooks/exhaustive-deps

  // La traînée : les points des 130 dernières ms, une lame de lumière qui s'affine vers la queue.
  const dessinerTrace = maintenant => {
    const c = toile.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    M.trace = M.trace.filter(p => maintenant - p.t < 130);
    if (!M.trace.length && !M.traceVue) return;
    ctx.clearRect(0, 0, M.W, M.H);
    M.traceVue = M.trace.length > 1;
    if (!M.traceVue) return;
    const pts = M.trace, n = pts.length;
    const largeur = k => 1 + 9 * (k / (n - 1)); // fine à la queue, large à la tête
    const bord = (sens) => pts.map((p, k) => {
      const q = pts[Math.min(n - 1, k + 1)], o = pts[Math.max(0, k - 1)];
      const dx = q.x - o.x, dy = q.y - o.y, l = Math.hypot(dx, dy) || 1;
      return { x: p.x - (dy / l) * largeur(k) * sens, y: p.y + (dx / l) * largeur(k) * sens };
    });
    const g = bord(1), d = bord(-1).reverse();
    ctx.save();
    ctx.beginPath();
    [...g, ...d].forEach((p, k) => (k ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.closePath();
    ctx.shadowColor = 'rgba(190, 225, 255, .95)';
    ctx.shadowBlur = 16;
    ctx.fillStyle = 'rgba(255, 255, 255, .95)';
    ctx.fill();
    ctx.restore();
  };

  // Les fruits du tour : enregistrés au montage de leur élément (un rappel stable par fruit).
  const rappels = useRef(new Map());
  const enregistrer = (id, partie) => {
    const cle = `${id}-${partie}`;
    if (!rappels.current.has(cle)) {
      rappels.current.set(cle, el => {
        if (!M.fruits.has(id)) M.fruits.set(id, { tranche: false, parti: false, x: 0, y: 0 });
        M.fruits.get(id)[partie] = el;
      });
    }
    return rappels.current.get(cle);
  };

  // Début du tour : les fruits partent avec le chrono. À l'annonce, on remet tout en place.
  useEffect(() => {
    vider();
    for (const F of M.fruits.values()) { F.tranche = false; F.parti = false; }
    M.moities.forEach(h => { h.el.style.visibility = 'hidden'; });
    M.moities = []; M.trace = []; M.geste = null;
    setTranches({}); setJus([]); setCorrections([]); setVerdict(null); setFlash(null); setDecompte(null); setReste(manche.duree);
    if (phase !== 'jeu') {
      jeu.current = { fini: true, debut: 0, tranchees: 0 };
      pantin.current?.expression('content');
      return undefined;
    }
    jeu.current = { fini: false, debut: performance.now(), tranchees: 0, echappees: new Set(), prolonge: false };
    const montre = setInterval(() => setReste(Math.max(0, Math.ceil(manche.duree - (performance.now() - jeu.current.debut) / 1000))), 200);
    plus((manche.duree - 3) * 1000, () => { if (!jeu.current.fini) musiqueNinja.regler({ enTension: true }); });
    [3, 2, 1].forEach(n => plus((manche.duree - n) * 1000, () => { if (!jeu.current.fini) { setDecompte(n); jouer('tic'); } }));
    return () => { vider(); clearInterval(montre); musiqueNinja.regler({ enTension: false }); };
  }, [phase, idx]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => vider(), []);

  // Chrono écoulé : distinct d'une erreur. Si des fautes sont encore en l'air, on les laisse retomber
  // (on peut encore les trancher) : jamais de coupure pendant qu'on avait la réponse sous le doigt.
  const finChrono = useRef(null);
  useEffect(() => {
    if (!expire) return;
    const j = jeu.current;
    if (j.fini) return;
    finChrono.current = () => {
      if (jeu.current.fini) return;
      finChrono.current = null;
      const manques = restantes().filter(e => !jeu.current.echappees.has(fruits.find(f => f.faux === e.question)?.id));
      jouer('gong');
      setVerdict({ type: 'temps', titre: 'Temps écoulé !', sous: manques.length ? { barre: manques[0].question, juste: manques[0].bonne } : null, id: Date.now() });
      pantin.current?.expression('panique');
      terminer(manques, 1100);
    };
    const tau = (performance.now() - j.debut) / 1000;
    const enVol = fruits.filter(f => f.faute && !M.fruits.get(f.id)?.tranche && !j.echappees.has(f.id) && f.t <= tau && f.t + f.vol > tau);
    if (!enVol.length) { finChrono.current(); return; }
    j.prolonge = true;
    // Ceinture : au plus tard quand la dernière retombe.
    const dernier = Math.max(...enVol.map(f => f.t + f.vol)) - tau;
    plus(Math.min(3, dernier) * 1000 + 150, () => finChrono.current?.());
  }, [expire]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Trancher ──
  const trancher = (f, F, ax, ay, bx, by) => {
    const j = jeu.current;
    F.tranche = true;
    setTranches(t => ({ ...t, [f.id]: f.faute ? 'faute' : 'bon' }));
    // Les deux moitiés partent de la place du fruit, la coupe dans le sens du geste : les images sont
    // coupées à la verticale, on les tourne de (angle du geste - 90°), le geste ramené entre 0 et 180°
    // (une coupe n'a pas de sens) pour qu'elles ne passent jamais tête en bas.
    let angle = Math.atan2(by - ay, bx - ax);
    if (angle < 0) angle += Math.PI;
    const nx = Math.sin(angle), ny = -Math.cos(angle); // la moitié g part vers (-nx, -ny)
    const rot = (angle * 180) / Math.PI - 90;
    const tau = (performance.now() - j.debut) / 1000 - f.t;
    const vyFruit = (position(f, tau + 0.02).y - position(f, tau).y) / 0.02;
    ['g', 'd'].forEach((cote, k) => {
      const el = F[cote];
      if (!el) return;
      const sg = k ? -1 : 1, v = 150 + Math.random() * 60;
      const h = { el, x: F.x, y: F.y, vx: -nx * v * sg, vy: Math.min(vyFruit, 0) * 0.35 - ny * v * sg - 120, r: rot, vr: sg * (60 + Math.random() * 90) };
      el.style.visibility = 'visible';
      el.style.transform = `translate(${(h.x - M.D / 2).toFixed(1)}px, ${(h.y - M.D / 2).toFixed(1)}px) rotate(${rot}deg)`;
      M.moities.push(h);
    });
    setJus(l => [...l.slice(-5), { id: `${f.id}-${Date.now()}`, x: F.x, y: F.y, fruit: f.fruit, r: Math.random() * 360 }]);
    jouer('tchac');
    plus(30, () => jouer('splash'));
    const r = pantin.current;
    if (f.faute) {
      j.tranchees += 1;
      onBon('fier');
      setFlash({ couleur: 'vert', id: Date.now() });
      setCorrections(l => [...l.slice(-3), { id: `${f.id}-${Date.now()}`, x: F.x, y: F.y, faux: f.faux, bon: f.bon }]);
      r?.expression('fier');
      plus(650, () => { if (!jeu.current.fini) r?.expression('content'); });
      if (j.prolonge) { finSiPlusRien(); return; }
      if (toutesReglees()) {
        // Toutes les fautes réglées : fini tout de suite (« Toutes tranchées » si aucune n'a échappé).
        if (j.echappees.size) { terminer([], 900); return; }
        plus(120, () => jouer('ding'));
        setVerdict({ type: 'gagne', titre: 'Toutes tranchées !', sous: null, id: Date.now() });
        setFete(Date.now());
        plus(380, () => { jouer('bravo'); r?.geste('saut'); });
        terminer([], 1300);
      }
      return;
    }
    // Un bon mot tranché : une erreur, mais le tour continue.
    plus(60, () => jouer('buzzer'));
    setFlash({ couleur: 'rouge', id: Date.now() });
    setVerdict({ type: 'bon', titre: 'Bon mot tranché !', sous: { juste: f.bon, suite: ' était bien écrit' }, id: Date.now() });
    plus(1300, () => setVerdict(v => (v?.type === 'bon' ? null : v)));
    onFaux(erreurNinja(f, 'tranché', true));
    r?.expression('panique');
    plus(700, () => { if (!jeu.current.fini) r?.expression('content'); });
  };

  // Le geste : chaque bout de trajet du doigt (du point précédent au nouveau) coupe les fruits qu'il
  // traverse. Un simple appui sur un fruit le tranche aussi (coupe horizontale).
  const point = e => {
    const R = aire.current.getBoundingClientRect();
    return { x: e.clientX - R.left, y: e.clientY - R.top };
  };
  const couper = (a, b) => {
    for (const f of fruits) {
      const F = M.fruits.get(f.id);
      if (!F || F.tranche || F.el?.style.visibility !== 'visible') continue;
      if (distanceSegment(F.x, F.y, a.x, a.y, b.x, b.y) < M.D * RAYON) {
        trancher(f, F, a.x, a.y, b.x, b.y);
        if (jeu.current.fini) return;
      }
    }
  };
  const appui = e => {
    if (jeu.current.fini || (e.button ?? 0) !== 0) return;
    e.preventDefault();
    try { aire.current.setPointerCapture(e.pointerId); } catch { /* pointeur déjà relâché */ }
    const p = point(e), t = performance.now();
    M.geste = { id: e.pointerId, dernier: p, depart: p, t0: t, coup: false };
    M.trace = [{ ...p, t }];
  };
  const bouge = e => {
    const g = M.geste;
    if (!g || g.id !== e.pointerId) return;
    const evs = e.getCoalescedEvents?.() ?? [];
    for (const ev of evs.length ? evs : [e]) {
      const p = point(ev), t = performance.now();
      M.trace.push({ ...p, t });
      // Le coup de sabre de Réviz et le whoosh : une fois par geste, dès qu'il prend de la vitesse.
      if (!g.coup && Math.hypot(p.x - g.depart.x, p.y - g.depart.y) > 28) {
        g.coup = true;
        jouer('whoosh');
        pantin.current?.trancher(p.y >= g.depart.y ? 1 : -1);
      }
      if (g.coup && !jeu.current.fini) couper(g.dernier, p);
      g.dernier = p;
    }
  };
  const lache = e => {
    const g = M.geste;
    if (!g || g.id !== e.pointerId) return;
    M.geste = null;
    if (g.coup || jeu.current.fini) return;
    // Un appui sans glisser : coupe horizontale à l'endroit touché.
    const p = point(e);
    const avant = fruits.some(f => { const F = M.fruits.get(f.id); return F && !F.tranche && F.el?.style.visibility === 'visible' && Math.hypot(F.x - p.x, F.y - p.y) < M.D * RAYON; });
    if (!avant) return;
    jouer('whoosh');
    pantin.current?.trancher(1);
    M.trace = [{ x: p.x - M.D * 0.6, y: p.y - 6, t: performance.now() - 60 }, { x: p.x + M.D * 0.6, y: p.y + 6, t: performance.now() }];
    couper({ x: p.x - M.D, y: p.y - 4 }, { x: p.x + M.D, y: p.y + 4 });
  };

  // Réviz à la mesure de l'écran : grand, au milieu du dojo ; les fruits passent devant lui.
  const tailleReviz = Math.round(isDesktop ? Math.max(300, hauteurEcran * 0.46) : Math.min(320, Math.max(190, hauteurEcran * 0.42)));
  const enJeu = phase === 'jeu';

  return (
    <div className={`app app--no-halo jx-page mg-page nj-page${isDesktop ? ' jx-page--large' : ''}${decompte ? ' nj-page--urgent' : ''}`}>
      <div className="nj-monde" aria-hidden="true">
        <img src={isDesktop ? '/jeux/ninja/fond-paysage.webp' : '/jeux/ninja/fond.webp'} alt="" className="nj-fond" />
        <i className="nj-lune" />
      </div>
      {flash && <div key={`f${flash.id}`} className={`nj-flash nj-flash--${flash.couleur}`} aria-hidden="true" />}
      {fete && (
        <div key={fete} className="mg-bravo" aria-hidden="true">
          {Array.from({ length: 18 }, (_, i) => <i key={i} style={{ '--k': i }} />)}
        </div>
      )}

      <div className="nj-reviz" style={{ '--taille': `${tailleReviz}px` }}>
        <Pantin ref={pantin} size={tailleReviz} expression="content" repli={null} accessoire={['ninja', 'sabre']} />
      </div>

      {/* L'aire de jeu couvre tout l'écran : on tranche partout, même en passant sur le titre. */}
      <div className={`nj-aire${enJeu ? ' nj-aire--jeu' : ''}`} ref={aire} style={{ '--d': `${taille}px` }}
        onPointerDown={appui} onPointerMove={bouge} onPointerUp={lache} onPointerCancel={lache}>
        {fruits.map(f => (
          <div key={`${idx}-${f.id}`} className="nj-fruit-cadre">
            <div ref={enregistrer(f.id, 'el')} className="nj-fruit" style={{ visibility: 'hidden' }}>
              <img ref={enregistrer(f.id, 'img')} src={`/jeux/ninja/${f.fruit}.webp`} alt="" draggable="false" className="nj-fruit-img" />
              <span ref={enregistrer(f.id, 'mot')} className={`nj-mot${f.mot.length > 11 ? ' nj-mot--long' : ''}`} lang="fr">{f.mot}</span>
            </div>
            {['g', 'd'].map(cote => (
              <div key={cote} ref={enregistrer(f.id, cote)} className={`nj-moitie${tranches[f.id] === 'bon' ? ' nj-moitie--rate' : ''}`} style={{ visibility: 'hidden' }}>
                <img src={`/jeux/ninja/${f.fruit}-${cote}.webp`} alt="" draggable="false" />
              </div>
            ))}
          </div>
        ))}
        {jus.map(j => (
          <img key={j.id} src={`/jeux/ninja/jus-${j.fruit}.webp`} alt="" draggable="false" className="nj-jus"
            style={{ left: j.x, top: j.y, '--r': `${j.r}deg` }} />
        ))}
        {corrections.map(c => (
          <span key={c.id} className="nj-correction" style={{ left: borne(c.x, 100, M.W - 100), top: c.y }}>
            <s>{c.faux}</s><b>{c.bon}</b><i>+100</i>
          </span>
        ))}
        <canvas ref={toile} className="nj-trace" aria-hidden="true" />
      </div>

      <div className="mg-scene nj-scene">
        <div className="jx-ligne-haut mg-hud">
          {fermer}
          <div className="mg-chrono">
            {enJeu && <span key={idx} className="mg-chrono-barre" style={{ '--duree': `${manche.duree}s`, '--attente': '0s' }} />}
            {enJeu && <span className="nj-secondes" aria-label={`${reste} secondes`}>{reste}</span>}
          </div>
          <span className="jx-score" aria-live="polite">{score}</span>
          {boutonSon}
        </div>
        <div className="mg-titre nj-titre">
          <span className="mg-titre-num">Tour {idx + 1} sur {total} · {manche.titre}</span>
          <h1>Le ninja des fautes !</h1>
          <p className="nj-consigne">Tranche les mots mal écrits</p>
        </div>
        <div className="nj-milieu">
          {!enJeu && (
            <button type="button" key={`c${idx}`} className="nj-annonce" onClick={onDemarrer}>
              <span className="nj-annonce-titre">{manche.annonce}</span>
              <span className="nj-annonce-sous">{manche.sous} · {manche.duree} s</span>
            </button>
          )}
          {decompte && <span key={`d${decompte}`} className="nj-decompte" aria-hidden="true">{decompte}</span>}
          {verdict && (
            <div key={`v${verdict.id}`} className={`nj-verdict nj-verdict--${verdict.type}`} role="status">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                {verdict.type === 'gagne' ? <path d="M5 12.5l4.5 4.5L19 7.5" />
                  : verdict.type === 'temps' ? <><circle cx="12" cy="13" r="8" /><path d="M12 9v4.5l3 2M9.5 3h5" /></>
                    : <path d="M7 7l10 10M17 7L7 17" />}
              </svg>
              <span>
                <b>{verdict.titre}</b>
                {verdict.sous && (
                  <small>
                    {verdict.sous.barre && <><s>{verdict.sous.barre}</s> → </>}
                    <em>{verdict.sous.juste}</em>{verdict.sous.suite}
                  </small>
                )}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
