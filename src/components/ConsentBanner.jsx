import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mascot } from './Mascot';
import { sendParentalConsent, consentErrorMessage } from '../services/consentService';
import { planifierRappelsParent } from '../services/reminderService';
import './guest.css';

/**
 * Bandeau discret pour un <15 ans : email du parent pas encore donné (compte
 * à rebours des 15 jours), ou parent qui n'a pas encore répondu :
 * l'app reste ouverte, on rappelle juste le délai et on permet de relancer.
 * Ne rend rien hors de cet état, donc peut être posé sans condition.
 */
export function ConsentBanner({ className = '' }) {
  const auth = useAuth();
  const [etat, setEtat] = useState('');
  const consent = auth?.consent;
  const joursAdresse = consent?.status === 'a-fournir' ? consent.joursRestants : null;

  // App native : notifications locales avant la mise en pause, annulées dès
  // que l'email du parent est donné.
  useEffect(() => { planifierRappelsParent(joursAdresse); }, [joursAdresse]);

  // Pas encore d'email parent (« Plus tard ») : compte à rebours des 15 jours.
  if (consent?.status === 'a-fournir') {
    const j = consent.joursRestants;
    return (
      <div className={`guest-banner consent-banner ${className}`.trim()} role="status">
        <Mascot pose="retour" size={30} alt="" aria-hidden="true" className="guest-banner-mascot" />
        <span className="guest-banner-text">
          <b>Email d'un parent</b> · plus que {j} jour{j > 1 ? 's' : ''}<span className="guest-banner-detail"> avant la mise en pause de ton compte</span>.
        </span>
        <Link to="/consent-pending" className="guest-banner-link">Le donner</Link>
      </div>
    );
  }

  if (consent?.status !== 'en-attente' || !consent.parentEmail) return null;

  async function relancer() {
    setEtat('envoi');
    try {
      await sendParentalConsent(consent.parentEmail, auth.currentUser?.displayName ?? '');
      setEtat('envoye');
    } catch (err) {
      setEtat(consentErrorMessage(err.message));
    }
  }

  const jours = consent.joursRestants;
  return (
    <div className={`guest-banner consent-banner ${className}`.trim()} role="status">
      <Mascot pose="hello" size={30} alt="" aria-hidden="true" className="guest-banner-mascot" />
      <span className="guest-banner-text">
        {etat && etat !== 'envoi' && etat !== 'envoye' ? etat : (
          <>
            <b>Accord parental en attente</b> · encore {jours} jour{jours > 1 ? 's' : ''}<span className="guest-banner-detail"> pour que ton parent accepte</span>.
          </>
        )}
      </span>
      {etat === 'envoye' ? (
        <span className="guest-banner-link">Renvoyé</span>
      ) : (
        <button type="button" className="guest-banner-link guest-banner-btn" onClick={relancer} disabled={etat === 'envoi'}>
          {etat === 'envoi' ? 'Envoi…' : 'Renvoyer'}
        </button>
      )}
    </div>
  );
}
