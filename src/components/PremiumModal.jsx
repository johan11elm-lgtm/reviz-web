import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useModalA11y } from '../hooks/useModalA11y';
import { apiFetch } from '../services/apiClient.js';
import './PremiumModal.css';

/**
 * Modale freemium — affichée quand la limite hebdomadaire de scans est atteinte.
 */
export function PremiumModal({ onClose, used = 5, limit = 5 }) {
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [verifyNeeded, setVerifyNeeded] = useState(false);
  const ref = useModalA11y(onClose);
  const navigate = useNavigate();

  const now = new Date();
  const day = now.getDay();
  const daysUntilMonday = day === 0 ? 1 : 8 - day;
  const resetLabel = daysUntilMonday === 1 ? 'demain' : `dans ${daysUntilMonday} jours`;

  async function handleUpgrade() {
    if (loading) return;
    setLoading(true);
    try {
      const idToken = await currentUser?.getIdToken();
      const res = await apiFetch('/api/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });
      const data = await res.json();
      if (res.status === 403 && data.error === 'EMAIL_NOT_VERIFIED') {
        setVerifyNeeded(true);
        setLoading(false);
      } else if (data.url) {
        window.location.href = data.url;
      } else {
        console.error('[PremiumModal] No URL returned:', data);
        alert('Erreur lors de la redirection. Réessaie dans quelques instants.');
        setLoading(false);
      }
    } catch (err) {
      console.error('[PremiumModal] Checkout error:', err);
      alert('Erreur de connexion. Vérifie ta connexion internet.');
      setLoading(false);
    }
  }

  return (
    <div className="premium-overlay" onClick={onClose}>
      <div
        className="premium-card"
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby="premium-modal-title"
        onClick={e => e.stopPropagation()}
      >
        <span className="premium-emoji" aria-hidden="true">✨</span>
        <p className="premium-title" id="premium-modal-title">Tu as atteint ta limite</p>
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

        {verifyNeeded && (
          <p className="premium-sub">
            📬 Confirme ton email avant de passer à Réviz+ — clique sur le lien
            qu'on t'a envoyé, ça prend 10 secondes !
          </p>
        )}

        {verifyNeeded ? (
          <button
            className="premium-btn premium-btn--upgrade"
            onClick={() => navigate('/verify-email')}
          >
            <span className="premium-btn-icon">📬</span>
            Vérifier mon email
          </button>
        ) : (
          <button
            className="premium-btn premium-btn--upgrade"
            onClick={handleUpgrade}
            disabled={loading}
          >
            <span className="premium-btn-icon">💎</span>
            {loading ? 'Redirection...' : 'Passer à Réviz+ — 4,99€/mois'}
          </button>
        )}

        <button className="premium-btn premium-btn--close" onClick={onClose}>
          Retour
        </button>
      </div>
    </div>
  );
}
