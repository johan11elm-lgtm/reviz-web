import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { formatLevelLabel } from '../utils/levels';
import { Mascot } from '../components/Mascot';
import './Onboarding.css';

// Tagline adaptée au cycle scolaire — affichée sur le slide d'accueil.
function levelTagline(level) {
  if (level?.cycle === 'college') {
    const examNote = level.classe === '3ème' ? ' et au Brevet' : '';
    return `Réviz transforme tes leçons en outils de révision calibrés pour le programme du collège${examNote}.`;
  }
  if (level?.cycle === 'lycee') {
    const examNote = level.classe === 'Terminale'
      ? ' et préparés pour la méthode du Bac'
      : level.classe === '1ère'
        ? ' et préparés pour les épreuves anticipées'
        : '';
    return `Réviz transforme tes leçons en outils de révision calibrés pour le programme du lycée${examNote}.`;
  }
  if (level?.cycle === 'superieur') {
    return `Réviz transforme tes cours en outils de révision calibrés pour le niveau universitaire — vocabulaire académique, démonstrations rigoureuses, format type partiels.`;
  }
  return `Réviz transforme n'importe quelle leçon en outils de révision en quelques secondes.`;
}

const SLIDES = [
  {
    id: 'welcome',
    pose: 'hello',
    animate: true,
    bubble: (prenom) => `Salut ${prenom} ! Moi c'est Réviz, ton coach IA. On va apprendre plus vite, ensemble.`,
    titleFn: (prenom) => `Salut ${prenom} 👋`,
  },
  {
    id: 'how',
    pose: 'scan',
    bubble: () => 'Trois étapes seulement : tu scannes, je transforme, tu révises.',
    title: 'Comment ça marche ?',
  },
  {
    id: 'formats',
    pose: 'flashcard',
    bubble: () => 'Pour chaque leçon je te fabrique 4 outils. Pioche ceux qui te parlent.',
    title: '4 formats en 1 scan',
  },
  {
    id: 'go',
    pose: 'fire',
    animate: true,
    bubble: () => "Allez, on lance ta première session. 10 secondes et c'est parti.",
    title: 'Prêt à réviser ?',
    body: "Ta première leçon t'attend. Photo ou texte, comme tu veux.",
  },
];

const HOW_STEPS = [
  { icon: '📸', tone: 'orange', num: '1', label: 'Scanne',   sub: 'Photo ou texte de ta leçon' },
  { icon: '🤖', tone: 'violet', num: '2', label: 'J\'analyse', sub: "L'IA transforme en outils" },
  { icon: '🏆', tone: 'green',  num: '3', label: 'Tu révises', sub: 'Et tu retiens vraiment' },
];

const FORMATS = [
  { icon: '📝', tone: 'green',  label: 'Résumé' },
  { icon: '🃏', tone: 'violet', label: 'Flashcards' },
  { icon: '🧠', tone: 'pink',   label: 'Carte mentale' },
  { icon: '❓', tone: 'orange', label: 'Quiz' },
];

export default function Onboarding() {
  const [step, setStep] = useState(0);
  const [animDir, setAnimDir] = useState('in');
  const { currentUser, getUserLevel } = useAuth();
  const navigate = useNavigate();
  const prenom = currentUser?.displayName?.split(' ')[0] ?? 'toi';
  const userLevel = getUserLevel();
  const levelLabel = formatLevelLabel(userLevel);

  useEffect(() => {
    if (currentUser && localStorage.getItem(`reviz-onboarded-${currentUser.uid}`)) {
      navigate('/', { replace: true });
    }
  }, [currentUser, navigate]);

  function markOnboarded() {
    if (currentUser) localStorage.setItem(`reviz-onboarded-${currentUser.uid}`, '1');
  }

  function handleNext() {
    setAnimDir('out');
    setTimeout(() => {
      if (step < SLIDES.length - 1) {
        setStep(s => s + 1);
        setAnimDir('in');
      } else {
        markOnboarded();
        navigate('/scan');
      }
    }, 200);
  }

  function handleSkip() {
    markOnboarded();
    navigate('/', { replace: true });
  }

  function handleSeeHome() {
    markOnboarded();
    navigate('/');
  }

  const slide = SLIDES[step];
  const isLast = step === SLIDES.length - 1;

  return (
    <div className="app onboarding-page">
      {/* Skip top-right (sauf dernière slide) */}
      {!isLast && (
        <button
          type="button"
          className="onb-skip"
          onClick={handleSkip}
        >
          Passer
        </button>
      )}

      <main className={`onb-body onb-anim-${animDir}`} key={slide.id}>
        <Mascot
          pose={slide.pose}
          size={180}
          glow
          animate={slide.animate}
          priority={step === 0}
        />

        <div className="rv-speech-bubble rv-speech-bubble--pointer-top-center onb-bubble">
          {slide.bubble(prenom)}
        </div>

        <h1 className="onb-title">
          {slide.titleFn ? slide.titleFn(prenom) : slide.title}
        </h1>

        {slide.id === 'welcome' && (
          <>
            {levelLabel && (
              <span className="rv-pill rv-pill--orange onb-level-chip">
                ✦ {levelLabel}
              </span>
            )}
            <p className="onb-body-text">{levelTagline(userLevel)}</p>
          </>
        )}

        {slide.id === 'how' && (
          <ul className="onb-steps">
            {HOW_STEPS.map((s, i) => (
              <li
                key={s.num}
                className="onb-step"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <span className={`rv-icon-square rv-icon-square--xl rv-icon-square--${s.tone}`}>
                  {s.icon}
                </span>
                <div className="onb-step-text">
                  <span className="onb-step-label">
                    <span className="onb-step-num">{s.num}</span>
                    {s.label}
                  </span>
                  <span className="onb-step-sub">{s.sub}</span>
                </div>
              </li>
            ))}
          </ul>
        )}

        {slide.id === 'formats' && (
          <div className="onb-grid">
            {FORMATS.map((f, i) => (
              <div
                key={f.label}
                className="onb-grid-item"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <span className={`rv-icon-square rv-icon-square--xl rv-icon-square--${f.tone}`}>
                  {f.icon}
                </span>
                <span className="onb-grid-label">{f.label}</span>
              </div>
            ))}
          </div>
        )}

        {slide.id === 'go' && slide.body && (
          <p className="onb-body-text">{slide.body}</p>
        )}
      </main>

      <footer className="onb-footer">
        <div className="onb-dots" role="presentation">
          {SLIDES.map((_, i) => (
            <span
              key={i}
              className={`rv-dot${i <= step ? ' rv-dot--on' : ''}`}
            />
          ))}
        </div>

        <button
          type="button"
          className="rv-btn-cta rv-btn-cta--full onb-next"
          onClick={handleNext}
        >
          {isLast ? '📸 Scanner ma première leçon' : 'Suivant →'}
        </button>

        {isLast && (
          <button
            type="button"
            className="rv-btn-cta rv-btn-cta--ghost rv-btn-cta--full onb-secondary"
            onClick={handleSeeHome}
          >
            Voir l'accueil d'abord
          </button>
        )}
      </footer>
    </div>
  );
}
