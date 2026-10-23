import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Pantin } from '../../components/Pantin';
import { TOURS_TAUPE, N_TROUS, tourDeTaupe } from '../../data/taupes';
import { jouer } from '../../utils/bruitages';
import { musiqueTaupe } from '../../utils/musiqueTaupe';
import './Taupe.css';

/**
 * Tape-taupe ! (23/10) : un potager en pâte à modeler (calques générés, public/jeux/taupe/), Réviz
 * jardinier au milieu, chapeau de paille, salopette et gros maillet en mousse. Des taupes à lunettes
 * sortent des 6 trous avec une pancarte (un nombre, ou un calcul au dernier tour) ; la règle est sur
 * la pancarte en bois sous le titre (« Que les multiples de 3 »). On tape les bonnes taupes : Réviz
 * bondit vers le trou et abat son maillet.
 *
 * Le verdict se voit et s'entend tout de suite : bonne taupe tapée, pouf, étoiles, +100 et une étoile
 * de plus au compteur ; mauvaise taupe tapée, petit cri vexé, buzzer, éclair rouge et bandeau qui dit
 * pourquoi (« 14 n'est pas dans la table de 3 »), et le compteur perd une étoile. Une bonne taupe qui
 * redescend sans avoir été tapée ricane : ce n'est pas une erreur, elle va au récap. Objectif atteint :
 * gagné tout de suite. Sinon « Temps écoulé ! » (cloche de la ferme, bandeau sombre), distinct d'une
 * erreur. Trois tours : nombres pairs ou impairs, multiples de 3, 4 ou 5, calculs faciles qui font 10, 12 ou 20.
 *
 * Le moteur place les taupes à chaque image (requestAnimationFrame, transform seulement) d'après
 * l'horloge du tour ; React ne rend que ce qui change (pose d'une taupe, compteur, verdict).
 * Le doigt est pris au pointerdown, sur tout le champ : la taupe la plus proche sous le doigt.
 */

const TEMPOS = [132, 142, 152];
const MONTEE = 0.16, DESCENTE = 0.18; // secondes
const SONNEE = 0.32; // une taupe tapée reste sonnée ce temps avant de replonger
// Le trou (trou.webp) : l'ouverture, en fractions de l'image (decouper.py) ; la taupe sort par là.
const TROU = { ratio: 0.6343, x0: 0.2172, x1: 0.8071, y1: 0.6274 };
// La taupe (taupe*.webp, même cadre pour les 3 poses) : sa pancarte, en fractions de l'image.
const TAUPE = { ratio: 0.97, pancarte: { x: 0.506, y: 0.709, w: 0.68, h: 0.41 } };
// La tête du maillet au bout de chaque coup (Pantin.frapper), par rapport au centre du haut du cadre
// de Réviz, en fractions de sa taille (mesuré sur les captures) : Réviz bondit pour qu'elle tombe sur la taupe.
const TETE_MAILLET = { gauche: [-0.564, 0.83], devant: [-0.066, 0.75] };
// Les fonds (px) et la hauteur où finit la terre du potager, au milieu (fraction de l'image, mesurée).
const FONDS = { portrait: { l: 1024, h: 1536, terre: 0.85 }, paysage: { l: 1536, h: 1024, terre: 0.83 } };
const POSES = { normale: '/jeux/taupe/taupe.webp', sonnee: '/jeux/taupe/taupe-sonnee.webp', moqueuse: '/jeux/taupe/taupe-moqueuse.webp' };

/** Un tour de Tape-taupe au niveau 0, 1 ou 2 (le thème de la Partie rapide ne sert pas : c'est du calcul). */
export function mancheTaupe(theme, niveau) {
  const t = TOURS_TAUPE[niveau];
  const tour = tourDeTaupe(niveau);
  return { ...t, type: 'taupe', niveau, regle: tour.regle, taupes: tour.taupes, pourquoi: tour.pourquoi, titre: tour.regle.texte, annonce: tour.regle.texte, apercu: 0 };
}
/**
 * Une erreur de la taupe pour le récap (format de src/data/erreursJeux.js) : une bonne taupe sortie
 * et ratée (donnee null), ou une mauvaise taupe tapée. Les mauvaises laissées tranquilles sont justes.
 */
