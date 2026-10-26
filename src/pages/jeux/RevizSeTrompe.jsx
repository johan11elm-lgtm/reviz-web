import { useCallback, useEffect, useRef, useState } from 'react';
import { Pantin } from '../../components/Pantin';
import { BulleReviz } from '../../components/reviz/BulleReviz';
import { themesDePartie } from '../../data/themesJeux';
import { tourDeBuzzer } from '../../data/affirmationsJeux';
import { erreurJeu } from '../../data/erreursJeux';
import { jouer } from '../../utils/bruitages';
import { musiqueBuzzer } from '../../utils/musiqueBuzzer';
import { minuterie, annuler } from './tempsDeJeu';
import './RevizSeTrompe.css';

/**
 * Réviz se trompe ? (23/10) : un plateau de jeu télé en feutrine (calques générés,
 * public/jeux/buzzer/), Réviz présentateur au micro. Il affirme une phrase, on buzze Vrai ou Faux
 * avant la fin du chrono. Grillé en train de mentir, il fait la tête (trombone triste) ; s'il disait
 * vrai, il félicite ; si on se trompe, il triomphe. Trois tours de plus en plus serrés : plus
 * d'affirmations, moins de temps pour savourer, musique plus rapide.
 */

// n : affirmations du tour ; pause : secondes de réaction de Réviz avant la suivante.
export const TOURS_BUZZER = [
  { duree: 15, n: 4, pause: 1.5, sous: 'Vrai ou faux ? Buzze vite !' },
  { duree: 14, n: 5, pause: 1.15, sous: 'Plus vite, il accélère !' },
  { duree: 13, n: 5, pause: 0.9, sous: 'Sprint final !' },
];
const TEMPOS = [128, 140, 152];
const MOQUERIES = ['Hé hé !', 'Je t’ai eu !', 'Piégé !'];

/** Un tour de Réviz se trompe ? sur un thème, au niveau 0, 1 ou 2. */
export function mancheBuzzer(theme, niveau) {
  const t = TOURS_BUZZER[niveau];
  const tour = tourDeBuzzer(theme, t.n);
  return { ...t, type: 'buzzer', niveau, theme: tour.theme, titre: tour.titre, annonce: tour.titre, affirmations: tour.affirmations, apercu: 0 };
}
/** Une partie de Réviz se trompe ? seul : 3 thèmes, 3 tours qui accélèrent. */
export const partieBuzzer = () => themesDePartie(TOURS_BUZZER.length).map((theme, i) => mancheBuzzer(theme, i));

// Les ampoules de l'étoile du décor, en px de l'image (téléphone : fond.webp, ordinateur :
// fond-paysage.webp) : elles luisent en chenillard.
const DECORS = {
  portrait: { fond: '/jeux/buzzer/fond.webp', pupitre: '/jeux/buzzer/pupitre.webp', l: 1024, h: 1536, ampoules: [
    [510, 358], [558, 432], [625, 489], [706, 510], [656, 585], [640, 669], [654, 749], [565, 727], [457, 727], [367, 749], [382, 669], [366, 585], [316, 510], [397, 489], [464, 432],
  ] },
  paysage: { fond: '/jeux/buzzer/fond-paysage.webp', pupitre: '/jeux/buzzer/pupitre-long.webp', l: 1536, h: 1024, ampoules: [
    [767, 245], [805, 298], [854, 343], [920, 360], [880, 419], [867, 484], [879, 549], [808, 530], [720, 530], [650, 549], [662, 484], [649, 419], [609, 360], [676, 343], [727, 299],
  ] },
};

// L'affirmation corrigée : la réponse de Réviz barrée et la bonne surlignée (ou juste surlignée).
function BulleCorrigee({ a, gabarit = false, pointe = 'bas' }) {
  return (
    <div className={`rv-bulle bz-bulle bz-bulle--corrigee${gabarit ? ' bz-bulle--gabarit' : ''}${pointe === 'gauche' ? ' rv-bulle--gauche' : ''}`} aria-hidden={gabarit ? 'true' : undefined}>
      <p className="rv-bulle-txt">
        <span className="rv-bulle-ligne">
          {a.avant}
          {a.vrai ? <mark className="bz-juste">{a.dit}</mark> : <><s className="bz-barre">{a.dit}</s> <mark className="bz-juste">{a.bonne}</mark></>}
          {a.apres}
        </span>
      </p>
    </div>
  );
}

