import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { auth } from '../services/firebaseConfig';
import { Bandeau } from './Bandeau';
import { mesurer } from '../services/mesure';

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
    <Bandeau teinte="peche" titre="Confirme ton e-mail" suite="lien envoyé (regarde aussi dans les spams)"
      action={{ onClick: renvoyer, label: 'Renvoyer', etat }} className={`email-banner ${className}`.trim()} />
  );
}
