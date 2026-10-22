import { NavLink, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { EtoileIA } from './BottomNav';
import { PleinIcon } from './BottomNav';
import { AVIS_PROFS_URL, isDecouverte } from '../services/decouverteService';
import './NavHaut.css';

// Pages du tunnel (inscription, connexion, essai…) et jeux en plein écran (flashcards, quiz) : pas de menu.
const HIDDEN_PREFIXES = [
  '/inscription', '/connexion', '/essai', '/verify-email', '/onboarding',
  '/consent-pending', '/finish-setup', '/welcome', '/legal', '/flashcards', '/quiz', '/jeux', '/upgrade-success',
];
// Pages d'une leçon : elles allument « Programme » (leçons scannées comprises).
const LESSON_PATHS = ['/analyse', '/flashcards', '/quiz', '/resume', '/mindmap'];

const ONGLETS = [
  { to: '/',          label: "Aujourd'hui", nom: 'accueil',   end: true },
  { to: '/programme', label: 'Programme',   nom: 'programme', also: ['/cours', ...LESSON_PATHS] },
  { to: '/agenda',    label: 'Agenda',      nom: 'agenda' },
  { to: '/profil',    label: 'Moi',         nom: 'moi',       also: ['/reglages'] },
];

/**
 * Menu des grands écrans (≥ 1024 px, hors app native) : la capsule en verre de la barre du
 * bas, posée en haut à droite (handoff Programme du 21/10), puis le bouton Réviz IA rond.
 * En mode essai, « Créer mon compte » remplace Réviz IA (le coach demande un compte).
 * Rendue une fois sous AuthProvider ; invisible en dessous de 1024 px (CSS).
 */
export function NavHaut() {
  const { currentUser, isGuest } = useAuth();
  const { pathname } = useLocation();
  if (!currentUser) return null;
  // Une partie de Battle (/battle/:code) est un jeu plein écran, comme les Flashcards et le Quiz.
  if (HIDDEN_PREFIXES.some(p => pathname.startsWith(p)) || /^\/battle\/./.test(pathname)) return null;

  return (
    <nav className="nav-haut" aria-label="Menu principal">
      {isGuest && (isDecouverte()
        ? <Link to={AVIS_PROFS_URL} className="nav-haut-compte">Donner mon avis</Link>
        : <Link to="/inscription" className="nav-haut-compte">Créer mon compte</Link>)}
      <div className="nav-haut-capsule">
        {ONGLETS.map(o => (
          <NavLink
            key={o.to}
            to={o.to}
            end={o.end}
            title={o.label}
            aria-label={o.label}
            className={({ isActive }) => {
              const actif = isActive || o.also?.some(p => pathname.startsWith(p));
              return `nav-haut-onglet${actif ? ' nav-haut-onglet--actif' : ''}`;
            }}
          >
            <PleinIcon nom={o.nom} />
            <span className="nav-haut-libelle">{o.label}</span>
          </NavLink>
        ))}
      </div>
      {!isGuest && (
        <NavLink to="/coach" className={({ isActive }) => `nav-haut-ia${isActive ? ' nav-haut-ia--actif' : ''}`} aria-label="Réviz IA" title="Réviz IA">
          <span className="nav-haut-ia-rond"><EtoileIA id="rv-ia-nav-haut" size={26} /></span>
        </NavLink>
      )}
    </nav>
  );
}