function erreurTaupe(manche, x, donnee) {
  const tapee = donnee !== null;
  return {
    jeu: 'taupe', theme: manche.regle.texte, question: x.texte, donnee,
    bonne: tapee ? 'À laisser' : 'À taper',
    explication: `${manche.pourquoi(x)} : il fallait ${tapee ? 'la laisser' : 'la taper'}.`,
  };
}
/** Tape-taupe seul : 3 tours qui accélèrent. */
export const partieTaupe = () => TOURS_TAUPE.map((_, i) => mancheTaupe(null, i));
export const TEMPO_TAUPE = niveau => TEMPOS[niveau] ?? TEMPOS.at(-1);

const borne = (v, a, b) => Math.max(a, Math.min(b, v));
const lisse = x => { const k = borne(x, 0, 1); return 1 - (1 - k) ** 3; };
const rebond = x => { const k = borne(x, 0, 1), c = 1.9; return 1 + (c + 1) * (k - 1) ** 3 + c * (k - 1) ** 2; };

export function PlateauTaupe({ manche, idx, total, phase, expire, onBon, onFaux, onTermine, onDemarrer, fermer, boutonSon, score, isDesktop, hauteurEcran }) {
  const pantin = useRef(null);
  const scene = useRef(null), champ = useRef(null), compteurEl = useRef(null), reviz = useRef(null);
  const taupes = manche.taupes;
  const [poses, setPoses] = useState({}); // id -> 'sonnee' | 'moqueuse' | 'rate' (mauvaise tapée)
  const [chocs, setChocs] = useState([]); // { id, trou, bon } : étoiles et +100 sur le trou
  const [compte, setCompte] = useState(0);
  const [perdue, setPerdue] = useState(null); // instant où le compteur vient de perdre une étoile
  const [verdict, setVerdict] = useState(null); // { type: gagne | faux | temps, titre, sous, id }
  const [flash, setFlash] = useState(null);
  const [fete, setFete] = useState(null);
  const [reste, setReste] = useState(manche.duree);
  const [decompte, setDecompte] = useState(null);
  const jeu = useRef({ fini: true, debut: 0, compte: 0 });
  const minuteurs = useRef([]);
  const plus = (ms, f) => minuteurs.current.push(setTimeout(f, ms));
  const vider = () => { minuteurs.current.forEach(clearTimeout); minuteurs.current = []; };

  // ── Le moteur : l'état de chaque taupe (tapée, à quel instant), ses éléments ──
  const m = useRef(null);
  if (!m.current) m.current = { taupes: new Map(), trous: [], reviz: { x: 0, y: 0, de: [0, 0], vers: [0, 0], t0: 0, devant: false } };
  const M = m.current;
  const etat = id => {
    if (!M.taupes.has(id)) M.taupes.set(id, { tapee: null, partie: false, sortie: false, el: null });
    return M.taupes.get(id);
  };
  const rappels = useRef(new Map());
  const enregistrer = id => {
    if (!rappels.current.has(id)) rappels.current.set(id, el => { etat(id).el = el; });
    return rappels.current.get(id);
  };
  const enregistrerTrou = i => el => { M.trous[i] = el; };

  // Où en est la taupe x, au temps t du tour : 0 dans le trou, 1 sortie (au-delà : le rebond).
  const hauteur = (x, E, t) => {
    const tau = t - x.t;
    if (tau < 0) return 0;
    if (E.tapee !== null) {
      const d = t - E.tapee;
      return d < SONNEE ? 1 : 1 - lisse((d - SONNEE) / 0.14);
    }
    if (tau < MONTEE) return rebond(tau / MONTEE);
    if (tau < x.vie - DESCENTE) return 1;
    return 1 - lisse((tau - (x.vie - DESCENTE)) / DESCENTE);
  };

  const terminer = (manques, delai) => {
    const j = jeu.current;
    if (j.fini) return;
    j.fini = true;
    musiqueTaupe.regler({ enTension: false });
    setDecompte(null);
    plus(delai, () => onTermine(manques));
  };
  // Les bonnes taupes ratées (sorties et redescendues sans être tapées) : au récap.
  const ratees = () => taupes.filter(x => x.bon && etat(x.id).partie && etat(x.id).tapee === null)
    .map(x => erreurTaupe(manche, x, null));

  // Une bonne taupe redescend sans avoir été tapée : elle ricane (ce n'est pas une erreur).
  const echappe = x => {
    setPoses(p => ({ ...p, [x.id]: 'moqueuse' }));
    jouer('hihi');
  };
  const echappeRef = useRef(echappe);
  echappeRef.current = echappe;

  // Chaque image : les taupes (montée, descente, sonnée), Réviz qui bondit vers le trou.
  useEffect(() => {
    let id = 0;
    const image = maintenant => {
      const j = jeu.current;
      const t = j.debut ? (maintenant - j.debut) / 1000 : -1;
      for (const x of taupes) {
        const E = M.taupes.get(x.id);
        if (!E?.el) continue;
        const h = t < 0 ? 0 : hauteur(x, E, t);
        if (t >= x.t && !E.sortie && !j.fini) { E.sortie = true; jouer('pop'); }
        // Une bonne taupe pas tapée qui commence à redescendre : elle ricane.
        if (!E.partie && E.tapee === null && t >= x.t + x.vie - DESCENTE - 0.1) {
          E.partie = true;
          if (x.bon && !j.fini) echappeRef.current(x);
        }
        E.el.style.transform = `translate3d(0, ${((1 - h) * 104).toFixed(2)}%, 0)`;
        E.el.style.visibility = h > 0.001 ? 'visible' : 'hidden';
      }
      // Réviz : un bond court vers la taupe tapée (en 0,1 s, avant que le maillet touche), il reste le
      // temps du coup, puis revient à sa place. Le temps du coup, il passe devant les trous (le maillet
      // devant la taupe) ; au repos, derrière (les taupes du haut sortent devant ses pieds).
      const R = M.reviz, el = reviz.current;
      if (el) {
        const u = (maintenant - R.t0) / 1000;
        const aller = lisse(u / 0.1), retour = lisse((u - 0.42) / 0.3);
        R.x = R.de[0] + (R.vers[0] - R.de[0]) * aller - R.vers[0] * retour;
        R.y = R.de[1] + (R.vers[1] - R.de[1]) * aller - R.vers[1] * retour;
        const saut = u < 0.1 ? Math.sin(Math.PI * u / 0.1) * -14 : 0;
        el.style.transform = `translate3d(${R.x.toFixed(1)}px, ${(R.y + saut).toFixed(1)}px, 0)`;
        const devant = R.devant && u < 0.6;
        if (devant !== R.vu) { R.vu = devant; el.parentNode.classList.toggle('tp-reviz-place--devant', devant); }
      }
      id = requestAnimationFrame(image);
    };
    id = requestAnimationFrame(image);
    return () => cancelAnimationFrame(id);
  }, [taupes]); // eslint-disable-line react-hooks/exhaustive-deps

  // Début du tour : les taupes partent avec le chrono. À l'annonce, tout est rentré.
  useEffect(() => {
    vider();
    for (const E of M.taupes.values()) { E.tapee = null; E.partie = false; E.sortie = false; }
    setPoses({}); setChocs([]); setCompte(0); setPerdue(null); setVerdict(null); setFlash(null); setDecompte(null); setReste(manche.duree);
    if (phase !== 'jeu') {
      jeu.current = { fini: true, debut: 0, compte: 0 };
      pantin.current?.expression('content');
      return undefined;
    }
    jeu.current = { fini: false, debut: performance.now(), compte: 0 };
    const montre = setInterval(() => setReste(Math.max(0, Math.ceil(manche.duree - (performance.now() - jeu.current.debut) / 1000))), 200);
    plus((manche.duree - 3) * 1000, () => { if (!jeu.current.fini) musiqueTaupe.regler({ enTension: true }); });
    [3, 2, 1].forEach(n => plus((manche.duree - n) * 1000, () => { if (!jeu.current.fini) { setDecompte(n); jouer('tic'); } }));
    return () => { vider(); clearInterval(montre); musiqueTaupe.regler({ enTension: false }); };
  }, [phase, idx]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => vider(), []);

  // Chrono écoulé : l'objectif n'est pas atteint ; distinct d'une erreur.
  useEffect(() => {
    if (!expire) return;
    const j = jeu.current;
    if (j.fini) return;
    jouer('cloche');
    setVerdict({ type: 'temps', titre: 'Temps écoulé !', sous: `${j.compte} taupe${j.compte > 1 ? 's' : ''} sur ${manche.objectif}`, id: Date.now() });
    pantin.current?.expression('decu');
    terminer(ratees(), 1200);
  }, [expire]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Taper ──
  const taper = (x, E, trou) => {
    const j = jeu.current;
    const t = (performance.now() - j.debut) / 1000;
    E.tapee = t;
    E.partie = true;
    // Réviz bondit pour que son maillet tombe sur la taupe ; l'impact sonne tout de suite (le doigt
    // n'attend pas le maillet).
    bondir(E.el.getBoundingClientRect());
    jouer('maillet');
    setChocs(l => [...l.slice(-4), { id: `${x.id}-${Date.now()}`, trou, bon: x.bon }]);
    const r = pantin.current;
    if (x.bon) {
      setPoses(p => ({ ...p, [x.id]: 'sonnee' }));
      j.compte += 1;
      setCompte(j.compte);
      onBon('fier');
      setFlash({ couleur: 'vert', id: Date.now() });
      r?.expression('fier');
      plus(600, () => { if (!jeu.current.fini) r?.expression('content'); });
      if (j.compte >= manche.objectif) {
        // Objectif atteint : gagné, tout de suite.
        plus(120, () => jouer('ding'));
        setVerdict({ type: 'gagne', titre: 'Bravo !', sous: `${manche.objectif} bonnes taupes`, id: Date.now() });
        setFete(Date.now());
        plus(380, () => { jouer('bravo'); r?.geste('saut'); });
        terminer([], 1300);
      }
      return;
    }
    // Une mauvaise taupe : erreur, le compteur perd une étoile, le tour continue.
    setPoses(p => ({ ...p, [x.id]: 'rate' }));
    plus(40, () => jouer('couic'));
    plus(110, () => jouer('buzzer'));
    setFlash({ couleur: 'rouge', id: Date.now() });
    if (j.compte > 0) { j.compte -= 1; setCompte(j.compte); setPerdue(Date.now()); }
    setVerdict({ type: 'faux', titre: manche.pourquoi(x), sous: null, id: Date.now() });
    plus(1300, () => setVerdict(v => (v?.type === 'faux' ? null : v)));
    onFaux(erreurTaupe(manche, x, 'Tapée'));
    r?.expression('panique');
    plus(700, () => { if (!jeu.current.fini) r?.expression('content'); });
  };

  // Le bond de Réviz vers une cible (le haut de la taupe, ou le trou vide) : coup à gauche si elle est
  // nettement à sa gauche, devant sinon ; il ne sort pas plus d'un quart de lui-même de l'écran.
  const bondir = cible => {
    const R = M.reviz, el = reviz.current;
    if (!el) return;
    const b = el.getBoundingClientRect(), taille = b.width;
    const cx = b.left + taille / 2 - R.x, haut = b.top - R.y; // sa place au repos
    const px = cible.left + cible.width / 2, py = cible.top + cible.height * 0.28;
    const vers = px < cx - taille * 0.3 ? 'gauche' : 'devant';
    const [tx, ty] = TETE_MAILLET[vers];
    const W = window.innerWidth;
    const x = borne(px - (cx + tx * taille), taille * 0.2 - cx, W - taille * 0.2 - cx);
    const y = Math.max(0, py - (haut + ty * taille));
    R.de = [R.x, R.y]; R.vers = [x, y]; R.t0 = performance.now(); R.devant = true;
    pantin.current?.frapper({ vers });
  };

  // Le doigt : la taupe dehors la plus proche du point touché (sa silhouette ou son trou), sinon un
  // coup dans la terre (Réviz frappe quand même, sans conséquence).
  const appui = e => {
    const j = jeu.current;
    if (j.fini || !j.debut || (e.button ?? 0) !== 0) return;
    e.preventDefault();
    const px = e.clientX, py = e.clientY;
    const t = (performance.now() - j.debut) / 1000;
    let meilleur = null;
    for (const x of taupes) {
      const E = M.taupes.get(x.id);
      if (!E?.el || E.tapee !== null || hauteur(x, E, t) < 0.25) continue;
      const a = E.el.getBoundingClientRect(), b = M.trous[x.trou].getBoundingClientRect();
      const g = Math.min(a.left, b.left) - 8, d = Math.max(a.right, b.right) + 8, h = a.top - 8, bas = b.bottom + 8;
      if (px < g || px > d || py < h || py > bas) continue;
      const dist = Math.hypot(px - (a.left + a.width / 2), py - (a.top + a.height / 2));
      if (!meilleur || dist < meilleur.dist) meilleur = { x, E, dist };
    }
    if (meilleur) { taper(meilleur.x, meilleur.E, meilleur.x.trou); return; }
    // Dans un trou vide : Réviz tape dans le vide.
    const vide = M.trous.findIndex(el => { const b = el?.getBoundingClientRect(); return b && px >= b.left && px <= b.right && py >= b.top - b.height * 0.4 && py <= b.bottom; });
    if (vide >= 0) {
      const b = M.trous[vide].getBoundingClientRect();
      bondir({ left: b.left, width: b.width, top: b.top - b.height * 0.3, height: b.height });
      jouer('appui');
    }
  };

  // Les dimensions, à la mesure de l'écran : les trous d'abord (3 par rangée, 2 rangées, chacune assez
  // haute pour la taupe sortie), puis Réviz, le plus grand possible entre le compteur et la rangée du
  // haut, les pieds posés juste derrière ses trous (son chapeau dépasse de 17 % au-dessus de son cadre,
  // ses pieds sont à 94 % : repères du pantin). La rangée du bas s'arrête là où finit la terre du décor
  // (le fond est en cover, calé à 40 % : on suit son échelle), pas sur les salades du premier plan.
  const [dim, setDim] = useState({ trou: 120, rangee: 140, reviz: 220, haut: 200, marge: 0 });
  useLayoutEffect(() => {
    const sc = scene.current, ch = champ.current, co = compteurEl.current;
    if (!sc || !ch || !co) return undefined;
    const maj = () => {
      const H = sc.clientHeight, padding = parseFloat(getComputedStyle(sc).paddingBottom) || 0;
      const { l: fl, h: fh, terre } = isDesktop ? FONDS.paysage : FONDS.portrait;
      const k = Math.max(sc.clientWidth / fl, H / fh), finTerre = (H - fh * k) * 0.4 + terre * fh * k;
      const bas = Math.max(padding, H - finTerre);
      const plafond = isDesktop ? Math.min(H * 0.36, 380) : Math.min(H * 0.38, 300);
      const trou = Math.min(ch.clientWidth * 0.98 / 3, plafond / 2 / (TROU.ratio + 0.55));
      const rangee = trou * (TROU.ratio + 0.55);
      const pieds = H - bas - 2 * rangee + rangee - trou * TROU.ratio * 0.7;
      const place = pieds - (co.offsetTop + co.offsetHeight) - 4;
      const reviz = borne(place / 1.11, 140, isDesktop ? 380 : 300);
      setDim({ trou: Math.round(trou), rangee: Math.round(rangee), reviz: Math.round(reviz), haut: Math.round(pieds - reviz * 0.94), marge: Math.round(bas - padding) });
    };
    maj();
    const ro = new ResizeObserver(maj);
    ro.observe(sc);
    return () => ro.disconnect();
  }, [isDesktop]);
  const tailleReviz = dim.reviz;
  const enJeu = phase === 'jeu';
  const larg = dim.trou, haut = dim.trou * TROU.ratio, tLarg = dim.trou * 0.74, tHaut = tLarg * TAUPE.ratio;
  const objectif = manche.objectif;

  return (
    <div className={`app app--no-halo jx-page mg-page tp-page${isDesktop ? ' jx-page--large' : ''}${decompte ? ' tp-page--urgent' : ''}`}>
      <div className="tp-monde" aria-hidden="true">
        <img src={isDesktop ? '/jeux/taupe/fond-paysage.webp' : '/jeux/taupe/fond.webp'} alt="" className="tp-fond" />
      </div>
      {flash && <div key={`f${flash.id}`} className={`tp-flash tp-flash--${flash.couleur}`} aria-hidden="true" />}
      {fete && (
        <div key={fete} className="mg-bravo" aria-hidden="true">
          {Array.from({ length: 18 }, (_, i) => <i key={i} style={{ '--k': i }} />)}
        </div>
      )}

      <div className="mg-scene tp-scene" ref={scene}>
        <div className="jx-ligne-haut mg-hud">
          {fermer}
          <div className="mg-chrono">
            {enJeu && <span key={idx} className="mg-chrono-barre" style={{ '--duree': `${manche.duree}s`, '--attente': '0s' }} />}
            {enJeu && <span className="tp-secondes" aria-label={`${reste} secondes`}>{reste}</span>}
          </div>
          <span className="jx-score" aria-live="polite">{score}</span>
          {boutonSon}
        </div>
        <div className="mg-titre tp-titre">
          <span className="mg-titre-num">Tour {idx + 1} sur {total}</span>
          <h1>Tape-taupe !</h1>
        </div>
        <div className="tp-regle">
          <span>{manche.regle.texte}</span>
        </div>
        <div className={`tp-compteur${perdue ? ' tp-compteur--perd' : ''}`} key={`c${perdue ?? 0}`} ref={compteurEl} aria-label={`${compte} sur ${objectif}`}>
          {Array.from({ length: objectif }, (_, i) => (
            <i key={i} className={i < compte ? 'tp-plein' : ''} />
          ))}
        </div>

        <div className="tp-reviz-place" style={{ top: dim.haut }}>
          <div className="tp-reviz" ref={reviz} style={{ '--taille': `${tailleReviz}px` }}>
            <Pantin ref={pantin} size={tailleReviz} expression="content" repli={null} accessoire={['paille', 'salopette', 'maillet']} />
          </div>
        </div>
        <div className="tp-milieu">
          <div className="tp-messages">
            {!enJeu && (
              <button type="button" key={`a${idx}`} className="tp-annonce" onClick={onDemarrer}>
                <span className="tp-annonce-titre">{manche.annonce}</span>
                <span className="tp-annonce-sous">Tape {objectif} bonnes taupes · {manche.duree} s</span>
              </button>
            )}
            {decompte && <span key={`d${decompte}`} className="tp-decompte" aria-hidden="true">{decompte}</span>}
            {verdict && (
              <div key={`v${verdict.id}`} className={`tp-verdict tp-verdict--${verdict.type}`} role="status">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  {verdict.type === 'gagne' ? <path d="M5 12.5l4.5 4.5L19 7.5" />
                    : verdict.type === 'temps' ? <><circle cx="12" cy="13" r="8" /><path d="M12 9v4.5l3 2M9.5 3h5" /></>
                      : <path d="M7 7l10 10M17 7L7 17" />}
                </svg>
                <span>
                  <b>{verdict.titre}</b>
                  {verdict.sous && <small>{verdict.sous}</small>}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Le champ : 2 rangées de 3 trous ; le doigt est pris dès qu'il touche. */}
        <div className={`tp-champ${enJeu ? ' tp-champ--jeu' : ''}`} ref={champ} onPointerDown={appui}
          style={{ '--l': `${larg}px`, '--h': `${haut}px`, '--tl': `${tLarg}px`, '--th': `${tHaut}px`, height: dim.rangee * 2, marginBottom: dim.marge }}>
          {Array.from({ length: N_TROUS }, (_, trou) => (
            <div key={trou} className="tp-trou" ref={enregistrerTrou(trou)}>
              <img src="/jeux/taupe/trou.webp" alt="" draggable="false" className="tp-trou-fond" />
              <div className="tp-sortie" style={{ top: `calc(var(--h) * ${TROU.y1} - var(--th) * 1.2)` }}>
                {taupes.filter(x => x.trou === trou).map(x => (
                  <div key={`${idx}-${x.id}`} ref={enregistrer(x.id)} className={`tp-taupe${poses[x.id] ? ` tp-taupe--${poses[x.id]}` : ''}`} style={{ visibility: 'hidden' }}>
                    <img src={POSES[poses[x.id] === 'rate' ? 'sonnee' : poses[x.id] ?? 'normale']} alt="" draggable="false" />
                    <span className={`tp-pancarte${x.texte.length > 3 ? ' tp-pancarte--calcul' : ''}`}
                      style={{ left: `${TAUPE.pancarte.x * 100}%`, top: `${TAUPE.pancarte.y * 100}%`, width: `${TAUPE.pancarte.w * 100}%`, height: `${TAUPE.pancarte.h * 100}%` }}>
                      {x.texte}
                    </span>
                  </div>
                ))}
              </div>
              <img src="/jeux/taupe/trou-avant.webp" alt="" draggable="false" className="tp-trou-avant" />
              {chocs.filter(c => c.trou === trou).map(c => (
                <span key={c.id} className={`tp-choc${c.bon ? '' : ' tp-choc--faux'}`} aria-hidden="true">
                  {[0, 1, 2, 3, 4].map(k => <img key={k} src="/jeux/taupe/etoile.webp" alt="" style={{ '--k': k }} />)}
                  {c.bon && <b>+100</b>}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
