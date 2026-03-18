import { Link } from 'react-router-dom';
import './Welcome.css';

const LogoStar = () => (
  <svg className="welcome-star" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M8 0 C8.3 2.8 8.8 4.2 10.2 5.6 11.6 7 13 7.5 16 8 13 8.5 11.6 9 10.2 10.4 8.8 11.8 8.3 13.2 8 16 7.7 13.2 7.2 11.8 5.8 10.4 4.4 9 3 8.5 0 8 3 7.5 4.4 7 5.8 5.6 7.2 4.2 7.7 2.8 8 0Z"
      fill="url(#welcomeGrad)"
    />
    <defs>
      <linearGradient id="welcomeGrad" x1="0" y1="0" x2="16" y2="16" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FFB347" />
        <stop offset="100%" stopColor="#FF6B00" />
      </linearGradient>
    </defs>
  </svg>
);

export default function Welcome() {
  return (
    <div className="app welcome-app">
      <div className="welcome-body">
        {/* Logo */}
        <div className="welcome-logo">
          <LogoStar />
          <span>réviz</span>
        </div>

        {/* Tagline */}
        <p className="welcome-tagline">Révise mieux.<br />Retiens plus.</p>

        {/* Illustration / déco */}
        <div className="welcome-emoji-row">
          <span>📐</span>
          <span>🧬</span>
          <span>📖</span>
          <span>⚛️</span>
          <span>🌍</span>
        </div>
      </div>

      {/* CTAs */}
      <div className="welcome-ctas">
        <Link to="/inscription" className="welcome-btn welcome-btn--primary">
          Créer un compte
        </Link>
        <Link to="/connexion" className="welcome-btn welcome-btn--secondary">
          Se connecter
        </Link>
      </div>
    </div>
  );
}
