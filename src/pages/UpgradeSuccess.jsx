import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './UpgradeSuccess.css';

const LogoStar = () => (
  <svg className="ugs-star" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path
      d="M8 0 C8.3 2.8 8.8 4.2 10.2 5.6 11.6 7 13 7.5 16 8 13 8.5 11.6 9 10.2 10.4 8.8 11.8 8.3 13.2 8 16 7.7 13.2 7.2 11.8 5.8 10.4 4.4 9 3 8.5 0 8 3 7.5 4.4 7 5.8 5.6 7.2 4.2 7.7 2.8 8 0Z"
      fill="url(#upgG)"
    />
    <defs>
      <linearGradient id="upgG" x1="0" y1="0" x2="16" y2="16" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FFB347" />
        <stop offset="100%" stopColor="#FF6B00" />
      </linearGradient>
    </defs>
  </svg>
);

const ADVANTAGES = [
  { icon: '📸', label: 'Scans illimités',        color: '#FF6B00', desc: 'Scanne autant de leçons que tu veux' },
  { icon: '🧠', label: 'Révisions sans limites', color: '#6366F1', desc: 'Quiz et flashcards à volonté' },
  { icon: '🚀', label: 'Accès prioritaire',      color: '#A855F7', desc: 'Toujours premier dans la file' },
  { icon: '✨', label: 'Fonctions exclusives',   color: '#22C55E', desc: 'Carte mentale, export PDF...' },
];

export default function UpgradeSuccess() {
  const navigate = useNavigate();
  const { currentUser, refreshPremium, isPremium } = useAuth();
  const [step, setStep] = useState(0);
  const prenom = currentUser?.displayName?.split(' ')[0] || 'toi';

  useEffect(() => {
    refreshPremium();
    const t1 = setTimeout(() => setStep(1), 200);
    const t2 = setTimeout(() => setStep(2), 280);
    const t3 = setTimeout(() => setStep(3), 360);
    const t4 = setTimeout(() => setStep(4), 440);
    const t5 = setTimeout(() => setStep(5), 600);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); clearTimeout(t5); };
  }, []);

  // Retry refreshPremium si le webhook n'a pas encore écrit dans Firestore
  useEffect(() => {
    if (isPremium) return;
    const retry = setTimeout(() => refreshPremium(), 2000);
    return () => clearTimeout(retry);
  }, [isPremium]);

  return (
    <div className="ugs-root">
      {/* Confetti */}
      <div className="ugs-confetti" aria-hidden="true">
        {Array.from({ length: 30 }).map((_, i) => (
          <span
            key={i}
            className={`ugs-confetti-piece ${i % 3 === 0 ? 'ugs-confetti-rect' : ''}`}
            style={{
              '--delay': `${Math.random() * 2}s`,
              '--x': `${Math.random() * 100}vw`,
              '--rot': `${Math.random() * 360}deg`,
              '--sway': `${(Math.random() - 0.5) * 40}px`,
              '--color': ['#FF6B00', '#FFB347', '#22C55E', '#6366F1', '#A855F7'][i % 5],
            }}
          />
        ))}
      </div>

      {/* Nav */}
      <nav className={`ugs-nav ugs-animate ${step >= 1 ? 'visible' : ''}`}>
        <div className="ugs-logo">
          <LogoStar />
          <span>réviz</span>
        </div>
      </nav>

      <main className="ugs-main">
        {/* Hero */}
        <section className="ugs-hero">
          <div className={`ugs-badge ugs-animate ${step >= 2 ? 'visible' : ''}`}>✦ Réviz+</div>
          <h1 className={`ugs-headline ugs-animate ${step >= 3 ? 'visible' : ''}`}>
            Félicitations {prenom} !
          </h1>
          <p className={`ugs-sub ugs-animate ${step >= 3 ? 'visible' : ''}`}>
            Tu fais maintenant partie de <strong>Réviz+</strong>.<br />
            Toutes les fonctionnalités premium sont activées.
          </p>
        </section>

        <div className={`ugs-divider ugs-animate ${step >= 4 ? 'visible' : ''}`} />

        {/* Avantages */}
        <section className="ugs-section">
          <p className={`ugs-label ugs-animate ${step >= 4 ? 'visible' : ''}`}>TES AVANTAGES</p>
          <h2 className={`ugs-section-title ugs-animate ${step >= 4 ? 'visible' : ''}`}>Tout est débloqué</h2>
          <div className="ugs-grid">
            {ADVANTAGES.map((a, i) => (
              <div
                key={i}
                className={`ugs-card ugs-animate ${step >= 4 ? 'visible' : ''}`}
                style={{ transitionDelay: `${i * 60}ms` }}
              >
                <div className="ugs-card-icon" style={{ background: a.color + '15' }}>
                  <span>{a.icon}</span>
                </div>
                <span className="ugs-card-label">{a.label}</span>
                <p className="ugs-card-desc">{a.desc}</p>
                <div className="ugs-card-status">
                  <span className="ugs-check">✓</span> ACTIF
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className={`ugs-divider ugs-animate ${step >= 5 ? 'visible' : ''}`} />

        {/* Confirmation */}
        <section className={`ugs-section ugs-footer ugs-animate ${step >= 5 ? 'visible' : ''}`}>
          <div className="ugs-receipt">
            <span className="ugs-receipt-check">✓</span>
            <div>
              <span className="ugs-receipt-label">Abonnement actif</span>
              <span className="ugs-receipt-price">4,99 €/mois</span>
            </div>
          </div>
          <button className="ugs-cta" onClick={() => navigate('/scan')}>
            C'est parti →
          </button>
          <p className="ugs-hint">Tu peux annuler à tout moment depuis les réglages.</p>
        </section>
      </main>
    </div>
  );
}
