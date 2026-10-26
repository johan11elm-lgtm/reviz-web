import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { hasProgramme } from '../utils/programme';
import { Mascot } from '../components/Mascot';
import { EntreeEcran, ChoixClasse, LienTexte } from '../components/entree/Entree';
import './Onboarding.entree.css';

// Découverte (handoff Claude Design du 22/10, écran 8) : une seule fois, avant
// l'accueil. Trois écrans : Réviz se présente, deux façons de réviser, on commence.
// La classe est déjà connue (inscription ou essai) ; si le profil n'en a aucune,
// on la demande sur le premier écran.
const ECRANS = {
  bonjour: { teinte: 'peche', expression: 'content', geste: 'coucou' },
  facons:  { teinte: 'lavande', expression: 'content' },
  go:      { teinte: 'menthe', expression: 'determine', geste: 'saut' },
};
const ORDRE = ['bonjour', 'facons', 'go'];
const court = c => c.replace('ème', 'e');

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

  useEffect(() => {
    if (currentUser && localStorage.getItem(`reviz-onboarded-${currentUser.uid}`)) {
      navigate('/', { replace: true });
    }
  }, [currentUser, navigate]);

  const etape = ORDRE[step];
  const ecran = ECRANS[etape];

  function suivant() {
    if (etape === 'bonjour' && demanderClasse) {
      if (!classe) { setErreurClasse('Choisis ta classe.'); return; }
      if (classe !== niveau?.classe) setUserLevel({ cycle: 'college', classe });
    }
    setStep(s => Math.min(s + 1, ORDRE.length - 1));
  }
  function finir(to) {
    if (currentUser) localStorage.setItem(`reviz-onboarded-${currentUser.uid}`, '1');
    // La présentation ne reste pas dans l'historique : « Mes leçons » ou un retour ne la rouvrent pas.
    navigate(to, { replace: true });
  }

  let bulle, carte;
  if (etape === 'bonjour') {
    bulle = [prenom ? `Salut ${prenom}, moi c'est Réviz.` : "Salut, moi c'est Réviz.", 'Je suis là pour tes révisions.'];
    carte = (
      <>
        <p className="en-texte onb-texte">
          Je transforme tes leçons en <b>résumés, flashcards, quiz et cartes mentales.</b> Et je te dis quoi réviser, et quand.
        </p>
        {demanderClasse && (
          <ChoixClasse valeur={classe} erreur={erreurClasse} onChange={c => { setClasse(c); setErreurClasse(''); }} />
        )}
        <button type="button" className="en-btn" onClick={suivant}>Suivant</button>
      </>
    );
  } else if (etape === 'facons') {
    bulle = ['Deux façons de réviser', 'Tu choisis, tu peux mélanger.'];
    carte = (
      <>
        <ul className="en-facons onb-facons">
          <li className="en-facon">
            <Mascot pose="reading" size={56} alt="" aria-hidden="true" />
            <div>
              <b>Ton programme</b>
              <span>
                {programmePret
                  ? `Les chapitres de ${court(classeProgramme)}, déjà prêts, dans l'ordre de l'année.`
                  : 'Les chapitres de 3e, déjà prêts. Ta classe arrive bientôt.'}
              </span>
            </div>
          </li>
          <li className="en-facon">
            <Mascot pose="scanphone" size={56} alt="" aria-hidden="true" />
            <div>
              <b>Scanner une leçon</b>
              <span>Une photo de ton cahier : les quatre formats en quelques secondes.</span>
            </div>
          </li>
        </ul>
        <button type="button" className="en-btn" onClick={suivant}>Suivant</button>
      </>
    );
  } else {
    bulle = ['On commence ?', 'Chaque révision compte pour ton niveau et ta série de jours.'];
    carte = programmePret ? (
      <>
        <button type="button" className="en-btn" onClick={() => finir('/programme')}>Ouvrir mon programme</button>
        <LienTexte onClick={() => finir('/scan')}>ou scanner une leçon</LienTexte>
      </>
    ) : (
      <>
        <button type="button" className="en-btn" onClick={() => finir('/scan')}>Scanner ma première leçon</button>
        <LienTexte onClick={() => finir('/programme')}>ou voir le programme de 3e</LienTexte>
      </>
    );
  }

  // Un seul EntreeEcran (donc un seul Pantin) pour les trois écrans : Réviz
  // change d'expression et joue le geste de l'écran, sans se recharger.
  return (
    <EntreeEcran
      teinte={ecran.teinte}
      bulle={bulle}
      expression={ecran.expression}
      geste={ecran.geste}
      taille="decouverte"
      etape={{ n: step + 1, total: ORDRE.length, libelle: false }}
      onRetour={step > 0 ? () => setStep(s => s - 1) : undefined}
      onPasser={step < ORDRE.length - 1 ? () => finir('/') : undefined}
    >
      {carte}
    </EntreeEcran>
  );
}
