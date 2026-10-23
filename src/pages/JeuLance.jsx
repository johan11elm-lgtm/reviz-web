import { useCallback, useEffect, useRef, useState } from 'react';
import { themesDePartie, tourDeLancer, THEMES_JEUX } from '../data/themesJeux';
import { erreurJeu } from '../data/erreursJeux';
import { jouer } from '../utils/bruitages';
import './JeuLance.css';

/**
 * Réviz lance (22/10), le deuxième jeu de Réviz Games : une salle de classe en carton (calques
 * générés, public/jeux/lance/). La question est écrite à la craie au tableau, deux paniers de basket
 * en carton portent chacun une réponse ; Réviz, bandeau sur le front, tient une boule de papier bras
 * levé. L'élève la lance d'une pichenette vers le bon panier (ou touche le panier, ou les flèches au
 * clavier) : le bras de Réviz fouette, la boule part en cloche, rapetisse en s'éloignant et tombe
 * dans le filet, ou heurte le cercle et rebondit dehors. 3 tours de 6 questions qui accélèrent :
 * paniers fixes, puis qui glissent, puis qui glissent et dansent, la boule de plus en plus vive.
 *
 * Tout ce qui bouge (paniers, boule) est placé par transform sur des calques fixes, à chaque image
 * (requestAnimationFrame), jamais par left/top : rien ne se redessine pendant le vol.
 */

// mouvement : 0 paniers fixes, 1 la rangée glisse, 2 elle glisse plus vite et chaque panier danse.
// vol : durée du vol de la boule (s).
export const TOURS_LANCE = [
  { duree: 14, mouvement: 0, vol: 0.56, sous: 'Lance la boule dans le bon panier' },
  { duree: 13, mouvement: 1, vol: 0.5, sous: 'Les paniers bougent !' },
  { duree: 12, mouvement: 2, vol: 0.44, sous: 'Encore plus vite !' },
];
const N_QUESTIONS = 6;
const N_PANIERS = 2;
const PANIERS = [...Array(N_PANIERS).keys()];

/** Partie rapide de Réviz lance : 3 thèmes faciles au hasard, un par tour. */
export function mancheLance(theme, niveau) {
  const t = TOURS_LANCE[niveau], tour = tourDeLancer(theme.lancer ? theme : THEMES_JEUX[0], N_QUESTIONS, N_PANIERS);
  return { ...t, type: 'lance', niveau, theme: tour.theme, titre: tour.titre, aide: tour.aide, questions: tour.questions, apercu: 0 };
}
export const partieLance = () => themesDePartie(TOURS_LANCE.length).map((theme, i) => mancheLance(theme, i));

// Le panier (panier.webp, 560 × 565) : centre du cercle et demi-largeur, en fractions de l'image ;
// le cercle est coupé en deux à sa mi-hauteur (COUPE) : la moitié du fond passe derrière la boule,
// celle de devant et le filet passent devant.
const CERCLE = { x: 0.51, y: 0.52, demi: 0.29 };
const COUPE = 0.53;
const melange = liste => {
  const a = [...liste];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
};
const borne = (v, a, b) => Math.max(a, Math.min(b, v));
// Une question ratée, au format du récap : « 7 × 8 = ? », « dog : en français ? ». donnee : le panier
// visé, ou null si le temps s'est écoulé.
const erreurLance = (manche, qu, donnee) => erreurJeu({
  jeu: 'lance', tour: manche, paire: qu.paire, donnee, bonne: qu.reponse,
  question: manche.aide ? `${qu.question} : ${manche.aide.charAt(0).toLowerCase()}${manche.aide.slice(1)}` : qu.question,
});

