import './PremiumModal.css';

/**
 * Modale freemium — affichée quand la limite d'analyses mensuelle est atteinte.
 * Props :
 *   onClose — appelé pour fermer la modale (retour au scan)
 */
export function PremiumModal({ onClose }) {
  return (
    <div className="premium-overlay" onClick={onClose}>
      <div className="premium-card" onClick={e => e.stopPropagation()}>
        <span className="premium-icon">💎</span>
        <p className="premium-title">Limite atteinte</p>
        <p className="premium-sub">
          Tu as utilisé tes 5 analyses gratuites ce mois-ci.<br />
          Passe à Premium pour des analyses illimitées.
        </p>
        <button className="premium-btn premium-btn--soon" disabled>
          Passer à Premium — Bientôt disponible 🔜
        </button>
        <button className="premium-btn premium-btn--close" onClick={onClose}>
          Retour
        </button>
      </div>
    </div>
  );
}
