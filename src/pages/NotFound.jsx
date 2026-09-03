import { Mascot } from '../components/Mascot';
import { Link } from 'react-router-dom';
import './NotFound.css';

export default function NotFound() {
  return (
    <div className="notfound">
      <Mascot pose="search" size={140} className="notfound-mascot" alt="" aria-hidden="true" />
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
