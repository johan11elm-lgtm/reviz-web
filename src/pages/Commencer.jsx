import { useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mascot } from '../components/Mascot';
import { AjoutControle } from '../components/AjoutControle';
import { EntreeEcran, Champ, ChoixClasse, LienTexte } from '../components/entree/Entree';
import { BLOCAGES, OBJECTIFS, Choix, PlanDepart, quand, minuscule } from '../components/entree/Decouverte';
import { CLASSES_BY_CYCLE } from '../utils/levels';
import { MATIERES_CONTROLE, intituleControle, jourEnClair } from '../utils/agenda';
import { planRevision } from '../utils/planRevision';
import { lireEntree, garderEntree } from '../utils/entreeAttente';
import { noterArrivee } from '../utils/arriveeFiche';
import { readGuest } from '../services/guestService';
import { loadCatalogue } from '../services/programmeService';
import { mesurer } from '../services/mesure';
import { nbsp } from '../utils/typography';
import { revenir } from '../utils/navigation';
import './Onboarding.entree.css';

// Entrée de Réviz (11/11) : plus d'essai sans compte. Comme dans l'app Knowunity, Réviz pose ses
// questions d'abord, une par écran, et répond à chaque choix ; le compte vient à la fin, « pour
// garder ton plan ». Les réponses attendent sur l'appareil (utils/entreeAttente.js) ; la découverte
// (pages/Onboarding.jsx) les range sur le compte et lance la séance d'accueil.
// Venu d'une fiche (`?classe=3ème&matiere=maths&chapitre=…`) : la classe est connue, et le chapitre
// est repris juste après l'inscription (utils/arriveeFiche.js).
const ORDRE = ['bonjour', 'prenom', 'classe', 'controle', 'blocage', 'objectif', 'chargement', 'pret'];
// La barre n'apparaît qu'aux questions : le bonjour, le prénom et la fin restent une conversation.
const QUESTIONS = ['classe', 'controle', 'blocage', 'objectif'];

const REACTION_CLASSE = {
  '6ème': ['La 6e, nouveau collège.', 'On prend les bonnes habitudes dès le début.'],
  '5ème': ['La 5e, c’est noté.', 'Je connais tout ton programme.'],
  '4ème': ['La 4e, c’est noté.', 'On s’y met avant que ça s’accélère.'],
  '3ème': ['La 3e, l’année du brevet.', 'On le prépare ensemble, pas à pas.'],
};

// Le chargement : ce que fait vraiment Réviz avec les réponses, une ligne après l'autre.
const LIGNES_CHARGEMENT = 4;
const PAS_CHARGEMENT_MS = 650;

