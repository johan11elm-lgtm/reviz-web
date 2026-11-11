import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { hasProgramme } from '../utils/programme';
import { SEANCE_ACCUEIL } from '../utils/seanceAccueil';
import { MATIERES_CONTROLE, intituleControle, jourEnClair, joursEntre, jourIso } from '../utils/agenda';
import { planRevision } from '../utils/planRevision';
import { mesurer } from '../services/mesure';
import { nbsp } from '../utils/typography';
import { Mascot } from '../components/Mascot';
import { AjoutControle } from '../components/AjoutControle';
import { noterDemandeControle, noterControleNote } from '../utils/demandeControle';
import { arriveeRecente, oublierArrivee } from '../utils/arriveeFiche';
import { loadCatalogue, openChapter } from '../services/programmeService';
import { EntreeEcran, ChoixClasse, LienTexte } from '../components/entree/Entree';
import './Onboarding.entree.css';

// Découverte (handoff Claude Design du 22/10), refaite le 11/11 sur le modèle de l'onboarding
// « Knowie » de Knowunity (REA-KNOWUNITY-2026-11-11.md, section 9) : Réviz pose trois questions,
// une par écran, et répond à chaque choix dans son titre avant qu'on continue.
//   1. Bonjour (sans barre de progression : une conversation, pas un formulaire).
//   2. Le prochain contrôle : la matière ouvre la feuille d'ajout de l'agenda. Un contrôle noté
//      fait revenir l'élève trois fois plus le lendemain (42 % contre 13 %, relevé du 10/11).
//   3. Ce qui bloque le plus.  4. La note visée (facile, faisable, ambitieux).
//   5. « C'est prêt » : le récapitulatif, puis la séance d'accueil (3 exercices faciles, un par
//      matière, utils/seanceAccueil.js), qu'on garde : elle fait réviser dès le premier jour.
// Les réponses 3 et 4 restent sur l'appareil (reviz-entree-<uid>) et partent en mesure ; Réviz IA
// et le plan pourront s'en servir ensuite. La classe est déjà connue (inscription ou essai) ; si le
// profil n'en a aucune, on la demande sur le premier écran.
const ORDRE = ['bonjour', 'controle', 'blocage', 'objectif', 'pret'];
const QUESTIONS = ['controle', 'blocage', 'objectif'];

export const BLOCAGES = [
  { id: 'quoi', label: 'Savoir quoi réviser', reponse: ['Je te dis quoi faire chaque jour.', 'Une étape à la fois, jusqu’au contrôle.'] },
  { id: 'retenir', label: 'Retenir mes leçons', reponse: ['On mise sur les flashcards et les exercices.', 'C’est ce qui fait retenir, pas la relecture.'] },
  { id: 'comprendre', label: 'Comprendre le cours', reponse: ['Quand tu bloques, Réviz IA t’explique.', 'Pas à pas, sans faire à ta place.'] },
  { id: 'stress', label: 'Le stress des contrôles', reponse: ['On s’entraîne comme le jour J.', 'Le contrôle te semblera familier.'] },
  { id: 'motivation', label: 'M’y mettre', reponse: ['Des séances de 5 minutes.', 'Le plus dur, c’est de commencer : on commence petit.'] },
];

export const OBJECTIFS = [
  { id: 'moyenne', label: 'Avoir la moyenne', niveau: 'Facile', aide: 'Un premier cap, à ta portée.' },
  { id: 'progresser', label: 'Gagner 2 ou 3 points', niveau: 'Faisable', aide: 'Un vrai défi, et réaliste.' },
  { id: 'haut', label: 'Viser 16 et plus', niveau: 'Ambitieux', aide: 'On vise juste et on commence tôt.' },
];

const court = c => c.replace('ème', 'e');
const minuscule = t => t.charAt(0).toLowerCase() + t.slice(1);

/** « demain », « jeudi 13 novembre » : le jour du contrôle, dit simplement. */
function quand(date) {
  const n = joursEntre(jourIso(), date);
  return n <= 0 ? 'aujourd’hui' : n === 1 ? 'demain' : jourEnClair(date);
}

