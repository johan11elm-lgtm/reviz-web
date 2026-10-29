import { NavLink, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { EtoileIA } from './BottomNav';
import { Avatar } from './Avatar';
import { LogoReviz } from './skin/Skin';
import { AVIS_PROFS_URL, isDecouverte } from '../services/decouverteService';
import './NavHaut.css';

// Pages du tunnel (inscription, connexion, essai…) et jeux en plein écran (flashcards, quiz, exercices) : pas de menu.
const HIDDEN_PREFIXES = [
  '/inscription', '/connexion', '/essai', '/verify-email', '/onboarding',
  '/consent-pending', '/finish-setup', '/welcome', '/legal', '/flashcards', '/quiz', '/exercices', '/controle', '/jeux', '/upgrade-success',
];
// Pages d'une leçon : elles allument « Programme » (leçons scannées comprises).
const LESSON_PATHS = ['/analyse', '/flashcards', '/quiz', '/exercices', '/resume', '/mindmap'];

const ONGLETS = [
  { to: '/',          label: "Aujourd'hui", end: true },
  { to: '/programme', label: 'Programme',   also: ['/cours', ...LESSON_PATHS] },
  { to: '/agenda',    label: 'Agenda' },
  { to: '/profil',    label: 'Moi',         also: ['/reglages'] },
];

/**
 * Menu des grands écrans (≥ 1024 px, hors app native), façon app Nomad (29/10) : le logo à
 * gauche, les onglets en texte dans une capsule blanche au centre (l'onglet actif en pilule
 * orange), puis à droite Réviz IA, « S'abonner » (sans Réviz+) et l'avatar du profil. En mode
 * essai, « Créer mon compte » remplace Réviz IA et l'abonnement (le coach demande un compte).
 * Au survol, les onglets s'animent comme le menu de nomadeducation.fr ; Réviz IA a le sien
 * (l'étoile tourne, un liseré dégradé fait le tour). Rendue une fois sous AuthProvider ;
 * invisible en dessous de 1024 px (CSS).
 */
export function NavHaut() {
  const { currentUser, isGuest, hasRevizPlus } = useAuth();
  const { pathname } = useLocation();
  if (!currentUser) return null;
  // Une partie de Battle (/battle/:code) est un jeu plein écran, comme les Flashcards et le Quiz.
  if (HIDDEN_PREFIXES.some(p => pathname.startsWith(p)) || /^\/battle\/./.test(pathname)) return null;
  const prenom = String(currentUser.displayName ?? '').trim().split(/\s+/)[0] || 'Moi';

  return (
    <nav className="nav-haut" aria-label="Menu principal">
      <Link to="/" className="nav-haut-logo" aria-label="Réviz, aujourd'hui">
        <LogoReviz />
      </Link>
      <div className="nav-haut-capsule">
        {ONGLETS.map(o => (
          <NavLink
            key={o.to}
            to={o.to}
            end={o.end}
            className={({ isActive }) => {
              const actif = isActive || o.also?.some(p => pathname.startsWith(p));
              return `nav-haut-onglet${actif ? ' nav-haut-onglet--actif' : ''}`;
            }}
          >
            {/* Survol façon nomadeducation.fr : deux bandes inclinées montent (orange puis marine)
                et le libellé roule, son double blanc tombe d'en haut. Double masqué aux lecteurs d'écran. */}
            <span className="nh-bandes" aria-hidden="true"><i /><i /></span>
            <span className="nh-roule"><span>{o.label}</span><span aria-hidden="true">{o.label}</span></span>
          </NavLink>
        ))}
      </div>
      <div className="nav-haut-droite">
        {isGuest && (isDecouverte()
          ? <Link to={AVIS_PROFS_URL} className="nav-haut-compte">Donner mon avis</Link>
          : <Link to="/inscription" className="nav-haut-compte">Créer mon compte</Link>)}
        {!isGuest && (
          <NavLink to="/coach" className={({ isActive }) => `nav-haut-ia${isActive ? ' nav-haut-ia--actif' : ''}`} aria-label="Réviz IA" title="Réviz IA">
            <EtoileIA id="rv-ia-nav-haut" size={20} />
            <span className="nav-haut-ia-libelle">Réviz IA</span>
          </NavLink>
        )}
        {!isGuest && !hasRevizPlus && (
          <Link to={{ pathname: '/reglages', hash: '#abonnement' }} className="nav-haut-compte nav-haut-abo">
            S’abonner <span className="nav-haut-plus">Réviz+</span>
          </Link>
        )}
        <Link to="/profil" className="nav-haut-profil" aria-label={`Mon profil, ${prenom}`}>
          <span className="nav-haut-avatar" aria-hidden="true"><Avatar size={32} /></span>
          <span className="nav-haut-prenom">{prenom}</span>
        </Link>
      </div>
    </nav>
  );
}
