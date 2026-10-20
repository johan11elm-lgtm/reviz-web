import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { hasProgramme } from '../utils/programme';
import { Mascot } from '../components/Mascot';
import { Pantin } from '../components/Pantin';
import { useIsDesktop } from '../hooks/useMediaQuery';
import './Onboarding.css';

// Refonte du 20/10 (« Reviz Valide ») : aplat pastel en haut (à gauche sur
// ordinateur) avec Réviz animé, quatre étapes courtes.
const ETAPES = ['bonjour', 'classe', 'facons', 'go'];

const CLASSES = [
  { classe: '6ème', court: '6e', sous: 'Les bases' },
  { classe: '5ème', court: '5e', sous: 'Physique, SVT' },
  { classe: '4ème', court: '4e', sous: 'Tout accélère' },
  { classe: '3ème', court: '3e', sous: 'Le brevet' },
];

// Réviz change d'attitude d'une étape à l'autre.
const JEU = {
  bonjour: { expression: 'content', geste: 'coucou', fond: '#FFC9A8', bulle: '#FFDAC4' },
  classe:  { expression: 'reflechit', fond: '#FFC9A8', bulle: '#FFDAC4' },
  facons:  { expression: 'content', fond: '#C9C2F2', bulle: '#D8D2F7' },
  go:      { expression: 'fier', geste: 'saut', fond: '#B9E8C9', bulle: '#D3F1DD' },
};

