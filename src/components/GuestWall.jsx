import { Link, useNavigate } from 'react-router-dom';
import { PageHeader } from './PageHeader';
import { Mascot } from './Mascot';
import './guest.css';

/**
 * Écran affiché en mode essai à la place d'une fonction qui demande un
 * compte (scan, coach) : les deux passent par des API authentifiées.
 * @param {string} props.action  ce que le compte débloque (« scanner tes leçons »)
 * @param {string} [props.text]  phrase d'explication
 */
export function GuestWall({ action, text }) {
  const navigate = useNavigate();
  return (
    <div className="app guest-wall">
      <PageHeader
        variant="back"
        onBack={() => (window.history.state?.idx > 0 ? navigate(-1) : navigate('/'))}
      />
      <div className="guest-wall-body">
        <div className="rv-empty-state">
          <Mascot pose="pointing" size={160} glow className="rv-empty-state-mascot" alt="" aria-hidden="true" />
          <h2 className="rv-empty-state-title">Crée ton compte pour {action}</h2>
          <p className="rv-empty-state-sub">
            {text ?? "C'est gratuit, et tout ce que tu as révisé en mode essai te suit."}
          </p>
          <Link className="rv-btn-cta" to="/inscription">
            <span>Créer mon compte gratuit</span>
            <span className="rv-btn-cta-arrow" aria-hidden="true">→</span>
          </Link>
          <Link className="rv-btn-cta rv-btn-cta--ghost" to="/programme">
            <span>Réviser mon programme</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
