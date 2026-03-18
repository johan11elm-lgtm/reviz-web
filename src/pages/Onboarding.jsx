import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Onboarding.css';

const SLIDES = [
  {
    emoji: '👋',
    titleFn: prenom => `Bienvenue, ${prenom} !`,
    body: 'Réviz va transformer ta façon de réviser. Plus de temps perdu à relire des pages — l\'IA fait le travail pour toi.',
  },
  {
    emoji: '✨',
    title: 'Comment ça marche ?',
    features: [
      { icon: '📸', label: 'Scanne',      desc: 'Photo ou texte de ta leçon' },
      { icon: '🤖', label: 'L\'IA analyse', desc: 'Flashcards, quiz, résumé générés' },
      { icon: '🏆', label: 'Révise',       desc: 'Progresse et suis tes stats' },
    ],
  },
  {
    emoji: '🚀',
    title: 'C\'est parti !',
    body: 'Scanne ta première leçon pour commencer à réviser autrement.',
  },
];

export default function Onboarding() {
  const [step, setStep] = useState(0);
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const prenom = currentUser?.displayName ?? 'toi';

  // Si déjà onboardé → home directement
  useEffect(() => {
    if (currentUser && localStorage.getItem(`reviz-onboarded-${currentUser.uid}`)) {
      navigate('/', { replace: true });
    }
  }, [currentUser, navigate]);

  function markOnboarded() {
    if (currentUser) localStorage.setItem(`reviz-onboarded-${currentUser.uid}`, '1');
  }

  function handleNext() {
    if (step < SLIDES.length - 1) {
      setStep(s => s + 1);
    } else {
      markOnboarded();
      navigate('/scan');
    }
  }

  function handleSkip() {
    markOnboarded();
    navigate('/');
  }

  const slide = SLIDES[step];
  const isLast = step === SLIDES.length - 1;

  return (
    <div className="onboarding-app">

      {/* Skip */}
      {!isLast && (
        <button className="onboarding-skip" onClick={handleSkip}>Passer</button>
      )}

      {/* Slide */}
      <div className="onboarding-body" key={step}>
        <div className="onboarding-emoji">{slide.emoji}</div>

        <h1 className="onboarding-title">
          {slide.titleFn ? slide.titleFn(prenom) : slide.title}
        </h1>

        {slide.body && (
          <p className="onboarding-text">{slide.body}</p>
        )}

        {slide.features && (
          <div className="onboarding-features">
            {slide.features.map((f, i) => (
              <div key={i} className="onboarding-feature">
                <div className="onboarding-feature-icon">{f.icon}</div>
                <div className="onboarding-feature-info">
                  <span className="onboarding-feature-label">{f.label}</span>
                  <span className="onboarding-feature-desc">{f.desc}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="onboarding-footer">
        {/* Dots */}
        <div className="onboarding-dots">
          {SLIDES.map((_, i) => (
            <div key={i} className={`onboarding-dot${i === step ? ' active' : ''}`} />
          ))}
        </div>

        {/* CTA */}
        <button className="onboarding-btn" onClick={handleNext}>
          {isLast ? '📸 Scanner ma première leçon' : 'Suivant →'}
        </button>

        {isLast && (
          <button className="onboarding-secondary" onClick={handleSkip}>
            Voir l'accueil d'abord
          </button>
        )}
      </div>

    </div>
  );
}
