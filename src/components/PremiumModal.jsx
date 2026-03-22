import './PremiumModal.css';

/**
 * Modale freemium — affichée quand la limite hebdomadaire de scans est atteinte.
 */
export function PremiumModal({ onClose, used = 5, limit = 5 }) {
  const now = new Date();
  const day = now.getDay();
  const daysUntilMonday = day === 0 ? 1 : 8 - day;
  const resetLabel = daysUntilMonday === 1 ? 'demain' : `dans ${daysUntilMonday} jours`;

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

        <button className="premium-btn premium-btn--upgrade" disabled>
          <span className="premium-btn-icon">💎</span>
          Passer à Réviz+ — Bientôt
        </button>

        <button className="premium-btn premium-btn--close" onClick={onClose}>
          Retour
        </button>
      </div>
    </div>
  );
}
