import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './UpgradeSuccess.css';

export default function UpgradeSuccess() {
  const navigate = useNavigate();
  const { currentUser, refreshPremium } = useAuth();
  const [step, setStep] = useState(0);
  const prenom = currentUser?.displayName?.split(' ')[0] || 'toi';

  useEffect(() => {
    refreshPremium();
    const t1 = setTimeout(() => setStep(1), 300);
    const t2 = setTimeout(() => setStep(2), 800);
    const t3 = setTimeout(() => setStep(3), 1400);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  return (
    <div className="upgrade-root">
      <div className="upgrade-confetti" aria-hidden="true">
        {Array.from({ length: 24 }).map((_, i) => (
          <span key={i} className="confetti-piece" style={{
            '--delay': `${Math.random() * 1.5}s`,
            '--x': `${Math.random() * 100}vw`,
            '--rot': `${Math.random() * 360}deg`,
            '--color': ['#FF6B00', '#FFB347', '#22C55E', '#6366F1', '#A855F7'][i % 5],
          }} />
        ))}
      </div>

      <div className={`upgrade-card ${step >= 1 ? 'visible' : ''}`}>
        <div className="upgrade-badge">✦ Réviz+</div>

        <div className="upgrade-icon">🎉</div>

        <h1 className={`upgrade-title ${step >= 2 ? 'visible' : ''}`}>
          Bienvenue {prenom} !
        </h1>

        <p className={`upgrade-sub ${step >= 2 ? 'visible' : ''}`}>
          Tu fais maintenant partie de <strong>Réviz+</strong>.<br />
          Voici ce qui t'attend :
        </p>

        <div className={`upgrade-features ${step >= 3 ? 'visible' : ''}`}>
          <div className="upgrade-feature">
            <span className="feature-icon">📸</span>
            <span>Scans illimités</span>
            <span className="feature-check">ACTIF</span>
          </div>
          <div className="upgrade-feature">
            <span className="feature-icon">🧠</span>
            <span>Révisions sans limites</span>
            <span className="feature-check">ACTIF</span>
          </div>
          <div className="upgrade-feature">
            <span className="feature-icon">🚀</span>
            <span>Accès prioritaire</span>
            <span className="feature-check">ACTIF</span>
          </div>
        </div>

        <button
          className={`upgrade-cta ${step >= 3 ? 'visible' : ''}`}
          onClick={() => navigate('/scan')}
        >
          C'est parti →
        </button>
      </div>
    </div>
  );
}
