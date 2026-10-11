import { Mascot } from './Mascot';
import { ChoixFormule } from './ChoixFormule';
import { useModalA11y } from '../hooks/useModalA11y';
import { LANCEMENT_OFFERT } from '../../api/_lancement.js';
import './PremiumModal.css';

/**
 * Modale freemium — affichée quand la limite hebdomadaire de scans est atteinte.
 */
export function PremiumModal({ onClose, used = 5, limit = 5 }) {
  const ref = useModalA11y(onClose);

  const now = new Date();
  const day = now.getDay();
  const daysUntilMonday = day === 0 ? 1 : 8 - day;
  const resetLabel = daysUntilMonday === 1 ? 'demain' : `dans ${daysUntilMonday} jours`;

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
        <span className="premium-emoji" aria-hidden="true"><Mascot pose="levelup" size={110} alt="" aria-hidden="true" /></span>
        <p className="premium-title" id="premium-modal-title">Tu as atteint ta limite</p>
        <p className="premium-sub">
          Tes <strong>{limit} scans gratuits</strong> de la semaine sont utilisés.<br />
          Nouveaux scans disponibles <strong>{resetLabel}</strong>.
        </p>

        {limit <= 10 && <div className="premium-counter">
          {Array.from({ length: limit }).map((_, i) => (
            <span key={i} className={`premium-dot ${i < used ? 'used' : ''}`} />
          ))}
        </div>}

        {LANCEMENT_OFFERT && (
          <p className="premium-sub">Réviz+ est offert pendant le lancement : c'est déjà la limite la plus haute.</p>
        )}

        {!LANCEMENT_OFFERT && <div className="premium-divider" />}

        {!LANCEMENT_OFFERT && <ChoixFormule />}

        <button className="premium-btn premium-btn--close" onClick={onClose}>
          Retour
        </button>
      </div>
    </div>
  );
}
