import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Bandeau } from './Bandeau';
import { sendParentalConsent, consentErrorMessage } from '../services/consentService';
import { planifierRappelsParent } from '../services/reminderService';

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
      <Bandeau teinte="rose" titre="Montre tes révisions à un parent" suite={`son accord garde ton compte, plus que ${j} jour${j > 1 ? 's' : ''}.`}
        action={{ to: '/consent-pending', label: 'Le faire' }} className={`consent-banner ${className}`.trim()} />
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
  const erreur = etat && etat !== 'envoi' && etat !== 'envoye' ? etat : null;
  return (
    <Bandeau teinte="rose" titre={erreur ? null : 'Accord parental en attente'}
      suite={erreur ?? `encore ${jours} jour${jours > 1 ? 's' : ''} pour que ton parent accepte.`}
      action={{ onClick: relancer, label: 'Renvoyer', etat: erreur ? '' : etat }} className={`consent-banner ${className}`.trim()} />
  );
}
