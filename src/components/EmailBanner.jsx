import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { auth } from '../services/firebaseConfig';
import { Mascot } from './Mascot';
import { mesurer } from '../services/mesure';
import './guest.css';

/**
 * Rappel d'accueil pour un compte email pas encore confirmé : l'élève entre
 * dans l'app dès l'inscription (le scan, le coach et Réviz+ attendent la
 * confirmation, Mon programme non). Revient d'un coup d'œil à sa messagerie →
 * on revérifie tout seul, et la ligne disparaît une fois l'email confirmé.
 * Ne rend rien hors de cet état, donc peut être posé sans condition.
 */
export function EmailBanner({ className = '' }) {
  const { currentUser, isGuest, resendVerificationEmail } = useAuth() ?? {};
  const [verifie, setVerifie] = useState(false);
  const [etat, setEtat] = useState('');

  const aConfirmer = !!currentUser && !isGuest && !verifie && !currentUser.emailVerified
    && currentUser.providerData?.some(p => p.providerId === 'password');

  useEffect(() => {
    if (!aConfirmer) return;
    async function revoir() {
      if (document.visibilityState !== 'visible') return;
      try {
        await auth.currentUser?.reload();
        if (!auth.currentUser?.emailVerified) return;
        // Le serveur lit email_verified dans le jeton (scan, paiement).
        await auth.currentUser.getIdToken(true);
        mesurer('email_verifie');
        setVerifie(true);
      } catch { /* hors ligne : on réessaiera au prochain retour */ }
    }
    revoir();
    document.addEventListener('visibilitychange', revoir);
    return () => document.removeEventListener('visibilitychange', revoir);
  }, [aConfirmer]);

  if (!aConfirmer) return null;

  async function renvoyer() {
    setEtat('envoi');
    try {
      await resendVerificationEmail();
      setEtat('envoye');
    } catch {
      setEtat('');
    }
  }

  return (
    <div className={`guest-banner email-banner ${className}`.trim()} role="status">
      <Mascot pose="pointing" size={30} alt="" aria-hidden="true" className="guest-banner-mascot" />
      <span className="guest-banner-text">
        <b>Confirme ton email</b> · lien envoyé<span className="guest-banner-detail"> (regarde aussi dans les spams)</span>
      </span>
      {etat === 'envoye' ? (
        <span className="guest-banner-link">Renvoyé</span>
      ) : (
        <button type="button" className="guest-banner-link guest-banner-btn" onClick={renvoyer} disabled={etat === 'envoi'}>
          {etat === 'envoi' ? 'Envoi…' : 'Renvoyer'}
        </button>
      )}
    </div>
  );
}
