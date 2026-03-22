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
    const t1 = setTimeout(() => setStep(1), 400);
    const t2 = setTimeout(() => setStep(2), 1000);
    const t3 = setTimeout(() => setStep(3), 1800);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  return (
    <div className="upgrade-page">
      <div className="upgrade-confetti" aria-hidden="true">
        {Array.from({ length: 20 }).map((_, i) => (
          <span key={i} className="confetti-piece" style={{
            '--delay': `${Math.random() * 1.5}s`,
            '--x': `${Math.random() * 100}vw`,
            '--rot': `${Math.random() * 360}deg`,
            '--color': ['#FF6B00', '#FFB347', '#7C3AED', '#3B82F6', '#10B981'][i % 5],
          }} />
        ))}
      </div>

      <div className={`upgrade-card ${step >= 1 ? 'visible' : ''}`}>
        <div className="upgrade-icon">
          <span className="upgrade-diamond">💎</span>
        </div>

        <h1 className={`upgrade-title ${step >= 2 ? 'visible' : ''}`}>
          Bienvenue dans Réviz+
        </h1>

        <p className={`upgrade-sub ${step >= 2 ? 'visible' : ''}`}>
          Bravo {prenom} ! Tu as maintenant accès à des <strong>scans illimités</strong>.
        </p>

        <div className={`upgrade-features ${step >= 3 ? 'visible' : ''}`}>
          <div className="upgrade-feature">
            <span className="feature-icon">📸</span>
            <span>Scans illimités</span>
          </div>
          <div className="upgrade-feature">
            <span className="feature-icon">🧠</span>
            <span>Révisions sans limites</span>
          </div>
          <div className="upgrade-feature">
            <span className="feature-icon">🚀</span>
            <span>Accès prioritaire</span>
          </div>
        </div>

        <button
          className={`upgrade-cta ${step >= 3 ? 'visible' : ''}`}
          onClick={() => navigate('/scan')}
        >
          C'est parti !
        </button>
      </div>
    </div>
  );
}
