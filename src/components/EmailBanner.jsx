import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { emailEnAttente } from '../services/emailEnAttente';
import { auth } from '../services/firebaseConfig';
import { Bandeau } from './Bandeau';
import { mesurer } from '../services/mesure';

/**
 * Rappel d'accueil pour un compte email pas encore confirmé : l'élève entre
 * dans l'app dès l'inscription (le scan, le coach et Réviz+ attendent la
 * confirmation, Mon programme non). Revient d'un coup d'œil à sa messagerie →
 * on revérifie tout seul, et la ligne disparaît une fois l'email confirmé.
 * L'adresse est écrite en entier (une sur cinq était mal tapée) ; « Confirmer »
 * ouvre la carte d'activation (messagerie, renvoi, correction).
 * Ne rend rien hors de cet état, donc peut être posé sans condition.
 */
export function EmailBanner({ className = '' }) {
  const { currentUser, isGuest, actualiserCompte } = useAuth() ?? {};
  const [verifie, setVerifie] = useState(false);

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
        mesurer('email_verifie', { raison: 'accueil' });
        setVerifie(true);
        actualiserCompte?.();
      } catch { /* hors ligne : on réessaiera au prochain retour */ }
    }
    revoir();
    document.addEventListener('visibilitychange', revoir);
    return () => document.removeEventListener('visibilitychange', revoir);
  }, [aConfirmer]);

  if (!aConfirmer) return null;

  const adresse = emailEnAttente(currentUser.uid) ?? currentUser.email;
  return (
    <Bandeau teinte="peche" titre="Confirme ton e-mail" suite={<>lien envoyé à <span className="email-banner-adresse">{adresse}</span></>}
      action={{ to: '/verify-email', label: 'Confirmer' }} className={`email-banner ${className}`.trim()} />
  );
}
