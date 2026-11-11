import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Bandeau } from './Bandeau';
import { PARRAINAGE_JOURS } from '../../api/_parrainage.js';
import { parrainageVu, noterParrainageVu } from '../utils/parrainage';

const jour = ms => new Date(ms).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });

/**
 * Bandeau d'accueil du parrainage (api/_parrainage.js), une fois par bonne nouvelle :
 * le code d'un ami vient d'être accepté, ou un ami s'est inscrit avec le lien de l'élève ;
 * et Réviz+ offert par un parent tout juste activé (api/_cadeau.js).
 * Ne rend rien hors de ces moments, donc peut être posé sans condition.
 */
export function ParrainageBanner() {
  const { currentUser, isGuest, isPremium, parrainage = {} } = useAuth() ?? {};
  const uid = currentUser?.uid;
  const [vu, setVu] = useState(() => (uid ? parrainageVu(uid) : null));
  const [, majCadeau] = useState(0);
  if (!uid || isGuest || !vu) return null;

  // Réviz+ offert par un parent (api/_cadeau.js) vient d'être activé : annoncé une fois.
  let cadeau = null;
  try { cadeau = localStorage.getItem(`reviz-cadeau-active-${uid}`); } catch { /* rien */ }
  if (cadeau === '1') {
    const vuCadeau = () => { try { localStorage.setItem(`reviz-cadeau-active-${uid}`, 'vu'); } catch { /* rien */ } majCadeau(n => n + 1); };
    return <Bandeau teinte="menthe" titre="Réviz+ est activé" suite="un cadeau de ton parent" action={{ onClick: vuCadeau, label: 'Super' }} className="parrainage-banner" />;
  }

  const filleuls = parrainage.filleuls ?? 0;
  const fin = Number.isFinite(parrainage.fin) && parrainage.fin > Date.now() ? parrainage.fin : null;
  const recu = Number.isFinite(parrainage.utiliseLe) && !vu.recu;
  const nouveauFilleul = filleuls > vu.filleuls;
  if (!recu && !nouveauFilleul) return null;

  const fermer = () => {
    const suivant = { recu: vu.recu || Number.isFinite(parrainage.utiliseLe), filleuls };
    noterParrainageVu(uid, suivant);
    setVu(suivant);
  };
  if (recu) {
    return <Bandeau teinte="menthe" titre="Code de ton ami accepté" suite={fin ? `Réviz+ offert jusqu’au ${jour(fin)}` : `${PARRAINAGE_JOURS} jours de Réviz+ offerts`}
      action={{ onClick: fermer, label: 'Super' }} className="parrainage-banner" />;
  }
  const qui = filleuls - vu.filleuls > 1 ? `${filleuls - vu.filleuls} amis ont rejoint Réviz` : 'Un ami a rejoint Réviz';
  return <Bandeau teinte="menthe" titre={`${qui} avec ton lien`}
    suite={!isPremium && fin ? `Réviz+ offert jusqu’au ${jour(fin)}` : 'merci de l’avoir invité'}
    action={{ onClick: fermer, label: 'Super' }} className="parrainage-banner" />;
}
