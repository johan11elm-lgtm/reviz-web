import './PremiumModal.css';

/**
 * Modale freemium — affichée quand la limite hebdomadaire de scans est atteinte.
 * Props :
 *   onClose — appelé pour fermer la modale
 *   used    — nombre de scans utilisés cette semaine
 *   limit   — limite gratuite (5)
 */
export function PremiumModal({ onClose, used = 5, limit = 5 }) {
  return (
    <div className="premium-overlay" onClick={onClose}>
      <div className="premium-card" onClick={e => e.stopPropagation()}>
        <span className="premium-icon">📚</span>
        <p className="premium-title">Tu as bien révisé cette semaine !</p>
        <p className="premium-sub">
          Tu as utilisé tes {limit} scans gratuits cette semaine.<br />
          Ils se rechargent lundi. Ou passe à Réviz+ pour des scans illimités.
        </p>
        <div className="premium-counter">
          {Array.from({ length: limit }).map((_, i) => (
            <span key={i} className={`premium-dot ${i < used ? 'used' : ''}`} />
          ))}
        </div>
        <button className="premium-btn premium-btn--soon" disabled>
          Réviz+ — Bientôt disponible 🔜
        </button>
        <button className="premium-btn premium-btn--close" onClick={onClose}>
          Retour
        </button>
      </div>
    </div>
  );
}
