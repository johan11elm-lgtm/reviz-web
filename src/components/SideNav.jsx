import { useRef } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mascot } from './Mascot';
import { HomeIcon, BookIcon, StatsIcon, UserIcon } from './BottomNav';
import { CameraIcon, BookOpenIcon, ChatIcon } from './Icons';
import { isProgrammeLessonId } from '../utils/programme';
import './SideNav.css';

// Pages du tunnel (inscription, connexion, essai…) : pas de menu latéral.
const HIDDEN_PREFIXES = [
  '/inscription', '/connexion', '/essai', '/verify-email', '/onboarding',
  '/consent-pending', '/finish-setup', '/welcome', '/legal',
];
// Pages d'une leçon : elles allument « Mes cours » ou « Mon programme »,
// selon l'entrée d'où l'élève l'a ouverte.
const LESSON_PATHS = ['/analyse', '/flashcards', '/quiz', '/resume', '/mindmap'];

/**
 * Barre latérale des grands écrans (≥ 1024 px, hors app native). Mêmes
 * entrées que la capsule du bas, plus Mon programme et le bouton Scanner.
 * Rendue une fois sous AuthProvider ; invisible en dessous de 1024 px (CSS).
 */
export function SideNav() {
  const { currentUser, isGuest } = useAuth();
  const { pathname } = useLocation();
  // Dernière entrée parcourue avant d'ouvrir la leçon ; à défaut (lien
  // direct, accueil), l'origine de la leçon : chapitre du programme ou scan.
  const origin = useRef(null);
  const onLesson = LESSON_PATHS.some(p => pathname.startsWith(p));
  if (pathname.startsWith('/cours')) origin.current = '/cours';
  else if (pathname.startsWith('/programme')) origin.current = '/programme';
  else if (!onLesson) origin.current = null;
  const lessonSection = origin.current
    ?? (isProgrammeLessonId(localStorage.getItem('reviz-current-lesson-id')) ? '/programme' : '/cours');

  if (!currentUser) return null;
  if (HIDDEN_PREFIXES.some(p => pathname.startsWith(p))) return null;

  const items = [
    { to: '/',          label: 'Accueil',       Icon: HomeIcon,     end: true },
    { to: '/cours',     label: 'Mes cours',     Icon: BookIcon,     also: lessonSection === '/cours' ? LESSON_PATHS : [] },
    { to: '/programme', label: 'Mon programme', Icon: BookOpenIcon, also: lessonSection === '/programme' ? LESSON_PATHS : [] },
    { to: '/coach',     label: 'Coach',         Icon: ChatIcon },
    { to: '/progres',   label: 'Progrès',       Icon: StatsIcon },
    { to: '/profil',    label: 'Profil',        Icon: UserIcon,     also: ['/reglages'] },
  ];

  return (
    <nav className="side-nav" aria-label="Menu principal">
      <Link to="/" className="side-nav-brand" aria-label="Accueil Réviz">
        <Mascot pose="hello" size={38} alt="" aria-hidden="true" />
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
              <span className="side-nav-icon" aria-hidden="true"><it.Icon /></span>
              <span>{it.label}</span>
            </NavLink>
          </li>
        ))}
      </ul>

      <div className="side-nav-foot">
        {isGuest ? (
          <>
            <p className="side-nav-note"><b>Mode essai</b> · progression gardée sur cet ordinateur.</p>
            <Link to="/inscription" className="rv-btn-cta rv-btn-cta--full side-nav-cta">
              <span>Créer mon compte</span>
            </Link>
          </>
        ) : (
          <Link to="/scan" className="rv-btn-cta rv-btn-cta--full side-nav-cta">
            <span className="side-nav-cta-icon" aria-hidden="true"><CameraIcon /></span>
            <span>Scanner une leçon</span>
          </Link>
        )}
      </div>
    </nav>
  );
}
