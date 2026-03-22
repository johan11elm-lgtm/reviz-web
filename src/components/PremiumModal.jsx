import './PremiumModal.css';

/**
 * Modale freemium — affichée quand la limite hebdomadaire de scans est atteinte.
 */
export function PremiumModal({ onClose, used = 5, limit = 5 }) {
  // Calcul du nombre de jours avant lundi prochain
  const now = new Date();
  const day = now.getDay(); // 0=dim, 1=lun, ...
  const daysUntilMonday = day === 0 ? 1 : 8 - day;
  const resetLabel = daysUntilMonday === 1 ? 'demain' : `dans ${daysUntilMonday} jours`;

  return (
    <div className="premium-overlay" onClick={onClose}>
      <div className="premium-card" onClick={e => e.stopPropagation()}>
        <span className="premium-emoji">🎉</span>
        <p className="premium-title">Bien joué cette semaine !</p>
        <p className="premium-sub">
          Tu as utilisé tes <strong>{limit} scans gratuits</strong>.<br />
          Ils reviennent <strong>{resetLabel}</strong>.
        </p>

        <div className="premium-counter">
          {Array.from({ length: limit }).map((_, i) => (
            <span key={i} className={`premium-dot ${i < used ? 'used' : ''}`} />
          ))}
        </div>

        <div className="premium-divider" />

        <p className="premium-upgrade-label">Tu veux des scans illimités ?</p>

        <button
          className="premium-btn premium-btn--parent"
          onClick={() => {
            const msg = encodeURIComponent(
              "Salut ! J'utilise Réviz pour réviser mes cours. " +
              "C'est une app qui transforme mes leçons en flashcards et quiz avec l'IA. " +
              "Tu peux regarder ici : https://reviz-gamma.vercel.app/welcome"
            );
            window.open(`https://wa.me/?text=${msg}`, '_blank');
          }}
        >
          💬 Envoyer à mes parents
        </button>

        <button className="premium-btn premium-btn--close" onClick={onClose}>
          Retour
        </button>
      </div>
    </div>
  );
}