// Une affirmation ratée, au format du récap. choix : true (Vrai), false (Faux), null (temps écoulé).
// Quand Réviz mentait, sa fausse réponse sert à expliquer la confusion (« Paris, c'est la France »).
const erreurBuzzer = (manche, a, choix) => erreurJeu({
  jeu: 'buzzer', tour: manche, paire: a.paire, question: a.texte,
  donnee: choix === null ? null : choix ? 'Vrai' : 'Faux', bonne: a.vrai ? 'Vrai' : 'Faux', autre: a.vrai ? null : a.dit,
});

export function PlateauBuzzer({ manche, idx, total, phase, expire, onBon, onFaux, onTermine, onDemarrer, fermer, boutonSon, score, isDesktop, hauteurEcran, horloge }) {
  const pantin = useRef(null);
  const [i, setI] = useState(-1); // affirmation en cours
  const [verdict, setVerdict] = useState(null); // { choix, juste }
  const [presse, setPresse] = useState(null); // buzzer écrasé : true (vrai) | false (faux)
  const [reaction, setReaction] = useState(null); // { type: grille | bravo | triomphe, texte, id }
  const [fete, setFete] = useState(null); // tour sans faute : pluie d'étoiles
  const jeu = useRef({ i: -1, repondu: false, fini: true, justes: 0 });
  const minuteurs = useRef([]);
  const plus = (ms, f) => minuteurs.current.push(minuterie(f, ms)); // gelées en arrière-plan (tempsDeJeu.js)
  const vider = () => { minuteurs.current.forEach(annuler); minuteurs.current = []; };
  const affs = manche.affirmations;

  const annoncer = useCallback(k => {
    horloge?.reprise(); // la réaction est finie : le chrono repart pour l'affirmation suivante
    jeu.current.i = k;
    jeu.current.repondu = false;
    setI(k);
    setVerdict(null);
    setReaction(null);
    pantin.current?.expression('content');
    pantin.current?.dire(affs[k].texte);
  }, [affs]);

  const terminer = useCallback(manques => {
    const j = jeu.current;
    if (j.fini) return;
    j.fini = true;
    musiqueBuzzer.regler({ enTension: false });
    onTermine(manques);
  }, [onTermine]);

  // Début du tour : Réviz lance la première affirmation dès que le chrono part.
  useEffect(() => {
    vider();
    jeu.current = { i: -1, repondu: false, fini: phase !== 'jeu', justes: 0 };
    setI(-1); setVerdict(null); setReaction(null); setPresse(null);
    if (phase !== 'jeu') return undefined;
    plus(250, () => annoncer(0));
    // Les trois dernières secondes : tic-tac dans la musique (lues sur le chrono, qui s'arrête pendant
    // les réactions de Réviz).
    const veille = setInterval(() => {
      const j = jeu.current;
      if (!j.fini && !j.tension && (horloge ? horloge.reste() : manche.duree) <= 3) { j.tension = true; musiqueBuzzer.regler({ enTension: true }); }
    }, 150);
    return () => { vider(); clearInterval(veille); musiqueBuzzer.regler({ enTension: false }); };
  }, [phase, idx]); // eslint-disable-line react-hooks/exhaustive-deps

  // Chrono écoulé : l'affirmation affichée sans réponse va dans le récap.
  useEffect(() => {
    if (!expire) return;
    const j = jeu.current;
    if (j.fini) return;
    const a = affs[j.i];
    pantin.current?.expression('surpris');
    setReaction({ type: 'temps', texte: 'Temps écoulé !', id: Date.now() });
    terminer(a && !j.repondu ? [erreurBuzzer(manche, a, null)] : []);
  }, [expire]); // eslint-disable-line react-hooks/exhaustive-deps

  const repondre = useCallback(choix => {
    const j = jeu.current;
    if (j.fini || j.repondu || j.i < 0) return;
    j.repondu = true;
    horloge?.pause(); // pendant la réaction de Réviz, le temps ne compte pas
    const a = affs[j.i];
    const juste = choix === a.vrai;
    setPresse(choix);
    plus(600, () => setPresse(null));
    setVerdict({ choix, juste });
    jouer('appui');
    const r = pantin.current;
    plus(110, () => {
      if (juste) {
        j.justes += 1;
        jouer('ding');
        onBon('fier');
        if (a.vrai) {
          r?.expression('fier');
          setReaction({ type: 'bravo', texte: 'Bravo !', id: Date.now() });
        } else {
          // Grillé : il voulait nous avoir.
          r?.expression('decu');
          r?.geste('gratterTete');
          setReaction({ type: 'grille', texte: 'Grillé !', id: Date.now() });
          plus(380, () => jouer('trombone'));
        }
      } else {
        jouer('buzzer');
        onFaux(erreurBuzzer(manche, a, choix));
        r?.expression('mortDeRire');
        r?.geste('brasEnLair');
        setReaction({ type: 'triomphe', texte: MOQUERIES[Math.floor(Math.random() * MOQUERIES.length)], id: Date.now() });
        plus(420, () => jouer('tada'));
      }
    });
    plus(110 + manche.pause * 1000, () => {
      if (j.fini) return;
      if (j.i + 1 < affs.length) { annoncer(j.i + 1); return; }
      if (j.justes === affs.length) {
        setFete(Date.now());
        jouer('bravo');
        r?.geste('saut');
      }
      terminer([]);
    });
  }, [affs, annoncer, manche, onBon, onFaux, terminer, horloge]);

  useEffect(() => () => vider(), []);
  // Au clavier : flèche gauche ou V pour Vrai, flèche droite ou F pour Faux.
  useEffect(() => {
    const touche = e => {
      if (e.repeat) return;
      if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'v') repondre(true);
      if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'f') repondre(false);
    };
    window.addEventListener('keydown', touche);
    return () => window.removeEventListener('keydown', touche);
  }, [repondre]);

  const a = phase === 'jeu' && i >= 0 ? affs[i] : null;
  const actif = !!a && !verdict;
  // Réviz à la mesure de l'écran (comme au tour de magie) : grand, mais le titre, la bulle et les
  // buzzers tiennent sur un iPhone SE dans Safari. Sur ordinateur, plein écran : le décor en
  // paysage, Réviz à un peu plus de la moitié de la hauteur, sa bulle à côté de lui (pointe à gauche).
  const tailleReviz = Math.round(isDesktop ? Math.max(300, hauteurEcran * 0.54) : Math.min(330, Math.max(200, hauteurEcran * 0.44)));
  const decor = DECORS[isDesktop ? 'paysage' : 'portrait'];
  const pointe = isDesktop ? 'gauche' : 'bas';
  const buzzer = (vrai, libelle) => {
    const juste = verdict && a && vrai === a.vrai;
    return (
      <button type="button" disabled={!actif}
        className={`bz-buzzer bz-buzzer--${vrai ? 'vrai' : 'faux'}${presse === vrai ? ' bz-buzzer--presse' : ''}${verdict?.choix === vrai ? ' bz-buzzer--choisi' : ''}${juste ? ' bz-buzzer--juste' : ''}${verdict && !juste ? ' bz-buzzer--eteint' : ''}`}
        onPointerDown={e => { if (e.button === 0) repondre(vrai); }}
        onClick={e => { if (e.detail === 0) repondre(vrai); }}
        aria-label={vrai ? 'Vrai' : 'Faux'}>
        <img src={`/jeux/buzzer/buzzer-${vrai ? 'vert' : 'rouge'}-socle.webp`} alt="" className="bz-socle" draggable="false" />
        <span className="bz-dome">
          <img src={`/jeux/buzzer/buzzer-${vrai ? 'vert' : 'rouge'}-dome.webp`} alt="" draggable="false" />
          <span className="bz-libelle">{libelle}</span>
        </span>
        {verdict?.choix === vrai && verdict.juste && <span key={i} className="bz-plus" aria-hidden="true">+100</span>}
      </button>
    );
  };

  return (
    <div className={`app app--no-halo jx-page mg-page bz-page${isDesktop ? ' jx-page--large' : ''}`}>
      <div className={`bz-monde${reaction ? ` bz-monde--${reaction.type}` : ''}`} aria-hidden="true">
        <img src={decor.fond} alt="" className="bz-fond" />
        {decor.ampoules.map(([x, y], k) => (
          <i key={k} className="bz-ampoule" style={{ left: `${(x / decor.l) * 100}%`, top: `${(y / decor.h) * 100}%`, '--k': k }} />
        ))}
      </div>
      {reaction && reaction.type !== 'temps' && <div key={reaction.id} className={`bz-flash bz-flash--${reaction.type === 'triomphe' ? 'rouge' : 'vert'}`} aria-hidden="true" />}
      {fete && (
        <div key={fete} className="mg-bravo" aria-hidden="true">
          {Array.from({ length: 18 }, (_, k) => <i key={k} style={{ '--k': k }} />)}
          <span>Sans faute !</span>
        </div>
      )}
      <div className="mg-scene bz-scene">
        <div className="jx-ligne-haut mg-hud">
          {fermer}
          <div className="mg-chrono">
            {phase === 'jeu' && <span key={idx} className="mg-chrono-barre" style={{ '--duree': `${manche.duree}s`, '--attente': '0s' }} />}
          </div>
          <span className="jx-score" aria-live="polite">{score}</span>
          {boutonSon}
        </div>
        <div className="mg-titre bz-titre">
          <span className="mg-titre-num">Tour {idx + 1} sur {total} · {manche.titre.replace(/ !$/, '')}</span>
          <h1>Réviz se trompe ?</h1>
        </div>

        <div className="bz-bulle-zone">
          {phase !== 'jeu' ? (
            <button type="button" key={`c${idx}`} className="bz-annonce" onClick={onDemarrer}>
              <span className="bz-annonce-titre">{manche.annonce}</span>
              <span className="bz-annonce-sous">{manche.sous} · {manche.duree} s</span>
            </button>
          ) : a && (
            <div className="bz-bulle-cadre" aria-live="polite">
              {/* La bulle prend d'emblée la taille de sa correction (copie invisible) : rien ne
                  bouge quand la mauvaise réponse est barrée et la bonne écrite à côté. */}
              <BulleCorrigee a={a} gabarit pointe={pointe} />
              {verdict ? <BulleCorrigee a={a} pointe={pointe} /> : <BulleReviz key={i} lignes={[a.texte]} pointe={pointe} className="bz-bulle" />}
              {verdict && <span key={`t${i}`} className={`bz-tampon bz-tampon--${a.vrai ? 'vrai' : 'faux'}`}>{a.vrai ? 'Vrai' : 'Faux'}</span>}
            </div>
          )}
        </div>

        <div className="bz-reviz">
          {reaction && <span key={reaction.id} className={`bz-reaction bz-reaction--${reaction.type}`}>{reaction.texte}</span>}
          {reaction?.type === 'grille' && <img key={`f${reaction.id}`} src="/jeux/magie/fumee.webp" alt="" className="bz-fumee" aria-hidden="true" />}
          <Pantin ref={pantin} size={tailleReviz} expression="content" repli={null} accessoire={['micro', 'noeud']} />
        </div>

        <div className="bz-pupitre">
          <img src={decor.pupitre} alt="" className="bz-pupitre-img" draggable="false" />
          <div className={`bz-buzzers${actif ? ' bz-buzzers--actifs' : ''}`}>
            {buzzer(true, 'Vrai')}
            {buzzer(false, 'Faux !')}
          </div>
        </div>
      </div>
    </div>
  );
}

export const TEMPO_BUZZER = niveau => TEMPOS[niveau] ?? TEMPOS.at(-1);
