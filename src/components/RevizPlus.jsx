import { DecouvrirRevizPlus } from './revizplus/RevizPlusOffre';
import { GemIcon } from './Icons';
import './RevizPlus.css';

/** Réviz+ : la pastille dorée et l'entrée vers la feuille « Découvrir Réviz+ ». */

/** Pastille dorée « Réviz+ ». Bouton si onClick, sinon simple étiquette. */
export function RevizPlusBadge({ onClick, label = 'Réviz+', className = '' }) {
  const classes = ['rp-badge', className].filter(Boolean).join(' ');
  if (!onClick) {
    return <span className={classes}><GemIcon /><span>{label}</span></span>;
  }
  return (
    <button type="button" className={classes} onClick={onClick} aria-label="Voir mon Réviz+">
      <GemIcon /><span>{label}</span>
    </button>
  );
}

/** « Découvrir Réviz+ » (handoff du 22/10) : comparatif, formule, paiement. */
export function RevizPlusSheet({ onClose }) {
  return <DecouvrirRevizPlus onClose={onClose} />;
}