export function JeuLance({ manche, numero, total, enJeu, expire, onBon, onFaux, onTermine, onCommencer, reviz, pantin, scene, horloge }) {
  const [q, setQ] = useState(0); // question en cours
  const [etat, setEtat] = useState('vise'); // vise | vol | suite
  const [resultat, setResultat] = useState(null); // { i, bon } : panier touché
  const [visee, setVisee] = useState(-1); // panier visé pendant le geste
  const [aide, setAide] = useState(manche.mouvement === 0); // geste montré au premier tour
  const fini = useRef(false);
  const serie = useRef(0);
  const reponses = useRef([]); // questions déjà jouées (justes ou fausses)
  const fonds = useRef([]), avants = useRef([]), cases = useRef([]);
  const boule = useRef(null);
  const vol = useRef(null);
  const tremble = useRef(PANIERS.map(() => 0)); // secousse de chaque panier touché (degrés, amortie)
  const geste = useRef(null);
  const question = manche.questions[q];

  const terminer = useCallback((sansEnCours = false) => {
    if (fini.current) return;
    fini.current = true;
    finJeu.current = performance.now();
    // Seule la question affichée compte (les suivantes, jamais vues, ne sont pas des erreurs) ; si la
    // dernière boule est arrivée après le chrono, la question suivante n'a jamais été montrée.
    const enCours = sansEnCours ? null : manche.questions[reponses.current.length];
    onTermine(enCours ? [erreurLance(manche, enCours, null)] : []);
  }, [manche, onTermine]);
  // Chrono écoulé pendant qu'une boule vole : on la laisse arriver, elle compte (Johan, 23/10 : pas de
  // coupure alors qu'on avait la réponse). Le tour se termine juste après son arrivée.
  const attendreBoule = useRef(false);
  useEffect(() => {
    if (!expire) return;
    if (vol.current && !vol.current.arrive) { attendreBoule.current = true; return; }
    terminer();
  }, [expire]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!enJeu || manche.mouvement) return;
    reviz.bulle(['Lance-la dans', 'le bon panier !']);
    const t = setTimeout(() => reviz.bulle(null), 2200);
    return () => clearTimeout(t);
  }, [enJeu]); // eslint-disable-line react-hooks/exhaustive-deps

  // Repères dans la scène : tout se mesure par rapport à elle (elle ne bouge pas).
  const repere = () => scene.current.getBoundingClientRect();
  const decalage = useRef(PANIERS.map(() => ({ x: 0, y: 0 })));
  const cercle = i => {
    const R = repere(), c = cases.current[i].getBoundingClientRect(), d = decalage.current[i];
    return { x: c.left - R.left + c.width * CERCLE.x + d.x, y: c.top - R.top + c.height * CERCLE.y + d.y, demi: c.width * CERCLE.demi, h: c.height };
  };

  // Les paniers démarrent à l'arrêt quand le chrono part et s'y remettent quand le tour finit
  // (le tour suivant repart de là) : leur amplitude monte et descend en douceur.
  const debutJeu = useRef(null), finJeu = useRef(null);
  useEffect(() => { if (enJeu) debutJeu.current = performance.now(); }, [enJeu]);
  const lisse = x => { const k = borne(x, 0, 1); return k * k * (3 - 2 * k); };

  // Une seule boucle par image : les paniers (glissement, secousse) puis la boule.
  useEffect(() => {
    let id = 0;
    const image = maintenant => {
      const t = debutJeu.current === null ? 0 : (maintenant - debutJeu.current) / 1000;
      const env = lisse(t / 0.9) * (finJeu.current === null ? 1 : 1 - lisse((maintenant - finJeu.current) / 400));
      for (const i of PANIERS) {
        const m = manche.mouvement;
        const d = decalage.current[i];
        const sg = i === 0 ? 1 : -1; // les deux paniers glissent en miroir : ils se croisent presque au centre
        d.x = env * (m === 0 ? 0 : m === 1 ? sg * 24 * Math.sin(t * 2.2) : sg * 30 * Math.sin(t * 3.2));
        d.y = env * (m === 2 ? 10 * Math.sin(t * 5 + i * 2.1) : 0);
        tremble.current[i] *= 0.9;
        const r = Math.abs(tremble.current[i]) < 0.05 ? 0 : tremble.current[i] * Math.sin(t * 40);
        const tr = `translate3d(${d.x.toFixed(2)}px, ${d.y.toFixed(2)}px, 0) rotate(${r.toFixed(2)}deg)`;
        if (fonds.current[i]) fonds.current[i].style.transform = tr;
        if (avants.current[i]) avants.current[i].style.transform = tr;
      }
      bougerBoule(maintenant);
      id = requestAnimationFrame(image);
    };
    id = requestAnimationFrame(image);
    return () => cancelAnimationFrame(id);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // La boule : vol en cloche vers le cercle (qui peut bouger : on le vise à chaque image), puis
  // descente dans le filet, ou rebond sur le bord et chute derrière Réviz.
  function bougerBoule(maintenant) {
    const v = vol.current, el = boule.current;
    if (!v || !el) return;
    const c = cercle(v.i);
    let x, y, s, z;
    const t = (maintenant - v.t0) / 1000;
    if (t < v.duree) {
      const u = t / v.duree;
      const cx = v.bon ? c.x : c.x + v.cote * c.demi * 0.92, cy = c.y - (v.bon ? 0 : c.h * 0.02);
      x = v.x0 + (cx - v.x0) * u;
      y = v.y0 + (cy - v.y0) * u - v.haut * 4 * u * (1 - u);
      s = 1 + (v.s1 - 1) * u;
      // Au-dessus de tout en montant ; passe sous le devant des paniers une fois au sommet.
      z = u < 0.5 ? 9 : 6;
      v.fin = { x, y, s, cx, cy };
      // Vitesse à l'arrivée (px/s) : le filet la reprend telle quelle.
      v.vx = (cx - v.x0) / v.duree; v.vy = ((cy - v.y0) + 4 * v.haut) / v.duree;
    } else if (v.bon) {
      // Dans le filet : elle entre à la vitesse de son arrivée, la laine la freine (exponentielle,
      // jusqu'à 35 %), puis elle ressort dessous et tombe derrière Réviz.
      const k = t - v.duree, T = 0.06, vy = v.vy, vf = 0.35 * vy;
      x = c.x + v.vx * 0.03 * (1 - Math.exp(-k / 0.03));
      y = c.y + vf * k + (vy - vf) * T * (1 - Math.exp(-k / T)) + 0.5 * 1500 * k * k;
      s = v.s1; z = y > c.y + c.h * 0.45 ? 3 : 6;
      el.style.opacity = String(borne(1 - (k - 0.25) / 0.15, 0, 1));
      if (k > 0.4) { vol.current = null; el.style.opacity = '0'; return; }
    } else {
      // Rebond : repart vers l'extérieur et vers le haut, puis tombe (gravité), derrière Réviz.
      const k = t - v.duree;
      x = v.fin.x + v.cote * 170 * k; y = v.fin.y - 240 * k + 0.5 * 1500 * k * k; s = v.s1; z = 3;
      el.style.opacity = String(borne(1 - (k - 0.45) / 0.25, 0, 1));
      if (k > 0.75) { vol.current = null; el.style.opacity = '0'; return; }
    }
    const r = (t * 720 * (v.bon ? 1 : -1)) % 360;
    el.style.zIndex = z;
    el.style.transform = `translate3d(${(x - v.taille / 2).toFixed(2)}px, ${(y - v.taille / 2).toFixed(2)}px, 0) scale(${s.toFixed(3)}) rotate(${r.toFixed(1)}deg)`;
    if (!v.arrive && t >= v.duree) { v.arrive = true; arriveeRef.current(v); }
  }

  const lancer = i => {
    if (!enJeu || etat !== 'vise' || fini.current || !question) return;
    setEtat('vol');
    setVisee(-1);
    setAide(false);
    const bon = question.choix[i] === question.reponse;
    const sens = i === 0 ? -1 : 1;
    jouer('lance');
    pantin.current?.lancer({
      sens,
      lacher: () => {
        const R = repere(), o = pantin.current?.objet();
        const taille = o ? Math.max(30, o.width) : 52;
        const x0 = o ? o.left - R.left + o.width / 2 : R.width * 0.3, y0 = o ? o.top - R.top + o.height / 2 : R.height * 0.6;
        const el = boule.current;
        el.style.width = el.style.height = `${taille}px`;
        el.style.opacity = '1';
        // Hauteur de la cloche : le sommet passe au-dessus du cercle, quelle que soit la distance.
        const c = cercle(i);
        vol.current = { i, bon, cote: x0 < c.x ? -1 : 1, t0: performance.now() - 1000 / 60, duree: manche.vol, x0, y0, taille, s1: borne((c.demi * 0.85) / taille, 0.45, 0.8), haut: Math.max(90, (y0 - c.y) * 0.55 + 70) };
        bougerBoule(performance.now());
      },
    });
  };

  // (appelée depuis la boucle d'images, montée une fois : on passe par une ref pour voir q à jour)
  const arriveeRef = useRef(null);
  arriveeRef.current = arrivee;
  function arrivee(v) {
    if (fini.current) return;
    // La boule est arrivée : pendant le verdict et la question suivante à la craie, le chrono s'arrête.
    if (!attendreBoule.current) horloge?.pause();
    const qu = manche.questions[q];
    reponses.current = [...reponses.current, q];
    setResultat({ i: v.i, bon: v.bon });
    if (v.bon) {
      serie.current += 1;
      jouer('swish');
      setTimeout(() => jouer(serie.current > 1 ? 'combo' : 'paire'), 60);
      onBon('fier');
      reviz.effet('panier', serie.current);
    } else {
      serie.current = 0;
      tremble.current[v.i] = 7;
      jouer('bonk');
      onFaux(erreurLance(manche, qu, qu.choix[v.i]));
    }
    const derniere = reponses.current.length >= manche.questions.length;
    setTimeout(() => {
      if (fini.current) return;
      if (attendreBoule.current) { terminer(true); return; }
      if (derniere) {
        if (reponses.current.length && serie.current >= manche.questions.length) { reviz.geste('brasEnLair'); reviz.effet('bravo'); jouer('bravo'); setTimeout(terminer, 1300); }
        else setTimeout(terminer, 300);
        return;
      }
      setResultat(null);
      setQ(x => x + 1);
      setEtat('suite');
      jouer('craie');
      pantin.current?.montrerObjet();
      jouer('froisse');
      setTimeout(() => { setEtat('vise'); horloge?.reprise(); }, 200);
    }, v.bon ? 460 : 660);
  }

  // Le geste : on pose le doigt n'importe où sous les paniers et on glisse vers le haut. Le panier
  // choisi est celui dont la direction est la plus proche de celle du geste.
  const versPanier = (x0, y0, x1, y1) => {
    const R = repere();
    const a = Math.atan2(y1 - y0, x1 - x0);
    let meilleur = -1, ecart = Infinity;
    for (const i of PANIERS) {
      const c = cercle(i);
      const b = Math.atan2(c.y - (y0 - R.top), c.x - (x0 - R.left));
      const d = Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));
      if (d < ecart) { ecart = d; meilleur = i; }
    }
    return meilleur;
  };
  const poser = ev => {
    geste.current = { x: ev.clientX, y: ev.clientY, id: ev.pointerId };
    ev.currentTarget.setPointerCapture?.(ev.pointerId);
  };
  const glisser = ev => {
    const g = geste.current;
    if (!g || g.id !== ev.pointerId) return;
    if (!enJeu) return;
    const dy = ev.clientY - g.y;
    setVisee(dy < -18 ? versPanier(g.x, g.y, ev.clientX, ev.clientY) : -1);
  };
  const lever = ev => {
    const g = geste.current;
    geste.current = null;
    if (!g || g.id !== ev.pointerId) return;
    const dy = ev.clientY - g.y, dx = ev.clientX - g.x;
    setVisee(-1);
    if (!enJeu) { onCommencer(); return; }
    if (dy < -28 && -dy > Math.abs(dx) * 0.25) { lancer(versPanier(g.x, g.y, ev.clientX, ev.clientY)); return; }
    // Une simple touche sur un panier le vise aussi ; ailleurs, on remontre le geste.
    const i = cases.current.findIndex((c, k) => {
      const r = c.getBoundingClientRect(), d = decalage.current[k];
      return ev.clientX >= r.left + d.x && ev.clientX <= r.right + d.x && ev.clientY >= r.top + d.y && ev.clientY <= r.bottom + r.height * 0.3 + d.y;
    });
    if (i >= 0) lancer(i);
    else if (etat === 'vise') setAide(true);
  };

  useEffect(() => {
    const touche = ev => {
      const i = { 1: 0, 2: 1, ArrowLeft: 0, ArrowRight: 1 }[ev.key];
      if (i === undefined) return;
      ev.preventDefault();
      if (!enJeu) onCommencer();
      else lancer(i);
    };
    window.addEventListener('keydown', touche);
    return () => window.removeEventListener('keydown', touche);
  });

  return (
    <>
      <button type="button" className={`ln-tableau${enJeu ? '' : ' ln-tableau--annonce'}`} onClick={enJeu ? undefined : onCommencer} tabIndex={enJeu ? -1 : 0}>
        {enJeu ? (
          <span key={q} className="ln-craie">
            <span className="ln-craie-titre">{manche.titre}</span>
            <span className={`ln-craie-question${question.question.length > 14 ? ' ln-craie-question--long' : ''}`} lang="fr">{question.question}</span>
            {manche.aide && <span className="ln-craie-aide">{manche.aide}</span>}
          </span>
        ) : (
          <span className="ln-craie ln-craie--annonce">
            <span className="ln-craie-titre">Tour {numero} sur {total}</span>
            <span className={`ln-craie-question${manche.titre.length > 14 ? ' ln-craie-question--long' : ''}`}>{manche.titre}</span>
            <span className="ln-craie-aide">{manche.sous} · {manche.duree} s</span>
          </span>
        )}
      </button>
      <div className="ln-paniers">
        {PANIERS.map(i => {
          const r = resultat;
          const marque = r?.i === i ? (r.bon ? ' ln-panier--marque' : ' ln-panier--rate') : r && !r.bon && question?.choix[i] === question.reponse ? ' ln-panier--juste' : '';
          const texte = enJeu ? question?.choix[i] : '';
          return (
            <div key={i} className="ln-case" ref={el => { cases.current[i] = el; }}>
              <span className="ln-panier-fond" ref={el => { fonds.current[i] = el; }} aria-hidden="true">
                <img src="/jeux/lance/panier.webp" alt="" />
              </span>
              <button type="button" className={`ln-panier-avant${visee === i ? ' ln-panier--vise' : ''}${marque}`}
                ref={el => { avants.current[i] = el; }} onClick={() => lancer(i)} disabled={!enJeu} aria-label={texte ? `Lancer vers ${texte}` : undefined}>
                <img src="/jeux/lance/panier.webp" alt="" className="ln-filet" />
                <span key={`${q}-${i}`} className={`ln-etiquette${texte?.length > 9 ? ' ln-etiquette--long ln-etiquette--tres-long' : texte?.length > 7 ? ' ln-etiquette--long' : texte?.length <= 4 ? ' ln-etiquette--court' : ''}`} lang="fr">
                  <span>{texte}</span>
                </span>
                {r?.i === i && r.bon && <b className="ln-plus" aria-hidden="true">+100</b>}
              </button>
            </div>
          );
        })}
      </div>
      <img ref={boule} src="/pantin/accessoires/boule.webp" alt="" className="ln-boule" aria-hidden="true" />
      <div className="ln-zone" onPointerDown={poser} onPointerMove={glisser} onPointerUp={lever} onPointerCancel={() => { geste.current = null; setVisee(-1); }} aria-hidden="true">
        {aide && enJeu && etat === 'vise' && <span className="ln-aide"><i /><span>Glisse vers un panier</span></span>}
      </div>
    </>
  );
}
