import { NavLink, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mascot } from './Mascot';
import { PleinIcon } from './BottomNav';
import { AVIS_PROFS_URL, isDecouverte } from '../services/decouverteService';
import './SideNav.css';

// Pages du tunnel (inscription, connexion, essai…) : pas de menu latéral.
const HIDDEN_PREFIXES = [
  '/inscription', '/connexion', '/essai', '/verify-email', '/onboarding',
  '/consent-pending', '/finish-setup', '/welcome', '/legal',
];
// Pages d'une leçon : elles allument « Programme » (leçons scannées comprises).
const LESSON_PATHS = ['/analyse', '/flashcards', '/quiz', '/resume', '/mindmap'];

/**
 * Barre latérale des grands écrans (≥ 1024 px, hors app native). Mêmes
 * entrées que la capsule du bas, plus Mon programme et le bouton Scanner.
 * Rendue une fois sous AuthProvider ; invisible en dessous de 1024 px (CSS).
 */
export function SideNav() {
  const { currentUser, isGuest, getUserLevel } = useAuth();
  const { pathname } = useLocation();
  if (!currentUser) return null;
  if (HIDDEN_PREFIXES.some(p => pathname.startsWith(p))) return null;

  const prenom = currentUser.displayName || (isGuest ? 'Mode essai' : 'Moi');
  const niveau = getUserLevel?.()?.classe;
  const items = [
    { to: '/',          label: "Aujourd'hui", nom: 'accueil',   end: true },
    { to: '/programme', label: 'Programme',   nom: 'programme', also: ['/cours', ...LESSON_PATHS] },
    ...(isGuest ? [] : [{ to: '/coach', label: 'Réviz IA', nom: 'ia' }]),
    { to: '/agenda',    label: 'Agenda',      nom: 'agenda' },
    { to: '/profil',    label: 'Moi',         nom: 'moi',       also: ['/progres', '/reglages'] },
  ];

  return (
    <nav className="side-nav" aria-label="Menu principal">
      <Link to="/" className="side-nav-brand" aria-label="Accueil Réviz">
        <Mascot pose="hello" size={36} alt="" aria-hidden="true" />
        <span className="side-nav-wordmark">réviz</span>
      </Link>

      <ul className="side-nav-list">
        {items.map(it => (
          <li key={it.to}>
            <NavLink
              to={it.to}
              end={it.end}
              className={({ isActive }) => {
                const active = isActive || it.also?.some(p => pathname.startsWith(p));
                return `side-nav-item${active ? ' side-nav-item--active' : ''}`;
              }}
            >
              <span className="side-nav-icon" aria-hidden="true"><PleinIcon nom={it.nom} /></span>
              <span>{it.label}</span>
            </NavLink>
          </li>
        ))}
      </ul>

      <div className="side-nav-foot">
        {isGuest && isDecouverte() ? (
          <>
            <p className="side-nav-note"><b>Mode découverte</b> · l'app telle que la voient vos élèves.</p>
            <Link to={AVIS_PROFS_URL} className="rv-btn-cta rv-btn-cta--full side-nav-cta">
              <span>Donner mon avis</span>
            </Link>
          </>
        ) : isGuest ? (
          <>
            <p className="side-nav-note"><b>Mode essai</b> · progression gardée sur cet ordinateur.</p>
            <Link to="/inscription" className="rv-btn-cta rv-btn-cta--full side-nav-cta">
              <span>Créer mon compte</span>
            </Link>
          </>
        ) : (
          <Link to="/coach" className="side-nav-ia">
            <span className="side-nav-ia-grain" aria-hidden="true" />
            <Mascot pose="coach" size={110} alt="" aria-hidden="true" className="side-nav-ia-mascotte" />
            <span className="side-nav-ia-txt">
              <span className="side-nav-ia-titre">Réviz IA</span>
              <span className="side-nav-ia-sous">Une question sur ta leçon ?</span>
              <span className="side-nav-ia-btn">Demander</span>
            </span>
          </Link>
        )}
        <Link to="/profil" className="side-nav-moi">
          <span className="side-nav-avatar" aria-hidden="true">{prenom.charAt(0).toUpperCase()}</span>
          <span className="side-nav-moi-txt">
            <span className="side-nav-moi-nom">{prenom}</span>
            {niveau && <span className="side-nav-moi-meta">{niveau}</span>}
          </span>
        </Link>
      </div>
    </nav>
  );
}
