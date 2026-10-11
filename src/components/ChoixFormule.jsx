import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { startCheckout } from '../services/billingService';
import { FORMULE_PAR_DEFAUT, prixDe } from '../../api/_prix.js';
import './ChoixFormule.css';

/**
 * Choix de la formule Réviz+ (annuel mis en avant, mensuel en ancre) puis
 * passage au paiement Stripe. Le tarif fondateur affiché ici n'est qu'un
 * affichage : le serveur le recalcule (api/_checkout.js).
 */
export function ChoixFormule({ className = '' }) {
  const { estFondateur } = useAuth();
  const navigate = useNavigate();
  const [formule, setFormule] = useState(FORMULE_PAR_DEFAUT);
  const [loading, setLoading] = useState(false);
  const [erreur, setErreur] = useState('');

  const annuel = prixDe('annuel', estFondateur);
  const mensuel = prixDe('mensuel', estFondateur);

  async function payer() {
    if (loading) return;
    setLoading(true); setErreur('');
    try {
      await startCheckout(formule); // redirection pleine page en cas de succès
    } catch (err) {
      setLoading(false);
      if (err.message === 'EMAIL_NOT_VERIFIED') navigate('/verify-email');
      else setErreur('Impossible d\'ouvrir le paiement. Réessaie dans un moment.');
    }
  }

  const options = [
    { id: 'annuel', titre: 'À l\'année', prix: annuel, detail: `soit ${annuel.parMois} par mois`, badge: 'Le plus avantageux' },
    { id: 'mensuel', titre: 'Au mois', prix: mensuel, detail: 'sans engagement' },
  ];

  return (
    <div className={['cf', className].filter(Boolean).join(' ')}>
      {estFondateur && <p className="cf-fondateur">Prix fondateur, gardé tant que tu restes abonné.</p>}
      <div className="cf-options" role="radiogroup" aria-label="Formule Réviz+">
        {options.map(o => (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={formule === o.id}
            className={`cf-option${formule === o.id ? ' cf-option--on' : ''}`}
            onClick={() => setFormule(o.id)}
          >
            <span className="cf-option-text">
              <span className="cf-option-titre">{o.titre}</span>
              <span className="cf-option-detail">{o.detail}</span>
            </span>
            <span className="cf-option-prix">
              {estFondateur && <s className="cf-option-barre">{prixDe(o.id).montant}</s>}
              {o.prix.montant}<span className="cf-option-cadence">{o.prix.cadence}</span>
            </span>
            {o.badge && <span className="cf-option-badge">{o.badge}</span>}
          </button>
        ))}
      </div>
      <button type="button" className="rv-btn-cta rv-btn-cta--full cf-cta" onClick={payer} disabled={loading}>
        {loading ? 'Ouverture du paiement…' : 'Passer à Réviz+'}
      </button>
      <p className="cf-note">Paiement sécurisé par Stripe. Résiliable à tout moment.</p>
      {erreur && <p className="cf-erreur" role="alert">{erreur}</p>}
    </div>
  );
}
