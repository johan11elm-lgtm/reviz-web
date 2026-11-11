import { useState, useEffect, useRef } from 'react';
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
import { BLOCAGES, OBJECTIFS, Choix, PlanDepart, quand, minuscule } from '../components/entree/Decouverte';
import { lireEntree, oublierEntree } from '../utils/entreeAttente';
import { ajouterControle } from '../services/agendaService';
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

export { BLOCAGES, OBJECTIFS };

const court = c => c.replace('ème', 'e');
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

  // Déjà faite : l'accueil. Mais pas une fois partie d'ici (séance d'accueil, chapitre) : pendant que
  // la page suivante se charge, la découverte reste affichée, et un compte qui se met à jour (accord
  // parental d'un moins de 15 ans) la renverrait à l'accueil par-dessus la séance.
  const partie = useRef(false);
  useEffect(() => {
    if (partie.current) return;
    if (currentUser && localStorage.getItem(`reviz-onboarded-${currentUser.uid}`)) {
      navigate('/', { replace: true });
    }
  }, [currentUser, navigate]);

  // Réponses données avant le compte (pages/Commencer.jsx, 11/11) : on les range sur le compte
  // (agenda, réponses) et on lance la séance d'accueil, ou le chapitre de la fiche d'arrivée,
  // sans reposer les questions.
  const [attente] = useState(() => {
    const e = currentUser ? lireEntree() : null;
    return e?.fini && !localStorage.getItem(`reviz-onboarded-${currentUser.uid}`) ? e : null;
  });
  const rangement = useRef(false);
  useEffect(() => {
    if (!attente || !currentUser || rangement.current) return;
    rangement.current = true;
    partie.current = true;
    const u = currentUser.uid;
    (async () => {
      const c = attente.controle && attente.controle !== 'aucun' ? attente.controle : null;
      if (c) {
        try { await ajouterControle(currentUser, c); noterControleNote(u); } catch { /* il le notera dans l'agenda */ }
      } else if (attente.controle === 'aucun') noterDemandeControle(u);
      if (attente.classe && !lycee && attente.classe !== niveau?.classe) setUserLevel({ cycle: 'college', classe: attente.classe });
      localStorage.setItem(`reviz-onboarded-${u}`, '1');
      garderReponses(u, { controle: c ? 'note' : attente.controle, blocage: attente.blocage, objectif: attente.objectif });
      mesurer('entree_fin', { raison: 'avant_compte', controle: c ? 'note' : (attente.controle ?? 'sans'), blocage: attente.blocage, objectif: attente.objectif });
      oublierEntree();
      // Venu d'une fiche : son chapitre ; sinon la séance d'accueil (3 exercices faciles).
      const classeA = attente.classe ?? niveau?.classe;
      const a = classeA ? arriveeRecente(classeA) : null;
      if (a) {
        try {
          const cat = await loadCatalogue(a.classe);
          const m = cat.matieres.find(x => x.slug === a.matiere);
          const ch = m?.chapitres.find(x => x.id === a.chapitre && x.pret);
          if (ch) {
            mesurer('premiere_revision', { etape: 'lancee', matiere: m.matiere, depuis: 'fiche' });
            await openChapter(a.classe, m.matiere, ch);
            oublierArrivee();
            navigate('/exercices', { replace: true });
            return;
          }
        } catch { /* la séance d'accueil, à la place */ }
      }
      mesurer('premiere_revision', { etape: 'lancee', matiere: 'decouverte' });
      navigate('/exercices?premiere=1', { replace: true });
    })();
    // Une seule fois, à l'arrivée du compte.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attente, currentUser]);

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
    partie.current = true;
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
        <PlanDepart controle={noteControle} blocage={blocage} objectif={objectif} />
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

  if (attente) {
    return (
      <EntreeEcran bulle={[prenom ? `Bienvenue, ${prenom}.` : 'Bienvenue.', 'Je range ton plan, un instant.']} expression="fier" taille="decouverte">
        <p className="en-texte onb-texte" role="status">Ton plan est enregistré sur ton compte.</p>
      </EntreeEcran>
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
