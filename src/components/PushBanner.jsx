import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Bandeau } from './Bandeau';
import { loadRevisions } from '../services/revisionService';
import { etatPush, activerPush, resynchroniserPush } from '../services/pushService';
import { HEURE_RAPPEL } from '../utils/push';

/**
 * Bandeau d'accueil qui propose le rappel de 17 h, une fois que l'élève a
 * révisé au moins une fois (avant, il ne sait pas encore ce qu'on lui
 * rappellerait). Seulement avec un compte, sur un navigateur qui peut
 * afficher des notifications et qui n'a encore rien répondu. Disparaît dès
 * que l'élève a choisi. Ne rend rien hors de cet état.
 */
export function PushBanner({ className = '' }) {
  const { currentUser, isGuest } = useAuth() ?? {};
  const [etat, setEtat] = useState(() => etatPush());
  const [envoi, setEnvoi] = useState('');

  // Une fois par jour, l'abonnement déjà autorisé est renvoyé au serveur.
  useEffect(() => { if (currentUser && !isGuest) resynchroniserPush(); }, [currentUser, isGuest]);

  const compte = !!currentUser && !isGuest && !currentUser.isAnonymous;
  if (!compte || etat !== 'proposables' || !loadRevisions().length) return null;

  async function activer() {
    setEnvoi('envoi');
    await activerPush('accueil');
    setEnvoi('');
    setEtat(etatPush());
  }

  return (
    <Bandeau teinte="lavande" titre={`Un rappel à ${HEURE_RAPPEL}`} suite="seulement les jours où tu n'as pas encore révisé"
      action={{ onClick: activer, label: 'Activer', etat: envoi }} className={`push-banner ${className}`.trim()} />
  );
}
