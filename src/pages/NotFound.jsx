import { Mascot } from '../components/Mascot';
import { Link } from 'react-router-dom';
import './NotFound.css';

export default function NotFound() {
  return (
    <div className="app notfound-page">
      <div className="notfound">
        <Mascot pose="confused" size={160} glow priority className="notfound-mascot" alt="" aria-hidden="true" />
        <h1 className="notfound-title">Page introuvable</h1>
        <p className="notfound-text">
          Cette page n'existe pas ou a été déplacée.
        </p>
        <Link to="/" className="rv-btn-cta notfound-btn">
          <span>Retour à l'accueil</span>
          <span className="rv-btn-cta-arrow" aria-hidden="true">→</span>
        </Link>
      </div>
    </div>
  );
}
