import { useCallback, useEffect, useRef, useState } from 'react';
import { Pantin } from '../../components/Pantin';
import { BulleReviz } from '../../components/reviz/BulleReviz';
import { jouer } from '../../utils/bruitages';
import { musiqueFin } from '../../utils/musiqueFin';
import { mesurer } from '../../services/mesure';
import { minuterie, annuler } from './tempsDeJeu';
import './FinDePartie.css';

/**
 * La fin de partie de Réviz Games (23/10, maquettes refonte-2026-11/games-mondes/fin/) : une petite
 * scène de remise des prix en feutrine (calques générés, public/jeux/fin/). Réviz sur son podium
 * fête la partie selon le résultat (médaille, ou la coupe pour un sans-faute), le score défile, les
 * étoiles tombent une à une, le meilleur score est gardé sur l'appareil. Trois actions : voir le
 * récap, rejouer (le même mode), quitter (l'écran de choix des jeux).
 *
 * Le récap : sur un bureau, une carte en carton par erreur (format de data/erreursJeux.js), qu'on
 * fait défiler une à une (glisser, flèches à l'écran ou au clavier) : la question, la réponse de
 * l'élève barrée au feutre, la bonne entourée, et Réviz qui explique dans sa bulle, déguisé en
 * fonction du jeu où l'erreur a été faite. Il reste en place, les cartes passent devant lui.
 */

export const NOMS_JEUX = {
  magie: 'Le tour de magie', lance: 'Réviz lance', buzzer: 'Réviz se trompe ?',
  pizzeria: 'La pizzeria !', ninja: 'Le ninja des fautes', taupe: 'Tape-taupe !',
  peche: 'La pêche', valise: 'La valise', paires: 'Les paires',
};
// Le costume de Réviz sur la carte : celui du jeu de l'erreur (un nom inconnu du pantin est ignoré).
export const POSES_RECAP = {
  magie: ['chapeau', 'baguette'], lance: ['bandeau'], buzzer: ['micro', 'noeud'],
  pizzeria: ['toque', 'tablier'], ninja: ['ninja'], taupe: null,
};

// 2 340 : espace insécable entre les milliers (toLocaleString varie selon les navigateurs, et l'espace
// fine de Bricolage Grotesque n'a pas de largeur sous WebKit).
const nombre = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '\u00a0');
const calme = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const lire = cle => { try { return Number(localStorage.getItem(cle)) || 0; } catch { return 0; } };

/** Les étoiles (par demi-étoile) : 3 pour un sans-faute, sinon selon la part de bonnes réponses. */
export function etoilesDe(bonnes, nErreurs) {
  if (!nErreurs) return bonnes ? 3 : 0.5;
  return Math.max(0.5, Math.min(2.5, Math.round((bonnes / (bonnes + nErreurs)) * 6) / 2));
}
const titreDe = (etoiles, nErreurs) => (!nErreurs ? 'Sans faute !' : etoiles >= 2.5 ? 'Bravo !' : etoiles >= 1.5 ? 'Bien joué !' : 'Bel effort !');

// Le score qui défile : de 0 au score en un peu plus d'une seconde (tic de compteur), puis onFini.
function useDefile(cible, onFini) {
  const [v, setV] = useState(() => (calme() ? cible : 0));
  const fin = useRef(onFini);
  fin.current = onFini;
  useEffect(() => {
    if (calme() || !cible) { setV(cible); const t = setTimeout(() => fin.current?.(), 300); return () => clearTimeout(t); }
    const duree = Math.min(1500, 600 + cible / 3);
    let id, dernierTic = 0;
    const t0 = performance.now() + 450;
    const image = t => {
      const u = Math.max(0, Math.min(1, (t - t0) / duree));
      setV(Math.round(cible * (1 - (1 - u) ** 3)));
      if (u > 0 && u < 1 && t - dernierTic > 75) { dernierTic = t; jouer('compte'); }
      if (u < 1) id = requestAnimationFrame(image);
      else fin.current?.();
    };
    id = requestAnimationFrame(image);
    return () => cancelAnimationFrame(id);
  }, [cible]);
  return v;
}

