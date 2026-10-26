import { useAuth } from '../context/AuthContext';
import { Bandeau } from './Bandeau';
import { AVIS_PROFS_URL, isDecouverte } from '../services/decouverteService';

/**
 * Bandeau discret du mode essai : rappelle que la progression reste sur cet
 * appareil et propose de créer un compte (la progression suit alors).
 * Ne rend rien hors mode essai, donc peut être posé sans condition.
 */
export function GuestBanner({ className = '' }) {
  const auth = useAuth();
  if (!auth?.isGuest) return null;
  if (isDecouverte()) {
    return <Bandeau teinte="lavande" titre="Mode découverte" suite="l’app telle que la voient vos élèves." action={{ to: AVIS_PROFS_URL, label: 'Donner mon avis' }} className={className} />;
  }
  return <Bandeau teinte="menthe" titre="Mode essai" suite="ta progression est gardée sur cet appareil." action={{ to: '/inscription', label: 'Créer mon compte' }} className={className} />;
}
