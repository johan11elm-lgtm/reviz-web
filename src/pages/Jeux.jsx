import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Pantin } from '../components/Pantin';
import { BulleReviz } from '../components/reviz/BulleReviz';
import { useAuth } from '../context/AuthContext';
import { loadCatalogue, loadChapterContent } from '../services/programmeService';
import { hasProgramme, PROGRAMME_CLASSES, PROGRAMME_FALLBACK } from '../utils/programme';
import { teinteMatiere, varsTeinte } from '../utils/teinteMatiere';
import { accessoireMatiere } from '../utils/accessoireMatiere';
import { PAIRES_JEUX } from '../data/pairesJeux';
import { themesDePartie, tourDeTheme } from '../data/themesJeux';
import { erreurJeu, erreursUniques } from '../data/erreursJeux';
import { jouer, sonActif, bruitagesActifs } from '../utils/bruitages';
import { musiqueMagie } from '../utils/musiqueMagie';
import { musiqueLance } from '../utils/musiqueLance';
import { JeuLance, partieLance, mancheLance } from './JeuLance';
import { musiqueBuzzer } from '../utils/musiqueBuzzer';
import { PlateauBuzzer, mancheBuzzer, partieBuzzer, TEMPO_BUZZER } from './jeux/RevizSeTrompe';
import { musiquePizzeria } from '../utils/musiquePizzeria';
import { PlateauPizzeria, manchePizzeria, partiePizzeria, TEMPO_PIZZERIA } from './jeux/Pizzeria';
import { musiqueNinja } from '../utils/musiqueNinja';
import { PlateauNinja, mancheNinja, partieNinja, TEMPO_NINJA } from './jeux/Ninja';
import { FinDePartie } from './jeux/FinDePartie';
import { finDeDemo } from './jeux/demoFin';
import { musiqueTaupe } from '../utils/musiqueTaupe';
import { musiqueFin } from '../utils/musiqueFin';
import { PlateauTaupe, mancheTaupe, partieTaupe, TEMPO_TAUPE } from './jeux/Taupe';
import { useIsDesktop } from '../hooks/useMediaQuery';
import { TransitionJeux, DUREES_TRANSITION } from './jeux/TransitionJeux';
import './Jeux.css';

/**
 * Réviz Games, prototype du 22/10 : une partie de 6 mini-jeux de 10 à 15 s sur un chapitre,
 * nourris par ses propres données (carte mentale, mots-clés), donc valables pour tout le
 * programme. Trois mécaniques : la pêche (trier ce qui passe), la valise (choisir les bons
 * parmi des pièges), les paires (relier un mot à sa définition). Le chrono raccourcit au fil
 * de la partie. Une erreur est mise en scène (Réviz réagit) sans arrêter le chrono ; tout ce
 * qui a été raté revient dans le récap de fin.
 *
 * Le tour de magie (22/10) est le premier jeu produit pour de vrai : un monde en pâte à modeler
 * (calques générés, public/jeux/magie/), Réviz magicien au centre. C'est le mode par défaut ;
 * ?jeu=prototype rejoue les 3 essais du matin (pêche, valise, paires).
 * Réviz lance (22/10, JeuLance.jsx) : la boule à lancer dans le bon panier.
 * Réviz se trompe ? (23/10, pages/jeux/RevizSeTrompe.jsx) : vrai ou faux au buzzer, plateau télé.
 * La pizzeria ! (23/10, pages/jeux/Pizzeria.jsx) : servir la fraction de pizza du ticket.
 * Le ninja des fautes (23/10, pages/jeux/Ninja.jsx) : trancher les mots mal écrits, dojo la nuit.
 * Tape-taupe ! (23/10, pages/jeux/Taupe.jsx) : calcul mental, taper les bonnes taupes du potager.
 * L'écran de choix propose les jeux séparément, plus une Partie rapide qui les mélange (6 tours,
 * chaque jeu au moins une fois, jamais deux fois de suite, de plus en plus rapides).
 * ?rapide=melange|magie|lance|buzzer|pizzeria|ninja|taupe lance directement (?jeu=buzzer reste accepté).
 * ?classe=5ème&matiere=Histoire&chapitre=<id> lance directement un chapitre.
 */

const DUREES = [15, 15, 13, 13, 11, 11];
const GAGS = ['Oups !', 'Aïe !', 'Raté !', 'Hmm, non.'];
const melange = liste => {
  const a = [...liste];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
};
const auHasard = liste => liste[Math.floor(Math.random() * liste.length)];

// ── La partie : 6 manches tirées du chapitre ─────────────────────────────────────────────
// ── Le tour de magie : 3 tours de 3 paires courtes, Réviz mélange de plus en plus ──────────
// voir : secondes pour mémoriser ; echanges : cartes échangées face cachée (bonneteau) ;
// pas : durée d'un échange. Le chrono ne part qu'une fois le mélange fini.
const TOURS_MAGIE = [
  { duree: 15, voir: 3.2, echanges: 0, pas: 0.7, annonce: 'Retrouve les paires', sous: 'Mémorise, puis retourne-les deux par deux' },
  { duree: 14, voir: 3, echanges: 2, pas: 0.7, annonce: 'Il mélange !', sous: 'Suis bien les cartes des yeux' },
  { duree: 13, voir: 2.8, echanges: 4, pas: 0.5, annonce: 'Mélange express !', sous: 'Plus de cartes qui bougent, plus vite' },
];
function pairesCourtes(data, branches) {
  const ecrites = PAIRES_JEUX[data?.programme?.chapitreId];
  if (ecrites?.length >= 3) return melange(ecrites).map(([a, b]) => ({ a, b }));
  // Repli : la carte mentale (une catégorie ↔ un de ses éléments), toujours courte.
  return branches.map(br => ({ a: br.label, b: auHasard(br.children) }));
}
// Partie rapide : des thèmes faciles (tables, capitales…), un par tour, sans lien avec une leçon.
// Les jeux s'enchaînent (magie, buzzer, magie…), chacun de plus en plus rapide (niveau 0, 1, 2) ;
// six thèmes tous différents.
const SOUS_RAPIDE = ['Mémorise, puis retourne-les deux par deux', 'Attention, il mélange !', 'Mélange express !'];
export function mancheMagie(theme, niveau) {
  const t = TOURS_MAGIE[niveau], tour = tourDeTheme(theme);
  return { ...t, type: 'magie', niveau, theme: tour.theme, paires: tour.paires, titre: tour.titre, annonce: tour.titre, sous: SOUS_RAPIDE[niveau], apercu: t.voir + 0.6 + t.echanges * t.pas };
}
/** Le tour de magie seul : 3 thèmes, 3 tours qui accélèrent. */
export const partieMagieSeule = () => themesDePartie(TOURS_MAGIE.length).map((theme, i) => mancheMagie(theme, i));
/**
 * Partie rapide : les jeux mélangés, 6 tours. Chaque jeu au moins une fois (tous, dans un ordre au
 * hasard, puis de quoi compléter les 6), jamais le même jeu deux fois de suite ; niveaux 0, 0, 1, 1,
 * 2, 2 ; six thèmes tous différents.
 */
