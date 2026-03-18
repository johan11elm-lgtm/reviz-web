import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Onboarding.css';

const LogoStar = () => (
  <svg className="ob-star" viewBox="0 0 16 16" fill="none">
    <path
      d="M8 0 C8.3 2.8 8.8 4.2 10.2 5.6 11.6 7 13 7.5 16 8 13 8.5 11.6 9 10.2 10.4 8.8 11.8 8.3 13.2 8 16 7.7 13.2 7.2 11.8 5.8 10.4 4.4 9 3 8.5 0 8 3 7.5 4.4 7 5.8 5.6 7.2 4.2 7.7 2.8 8 0Z"
      fill="url(#obGrad)"
    />
    <defs>
      <linearGradient id="obGrad" x1="0" y1="0" x2="16" y2="16" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FFB347" />
        <stop offset="100%" stopColor="#FF6B00" />
      </linearGradient>
    </defs>
  </svg>
);

const SLIDES = [
  {
    id: 'welcome',
    titleFn: prenom => `Salut ${prenom} 👋`,
    body: 'Fini de relire tes cours pendant des heures. Réviz transforme n\'importe quelle leçon en outils de révision en quelques secondes.',
    visual: 'logo',
  },
  {
    id: 'how',
    title: 'Comment ça marche ?',
    body: null,
    visual: 'steps',
    steps: [
      { icon: '📸', label: 'Scanne',        desc: 'Photo ou texte de ta leçon' },
      { icon: '🤖', label: 'L\'IA analyse', desc: 'Contenu de révision généré en secondes' },
      { icon: '🏆', label: 'Révise',        desc: 'Flashcards, quiz, résumé, carte mentale' },
    ],
  },
  {
    id: 'formats',
    title: '4 formats en 1 scan',
    body: null,
    visual: 'grid',
    items: [
      { icon: '📝', label: 'Résumé',        color: '#22C55E' },
      { icon: '🃏', label: 'Flashcards',    color: '#6366F1' },
      { icon: '🧠', label: 'Carte mentale', color: '#A855F7' },
      { icon: '❓', label: 'Quiz',           color: '#FF6B00' },
    ],
  },
  {
    id: 'go',
    title: 'Prêt à réviser autrement ?',
    body: 'Scanne ta première leçon maintenant — ça prend 10 secondes.',
    visual: 'cta',
  },
];

export default function Onboarding() {
  const [step, setStep] = useState(0);
  const [animDir, setAnimDir] = useState('in');
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const prenom = currentUser?.displayName?.split(' ')[0] ?? 'toi';

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
    navigate('/');
  }

  const slide = SLIDES[step];
  const isLast = step === SLIDES.length - 1;

  return (
    <div className="ob-root">

      {/* Aurora */}
      <div className="ob-aurora" aria-hidden="true">
        <div className="ob-orb ob-orb--1" />
        <div className="ob-orb ob-orb--2" />
        <div className="ob-orb ob-orb--3" />
      </div>

      {/* Skip */}
      {!isLast && (
        <button className="ob-skip" onClick={handleSkip}>Passer</button>
      )}

      {/* Slide */}
      <div className={`ob-body ob-anim-${animDir}`} key={slide.id}>

        {/* Visual */}
        {slide.visual === 'logo' && (
          <div className="ob-logo-wrap">
            <LogoStar />
            <span className="ob-logo-text">réviz</span>
          </div>
        )}

        {slide.visual === 'steps' && (
          <div className="ob-steps">
            {slide.steps.map((s, i) => (
              <div key={i} className="ob-step" style={{ animationDelay: `${i * 80}ms` }}>
                <div className="ob-step-icon">{s.icon}</div>
                <div className="ob-step-num">{i + 1}</div>
                <div className="ob-step-info">
                  <span className="ob-step-label">{s.label}</span>
                  <span className="ob-step-desc">{s.desc}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {slide.visual === 'grid' && (
          <div className="ob-grid">
            {slide.items.map((item, i) => (
              <div key={i} className="ob-grid-item" style={{ animationDelay: `${i * 60}ms` }}>
                <div className="ob-grid-icon" style={{ background: item.color + '22' }}>
                  <span>{item.icon}</span>
                </div>
                <span className="ob-grid-label">{item.label}</span>
                <div className="ob-grid-dot" style={{ background: item.color }} />
              </div>
            ))}
          </div>
        )}

        {slide.visual === 'cta' && (
          <div className="ob-cta-icon">🚀</div>
        )}

        {/* Texte */}
        <h1 className="ob-title">
          {slide.titleFn ? slide.titleFn(prenom) : slide.title}
        </h1>

        {slide.body && (
          <p className="ob-body-text">{slide.body}</p>
        )}
      </div>

      {/* Footer */}
      <div className="ob-footer">
        <div className="ob-dots">
          {SLIDES.map((_, i) => (
            <div key={i} className={`ob-dot${i === step ? ' active' : i < step ? ' done' : ''}`} />
          ))}
        </div>

        <button className="ob-btn" onClick={handleNext}>
          {isLast ? '📸 Scanner ma première leçon' : 'Suivant →'}
        </button>

        {isLast && (
          <button className="ob-secondary" onClick={handleSkip}>
            Voir l'accueil d'abord
          </button>
        )}
      </div>

    </div>
  );
}
