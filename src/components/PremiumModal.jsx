import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import './PremiumModal.css';

/**
 * Modale freemium — affichée quand la limite hebdomadaire de scans est atteinte.
 */
export function PremiumModal({ onClose, used = 5, limit = 5 }) {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(false);

  const now = new Date();
  const day = now.getDay();
  const daysUntilMonday = day === 0 ? 1 : 8 - day;
  const resetLabel = daysUntilMonday === 1 ? 'demain' : `dans ${daysUntilMonday} jours`;

  async function handleUpgrade() {
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch('/api/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: currentUser?.uid,
          email: currentUser?.email,
        }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error('[PremiumModal] Checkout error:', err);
      setLoading(false);
    }
  }

  return (
    <div className="premium-overlay" onClick={onClose}>
      <div className="premium-card" onClick={e => e.stopPropagation()}>
        <span className="premium-emoji">✨</span>
        <p className="premium-title">Tu as atteint ta limite</p>
        <p className="premium-sub">
          Tes <strong>{limit} scans gratuits</strong> de la semaine sont utilisés.<br />
          Nouveaux scans disponibles <strong>{resetLabel}</strong>.
        </p>

        <div className="premium-counter">
          {Array.from({ length: limit }).map((_, i) => (
            <span key={i} className={`premium-dot ${i < used ? 'used' : ''}`} />
          ))}
        </div>

        <div className="premium-divider" />

        <button
          className="premium-btn premium-btn--upgrade"
          onClick={handleUpgrade}
          disabled={loading}
        >
          <span className="premium-btn-icon">💎</span>
          {loading ? 'Redirection...' : 'Passer à Réviz+ — 4,99€/mois'}
        </button>

        <button className="premium-btn premium-btn--close" onClick={onClose}>
          Retour
        </button>
      </div>
    </div>
  );
}