const JEUX = { magie: mancheMagie, lance: mancheLance, buzzer: mancheBuzzer, pizzeria: manchePizzeria, ninja: mancheNinja, taupe: mancheTaupe };
export function partieMelangee() {
  const themes = themesDePartie(6);
  const jeux = Object.keys(JEUX);
  let ordre;
  do { ordre = [...melange(jeux), ...melange(jeux)].slice(0, 6); } while (ordre.some((j, i) => j === ordre[i + 1]));
  const niveaux = [0, 0, 1, 1, 2, 2];
  return ordre.map((jeu, i) => JEUX[jeu](themes[i], niveaux[i]));
}
const ACCESSOIRES_JEU = { magie: ['chapeau', 'baguette'], lance: ['bandeau', 'boule'], buzzer: ['micro', 'noeud'], pizzeria: ['toque', 'tablier'], ninja: ['ninja', 'sabre'], taupe: ['paille', 'salopette', 'maillet'] };
function partieMagie(data, branches) {
  const paires = pairesCourtes(data, branches);
  if (paires.length < 2) return [];
  return TOURS_MAGIE.map((t, i) => {
    const lot = [0, 1, 2].map(k => paires[(i * 3 + k) % paires.length]).filter((p, k, l) => l.indexOf(p) === k);
    return { ...t, type: 'magie', paires: lot, apercu: t.voir + 0.6 + t.echanges * t.pas };
  });
}

export function construirePartie(data, mode = 'magie') {
  const branches = melange((data?.mindmap?.branches ?? []).filter(b => b.label && (b.children?.length ?? 0) >= 3));
  const mots = melange((data?.resume?.keyTerms ?? []).filter(k => k.term && k.def));
  const carte = branches.length >= 2;
  let ib = 0, im = 0;
  const branche = () => branches[ib++ % branches.length];
  const pieges = b => melange(branches.filter(x => x !== b).flatMap(x => x.children.map(texte => ({ texte, de: x.label }))));
  const items = (b, nBons, nPieges) => melange([
    ...melange(b.children).slice(0, nBons).map(texte => ({ texte, de: b.label, bon: true })),
    ...pieges(b).slice(0, nPieges).map(p => ({ ...p, bon: false })),
  ]).map((it, id) => ({ ...it, id }));
  const manche = {
    peche: () => { const b = branche(); return { type: 'peche', cible: b.label, items: items(b, 4, 4) }; },
    valise: () => { const b = branche(); return { type: 'valise', cible: b.label, items: items(b, 3, 3) }; },
    paires: () => {
      const vus = new Set(), paires = [];
      for (let k = 0; k < mots.length && paires.length < 3; k++) {
        const m = mots[im++ % mots.length];
        if (!vus.has(m.term)) { vus.add(m.term); paires.push(m); }
      }
      return { type: 'paires', paires };
    },
  };
  if (mode !== 'prototype') return partieMagie(data, branches);
  const ordre = carte ? ['peche', 'paires', 'valise', 'peche', 'paires', 'valise'] : ['paires', 'paires', 'paires'];
  return ordre.map((type, i) => ({ ...manche[type](), duree: DUREES[i] ?? 11 })).filter(m => m.type !== 'paires' || m.paires.length >= 2);
}

const CONSIGNES = {
  peche: m => ({ titre: 'Pêche !', sous: <>Seulement : <b>{m.cible}</b></> }),
  valise: m => ({ titre: 'Fais la valise !', sous: <>Les 3 qui vont avec : <b>{m.cible}</b></> }),
  paires: () => ({ titre: 'Relie !', sous: 'Chaque mot à sa définition' }),
};

// ── Les erreurs, au format commun du récap (data/erreursJeux.js) ─────────────────────────
// Pêche et valise (essais du 22/10) : le mot, la catégorie où l'élève l'a mis, la bonne.
const erreurCategorie = (jeu, mot, donnee, bonne) => ({
  jeu, theme: bonne, question: `«\u00a0${mot}\u00a0» va avec…`, donnee, bonne,
  explication: donnee ? `«\u00a0${mot}\u00a0» fait partie de «\u00a0${bonne}\u00a0», pas de «\u00a0${donnee}\u00a0».` : `«\u00a0${mot}\u00a0» fait partie de «\u00a0${bonne}\u00a0».`,
});
const erreurDefinition = (p, donnee) => ({
  jeu: 'paires', theme: 'Définitions', question: `«\u00a0${p.term}\u00a0», c'est…`, donnee, bonne: p.def,
  explication: `«\u00a0${p.term}\u00a0» : ${p.def.charAt(0).toLowerCase()}${p.def.slice(1).replace(/\.?$/, '.')}`,
});
// Le tour de magie : la carte retournée en premier, celle retournée avec (null : paire pas trouvée
// à temps) et sa vraie partenaire. Les tables se lisent en calcul : « 7 × 8 = ? », « ? = 56 ».
function erreurMagie(manche, p, premiere, seconde) {
  const terme = premiere === p.a;
  const question = manche.theme === 'tables' ? (terme ? `${p.a} = ?` : `? = ${p.b}`) : `«\u00a0${premiere}\u00a0» va avec…`;
  return erreurJeu({ jeu: 'magie', tour: manche, paire: p, question, donnee: seconde, bonne: terme ? p.b : p.a });
}