export default function Onboarding() {
  const [step, setStep] = useState(0);
  const { currentUser, getUserLevel, setUserLevel } = useAuth();
  const navigate = useNavigate();
  const isDesktop = useIsDesktop();
  const prenom = currentUser?.displayName?.split(' ')[0];
  const niveau = getUserLevel();
  const [classe, setClasse] = useState(niveau?.cycle === 'college' ? niveau.classe : null);
  const lycee = niveau?.cycle === 'lycee';
  const programmePret = hasProgramme(lycee ? niveau : { cycle: 'college', classe: classe ?? '3ème' });
  const classeProgramme = lycee ? '3ème' : (classe ?? '3ème');

  useEffect(() => {
    if (currentUser && localStorage.getItem(`reviz-onboarded-${currentUser.uid}`)) {
      navigate('/', { replace: true });
    }
  }, [currentUser, navigate]);

  // Le lycée n'a pas encore de programme : on saute le choix de la classe.
  const etapes = lycee ? ETAPES.filter(e => e !== 'classe') : ETAPES;
  const etape = etapes[step];
  const jeu = JEU[etape];
  const dernier = step === etapes.length - 1;
  const bloque = etape === 'classe' && !classe;

  function suivant() {
    if (etape === 'classe' && classe && classe !== niveau?.classe) setUserLevel({ cycle: 'college', classe });
    setStep(s => Math.min(s + 1, etapes.length - 1));
  }
  function finir(to) {
    if (currentUser) localStorage.setItem(`reviz-onboarded-${currentUser.uid}`, '1');
    navigate(to, { replace: to === '/' });
  }

  const points = (
    <ol className="onb-points" aria-label={`Étape ${step + 1} sur ${etapes.length}`}>
      {etapes.map((id, i) => (
        <li key={id} className={`onb-point${i === step ? ' onb-point--actif' : i < step ? ' onb-point--fait' : ''}`} aria-current={i === step ? 'step' : undefined} />
      ))}
    </ol>
  );

  const retour = step > 0 && (
    <button type="button" className="onb-retour" onClick={() => setStep(s => s - 1)} aria-label="Étape précédente">
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
    </button>
  );

  let titre, sous, corps = null;
  if (etape === 'bonjour') {
    titre = prenom ? `Salut ${prenom}, moi c'est Réviz.` : "Salut, moi c'est Réviz.";
    sous = "Je transforme tes leçons en résumés, flashcards, quiz et cartes mentales. Et je te dis quoi réviser, et quand.";
  } else if (etape === 'classe') {
    titre = 'Tu es en quelle classe ?';
    sous = isDesktop
      ? "Je prépare ton programme, chapitre par chapitre, d'après le programme officiel."
      : 'Je prépare ton programme, chapitre par chapitre.';
    corps = (
      <div className="onb-classes" role="radiogroup" aria-label="Ta classe">
        {CLASSES.map(c => {
          const on = classe === c.classe;
          return (
            <button
              key={c.classe}
              type="button"
              role="radio"
              aria-checked={on}
              className={`onb-classe${on ? ' onb-classe--on' : ''}`}
              onClick={() => setClasse(c.classe)}
            >
              <span className="onb-classe-nom">{c.court}</span>
              <span className="onb-classe-sous">{c.sous}</span>
              {on && <span className="onb-classe-ok" aria-hidden="true">✓</span>}
            </button>
          );
        })}
      </div>
    );
  } else if (etape === 'facons') {
    titre = 'Deux façons de réviser';
    sous = 'Sans rien scanner, ou à partir de ta propre leçon.';
    corps = (
      <ul className="onb-facons">
        <li className="onb-facon">
          <span className="onb-facon-rond" style={{ background: '#FFE6D2' }}><Mascot pose="reading" size={52} alt="" aria-hidden="true" /></span>
          <span className="onb-facon-txt">
            <span className="onb-facon-titre">Ton programme</span>
            <span className="onb-facon-sous">
              {programmePret ? `Les chapitres de ${classeProgramme}, déjà prêts, dans l'ordre de l'année.` : 'Les chapitres de 3ème, déjà prêts. Ta classe arrive bientôt.'}
            </span>
          </span>
        </li>
        <li className="onb-facon">
          <span className="onb-facon-rond" style={{ background: '#E4E0FA' }}><Mascot pose="scanphone" size={52} alt="" aria-hidden="true" /></span>
          <span className="onb-facon-txt">
            <span className="onb-facon-titre">Scanner une leçon</span>
            <span className="onb-facon-sous">Une photo de ton cahier : les quatre supports en quelques secondes.</span>
          </span>
        </li>
      </ul>
    );
  } else {
    titre = 'On commence ?';
    sous = 'Chaque révision compte pour ton niveau et ta série de jours.';
  }

  const boutons = !dernier ? (
    <button type="button" className="onb-cta" onClick={suivant} disabled={bloque}>Continuer</button>
  ) : programmePret ? (
    <>
      <button type="button" className="onb-cta" onClick={() => finir('/programme')}>Ouvrir mon programme</button>
      <button type="button" className="onb-lien" onClick={() => finir('/scan')}>ou scanner une leçon</button>
    </>
  ) : (
    <>
      <button type="button" className="onb-cta" onClick={() => finir('/scan')}>Scanner ma première leçon</button>
      <button type="button" className="onb-lien" onClick={() => finir('/programme')}>ou voir le programme de 3ème</button>
    </>
  );
  const note = etape === 'classe'
    ? 'Lycée : bientôt. Le scan marche déjà pour tous les cours.'
    : isDesktop ? `Étape ${step + 1} sur ${etapes.length}` : null;

  const scene = (
    <div className="onb-scene" style={{ background: jeu.fond }}>
      <span className="onb-bulle onb-bulle--a" style={{ background: jeu.bulle }} aria-hidden="true" />
      <span className="onb-bulle onb-bulle--b" style={{ background: jeu.bulle }} aria-hidden="true" />
      <span className="onb-pastille" aria-hidden="true" />
      <span className="onb-grain" aria-hidden="true" />
      {isDesktop ? (
        <span className="onb-marque">réviz</span>
      ) : (
        <div className="onb-haut">
          {retour || <span className="onb-retour-vide" />}
          {points}
          {!dernier ? <button type="button" className="onb-passer" onClick={() => finir('/')}>Passer</button> : <span className="onb-retour-vide" />}
        </div>
      )}
      <PantinEtape etape={etape} jeu={jeu} size={isDesktop ? 500 : 280} />
      {isDesktop && <p className="onb-salut">Salut, moi c'est Réviz.</p>}
    </div>
  );

  return (
    <div className={`app app--no-halo onboarding-page${isDesktop ? ' onb-desk' : ''}`}>
      {scene}
      <main className="onb-panneau">
        <div className="onb-contenu" key={etape}>
          {isDesktop && (
            <div className="onb-haut-desk">
              {retour}
              {points}
              {!dernier && <button type="button" className="onb-passer" onClick={() => finir('/')}>Passer</button>}
            </div>
          )}
          <div className="onb-titres">
            <h1 className="onb-titre">{titre}</h1>
            <p className="onb-sous">{sous}</p>
          </div>
          {corps}
          {isDesktop && (
            <div className="onb-actions">
              {boutons}
              {note && <span className="onb-note">{note}</span>}
            </div>
          )}
        </div>
        {!isDesktop && (
          <div className="onb-pied">
            {boutons}
            {note && <span className="onb-note">{note}</span>}
          </div>
        )}
      </main>
    </div>
  );
}

// Un seul pantin pour toutes les étapes : il change d'expression et joue
// le geste de l'étape à son arrivée (pas de rechargement entre étapes).
function PantinEtape({ etape, jeu, size }) {
  const [pantin, setPantin] = useState(null);
  useEffect(() => {
    if (pantin && jeu.geste) pantin.geste(jeu.geste);
  }, [etape, pantin]);
  return (
    <div className="onb-pantin">
      <Pantin ref={setPantin} size={size} expression={jeu.expression} entree="coucou" repli="hello" />
    </div>
  );
}
