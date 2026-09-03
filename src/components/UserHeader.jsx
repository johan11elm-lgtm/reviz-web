import { Link, useNavigate } from 'react-router-dom';
import { Mascot } from './Mascot';
import { CoachHeaderButton } from './CoachChat';
import { XP_PAR_NIVEAU } from '../utils/gamification';

const CrownIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3.5 17.5 5 8l4.6 4.2L12 6l2.4 6.2L19 8l1.5 9.5Z" />
    <path d="M5.5 20.5h13" />
  </svg>
);

/**
 * UserHeader — en-tête « identité » de la Home : avatar mascotte (lien vers
 * le profil) avec badge de niveau, prénom · niveau, barre d'XP, et à droite
 * les actions Réviz+ (couronne) et coach. Compose .rv-user-* (headers.css).
 *
 * @param {object} props
 * @param {string} props.prenom
 * @param {number} props.level
 * @param {number} props.xpInLvl           — XP acquis dans le niveau courant
 * @param {number} props.fillPct           — remplissage de la barre (0–100)
 * @param {boolean} [props.isPremium]      — couronne « active » (orange)
 * @param {function} [props.onCoach]       — ouvre le coach ; bouton masqué si absent
 * @param {string} [props.className]
 */
export function UserHeader({ prenom, level, xpInLvl, fillPct, isPremium = false, onCoach, className = '' }) {
  const navigate = useNavigate();
  const classes = ['rv-user-header', className].filter(Boolean).join(' ');

  return (
    <header className={classes}>
      <Link to="/profil" className="rv-user-avatar" aria-label="Voir mon profil">
        <Mascot pose="hello" size={46} className="rv-user-avatar-img" alt="" aria-hidden="true" />
        <span className="rv-user-level-badge" aria-hidden="true">{level}</span>
      </Link>

      <div className="rv-user-meta">
        <div className="rv-user-name-row">
          <span className="rv-user-name">{prenom}</span>
          <span className="rv-user-sep" aria-hidden="true">•</span>
          <span className="rv-user-level">Niveau {level}</span>
        </div>
        <div
          className="rv-bar rv-user-xp"
          role="progressbar"
          aria-label={`${xpInLvl} XP sur ${XP_PAR_NIVEAU} pour passer au niveau ${level + 1}`}
          aria-valuemin={0}
          aria-valuemax={XP_PAR_NIVEAU}
          aria-valuenow={xpInLvl}
        >
          <div className="rv-bar-fill rv-bar-fill--orange" style={{ width: `${fillPct}%` }} />
        </div>
      </div>

      <div className="rv-user-actions">
        <button
          type="button"
          className={`rv-bell-btn rv-user-premium-btn${isPremium ? ' rv-user-premium-btn--active' : ''}`}
          onClick={() => navigate('/reglages')}
          aria-label={isPremium ? 'Réviz+ actif : gérer mon abonnement' : 'Découvrir Réviz+'}
          title="Réviz+"
        >
          <CrownIcon />
        </button>
        {onCoach && <CoachHeaderButton onClick={onCoach} />}
      </div>
    </header>
  );
}