// Les confettis en papier : des bandes qui tombent en tournant, sur les côtés de la scène.
const COULEURS = ['#F2B33D', '#E8574A', '#4C7BD9', '#F28A2E', '#9B6CE0', '#5DBB7A'];
function Confettis({ n }) {
  const [liste] = useState(() => Array.from({ length: n }, (_, k) => ({
    x: (k % 2 ? 55 : 0) + Math.random() * 45, d: 5 + Math.random() * 5, r: Math.random() * 360,
    t: -Math.random() * 10, c: COULEURS[k % COULEURS.length], l: 7 + Math.random() * 6,
  })));
  if (calme()) return null;
  return (
    <div className="fp-confettis" aria-hidden="true">
      {liste.map((c, k) => (
        <i key={k} style={{ left: `${c.x}%`, '--d': `${c.d}s`, '--t': `${c.t}s`, '--r': `${c.r}deg`, background: c.c, width: c.l, height: c.l * 0.55 }} />
      ))}
    </div>
  );
}

function Etoile({ remplie, rang, visible }) {
  return (
    <span className={`fp-etoile fp-etoile--${rang}${visible ? ' fp-etoile--la' : ''}`} style={{ '--k': rang }}>
      <img src="/jeux/fin/etoile.webp" alt="" className="fp-etoile-vide" draggable="false" />
      {remplie > 0 && <img src="/jeux/fin/etoile.webp" alt="" className="fp-etoile-or" draggable="false" style={{ clipPath: remplie < 1 ? 'inset(0 50% 0 0)' : undefined }} />}
    </span>
  );
}

