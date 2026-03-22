import { Link } from 'react-router-dom';
import './NotFound.css';

export default function NotFound() {
  return (
    <div className="notfound">
      <div className="notfound-emoji">🔍</div>
      <h1 className="notfound-title">Page introuvable</h1>
      <p className="notfound-text">
        Oups, cette page n'existe pas ou a été déplacée.
      </p>
      <Link to="/" className="notfound-btn">
        Retour à l'accueil
      </Link>
    </div>
  );
}