export default function Commencer() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { currentUser, isGuest } = useAuth();
  const calme = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  // Venu d'une fiche ou d'une page du site : la classe (et le chapitre) sont dans l'adresse.
  const classeLien = CLASSES_BY_CYCLE.college.includes(params.get('classe')) ? params.get('classe') : null;
  const matiereLien = /^[a-z0-9-]{1,40}$/.test(params.get('matiere') ?? '') ? params.get('matiere') : null;
  const chapitreLien = classeLien && matiereLien && /^[a-z0-9-]{1,80}$/.test(params.get('chapitre') ?? '') ? params.get('chapitre') : null;
  const via = /^[a-z0-9_-]{1,30}$/i.test(params.get('via') ?? '') ? params.get('via') : null;

  // Les réponses déjà données sur cet appareil (retour arrière, page rouverte) sont reprises.
  const [depart] = useState(() => lireEntree());
  // Plan déjà prêt (retour depuis l'inscription) : on rouvre « C'est prêt ».
  const [step, setStep] = useState(() => (depart?.fini ? ORDRE.filter(e => !(e === 'classe' && classeLien)).indexOf('pret') : 0));
  const [prenom, setPrenom] = useState(depart?.prenom ?? '');
  const [erreurPrenom, setErreurPrenom] = useState('');
  const [classe, setClasse] = useState(classeLien ?? depart?.classe ?? null);
  const [classeChoisie, setClasseChoisie] = useState(false);
  const [controle, setControle] = useState(depart?.controle ?? null); // objet, 'aucun' ou null
  const [feuille, setFeuille] = useState(null);
  const [blocage, setBlocage] = useState(depart?.blocage ?? null);
  const [objectif, setObjectif] = useState(depart?.objectif ?? null);
  const [lignes, setLignes] = useState(0);
  const [chapitreArrivee, setChapitreArrivee] = useState(null);
  const vu = useRef(new Set());

  const etapes = ORDRE.filter(e => !(e === 'classe' && classeLien));
  const etape = etapes[step];

  useEffect(() => {
    if (chapitreLien) noterArrivee({ classe: classeLien, matiere: matiereLien, chapitre: chapitreLien });
  }, [chapitreLien, classeLien, matiereLien]);
  // Le titre du chapitre de la fiche, pour le dire sur « C'est prêt ».
  useEffect(() => {
    if (!chapitreLien) return undefined;
    let vivant = true;
    loadCatalogue(classeLien)
      .then(c => {
        const ch = c.matieres.find(m => m.slug === matiereLien)?.chapitres.find(x => x.id === chapitreLien && x.pret);
        if (vivant && ch) setChapitreArrivee(ch.titre);
      })
      .catch(() => {});
    return () => { vivant = false; };
  }, [chapitreLien, classeLien, matiereLien]);

  // Chaque écran vu une fois, pour savoir où l'on perd les élèves.
  useEffect(() => {
    if (!etape || vu.current.has(etape)) return;
    vu.current.add(etape);
    mesurer('entree_vue', { etape, via, fiche: !!chapitreLien });
  }, [etape, via, chapitreLien]);

  // Le chargement se déroule ligne à ligne, puis « C'est prêt ».
  useEffect(() => {
    if (etape !== 'chargement') return undefined;
    if (calme) { setStep(s => s + 1); return undefined; }
    setLignes(0);
    let n = 0;
    const t = setInterval(() => {
      n += 1;
      setLignes(n);
      if (n > LIGNES_CHARGEMENT) { clearInterval(t); setStep(s => s + 1); }
    }, PAS_CHARGEMENT_MS);
    return () => clearInterval(t);
  }, [etape, calme]);

  // Arrivé à la fin : le plan est prêt, il attend le compte.
  useEffect(() => {
    // La classe venue du lien d'une fiche n'a pas d'écran : gardée ici aussi.
    if (etape === 'pret') garderEntree({ fini: true, ...(classe ? { classe } : {}) });
  }, [etape, classe]);

  // Déjà un compte sur cet appareil : l'accueil. Un essai d'avant le 11/11 : il le reprend.
  if (currentUser && !isGuest) return <Navigate to="/" replace />;
  if (readGuest()) return <Navigate to="/" replace />;

  const p = prenom.trim();
  const noteControle = controle && controle !== 'aucun' ? controle : null;
  const choixBlocage = BLOCAGES.find(b => b.id === blocage);
  const choixObjectif = OBJECTIFS.find(o => o.id === objectif);
  const court = c => c.replace('ème', 'e');

  function avancer() { setStep(s => Math.min(s + 1, etapes.length - 1)); }
  function reculer() {
    if (step === 0) revenir(navigate, '/welcome');
    else setStep(s => Math.max(0, s - (etapes[s - 1] === 'chargement' ? 2 : 1)));
  }
  function repondre(question, reponse, extra = {}) {
    mesurer('entree_reponse', { question, reponse, avant_compte: true, ...extra });
  }

  function validerPrenom(e) {
    e.preventDefault();
    if (!p) { setErreurPrenom('Entre ton prénom.'); return; }
    garderEntree({ prenom: p, ...(classeLien ? { classe: classeLien } : {}) });
    avancer();
  }
  function choisirClasse(c) {
    setClasse(c);
    setClasseChoisie(true);
    garderEntree({ classe: c });
    repondre('classe', c);
  }
  function controleChoisi(c) {
    setControle(c);
    setFeuille(null);
    garderEntree({ controle: c });
    repondre('controle', 'note', { matiere: c.matiere });
  }
  function pasDeControle() {
    setControle('aucun');
    garderEntree({ controle: 'aucun' });
    repondre('controle', 'aucun');
    avancer();
  }
  function choisir(question, id, set) {
    set(id);
    garderEntree({ [question]: id });
    repondre(question, id);
  }
  function creerCompte() {
    mesurer('entree_compte', { etape: 'clic', controle: noteControle ? 'note' : (controle ?? 'sans') });
    navigate('/inscription');
  }

  let bulle, expression = 'content', carte;
  if (etape === 'bonjour') {
    bulle = ['Salut, moi c’est Réviz.', 'Quelques petites questions d’abord. Rien de compliqué.'];
    carte = (
      <>
        <p className="en-texte onb-texte">
          Je prépare tes contrôles avec toi : <b>résumés, flashcards, exercices en jeu</b>, et chaque jour, ce qu’il faut réviser.
        </p>
        <button type="button" className="en-btn" onClick={avancer}>C’est parti</button>
      </>
    );
  } else if (etape === 'prenom') {
    // Réviz répond pendant la frappe.
    bulle = p ? [`Enchanté, ${p} !`, 'On continue ?'] : ['Comment je t’appelle ?', 'Ton prénom suffit.'];
    expression = p ? 'fier' : 'content';
    carte = (
      <form className="en-pile" onSubmit={validerPrenom} noValidate>
        <Champ id="commencer-prenom" label="Ton prénom" type="text" placeholder="Lucas" value={prenom}
          erreur={erreurPrenom} maxLength={30} autoComplete="given-name" enterKeyHint="next" autoFocus
          onChange={e => { setPrenom(e.target.value); setErreurPrenom(''); }} />
        <button type="submit" className="en-btn">Continuer</button>
      </form>
    );
  } else if (etape === 'classe') {
    if (classe && classeChoisie) {
      bulle = REACTION_CLASSE[classe];
      expression = 'fier';
    } else {
      bulle = ['Tu es en quelle classe ?', 'Ton programme suit ta classe.'];
      expression = 'reflechit';
    }
    carte = (
      <>
        <ChoixClasse valeur={classe} onChange={choisirClasse} />
        <button type="button" className="en-btn" onClick={avancer} disabled={!classe}>Continuer</button>
      </>
    );
  } else if (etape === 'controle') {
    if (noteControle) {
      expression = 'fier';
      bulle = [`Noté : ${minuscule(intituleControle(noteControle))} ${quand(noteControle.date)}.`, 'Je te prépare le plan jusqu’au jour J.'];
    } else {
      expression = 'reflechit';
      bulle = ['Ton prochain contrôle, c’est en quoi ?', 'Je te prépare un plan jusqu’au jour J.'];
    }
    carte = noteControle ? (
      <>
        <div className="onb-controle">
          <b>{intituleControle(noteControle)}</b>
          <span>{jourEnClair(noteControle.date)} · plan de révision en {planRevision(noteControle).length} étapes</span>
        </div>
        <button type="button" className="en-btn" onClick={avancer}>Continuer</button>
        <LienTexte onClick={() => setControle(null)}>Changer de contrôle</LienTexte>
      </>
    ) : (
      <>
        <div className="onb-matieres" role="group" aria-label="Matière du contrôle">
          {MATIERES_CONTROLE.filter(m => m.slug !== 'autre').map(m => (
            <button key={m.slug} type="button" className="onb-matiere" onClick={() => setFeuille({ matiere: m.slug })}>
              <span className="onb-matiere-rond" aria-hidden="true"><Mascot pose={m.mascot} size={30} alt="" /></span>
              {m.label}
            </button>
          ))}
        </div>
        <div className="onb-liens">
          <LienTexte onClick={() => setFeuille({ matiere: 'autre' })}>Autre matière</LienTexte>
          <LienTexte onClick={pasDeControle}>Pas de contrôle prévu</LienTexte>
        </div>
      </>
    );
  } else if (etape === 'blocage') {
    if (choixBlocage) {
      bulle = choixBlocage.reponse;
    } else {
      expression = 'reflechit';
      bulle = controle === 'aucun'
        ? ['Pas de souci, tu le noteras plus tard.', 'Qu’est-ce qui te bloque le plus ?']
        : ['Qu’est-ce qui te bloque le plus ?', 'Choisis-en un, je m’adapte.'];
    }
    carte = (
      <>
        <Choix nom="Ce qui te bloque le plus" options={BLOCAGES} valeur={blocage} onChange={id => choisir('blocage', id, setBlocage)} />
        <button type="button" className="en-btn" onClick={avancer} disabled={!blocage}>Continuer</button>
      </>
    );
  } else if (etape === 'objectif') {
    const matiere = noteControle && noteControle.matiere !== 'autre' ? MATIERES_CONTROLE.find(m => m.slug === noteControle.matiere) : null;
    if (choixObjectif) {
      expression = choixObjectif.id === 'haut' ? 'determine' : 'fier';
      bulle = [`Objectif ${choixObjectif.niveau.toLowerCase()}.`, choixObjectif.aide];
    } else {
      expression = 'reflechit';
      bulle = [`Tu vises quelle note${matiere ? ` en ${matiere.label === matiere.label.toUpperCase() ? matiere.label : matiere.label.toLowerCase()}` : ''} ?`, 'Sois honnête : je règle le plan dessus.'];
    }
    carte = (
      <>
        <Choix nom="Ta note visée" options={OBJECTIFS} valeur={objectif} onChange={id => choisir('objectif', id, setObjectif)} etiquette />
        <button type="button" className="en-btn" onClick={avancer} disabled={!objectif}>Continuer</button>
      </>
    );
  } else if (etape === 'chargement') {
    expression = 'reflechit';
    bulle = [p ? `Je prépare ton plan, ${p}.` : 'Je prépare ton plan.', 'Quelques secondes.'];
    const textes = [
      'Je lis tes réponses',
      `J’ouvre le programme de ${court(classe ?? '3ème')}`,
      noteControle ? `Je cale le plan sur ton ${minuscule(intituleControle(noteControle))}` : 'Je prépare tes premières questions',
      choixObjectif ? `Je règle les séances sur ton objectif : ${choixObjectif.label.toLowerCase()}` : 'Je règle tes séances',
    ];
    carte = (
      <ul className="cmc-chargement" aria-live="polite">
        {textes.map((t, i) => (
          <li key={t} className={i < lignes ? 'is-fait' : i === lignes ? 'is-en-cours' : ''}>
            <span className="cmc-coche" aria-hidden="true" />{nbsp(t)}
          </li>
        ))}
      </ul>
    );
  } else {
    expression = 'fier';
    bulle = [p ? `C’est prêt, ${p}.` : 'C’est prêt.', 'Voilà ton plan de départ.'];
    carte = (
      <>
        <PlanDepart controle={noteControle} blocage={blocage} objectif={objectif} />
        <p className="en-texte onb-texte">
          {chapitreArrivee
            ? <>{nbsp('Crée ton compte pour le garder. Juste après, on reprend ')}<b>{nbsp(chapitreArrivee)}</b>.</>
            : <>{nbsp('Crée ton compte pour le garder. Juste après, ')}<b>3 questions faciles</b>{nbsp(' pour commencer.')}</>}
        </p>
        <button type="button" className="en-btn" onClick={creerCompte}>Créer mon compte</button>
      </>
    );
  }

  const q = QUESTIONS.indexOf(etape);
  const questions = QUESTIONS.filter(e => etapes.includes(e));
  return (
    <>
      <EntreeEcran
        bulle={bulle.map(nbsp)}
        expression={expression}
        geste={etape === 'bonjour' ? 'coucou' : undefined}
        taille="decouverte"
        etape={q >= 0 ? { n: questions.indexOf(etape) + 1, total: questions.length, libelle: false } : undefined}
        onRetour={etape === 'chargement' ? undefined : reculer}
        dessous={etape === 'bonjour' || etape === 'pret' ? <LienTexte avant="Déjà un compte ?" to="/connexion">Se connecter</LienTexte> : undefined}
      >
        <div className="onb-ecran" key={etape}>{carte}</div>
      </EntreeEcran>
      {feuille && (
        <AjoutControle initial={feuille} onClose={() => setFeuille(null)}
          sansCompte={{ classe: classe ?? '3ème', onChoisi: controleChoisi }} />
      )}
    </>
  );
}
