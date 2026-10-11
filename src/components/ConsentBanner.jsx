import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Mascot } from './Mascot';
import { sendParentalConsent, consentErrorMessage } from '../services/consentService';
import './guest.css';

/**
 * Bandeau discret pour un <15 ans dont le parent n'a pas encore répondu :
 * l'app reste ouverte, on rappelle juste le délai et on permet de relancer.
 * Ne rend rien hors de cet état, donc peut être posé sans condition.
 */
export function ConsentBanner({ className = '' }) {
  const auth = useAuth();
  const [etat, setEtat] = useState('');
  const consent = auth?.consent;
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
            <b>Accord parental en attente</b> · encore {jours} jour{jours > 1 ? 's' : ''} pour que ton parent accepte.
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
