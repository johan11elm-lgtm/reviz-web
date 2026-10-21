import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mascot } from './Mascot';
import { agendaLocal, chargerAgenda } from '../services/agendaService';
import { controlesAVenir, compteARebours, matiereControle } from '../utils/agenda';
import './guest.css';

// Au-delà, le contrôle reste dans l'Agenda mais ne s'affiche pas sur l'accueil.
const HORIZON_JOURS = 14;

/**
 * Compte à rebours du prochain contrôle noté dans l'Agenda, sur l'accueil.
 * Ne rend rien sans contrôle proche : peut être posé sans condition.
 */
export function ControleBanner({ className = '' }) {
  const { currentUser } = useAuth();
  const uid = currentUser?.uid;
  const [agenda, setAgenda] = useState(() => agendaLocal(uid));

  useEffect(() => {
    let vivant = true;
    const relire = () => { if (vivant) setAgenda(agendaLocal(uid)); };
    window.addEventListener('reviz-agenda', relire);
    chargerAgenda(currentUser).then(a => { if (vivant) setAgenda(a); });
    return () => { vivant = false; window.removeEventListener('reviz-agenda', relire); };
  }, [uid, currentUser]);

  const prochain = controlesAVenir(agenda.controles)[0];
  if (!prochain) return null;
  const quand = compteARebours(prochain.date);
  const loin = new Date(`${prochain.date}T00:00`) - Date.now() > HORIZON_JOURS * 86_400_000;
  if (loin) return null;

  const m = matiereControle(prochain.matiere);
  const cible = prochain.matiere === 'autre' ? '/cours' : `/programme?matiere=${prochain.matiere}`;
  return (
    <div className={`guest-banner controle-banner ${className}`.trim()} role="status">
      <Mascot pose={m.mascot} size={30} alt="" aria-hidden="true" className="guest-banner-mascot" />
      <span className="guest-banner-text">
        <b>{m.label}</b> · contrôle {quand}
        {prochain.titre && <span className="guest-banner-detail"> · {prochain.titre}</span>}
      </span>
      <Link to={cible} className="guest-banner-link">Réviser</Link>
    </div>
  );
}