// ── La pêche : les mots passent dans l'eau, on ne pêche que ceux de la catégorie ──────────
function Peche({ manche, expire, onBon, onFaux, onTermine }) {
  const [etats, setEtats] = useState({}); // id -> 'peche' | 'faux'
  const fini = useRef(false);
  const bons = manche.items.filter(i => i.bon);
  const terminer = useCallback(et => {
    if (fini.current) return;
    fini.current = true;
    onTermine(bons.filter(b => et[b.id] !== 'peche').map(b => erreurCategorie('peche', b.texte, null, manche.cible)));
  }, [bons, manche.cible, onTermine]);
  useEffect(() => { if (expire) terminer(etats); }, [expire]); // eslint-disable-line react-hooks/exhaustive-deps

  const pecher = it => {
    if (etats[it.id] || fini.current) return;
    const suite = { ...etats, [it.id]: it.bon ? 'peche' : 'faux' };
    setEtats(suite);
    if (it.bon) {
      onBon();
      if (bons.every(b => suite[b.id] === 'peche')) setTimeout(() => terminer(suite), 450);
    } else onFaux(erreurCategorie('peche', it.texte, manche.cible, it.de));
  };

  // 3 couloirs ; dans chaque couloir, les mots sont répartis sur le trajet (délais négatifs).
  const couloirs = [0, 1, 2].map(c => manche.items.filter((_, i) => i % 3 === c));
  return (
    <div className="jx-bassin">
      <span className="jx-vague jx-vague--a" aria-hidden="true" />
      <span className="jx-vague jx-vague--b" aria-hidden="true" />
      {couloirs.map((liste, c) => (
        <div key={c} className={`jx-couloir jx-couloir--${c}`}>
          {liste.map((it, k) => {
            const duree = 7 + c * 0.8;
            const etat = etats[it.id];
            return (
              <span key={it.id} className={`jx-nage${etat ? ' jx-nage--stop' : ''}`}
                style={{ '--duree': `${duree}s`, '--delai': `${-(k / liste.length) * duree - c * 0.9}s` }}>
                <button type="button" className={`jx-poisson${etat ? ` jx-poisson--${etat}` : ''}`} onClick={() => pecher(it)} disabled={!!etat}>
                  {it.texte}
                  {etat === 'peche' && <span className="jx-plus" aria-hidden="true">+100</span>}
                </button>
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ── La valise : 6 cartes, on n'y range que les 3 qui vont avec ───────────────────────────
function Valise({ manche, expire, onBon, onFaux, onTermine }) {
  const [etats, setEtats] = useState({}); // id -> 'range' | 'rejet'
  const [secousse, setSecousse] = useState(0);
  const fini = useRef(false);
  const bons = manche.items.filter(i => i.bon);
  const ranges = bons.filter(b => etats[b.id] === 'range').length;
  const terminer = useCallback(et => {
    if (fini.current) return;
    fini.current = true;
    onTermine(bons.filter(b => et[b.id] !== 'range').map(b => erreurCategorie('valise', b.texte, null, manche.cible)));
  }, [bons, manche.cible, onTermine]);
  useEffect(() => { if (expire) terminer(etats); }, [expire]); // eslint-disable-line react-hooks/exhaustive-deps

  const ranger = it => {
    if (etats[it.id] || fini.current) return;
    const suite = { ...etats, [it.id]: it.bon ? 'range' : 'rejet' };
    setEtats(suite);
    if (it.bon) {
      onBon();
      setSecousse(s => s + 1);
      if (bons.every(b => suite[b.id] === 'range')) setTimeout(() => terminer(suite), 500);
    } else onFaux(erreurCategorie('valise', it.texte, manche.cible, it.de));
  };

  return (
    <div className="jx-valise-aire">
      <div className="jx-cartes">
        {manche.items.map(it => (
          <button key={it.id} type="button" className={`jx-carte${etats[it.id] ? ` jx-carte--${etats[it.id]}` : ''}`}
            onClick={() => ranger(it)} disabled={!!etats[it.id]}>
            {it.texte}
          </button>
        ))}
      </div>
      <div key={secousse} className={`jx-valise${secousse ? ' jx-valise--hop' : ''}`}>
        <img src="/jeux/valise.webp" alt="" className="jx-valise-img" />
        <span className="jx-valise-compte">{ranges} / {bons.length}</span>
      </div>
    </div>
  );
}

// ── Les paires : toucher un mot, puis sa définition ──────────────────────────────────────
function Paires({ manche, expire, onBon, onFaux, onTermine }) {
  const defs = useMemo(() => melange(manche.paires), [manche]);
  const [choisi, setChoisi] = useState(null); // terme sélectionné
  const [relies, setRelies] = useState([]); // termes reliés, dans l'ordre (couleur)
  const [faux, setFaux] = useState(null); // { terme, def } secoués un instant
  const fini = useRef(false);
  const terminer = useCallback(r => {
    if (fini.current) return;
    fini.current = true;
    onTermine(manche.paires.filter(p => !r.includes(p.term)).map(p => erreurDefinition(p, null)));
  }, [manche, onTermine]);
  useEffect(() => { if (expire) terminer(relies); }, [expire]); // eslint-disable-line react-hooks/exhaustive-deps

  const toucherDef = p => {
    if (!choisi || relies.includes(p.term) || fini.current) return;
    if (choisi === p.term) {
      const suite = [...relies, p.term];
      setRelies(suite);
      setChoisi(null);
      onBon();
      if (suite.length === manche.paires.length) setTimeout(() => terminer(suite), 450);
    } else {
      setFaux({ terme: choisi, def: p.term });
      setTimeout(() => setFaux(null), 500);
      onFaux(erreurDefinition(manche.paires.find(x => x.term === choisi), p.def));
      setChoisi(null);
    }
  };
  const couleur = t => relies.indexOf(t);

  return (
    <div className="jx-paires">
      <div className="jx-termes">
        {manche.paires.map(p => {
          const c = couleur(p.term);
          return (
            <button key={p.term} type="button" disabled={c >= 0}
              className={`jx-terme${choisi === p.term ? ' jx-terme--choisi' : ''}${c >= 0 ? ` jx-relie jx-relie--${c}` : ''}${faux?.terme === p.term ? ' jx-secoue' : ''}`}
              onClick={() => setChoisi(choisi === p.term ? null : p.term)}>
              {p.term}
            </button>
          );
        })}
      </div>
      <div className="jx-defs">
        {defs.map(p => {
          const c = couleur(p.term);
          return (
            <button key={p.term} type="button" disabled={c >= 0 || !choisi}
              className={`jx-def${c >= 0 ? ` jx-relie jx-relie--${c}` : ''}${faux?.def === p.term ? ' jx-secoue' : ''}${choisi && c < 0 ? ' jx-def--actif' : ''}`}
              onClick={() => toucherDef(p)}>
              {p.def}
            </button>
          );
        })}
      </div>
      <p className="jx-aide">{choisi ? 'Touche sa définition' : 'Touche un mot'}</p>
    </div>
  );
}


// ── Le tour de magie : Réviz montre les paires, retourne les cartes, les mélange au bonneteau,
// puis on retrouve les paires. Chaque carte a une place sur la table (2 rangées de 3) : un échange
// fait glisser deux cartes l'une vers l'autre. Une paire trouvée s'envole en étincelles.
const PAGAILLE = [-4, 2.5, -1.5, 3, -3, 1.5];
function TourDeMagie({ manche, expire, onBon, onFaux, onTermine, reviz }) {
  const cartes = useMemo(() => manche.paires.flatMap((p, i) => [
    { id: `a${i}`, paire: i, sorte: 'terme', texte: p.a },
    { id: `b${i}`, paire: i, sorte: 'indice', texte: p.b },
  ]), [manche]);
  const [places, setPlaces] = useState(() => melange(cartes.map((_, i) => i))); // places[carte] = case
  const [bougent, setBougent] = useState([]); // cartes en train de glisser
  const [etape, setEtape] = useState('voir'); // voir | melange | jeu
  const [ouvertes, setOuvertes] = useState([]);
  const [trouvees, setTrouvees] = useState([]);
  const [rate, setRate] = useState(false);
  const fini = useRef(false);
  const serie = useRef(0); // paires trouvées d'affilée (combo)
  const terminer = useCallback(tr => {
    if (fini.current) return;
    fini.current = true;
    onTermine(manche.paires.filter((_, i) => !tr.includes(i)).map(p => erreurMagie(manche, p, p.a, null)));
  }, [manche, onTermine]);
  useEffect(() => { if (expire) terminer(trouvees); }, [expire]); // eslint-disable-line react-hooks/exhaustive-deps

  // Le spectacle : montrer, retourner, mélanger.
  useEffect(() => {
    const t = [];
    const a = ms => new Promise(ok => t.push(setTimeout(ok, ms)));
    let vivant = true;
    (async () => {
      reviz.bulle(['Regarde bien !', 'Mémorise les paires.']);
      await a(manche.voir * 1000 - 600);
      if (!vivant) return;
      reviz.geste('brasEnLair');
      reviz.bulle(['Abracadabra !']);
      jouer('magie');
      await a(600);
      setEtape('melange');
      await a(600);
      if (manche.echanges) reviz.bulle(['Suis bien', 'les cartes…']);
      for (let k = 0; k < manche.echanges && vivant; k++) {
        setPlaces(pl => {
          const [x, y] = melange(pl.map((_, i) => i)).slice(0, 2);
          setBougent([x, y]);
          jouer('glisse');
          const suite = [...pl];
          [suite[x], suite[y]] = [suite[y], suite[x]];
          return suite;
        });
        await a(manche.pas * 1000);
      }
      if (!vivant) return;
      setBougent([]);
      reviz.bulle(manche.echanges ? ['À toi !', 'Où sont les paires ?'] : null);
      setEtape('jeu');
      await a(1400);
      reviz.bulle(null);
    })();
    return () => { vivant = false; t.forEach(clearTimeout); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const retourner = i => {
    const c = cartes[i];
    if (etape !== 'jeu' || fini.current || ouvertes.length >= 2 || ouvertes.includes(i) || trouvees.includes(c.paire)) return;
    const suite = [...ouvertes, i];
    setOuvertes(suite);
    jouer('carte');
    if (suite.length < 2) return;
    const [a, b] = suite.map(k => cartes[k]);
    setTimeout(() => {
      if (a.paire === b.paire) {
        const tr = [...trouvees, a.paire];
        setTrouvees(tr);
        setOuvertes([]);
        serie.current += 1;
        onBon('emerveille');
        reviz.effet('paire', serie.current);
        jouer(serie.current > 1 ? 'combo' : 'paire');
        if (tr.length === manche.paires.length) {
          setTimeout(() => { reviz.geste('saut'); reviz.effet('bravo'); jouer('bravo'); }, 450);
          setTimeout(() => terminer(tr), 1500);
        }
      } else {
        serie.current = 0;
        onFaux(erreurMagie(manche, manche.paires[a.paire], a.texte, b.texte));
        reviz.effet('rate');
        jouer('rate');
        setRate(true);
        setTimeout(() => { setOuvertes([]); setRate(false); }, 800);
      }
    }, 380);
  };

  return (
    <div className={`mg-cartes${etape === 'voir' ? ' mg-cartes--apercu' : ''}`} style={{ '--pas': `${manche.pas}s` }}>
      {cartes.map((c, i) => {
        const trouvee = trouvees.includes(c.paire);
        const visible = etape === 'voir' || ouvertes.includes(i) || trouvee;
        const pl = places[i];
        return (
          <button key={c.id} type="button" onClick={() => retourner(i)}
            className={`mg-carte${visible ? ' mg-carte--face' : ''}${trouvee ? ' mg-carte--trouvee' : ''}${rate && ouvertes.includes(i) ? ' mg-carte--rate' : ''}${bougent.includes(i) ? ' mg-carte--bouge' : ''}`}
            style={{ '--i': pl, '--col': pl % 3, '--rang': Math.floor(pl / 3), '--r': `${PAGAILLE[pl % PAGAILLE.length]}deg` }}
            aria-label={visible ? c.texte : 'Carte cachée'}>
            <span className="mg-carte-anim">
              <span className="mg-carte-int">
                <span className="mg-face mg-face--dos" aria-hidden="true" />
                <span className={`mg-face mg-face--avant mg-face--${c.sorte}${c.texte.length > (c.sorte === 'terme' ? 6 : 16) ? ' mg-face--long' : ''}${c.texte.length <= 4 ? ' mg-face--court' : ''}`} lang="fr"><span>{c.texte}</span></span>
              </span>
              {trouvee && <span className="mg-etincelles" aria-hidden="true" />}
            </span>
          </button>
        );
      })}
    </div>
  );
}

const MINI_JEUX = { peche: Peche, valise: Valise, paires: Paires, magie: TourDeMagie };

// ── La page ──────────────────────────────────────────────────────────────────────────────
export default function Jeux() {
  const navigate = useNavigate();
  const isDesktop = useIsDesktop();
  const { getUserLevel } = useAuth();
  const level = getUserLevel?.();
  const [params] = useSearchParams();
  // ?jeu=prototype rejoue les essais du matin ; tout le reste est le mode jeux (?jeu=buzzer : voir RAPIDES).
  const mode = params.get('jeu') === 'prototype' ? 'prototype' : 'magie';
  const [classe, setClasse] = useState(() => params.get('classe') || (hasProgramme(level) ? level.classe : PROGRAMME_FALLBACK));
  const [catalogue, setCatalogue] = useState(null);
  const [matiereChoisie, setMatiereChoisie] = useState(() => params.get('matiere'));
  const [chapitre, setChapitre] = useState(null); // { matiere, titre, data }
  const [phase, setPhase] = useState('choix'); // choix | charge | consigne | jeu | fin
  const [partie, setPartie] = useState([]);
  const [idx, setIdx] = useState(0);
  const [expire, setExpire] = useState(-1); // numéro du jeu dont le chrono est écoulé
  const [score, setScore] = useState(0);
  const [bonnes, setBonnes] = useState(0);
  const [erreurs, setErreurs] = useState([]);
  const [gag, setGag] = useState(null);
  const [bulle, setBulle] = useState(null); // ce que dit Réviz pendant le tour de magie
  const [transition, setTransition] = useState(null); // null | 'enroule' | 'carte' | 'deroule'
  const [effets, setEffets] = useState([]); // { id, type, n } : combo, fumée, bravo
  const [son, setSon] = useState(sonActif);
  const [hauteurEcran] = useState(() => (typeof window !== 'undefined' ? window.innerHeight : 844));
  const pantin = useRef(null);
  const scene = useRef(null); // Réviz lance : le repère de la boule et des paniers
  const retourHumeur = useRef(null);
  const debutManche = useRef(0);
  const finie = useRef(-1); // numéro du dernier jeu terminé

  useEffect(() => {
    let vivant = true;
    setCatalogue(null);
    loadCatalogue(classe).then(c => { if (vivant) setCatalogue(c); }).catch(() => {});
    return () => { vivant = false; };
  }, [classe]);

  const lancer = useCallback(async (matiere, ch) => {
    setPhase('charge');
    try {
      const data = await loadChapterContent(classe, matiere, ch.id);
      setChapitre({ matiere, titre: ch.titre, data });
      setPartie(construirePartie(data, mode));
      setIdx(0); setScore(0); setBonnes(0); setErreurs([]); setExpire(-1); finie.current = -1;
      setPhase('consigne');
    } catch { setPhase('choix'); }
  }, [classe, mode]);
  const nouvellePartie = () => { setIdx(0); setScore(0); setBonnes(0); setErreurs([]); setExpire(-1); finie.current = -1; setPhase('consigne'); };
  // Les 3 jeux séparément, et la Partie rapide qui les mélange.
  const RAPIDES = { melange: partieMelangee, magie: partieMagieSeule, lance: partieLance, buzzer: partieBuzzer, pizzeria: partiePizzeria, ninja: partieNinja, taupe: partieTaupe };
  const TITRES = { melange: 'Partie rapide', magie: 'Le tour de magie', lance: 'Réviz lance', buzzer: 'Réviz se trompe ?', pizzeria: 'La pizzeria !', ninja: 'Le ninja des fautes', taupe: 'Tape-taupe !' };
  const lancerRapide = (jeu = 'melange') => {
    setChapitre({ matiere: 'Réviz Games', titre: TITRES[jeu], rapide: jeu });
    setPartie(RAPIDES[jeu]());
    nouvellePartie();
  };
  useEffect(() => {
    // Développement : ?fin=0|1|6 ouvre directement la fin d'une Partie rapide avec autant d'erreurs.
    if (import.meta.env.DEV && params.get('fin') !== null) {
      const d = finDeDemo(Number(params.get('fin')) || 0);
      setChapitre({ matiere: 'Réviz Games', titre: TITRES.melange, rapide: 'melange' });
      setPartie(RAPIDES.melange());
      setScore(d.score); setBonnes(d.bonnes); setErreurs(d.erreurs);
      setPhase('fin');
      return;
    }
    const r = params.get('rapide') ?? (['buzzer', 'pizzeria'].includes(params.get('jeu')) ? params.get('jeu') : null);
    if (r) lancerRapide(RAPIDES[r] ? r : 'melange');
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Lien direct vers un chapitre.
  const direct = params.get('chapitre');
  useEffect(() => {
    if (!direct || !catalogue || chapitre) return;
    const m = catalogue.matieres.find(x => x.matiere === matiereChoisie) ?? catalogue.matieres.find(x => x.chapitres.some(c => c.id === direct));
    const ch = m?.chapitres.find(c => c.id === direct);
    if (m && ch) lancer(m.matiere, ch);
  }, [catalogue]); // eslint-disable-line react-hooks/exhaustive-deps

  const manche = partie[idx];

  // Musique d'un jeu : une seule boucle, de la première annonce jusqu'à l'écran de fin ; chaque
  // tour la joue un peu plus vite (8 % de plus à chaque tour).
  // Le niveau du tour (0, 1, 2) règle la vitesse : dans la Partie rapide, chaque jeu revient deux fois.
  const MUSIQUES = {
    magie: { m: musiqueMagie, tempo: n => Math.round(116 * (1 + n * 0.08)) },
    lance: { m: musiqueLance, tempo: n => Math.round(126 * (1 + n * 0.08)) },
    buzzer: { m: musiqueBuzzer, tempo: TEMPO_BUZZER },
    pizzeria: { m: musiquePizzeria, tempo: TEMPO_PIZZERIA },
    ninja: { m: musiqueNinja, tempo: TEMPO_NINJA },
    taupe: { m: musiqueTaupe, tempo: TEMPO_TAUPE },
  };
  const musique = (phase === 'consigne' || phase === 'jeu') ? MUSIQUES[manche?.type] : null;
  const tempoTour = musique ? musique.tempo(manche.niveau ?? idx) : 0;
  useEffect(() => {
    for (const x of Object.values(MUSIQUES)) if (x !== musique || !son) x.m.arreter();
    if (!musique || !son) return;
    musique.m.regler({ bpm: tempoTour });
    musique.m.demarrer();
  }, [musique?.m, tempoTour, son]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => { musiqueMagie.arreter(); musiqueLance.arreter(); musiqueBuzzer.arreter(); musiquePizzeria.arreter(); musiqueNinja.arreter(); musiqueTaupe.arreter(); musiqueFin.arreter(); }, []);

  // Consigne : 1,7 s (ou une touche), puis le chrono part.
  useEffect(() => {
    if (phase !== 'consigne') return;
    const t = setTimeout(() => setPhase('jeu'), 1700 + DUREES_TRANSITION.deroule);
    return () => clearTimeout(t);
  }, [phase, idx]);
  useEffect(() => {
    if (phase !== 'jeu' || !manche) return;
    debutManche.current = performance.now();
    const t = setTimeout(() => setExpire(idx), ((manche.apercu ?? 0) + manche.duree) * 1000);
    return () => clearTimeout(t);
  }, [phase, idx]); // eslint-disable-line react-hooks/exhaustive-deps

  const humeur = (nom, ms) => {
    pantin.current?.expression(nom);
    clearTimeout(retourHumeur.current);
    retourHumeur.current = setTimeout(() => pantin.current?.expression('content'), ms);
  };
  const onBon = useCallback((nom = 'fier') => {
    setScore(s => s + 100);
    setBonnes(b => b + 1);
    humeur(nom, 900);
  }, []);
  const onFaux = useCallback(err => {
    setErreurs(e => [...e, err]);
    setGag({ texte: auHasard(GAGS), id: Date.now() });
    humeur(auHasard(['etourdi', 'panique', 'surpris']), 900);
  }, []);
  const onTermine = useCallback(manques => {
    if (finie.current === idx) return;
    finie.current = idx;
    const reste = Math.max(0, manche.duree + (manche.apercu ?? 0) - (performance.now() - debutManche.current) / 1000);
    if (!manques.length && reste > 0.5) setScore(s => s + Math.round(reste) * 20);
    if (manques.length) setErreurs(e => [...e, ...manques]);
    setTimeout(() => {
      if (idx + 1 >= partie.length) { setPhase('fin'); return; }
      // Transition B : le décor s'enroule, la carte du jeu suivant, le nouveau décor se déroule.
      // Le tour suivant ne démarre qu'au déroulement (ses minuteries partent à ce moment-là).
      const d = DUREES_TRANSITION;
      setTransition('enroule'); jouer('glisse');
      setTimeout(() => { setTransition('carte'); jouer('carte'); }, d.enroule);
      setTimeout(() => { setIdx(i => i + 1); setPhase('consigne'); setTransition('deroule'); jouer('glisse'); }, d.enroule + d.carte);
      setTimeout(() => setTransition(null), d.enroule + d.carte + d.deroule);
    }, 650);
  }, [manche, idx, partie.length]);

  const teinte = teinteMatiere(chapitre?.matiere ?? matiereChoisie ?? '');
  const accessoire = accessoireMatiere(chapitre?.matiere);
  const deco = (
    <>
      <span className="jx-deco jx-deco--a" aria-hidden="true" />
      <span className="jx-deco jx-deco--b" aria-hidden="true" />
      <span className="jx-grain" aria-hidden="true" />
    </>
  );
  const fermer = (
    <button type="button" className="jx-rond" onClick={() => (phase === 'choix' ? navigate(-1) : setPhase('choix'))} aria-label="Fermer">
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
    </button>
  );
  const page = contenu => (
    <div className={`app app--no-halo jx-page${isDesktop ? ' jx-page--large' : ''}`} style={varsTeinte(teinte)}>
      {deco}
      <div className="jx-ecran">{contenu}</div>
    </div>
  );

  // ── Choix du chapitre ──
  if (phase === 'choix' || phase === 'charge') {
    const m = catalogue?.matieres.find(x => x.matiere === matiereChoisie) ?? catalogue?.matieres[0];
    return page(
      <>
        <div className="jx-ligne-haut">{fermer}<span className="jx-surtitre">Prototype</span></div>
        <h1 className="jx-titre">Réviz Games</h1>
        <p className="jx-intro">{mode === 'magie' ? 'Des jeux de 10 à 15 secondes, sur des thèmes faciles : tables, capitales, anglais…' : '6 mini-jeux de 10 à 15 secondes sur un chapitre : pêche, valise, paires.'}</p>
        {mode === 'magie' && (
          <>
            <button type="button" className="jx-rapide jx-rapide--melange" onClick={() => lancerRapide('melange')}>
              <span className="jx-rapide-txt"><b>Partie rapide</b><span>Les jeux mélangés, 6 tours de plus en plus rapides</span></span>
              <span className="jx-jouer" aria-hidden="true">Jouer</span>
            </button>
            <span className="jx-surtitre jx-ou">Ou un seul jeu, 3 tours</span>
            <div className="jx-jeux">
              <button type="button" className="jx-rapide" onClick={() => lancerRapide('magie')}>
                <span className="jx-rapide-txt"><b>Le tour de magie</b><span>Retrouve les paires, il mélange de plus en plus</span></span>
                <span className="jx-jouer" aria-hidden="true">Jouer</span>
              </button>
              <button type="button" className="jx-rapide jx-rapide--lance" onClick={() => lancerRapide('lance')}>
                <span className="jx-rapide-txt"><b>Réviz lance</b><span>Lance la boule dans le bon panier</span></span>
                <span className="jx-jouer" aria-hidden="true">Jouer</span>
              </button>
              <button type="button" className="jx-rapide jx-rapide--buzzer" onClick={() => lancerRapide('buzzer')}>
                <span className="jx-rapide-txt"><b>Réviz se trompe ?</b><span>Vrai ou faux : buzze quand il dit une bêtise</span></span>
                <span className="jx-jouer" aria-hidden="true">Jouer</span>
              </button>
              <button type="button" className="jx-rapide jx-rapide--pizzeria" onClick={() => lancerRapide('pizzeria')}>
                <span className="jx-rapide-txt"><b>La pizzeria !</b><span>Sers la bonne fraction de pizza</span></span>
                <span className="jx-jouer" aria-hidden="true">Jouer</span>
              </button>
              <button type="button" className="jx-rapide jx-rapide--ninja" onClick={() => lancerRapide('ninja')}>
                <span className="jx-rapide-txt"><b>Le ninja des fautes</b><span>Tranche les mots mal écrits</span></span>
                <span className="jx-jouer" aria-hidden="true">Jouer</span>
              </button>
              <button type="button" className="jx-rapide jx-rapide--taupe" onClick={() => lancerRapide('taupe')}>
                <span className="jx-rapide-txt"><b>Tape-taupe !</b><span>Calcul mental : tape les bonnes taupes</span></span>
                <span className="jx-jouer" aria-hidden="true">Jouer</span>
              </button>
            </div>
          </>
        )}
        {mode !== 'prototype' && <span className="jx-surtitre jx-ou">Ou sur un chapitre de ton programme</span>}
        <div className="jx-puces" role="radiogroup" aria-label="Classe">
          {PROGRAMME_CLASSES.map(c => (
            <button key={c} type="button" role="radio" aria-checked={c === classe} className={`jx-puce${c === classe ? ' jx-puce--on' : ''}`} onClick={() => setClasse(c)}>{c}</button>
          ))}
        </div>
        <div className="jx-puces" role="radiogroup" aria-label="Matière">
          {catalogue?.matieres.map(x => (
            <button key={x.matiere} type="button" role="radio" aria-checked={x === m} className={`jx-puce${x === m ? ' jx-puce--on' : ''}`} onClick={() => setMatiereChoisie(x.matiere)}>{x.matiere}</button>
          ))}
        </div>
        <div className="jx-chapitres">
          {!catalogue && <p className="jx-intro">Chargement du programme…</p>}
          {m?.chapitres.map(ch => (
            <button key={ch.id} type="button" className="jx-chapitre" disabled={phase === 'charge'} onClick={() => lancer(m.matiere, ch)}>
              <span>{ch.titre}</span>
              <span className="jx-jouer" aria-hidden="true">Jouer</span>
            </button>
          ))}
        </div>
      </>,
    );
  }

  // ── Fin de partie : le score sur le podium, puis le récap (une carte par erreur) ──
  if (phase === 'fin') {
    const rejouer = () => { setPartie(chapitre.rapide ? RAPIDES[chapitre.rapide]() : construirePartie(chapitre.data, mode)); nouvellePartie(); };
    const tours = partie.length;
    return (
      <FinDePartie surtitre={`${chapitre.titre} · ${tours} tour${tours > 1 ? 's' : ''}`}
        score={score} bonnes={bonnes} erreurs={erreursUniques(erreurs)}
        cleRecord={`reviz-jeux-record-${chapitre.rapide ?? `chapitre-${chapitre.titre}`}`}
        onRejouer={rejouer} onQuitter={() => setPhase('choix')} isDesktop={isDesktop} hauteurEcran={hauteurEcran} />
    );
  }

  // ── Consigne puis mini-jeu ──
  const effet = (type, n = 0) => {
    const id = Date.now() + Math.random();
    setEffets(e => [...e, { id, type, n }]);
    setTimeout(() => setEffets(e => e.filter(x => x.id !== id)), type === 'bravo' ? 1900 : 1500);
  };
  // Réviz à la mesure de l'écran : 320 px sur un grand téléphone, moins sur un iPhone 12 ou SE dans
  // Safari (barres affichées), pour que le titre, son chapeau et les cartes tiennent sans se chevaucher.
  const tailleReviz = Math.round(Math.min(320, Math.max(190, hauteurEcran * 0.4)));
  const tailleLance = Math.round(Math.min(300, Math.max(170, hauteurEcran * 0.36)));
  const reviz = {
    geste: nom => pantin.current?.geste(nom), bulle: setBulle, effet,
  };
  const boutonSon = (
    <button type="button" className="jx-rond mg-son" onClick={() => { bruitagesActifs(!son); setSon(!son); }}
      aria-label={son ? 'Couper le son' : 'Remettre le son'} aria-pressed={!son}>
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M4 9h4l5-4v14l-5-4H4z" />
        {son ? <path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12" /> : <path d="M17 9l5 6M22 9l-5 6" />}
      </svg>
    </button>
  );

  // ── Réviz se trompe ? : le plateau télé occupe tout l'écran, Réviz présentateur au micro ──
  // Pendant l'enroulement et la carte, la manche affichée est encore l'ancienne : la carte annonce la
  // suivante ; au déroulement, idx est déjà passé à la nouvelle.
  const suivante = transition === 'deroule' ? manche : partie[idx + 1];
  const transitionEl = (
    <TransitionJeux etape={transition} suivante={suivante} numero={(transition === 'deroule' ? idx : idx + 1) + 1}
      total={partie.length} score={score} />
  );

  if (manche.type === 'buzzer') {
    return (
      <>
        {transitionEl}
      <PlateauBuzzer manche={manche} idx={idx} total={partie.length} phase={phase} expire={expire === idx} score={score}
        onBon={onBon} onFaux={onFaux} onTermine={onTermine} onDemarrer={() => setPhase('jeu')}
        fermer={fermer} boutonSon={boutonSon} isDesktop={isDesktop} hauteurEcran={hauteurEcran} />
      </>
    );
  }

  // ── La pizzeria ! : le comptoir de Réviz pizzaïolo, la pizza coupée, le ticket de commande ──
  if (manche.type === 'pizzeria') {
    return (
      <>
        {transitionEl}
      <PlateauPizzeria manche={manche} idx={idx} total={partie.length} phase={phase} expire={expire === idx} score={score}
        onBon={onBon} onFaux={onFaux} onTermine={onTermine} onDemarrer={() => setPhase('jeu')}
        fermer={fermer} boutonSon={boutonSon} isDesktop={isDesktop} hauteurEcran={hauteurEcran} />
      </>
    );
  }

  // ── Le ninja des fautes : le dojo occupe tout l'écran, Réviz ninja au milieu des fruits ──
  if (manche.type === 'ninja') {
    return (
      <>
        {transitionEl}
      <PlateauNinja manche={manche} idx={idx} total={partie.length} phase={phase} expire={expire === idx} score={score}
        onBon={onBon} onFaux={onFaux} onTermine={onTermine} onDemarrer={() => setPhase('jeu')}
        fermer={fermer} boutonSon={boutonSon} isDesktop={isDesktop} hauteurEcran={hauteurEcran} />
      </>
    );
  }

  // ── Tape-taupe ! : le potager occupe tout l'écran, Réviz jardinier au-dessus des trous ──
  if (manche.type === 'taupe') {
    return (
      <>
        {transitionEl}
      <PlateauTaupe manche={manche} idx={idx} total={partie.length} phase={phase} expire={expire === idx} score={score}
        onBon={onBon} onFaux={onFaux} onTermine={onTermine} onDemarrer={() => setPhase('jeu')}
        fermer={fermer} boutonSon={boutonSon} isDesktop={isDesktop} hauteurEcran={hauteurEcran} />
      </>
    );
  }

  // ── Le tour de magie : le monde occupe tout l'écran, Réviz magicien derrière sa table ──
  if (manche.type === 'magie') {
    return (
      <>
        {transitionEl}
      <div className={`app app--no-halo jx-page mg-page${isDesktop ? ' jx-page--large' : ''}`}>
        <div className="mg-monde" aria-hidden="true" />
        {effets.some(e => e.type === 'bravo') && (
          <div className="mg-bravo" aria-hidden="true">
            {Array.from({ length: 18 }, (_, k) => <i key={k} style={{ '--k': k }} />)}
            <span>Bravo !</span>
          </div>
        )}
        <div className="mg-scene">
          <div className="jx-ligne-haut mg-hud">
            {fermer}
            <div className="mg-chrono">
              {phase === 'jeu' && <span key={idx} className="mg-chrono-barre" style={{ '--duree': `${manche.duree}s`, '--attente': `${manche.apercu}s` }} />}
            </div>
            <span className="jx-score" aria-live="polite">{score}</span>
            {boutonSon}
          </div>
          <div className="mg-titre">
            <span className="mg-titre-num">Tour {idx + 1} sur {partie.length}</span>
            <h1>{manche.titre ?? 'Le tour de magie'}</h1>
          </div>
          <div className="mg-reviz">
            {bulle && phase === 'jeu' && <BulleReviz key={bulle.join()} lignes={bulle} className="mg-bulle" />}
            {gag && <span key={gag.id} className="jx-gag mg-gag">{gag.texte}</span>}
            {effets.map(e => e.type === 'paire' ? (
              e.n > 1 && <b key={e.id} className="mg-combo" aria-hidden="true">Combo ×{e.n}</b>
            ) : e.type === 'rate' ? (
              <img key={e.id} src="/jeux/magie/fumee.webp" alt="" className="mg-fumee" aria-hidden="true" />
            ) : null)}
            <Pantin ref={pantin} size={isDesktop ? 330 : tailleReviz} expression="content" repli={null} accessoire={['chapeau', 'baguette']} />
          </div>
          <div className="mg-table">
            <img src="/jeux/magie/table.webp" alt="" className="mg-table-img" />
            {phase === 'jeu'
              ? <TourDeMagie key={idx} manche={manche} expire={expire === idx} onBon={onBon} onFaux={onFaux} onTermine={onTermine} reviz={reviz} />
              : (
                <button type="button" key={`c${idx}`} className="mg-annonce" onClick={() => setPhase('jeu')}>
                  <span className="mg-annonce-titre">{manche.annonce}</span>
                  <span className="mg-annonce-sous">{manche.sous} · {manche.duree} s</span>
                </button>
              )}
          </div>
        </div>
      </div>
      </>
    );
  }

  // ── Réviz lance : la salle de classe occupe tout l'écran ; tableau, paniers, Réviz et pupitre ──
  if (manche.type === 'lance') {
    return (
      <>
        {transitionEl}
      <div className={`app app--no-halo jx-page ln-page${isDesktop ? ' jx-page--large' : ''}`}>
        <div className="ln-monde" aria-hidden="true" />
        {effets.some(e => e.type === 'bravo') && (
          <div className="mg-bravo ln-bravo" aria-hidden="true">
            {Array.from({ length: 18 }, (_, k) => <i key={k} style={{ '--k': k }} />)}
            <span>Bravo !</span>
          </div>
        )}
        <div className="ln-scene" ref={scene}>
          <div className="jx-ligne-haut ln-hud">
            {fermer}
            <div className="mg-chrono">
              {phase === 'jeu' && <span key={idx} className="mg-chrono-barre" style={{ '--duree': `${manche.duree}s`, '--attente': '0s' }} />}
            </div>
            <span className="jx-score" aria-live="polite">{score}</span>
            {boutonSon}
          </div>
          <JeuLance key={idx} manche={manche} numero={idx + 1} total={partie.length} enJeu={phase === 'jeu'} expire={expire === idx}
            onBon={onBon} onFaux={onFaux} onTermine={onTermine} onCommencer={() => setPhase('jeu')} reviz={reviz} pantin={pantin} scene={scene} />
          <div className="ln-reviz" style={{ '--taille': `${isDesktop ? 300 : tailleLance}px` }}>
            {bulle && phase === 'jeu' && <BulleReviz key={bulle.join()} lignes={bulle} className="mg-bulle ln-bulle" />}
            {gag && <span key={gag.id} className="jx-gag mg-gag">{gag.texte}</span>}
            {effets.map(e => e.type === 'panier' && e.n > 1 && <b key={e.id} className="mg-combo" aria-hidden="true">Combo ×{e.n}</b>)}
            <Pantin ref={pantin} size={isDesktop ? 300 : tailleLance} expression="content" repli={null} accessoire={['bandeau', 'boule']} />
            <img src="/jeux/lance/pupitre.webp" alt="" className="ln-pupitre" aria-hidden="true" />
          </div>
        </div>
      </div>
      </>
    );
  }

  const Jeu = MINI_JEUX[manche.type];
  const consigne = CONSIGNES[manche.type](manche);
  return page(
    <>
      <div className="jx-ligne-haut">
        {fermer}
        <div className="jx-tete">
          <span className="jx-tete-titre">{chapitre.titre}</span>
          <span className="jx-tete-compte">Jeu {idx + 1} sur {partie.length}</span>
        </div>
        <span className="jx-score" aria-live="polite">{score}</span>
      </div>
      <div className="jx-chrono" aria-hidden="true">
        {phase === 'jeu' && <span key={idx} className="jx-chrono-barre" style={{ '--duree': `${manche.duree}s` }} />}
      </div>
      <div className="jx-scene-haut">
        <p className="jx-consigne-ligne">{phase === 'jeu' && <><b>{consigne.titre}</b> {consigne.sous}</>}</p>
        <div className="jx-reviz">
          <Pantin ref={pantin} size={isDesktop ? 130 : 92} expression="content" repli="hello" accessoire={accessoire} />
          {gag && <span key={gag.id} className="jx-gag">{gag.texte}</span>}
        </div>
      </div>
      <div className="jx-aire">
        {phase === 'consigne' ? (
          <button type="button" key={`c${idx}`} className="jx-consigne" onClick={() => setPhase('jeu')}>
            <span className="jx-consigne-num">Jeu {idx + 1}</span>
            <span className="jx-consigne-titre">{consigne.titre}</span>
            <span className="jx-consigne-sous">{consigne.sous}</span>
            <span className="jx-consigne-temps">{manche.duree} secondes</span>
          </button>
        ) : (
          <Jeu key={idx} manche={manche} expire={expire === idx} onBon={onBon} onFaux={onFaux} onTermine={onTermine} />
        )}
      </div>
    </>,
  );
}