// ── L'écran de fin ──────────────────────────────────────────────────────────────────────────
function Podium({ surtitre, score, bonnes, erreurs, record, onRecap, onRejouer, libelleRejouer, boutonSon, onQuitter, isDesktop, hauteurEcran }) {
  const n = erreurs.length;
  const etoiles = etoilesDe(bonnes, n);
  const pantin = useRef(null);
  const [fini, setFini] = useState(false);
  // Les sons et le geste du podium, après le défilement du score : annulés si on quitte avant (la croix, rejouer),
  // et gelés en arrière-plan.
  const suite = useRef([]);
  const plus = (ms, f) => suite.current.push(minuterie(f, ms));
  useEffect(() => () => { suite.current.forEach(annuler); suite.current = []; }, []);
  const affiche = useDefile(score, () => {
    setFini(true);
    if (calme()) return;
    [0, 1, 2].forEach(k => { if (etoiles > k) plus(120 + k * 260, () => jouer('etoile')); });
    plus(120 + 3 * 260, () => {
      if (record.nouveau) jouer('record');
      if (etoiles >= 1.5) pantin.current?.geste('brasEnLair');
      else pantin.current?.geste('coucou');
    });
  });
  useEffect(() => { jouer(n ? 'fin' : 'sansFaute'); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Réviz prend la hauteur qui reste une fois le titre, les étoiles, le score et les boutons posés.
  const taille = isDesktop ? 280 : Math.round(Math.min(250, Math.max(120, (hauteurEcran - 470) * 1.1)));
  const accessoire = !n ? 'coupe' : etoiles >= 1.5 ? 'medaille' : null;
  const total = bonnes + n;
  return (
    <section className="fp-fin" aria-labelledby="fp-titre">
      <div className="fp-haut">
        <button type="button" className="fp-rond" onClick={onQuitter} aria-label="Quitter">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>
        <span className="fp-surtitre">{surtitre}</span>
        {boutonSon}
      </div>
      <div className="fp-tete">
        <h1 id="fp-titre" className="fp-titre">{titreDe(etoiles, n)}</h1>
      </div>
      <div className="fp-etoiles" role="img" aria-label={`${String(etoiles).replace('.', ',')} étoile${etoiles > 1 ? 's' : ''} sur 3`}>
        {[0, 1, 2].map(k => <Etoile key={k} rang={k} remplie={Math.max(0, Math.min(1, etoiles - k))} visible={fini} />)}
      </div>
      <div className="fp-heros" style={{ '--taille': `${taille}px` }}>
        <Pantin ref={pantin} size={taille} expression={etoiles >= 1.5 ? 'fier' : 'content'} entree="saut" repli="hello" accessoire={accessoire} className="fp-pantin" />
        <img src="/jeux/fin/podium.webp" alt="" className="fp-podium" draggable="false" />
      </div>
      <div className="fp-score-bloc">
        <div className="fp-score-ligne">
          <span className="fp-score" aria-hidden="true">{nombre(affiche)}</span>
          <span className="fp-sr">Score : {nombre(score)} points.</span>
          {record.nouveau && fini && <span className="fp-record">Nouveau record !</span>}
        </div>
        <span className="fp-meilleur">Meilleur : <b>{nombre(record.meilleur)}</b></span>
        {total > 0 && <span className="fp-bonnes">{bonnes} bonne{bonnes > 1 ? 's' : ''} réponse{bonnes > 1 ? 's' : ''} sur {total}</span>}
      </div>
      <div className="fp-actions">
        {n > 0
          ? <button type="button" className="fp-btn fp-btn--orange fp-btn--large" onClick={onRecap}>Voir le récap · {n} erreur{n > 1 ? 's' : ''}</button>
          : <span className="fp-ruban">0 erreur, rien à revoir</span>}
        <div className="fp-actions-ligne">
          <button type="button" className={`fp-btn ${n ? 'fp-btn--encre' : 'fp-btn--orange'}`} onClick={onRejouer}>{libelleRejouer}</button>
          <button type="button" className="fp-btn fp-btn--blanc" onClick={onQuitter}>Quitter</button>
        </div>
      </div>
    </section>
  );
}

// ── Le récap : une carte par erreur ─────────────────────────────────────────────────────────
// Trait de feutre (barre) et rond de feutre (entoure), tracés à la main, dessinés à l'apparition.
const Barre = () => (
  <svg className="fp-feutre fp-feutre--barre" viewBox="0 0 100 20" preserveAspectRatio="none" aria-hidden="true">
    <path d="M3 13 C 25 8, 45 12, 62 9 S 88 7, 97 8" pathLength="1" />
  </svg>
);
const Rond = () => (
  <svg className="fp-feutre fp-feutre--rond" viewBox="0 0 100 50" preserveAspectRatio="none" aria-hidden="true">
    <path d="M58 5 C 30 3, 6 10, 5 25 C 4 41, 34 47, 56 46 C 80 45, 96 37, 95 23 C 94 10, 72 3, 46 6" pathLength="1" />
  </svg>
);

// Taille d'une valeur selon sa longueur : un mot ou deux tiennent toujours sur une ligne, sans être
// coupés au milieu (« chevaux », « laissé passer »).
const tailleValeur = v => (String(v ?? '').length > 11 ? ' fp-valeur--longue' : String(v ?? '').length > 6 ? ' fp-valeur--moyenne' : '');

function Carte({ e, classe = '', style, refCarte, active }) {
  const phrase = e.jeu === 'buzzer';
  const q = phrase ? `« ${e.question} »` : e.question;
  const taille = q.length > 34 ? ' fp-question--longue' : q.length > 16 ? ' fp-question--moyenne' : '';
  return (
    <article ref={refCarte} className={`fp-carte ${classe}`} style={style} aria-hidden={active ? undefined : 'true'}>
      {e.theme || NOMS_JEUX[e.jeu] ? (
        <span className="fp-etiquette">{[NOMS_JEUX[e.jeu], e.theme].filter(Boolean).join(' · ')}</span>
      ) : null}
      <p className={`fp-question${phrase ? ' fp-question--phrase' : ''}${taille}`} lang="fr">
        {phrase && <span className="fp-sr">Réviz a dit : </span>}{q}
      </p>
      <div className="fp-reponses">
        <p className="fp-reponse fp-reponse--toi">
          <span className="fp-reponse-nom">{(e.donnee !== null && e.libelles?.donnee) || 'Ta réponse'}</span>
          {e.donnee === null
            ? <span className="fp-temps">Temps écoulé</span>
            : <s className={`fp-valeur fp-valeur--fausse${tailleValeur(e.donnee)}`}>{e.donnee}{active && <Barre />}</s>}
        </p>
        <p className="fp-reponse fp-reponse--bonne">
          <span className="fp-reponse-nom">{e.libelles?.bonne ?? 'La bonne réponse'}</span>
          <b className={`fp-valeur fp-valeur--bonne${tailleValeur(e.bonne)}`}>{e.bonne}{active && <Rond />}</b>
        </p>
      </div>
      <div className="fp-explication">
        {active
          ? <BulleReviz key={e.explication} lignes={[e.explication]} pointe="gauche" className="fp-bulle" />
          : <div className="rv-bulle rv-bulle--la rv-bulle--gauche fp-bulle"><p className="rv-bulle-txt"><span className="rv-bulle-ligne">{e.explication}</span></p></div>}
      </div>
    </article>
  );
}

function Recap({ erreurs, onRetour, onRejouer, libelleRejouer, onQuitter, isDesktop, hauteurEcran }) {
  const n = erreurs.length;
  const [i, setI] = useState(0);
  const [sortante, setSortante] = useState(null); // { e, sens, depart, r }
  const [entree, setEntree] = useState(null); // 'monte' | 'revient'
  const [butee, setButee] = useState(0);
  const pantin = useRef(null);
  const carte = useRef(null);
  const glisse = useRef(null);
  const titre = useRef(null);
  const minuteur = useRef(null);
  const e = erreurs[i];

  useEffect(() => { titre.current?.focus(); }, []);
  // Réviz réagit à chaque carte, puis l'explique (sa bouche suit la bulle).
  useEffect(() => {
    const p = pantin.current;
    p?.expression(e.donnee === null ? 'surpris' : 'idee');
    const t1 = setTimeout(() => p?.dire(e.explication), 280);
    const t2 = setTimeout(() => p?.expression('content'), 1600);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [i]); // eslint-disable-line react-hooks/exhaustive-deps

  const aller = useCallback((sens, depart = 0) => {
    const j = i + sens;
    if (j < 0 || j >= n) {
      setButee(b => (b > 0 ? -1 : 1) * (Math.abs(b) + 1));
      if (carte.current) carte.current.style.setProperty('--dx', '0px');
      return;
    }
    clearTimeout(minuteur.current);
    setSortante({ e, sens, depart, r: depart * 0.06 });
    setEntree(sens > 0 ? 'monte' : 'revient');
    setI(j);
    jouer('page');
    minuteur.current = setTimeout(() => { setSortante(null); setEntree(null); }, calme() ? 0 : 460);
  }, [i, n, e]);
  useEffect(() => () => clearTimeout(minuteur.current), []);

  useEffect(() => {
    const touche = ev => {
      if (ev.key === 'ArrowRight') { ev.preventDefault(); aller(1); }
      else if (ev.key === 'ArrowLeft') { ev.preventDefault(); aller(-1); }
      else if (ev.key === 'Escape') onRetour();
    };
    window.addEventListener('keydown', touche);
    return () => window.removeEventListener('keydown', touche);
  }, [aller, onRetour]);

  // Glisser la carte du dessus : elle suit le doigt (penchée), et part au-delà de 70 px ou d'un
  // geste vif ; sinon elle revient en place. touch-action: none sur la pile : la page ne bouge pas.
  const bas = ev => {
    if (ev.pointerType === 'mouse' && ev.button !== 0) return;
    glisse.current = { x0: ev.clientX, y0: ev.clientY, dx: 0, t0: performance.now(), id: ev.pointerId };
    ev.currentTarget.setPointerCapture?.(ev.pointerId);
    carte.current?.classList.add('fp-carte--tenue');
  };
  const bouge = ev => {
    const g = glisse.current;
    if (!g || g.id !== ev.pointerId) return;
    g.dx = ev.clientX - g.x0;
    carte.current?.style.setProperty('--dx', `${g.dx}px`);
  };
  const haut = ev => {
    const g = glisse.current;
    if (!g || g.id !== ev.pointerId) return;
    glisse.current = null;
    carte.current?.classList.remove('fp-carte--tenue');
    const vite = Math.abs(g.dx) / Math.max(1, performance.now() - g.t0) > 0.6 && Math.abs(g.dx) > 24;
    if (Math.abs(g.dx) > 70 || vite) aller(g.dx < 0 ? 1 : -1, g.dx);
    else carte.current?.style.setProperty('--dx', '0px');
  };

  const taille = isDesktop ? 220 : Math.round(Math.min(170, Math.max(100, hauteurEcran * (hauteurEcran < 600 ? 0.19 : 0.24))));
  const reste = Math.min(2, n - i - 1);
  return (
    <section className="fp-recap" aria-labelledby="fp-recap-titre" style={{ '--taille': `${taille}px` }}>
      <div className="fp-haut fp-haut--recap">
        <button type="button" className="fp-rond" onClick={onRetour} aria-label="Retour au score">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M19 12H5M11 6l-6 6 6 6" /></svg>
        </button>
        <h1 id="fp-recap-titre" ref={titre} tabIndex={-1} className="fp-titre fp-titre--recap">Le récap</h1>
        <span className="fp-compteur" aria-live="polite"><span className="fp-sr">Erreur </span>{i + 1} / {n}</span>
      </div>

      <div className="fp-pile" onPointerDown={bas} onPointerMove={bouge} onPointerUp={haut} onPointerCancel={haut}
        role="group" aria-roledescription="carrousel" aria-label="Tes erreurs, une carte par erreur. Flèches gauche et droite pour changer de carte.">
        {Array.from({ length: reste }, (_, k) => <span key={`d${i + k}`} className={`fp-dos fp-dos--${k + 1}`} aria-hidden="true" />)}
        {sortante && sortante.sens < 0 && (
          <Carte e={sortante.e} classe="fp-carte--rentre" style={{ '--dx0': `${sortante.depart}px`, '--r0': `${sortante.r}deg` }} />
        )}
        <Carte key={i} e={e} active refCarte={carte}
          classe={`${entree ? `fp-carte--${entree}` : ''}${butee ? ` fp-carte--butee${butee > 0 ? '' : '-b'}` : ''}`} />
        {sortante && sortante.sens > 0 && (
          <Carte e={sortante.e} classe="fp-carte--part" style={{ '--dx0': `${sortante.depart}px`, '--r0': `${sortante.r}deg` }} />
        )}
        <div className="fp-prof">
          <Pantin ref={pantin} size={taille} expression="content" repli="hello" accessoire={POSES_RECAP[e.jeu] ?? null} />
        </div>
      </div>

      <div className="fp-nav">
        <button type="button" className="fp-rond fp-fleche" onClick={() => aller(-1)} disabled={i === 0} aria-label="Erreur précédente">
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>
        </button>
        {n <= 12 ? (
          <div className="fp-points" aria-hidden="true">
            {erreurs.map((_, k) => <span key={k} className={`fp-point${k === i ? ' fp-point--la' : ''}`} />)}
          </div>
        ) : <span className="fp-points-txt" aria-hidden="true">{i + 1} sur {n}</span>}
        <button type="button" className="fp-rond fp-fleche" onClick={() => aller(1)} disabled={i === n - 1} aria-label="Erreur suivante">
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 5l7 7-7 7" /></svg>
        </button>
      </div>

      <div className="fp-actions-ligne fp-actions-ligne--recap">
        <button type="button" className="fp-btn fp-btn--orange" onClick={onRejouer}>{libelleRejouer}</button>
        <button type="button" className="fp-btn fp-btn--blanc" onClick={onQuitter}>Quitter</button>
      </div>
    </section>
  );
}

/**
 * @param {string} surtitre   « Partie rapide · 6 tours »
 * @param {number} score, bonnes
 * @param {object[]} erreurs  format commun, déjà dédoublonnées
 * @param {string} cleRecord  clé du meilleur score sur l'appareil (un par mode)
 * @param {number} [recordAvant]  le meilleur score d'avant cette partie, quand il est connu d'ailleurs que de cleRecord
 */
export function FinDePartie({ surtitre, score, bonnes, erreurs, cleRecord, recordAvant, onRejouer, libelleRejouer = 'Rejouer', boutonSon, onQuitter, isDesktop, hauteurEcran, mode }) {
  const [vue, setVue] = useState('fin');
  const [record] = useState(() => {
    const avant = recordAvant ?? lire(cleRecord);
    return { meilleur: Math.max(avant, score), nouveau: avant > 0 && score > avant };
  });
  useEffect(() => {
    // recordAvant : le record vient d'ailleurs (la partie du jour : le même que sur l'écran des jeux, repris du
    // compte), il n'y a rien à garder ici.
    if (recordAvant === undefined && score > lire(cleRecord)) try { localStorage.setItem(cleRecord, String(score)); } catch { /* stockage indisponible */ }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  // La musique de fin part après la fanfare du podium et continue pendant le récap.
  useEffect(() => {
    const t = setTimeout(() => musiqueFin.demarrer(), 1200);
    return () => { clearTimeout(t); musiqueFin.arreter(); };
  }, []);
  const retour = useCallback(() => setVue('fin'), []);

  return (
    <div className={`app app--no-halo app--large fp-page fp-page--${vue}${isDesktop ? ' fp-page--large' : ''}`}>
      <div className="fp-fond fp-fond--scene" aria-hidden="true" />
      <div className="fp-fond fp-fond--bureau" aria-hidden="true" />
      {vue === 'fin' && <Confettis n={isDesktop ? 34 : 22} />}
      <div className="fp-ecran">
        {vue === 'fin' ? (
          <Podium surtitre={surtitre} score={score} bonnes={bonnes} erreurs={erreurs} record={record}
            onRecap={() => { jouer('page'); setVue('recap'); mesurer('recap_ouvert', { mode, erreurs: erreurs.length }); }} onRejouer={onRejouer} libelleRejouer={libelleRejouer} boutonSon={boutonSon} onQuitter={onQuitter}
            isDesktop={isDesktop} hauteurEcran={hauteurEcran} />
        ) : (
          <Recap erreurs={erreurs} onRetour={retour} onRejouer={onRejouer} libelleRejouer={libelleRejouer} onQuitter={onQuitter} isDesktop={isDesktop} hauteurEcran={hauteurEcran} />
        )}
      </div>
    </div>
  );
}
