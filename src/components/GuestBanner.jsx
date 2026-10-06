import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mascot } from './Mascot';
import { AVIS_PROFS_URL, isDecouverte } from '../services/decouverteService';
import './guest.css';

/**
 * Bandeau discret du mode essai : rappelle que la progression reste sur cet
 * appareil et propose de créer un compte (la progression suit alors).
 * Ne rend rien hors mode essai, donc peut être posé sans condition.
 */
export function GuestBanner({ className = '' }) {
  const auth = useAuth();
  if (!auth?.isGuest) return null;
  if (isDecouverte()) {
    return (
      <div className={`guest-banner ${className}`.trim()} role="status">
        <Mascot pose="hello" size={30} alt="" aria-hidden="true" className="guest-banner-mascot" />
        <span className="guest-banner-text">
          <b>Mode découverte</b> · l'app telle que la voient vos élèves.
        </span>
        <Link to={AVIS_PROFS_URL} className="guest-banner-link">Donner mon avis</Link>
      </div>
    );
  }
  return (
    <div className={`guest-banner ${className}`.trim()} role="status">
      <Mascot pose="hello" size={30} alt="" aria-hidden="true" className="guest-banner-mascot" />
      <span className="guest-banner-text">
        <b>Mode essai</b> · progression gardée sur cet appareil.
      </span>
      <Link to="/inscription" className="guest-banner-link">Créer mon compte</Link>
    </div>
  );
}