function garderReponses(uid, reponses) {
  if (!uid) return;
  try { localStorage.setItem(`reviz-entree-${uid}`, JSON.stringify(reponses)); } catch { /* stockage indisponible */ }
}

export default function Onboarding() {
  const [step, setStep] = useState(0);
  const { currentUser, getUserLevel, setUserLevel } = useAuth();
  const navigate = useNavigate();
  const prenom = currentUser?.displayName?.split(' ')[0];
  const niveau = getUserLevel();
  const lycee = niveau?.cycle === 'lycee';
  // Profil sans classe (rare) : la classe se choisit sur le premier écran.
  const demanderClasse = !lycee && !niveau?.classe;
  const [classe, setClasse] = useState(niveau?.cycle === 'college' ? niveau.classe : null);
  const [erreurClasse, setErreurClasse] = useState('');
  const programmePret = hasProgramme(lycee ? niveau : { cycle: 'college', classe: classe ?? '3ème' });
  const classeProgramme = lycee ? '3ème' : (classe ?? '3ème');

  // Réponses : contrôle noté (objet de l'agenda) ou 'aucun', blocage, objectif.
  const [controle, setControle] = useState(null);
  const [feuille, setFeuille] = useState(null); // null | { matiere }
  const [blocage, setBlocage] = useState(null);
  const [objectif, setObjectif] = useState(null);
  // Arrivé par une fiche publique (utils/arriveeFiche.js) : on lui propose de reprendre ce chapitre.
  const [arrivee, setArrivee] = useState(null); // { matiere, ch } une fois le chapitre trouvé
  const [ouvertureArrivee, setOuvertureArrivee] = useState(false);
  useEffect(() => {
    const a = lycee ? null : arriveeRecente(classeProgramme);
    if (!a) return undefined;
    let vivant = true;
    loadCatalogue(a.classe)
      .then(c => {
        const m = c.matieres.find(x => x.slug === a.matiere);
        const ch = m?.chapitres.find(x => x.id === a.chapitre && x.pret);
        if (vivant && ch) setArrivee({ matiere: m.matiere, ch });
      })
      .catch(() => { /* la séance d'accueil reste proposée */ });
    return () => { vivant = false; };
  }, [lycee, classeProgramme]);

  useEffect(() => {
    if (currentUser && localStorage.getItem(`reviz-onboarded-${currentUser.uid}`)) {
      navigate('/', { replace: true });
    }
  }, [currentUser, navigate]);

  const etape = ORDRE[step];
  const uid = currentUser?.uid;
  const noteControle = controle && controle !== 'aucun' ? controle : null;
  const choixBlocage = BLOCAGES.find(b => b.id === blocage);
  const choixObjectif = OBJECTIFS.find(o => o.id === objectif);

  function suivant() {
    if (etape === 'bonjour' && demanderClasse) {
      if (!classe) { setErreurClasse('Choisis ta classe.'); return; }
      if (classe !== niveau?.classe) setUserLevel({ cycle: 'college', classe });
    }
    setStep(s => Math.min(s + 1, ORDRE.length - 1));
  }
  function finir(to, raison) {
    if (uid) localStorage.setItem(`reviz-onboarded-${uid}`, '1');
    garderReponses(uid, { controle: noteControle?.id ?? (controle === 'aucun' ? 'aucun' : null), blocage, objectif });
    mesurer('entree_fin', { raison, etape, controle: noteControle ? 'note' : (controle ?? 'sans'), blocage, objectif });
    // La présentation ne reste pas dans l'historique : « Mes leçons » ou un retour ne la rouvrent pas.
    navigate(to, { replace: true });
  }
  // La séance d'accueil ne dépend d'aucun chapitre : rien à charger, pas d'échec possible.
  function lancerPremiere() {
    mesurer('premiere_revision', { etape: 'lancee', matiere: 'decouverte' });
    finir('/exercices?premiere=1', 'seance');
  }
  async function reprendreArrivee() {
    setOuvertureArrivee(true);
    mesurer('premiere_revision', { etape: 'lancee', matiere: arrivee.matiere, depuis: 'fiche' });
    try {
      await openChapter(classeProgramme, arrivee.matiere, arrivee.ch);
      oublierArrivee();
      finir('/exercices', 'fiche');
    } catch {
      setOuvertureArrivee(false);
      lancerPremiere();
    }
  }

  // ── Contrôle : la matière ouvre la feuille de l'agenda, déjà remplie ──
  function choisirMatiere(matiere) {
    mesurer('entree_reponse', { question: 'controle', reponse: 'matiere', matiere });
    setFeuille({ matiere });
  }
  function controleNote(agenda) {
    const c = agenda.controles.at(-1);
    mesurer('entree_reponse', { question: 'controle', reponse: 'note', matiere: c.matiere, jours: joursEntre(jourIso(), c.date) });
    setControle(c);
    setFeuille(null);
    noterControleNote(currentUser?.uid);
  }
  function pasDeControle() {
    mesurer('entree_reponse', { question: 'controle', reponse: 'aucun' });
    setControle('aucun');
    // Question déjà posée : la carte de fin de séance (ControleDemande) attend 3 jours.
    noterDemandeControle(currentUser?.uid);
    setStep(s => s + 1);
  }
  function choisir(question, id, set) {
    mesurer('entree_reponse', { question, reponse: id });
    set(id);
  }

  // Ce que dit Réviz : la question, puis sa réponse au choix de l'élève.
  let bulle, expression = 'content', carte;
  if (etape === 'bonjour') {
    bulle = [prenom ? `Salut ${prenom}, moi c'est Réviz.` : "Salut, moi c'est Réviz.", 'Trois petites questions d’abord. Rien de compliqué.'];
    carte = (
      <>
        <p className="en-texte onb-texte">
          Je prépare tes contrôles avec toi : <b>résumés, flashcards, exercices en jeu</b>, et chaque jour, ce qu’il faut réviser.
        </p>
        {demanderClasse && (
          <ChoixClasse valeur={classe} erreur={erreurClasse} onChange={c => { setClasse(c); setErreurClasse(''); }} />
        )}
        <button type="button" className="en-btn" onClick={suivant}>C’est parti</button>
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
        <button type="button" className="en-btn" onClick={suivant}>Continuer</button>
        <LienTexte onClick={() => setControle(null)}>Changer de contrôle</LienTexte>
      </>
    ) : (
      <>
        <div className="onb-matieres" role="group" aria-label="Matière du contrôle">
          {MATIERES_CONTROLE.filter(m => m.slug !== 'autre').map(m => (
            <button key={m.slug} type="button" className="onb-matiere" onClick={() => choisirMatiere(m.slug)}>
              <span className="onb-matiere-rond" aria-hidden="true"><Mascot pose={m.mascot} size={30} alt="" /></span>
              {m.label}
            </button>
          ))}
        </div>
        <div className="onb-liens">
          <LienTexte onClick={() => choisirMatiere('autre')}>Autre matière</LienTexte>
          <LienTexte onClick={pasDeControle}>Pas de contrôle prévu</LienTexte>
        </div>
      </>
    );
  } else if (etape === 'blocage') {
    if (choixBlocage) {
      bulle = choixBlocage.reponse;
    } else if (controle === 'aucun') {
      expression = 'reflechit';
      bulle = ['Pas de souci, tu le noteras plus tard.', 'Qu’est-ce qui te bloque le plus ?'];
    } else {
      expression = 'reflechit';
      bulle = ['Qu’est-ce qui te bloque le plus ?', 'Choisis-en un, je m’adapte.'];
    }
    carte = (
      <>
        <Choix nom="Ce qui te bloque le plus" options={BLOCAGES} valeur={blocage} onChange={id => choisir('blocage', id, setBlocage)} />
        <button type="button" className="en-btn" onClick={suivant} disabled={!blocage}>Continuer</button>
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
        <button type="button" className="en-btn" onClick={suivant} disabled={!objectif}>Continuer</button>
      </>
    );
  } else {
    expression = 'fier';
    bulle = [prenom ? `C’est prêt, ${prenom}.` : 'C’est prêt.', 'Voilà ton plan de départ.'];
    carte = (
      <>
        <ul className="onb-plan" aria-label="Ton plan de départ">
          <li>
            <span className="onb-plan-rond onb-plan-rond--lavande" aria-hidden="true"><Mascot pose="pointing" size={34} alt="" /></span>
            <div>
              <b>{noteControle ? `${intituleControle(noteControle)} ${quand(noteControle.date)}` : 'Pas encore de contrôle noté'}</b>
              <span>{noteControle ? `Plan de révision en ${planRevision(noteControle).length} étapes d’ici là.` : 'Note-le dans l’agenda dès que tu le connais : le plan se fait tout seul.'}</span>
            </div>
          </li>
          {choixBlocage && (
            <li>
              <span className="onb-plan-rond onb-plan-rond--peche" aria-hidden="true"><Mascot pose="thinking" size={34} alt="" /></span>
              <div><b>{choixBlocage.label}</b><span>{choixBlocage.reponse[0]}</span></div>
            </li>
          )}
          {choixObjectif && (
            <li>
              <span className="onb-plan-rond onb-plan-rond--menthe" aria-hidden="true"><Mascot pose="celebration" size={34} alt="" /></span>
              <div><b>{choixObjectif.label}</b><span>Objectif {choixObjectif.niveau.toLowerCase()}. On fait le point après chaque séance.</span></div>
            </li>
          )}
        </ul>
        {programmePret && arrivee ? (
          <>
            <p className="en-texte onb-texte">
              {nbsp('On reprend là où tu étais : ')}<b>{nbsp(arrivee.ch.titre)}</b>{nbsp(', en exercices.')}
            </p>
            <button type="button" className="en-btn" onClick={reprendreArrivee} disabled={ouvertureArrivee}>
              {ouvertureArrivee ? 'Un instant…' : 'Reprendre ce chapitre'}
            </button>
            <LienTexte onClick={lancerPremiere}>ou {SEANCE_ACCUEIL.length} questions faciles pour commencer</LienTexte>
          </>
        ) : programmePret ? (
          <>
            <p className="en-texte onb-texte">
              Pour commencer, <b>{SEANCE_ACCUEIL.length} questions faciles</b>, une minute. Pas besoin d’avoir révisé.
            </p>
            <button type="button" className="en-btn" onClick={lancerPremiere}>C’est parti</button>
            <LienTexte onClick={() => finir('/programme', 'programme')}>ou choisir un chapitre de {court(classeProgramme)}</LienTexte>
          </>
        ) : (
          <>
            <button type="button" className="en-btn" onClick={() => finir('/scan', 'scan')}>Scanner ma première leçon</button>
            <LienTexte onClick={() => finir('/programme', 'programme')}>ou voir le programme de 3e</LienTexte>
          </>
        )}
      </>
    );
  }

  // La barre n'apparaît qu'aux trois questions : le bonjour et « C'est prêt » restent une conversation.
  const q = QUESTIONS.indexOf(etape);
  return (
    <>
      <EntreeEcran
        bulle={bulle.map(nbsp)}
        expression={expression}
        taille="decouverte"
        etape={q >= 0 ? { n: q + 1, total: QUESTIONS.length, libelle: false } : undefined}
        onRetour={step > 0 ? () => setStep(s => s - 1) : undefined}
        onPasser={etape !== 'pret' ? () => finir('/', 'passer') : undefined}
      >
        <div className="onb-ecran" key={etape}>{carte}</div>
      </EntreeEcran>
      {feuille && <AjoutControle initial={feuille} onClose={() => setFeuille(null)} onSaved={controleNote} />}
    </>
  );
}

/** Une question, une réponse : de grandes cases, comme une conversation. */
function Choix({ nom, options, valeur, onChange, etiquette = false }) {
  return (
    <div className="onb-choix" role="radiogroup" aria-label={nom}>
      {options.map(o => (
        <button key={o.id} type="button" role="radio" aria-checked={valeur === o.id}
          className={`onb-option${valeur === o.id ? ' is-choisie' : ''}`} onClick={() => onChange(o.id)}>
          <span className="onb-option-texte">{o.label}</span>
          {etiquette && <span className={`onb-option-niveau onb-option-niveau--${o.id}`}>{o.niveau}</span>}
        </button>
      ))}
    </div>
  );
}
