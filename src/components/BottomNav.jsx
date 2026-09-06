import { NavLink, useLocation } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'

const HomeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 11.5 12 4l9 7.5" />
    <path d="M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9" />
  </svg>
)

const BookIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 5a2 2 0 0 1 2-2h12v16H6a2 2 0 0 0-2 2V5Z" />
    <path d="M4 19a2 2 0 0 0 2 2h12" />
    <path d="M8 7h7" />
    <path d="M8 11h5" />
  </svg>
)

const StatsIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 20V10" />
    <path d="M12 20V4" />
    <path d="M19 20v-7" />
  </svg>
)

const UserIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21a8 8 0 0 1 16 0" />
  </svg>
)

const TABS = [
  { to: '/',        Icon: HomeIcon,  label: 'Accueil' },
  { to: '/cours',   Icon: BookIcon,  label: 'Cours' },
  { to: '/progres', Icon: StatsIcon, label: 'Progrès' },
  { to: '/profil',  Icon: UserIcon,  label: 'Profil' },
]

export function BottomNav() {
  const [hidden, setHidden] = useState(false);
  const lastY = useRef(0);
  const { pathname } = useLocation();

  useEffect(() => {
    setHidden(false);
    lastY.current = 0;
    let scrollUpAccum = 0;

    // Le défilement d'une page vit dans son conteneur (.content, .pg-content,
    // .pf-content, .analyse-content…), jamais sur window. Plutôt que de
    // deviner sa classe — et de le rater quand la page arrive en lazy après
    // ce montage — on écoute tous les scrolls en phase de capture sur le
    // document et on ne garde que les conteneurs verticaux de la page.
    function onScroll(e) {
      const el = e.target;
      if (!(el instanceof Element)) return;
      // Rangées horizontales (amorces, chips) : pas de défilement vertical.
      if (el.scrollHeight <= el.clientHeight + 1) return;
      // Feuilles et modales défilent pour leur compte, la nav reste en place.
      if (el.closest('[role="dialog"]')) return;

      // Rebond élastique iOS : sans borne, le retour du rebond en bas de page
      // compte comme une remontée et ré-affiche la nav aussitôt cachée.
      const max = el.scrollHeight - el.clientHeight;
      const y = Math.min(Math.max(el.scrollTop, 0), max);
      const delta = y - lastY.current;

      if (y < 10) {
        setHidden(false);
        scrollUpAccum = 0;
      } else if (delta > 0) {
        scrollUpAccum = 0;
        if (delta > 4) setHidden(true);
      } else {
        scrollUpAccum += Math.abs(delta);
        if (scrollUpAccum > 30) {
          setHidden(false);
          scrollUpAccum = 0;
        }
      }
      lastY.current = y;
    }

    document.addEventListener('scroll', onScroll, { capture: true, passive: true });
    return () => document.removeEventListener('scroll', onScroll, { capture: true });
  }, [pathname]);

  return (
    <nav className={`bottom-nav${hidden ? ' bottom-nav--hidden' : ''}`}>
      {TABS.map(tab => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.to === '/'}
          // Une leçon vit dans « Mes cours » : /analyse allume l'onglet Cours.
          className={({ isActive }) => {
            const active = isActive || (tab.to === '/cours' && pathname === '/analyse');
            return `nav-item${active ? ' active' : ''}`;
          }}
          aria-label={tab.label}
        >
          <span className="nav-icon"><tab.Icon /></span>
          <span className="nav-label">{tab.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
