import { NavLink, useLocation } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import './RevizPlus.css'

export const HomeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 11.5 12 4l9 7.5" />
    <path d="M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9" />
  </svg>
)

export const BookIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 5a2 2 0 0 1 2-2h12v16H6a2 2 0 0 0-2 2V5Z" />
    <path d="M4 19a2 2 0 0 0 2 2h12" />
    <path d="M8 7h7" />
    <path d="M8 11h5" />
  </svg>
)

export const StatsIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 20V10" />
    <path d="M12 20V4" />
    <path d="M19 20v-7" />
  </svg>
)

export const UserIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21a8 8 0 0 1 16 0" />
  </svg>
)

// Icônes pleines de la capsule encre (refonte du 20/10).
const Plein = ({ d }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d={d} /></svg>
)
export const PATHS = {
  accueil:   'M11.3 2.6a1 1 0 0 1 1.4 0l8.4 7.6c.6.6.2 1.8-.7 1.8H19v8a2 2 0 0 1-2 2h-3v-6h-4v6H7a2 2 0 0 1-2-2v-8H3.6c-.9 0-1.3-1.2-.7-1.8z',
  programme: 'M6 2h11a2 2 0 0 1 2 2v14H7a1 1 0 0 0 0 2h12v2H7a3 3 0 0 1-3-3V4a2 2 0 0 1 2-2zm3 5v2h7V7zm0 4v2h5v-2z',
  agenda:    'M7 2h2v2h6V2h2v2h2a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2zm-2 8v9h14v-9zm2 2h4v4H7z',
  moi:       'M12 2a5 5 0 1 1 0 10 5 5 0 0 1 0-10zm0 12c4.4 0 8 2.2 8 5v1a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-1c0-2.8 3.6-5 8-5z',
  ia:        'M4 3h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H9l-5 4v-4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z',
}
export const PleinIcon = ({ nom }) => <Plein d={PATHS[nom]} />

// Étoile Réviz IA, dégradé orange → rose. `id` unique par instance (le
// dégradé SVG est référencé par id dans le document).
export const EtoileIA = ({ id = 'rv-ia-grad', size = 24 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
    <defs>
      <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#FFC24B" /><stop offset=".45" stopColor="#FF7A2F" /><stop offset="1" stopColor="#FF4F7B" />
      </linearGradient>
    </defs>
    <path d="M12 0C12.7 6.3 17.7 11.3 24 12C17.7 12.7 12.7 17.7 12 24C11.3 17.7 6.3 12.7 0 12C6.3 11.3 11.3 6.3 12 0Z" fill={`url(#${id})`} />
  </svg>
)

const TABS = [
  { to: '/',          nom: 'accueil',   label: "Aujourd'hui" },
  // Une leçon (scannée ou du programme) et « Mes cours » allument Programme.
  { to: '/programme', nom: 'programme', label: 'Programme', also: ['/cours', '/analyse', '/flashcards', '/quiz', '/resume', '/mindmap'] },
  { to: '/agenda',    nom: 'agenda',    label: 'Agenda' },
  { to: '/profil',    nom: 'moi',       label: 'Moi', also: ['/reglages'] },
]

export function BottomNav() {
  const [hidden, setHidden] = useState(false);
  const lastY = useRef(0);
  const { pathname } = useLocation();
  // Le coach passe par une API authentifiée : pas d'onglet en mode essai.
  const auth = useAuth();
  const isGuest = auth?.isGuest;
  // Réviz+ : pastille « + » dorée sur l'onglet du coach (RevizPlus.css).
  const hasRevizPlus = !!auth?.hasRevizPlus && !isGuest;
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
    <nav className={`bottom-nav${hidden ? ' bottom-nav--hidden' : ''}`} aria-label="Menu principal">
      {TABS.map(tab => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.to === '/'}
          className={({ isActive }) => {
            const active = isActive || tab.also?.some(p => pathname.startsWith(p));
            return `nav-item${active ? ' active' : ''}`;
          }}
          aria-label={tab.label}
        >
          <span className="nav-icon"><PleinIcon nom={tab.nom} /></span>
          <span className="nav-label">{tab.label}</span>
        </NavLink>
      ))}
      {/* Le coach passe par une API authentifiée : pas d'onglet en mode essai. */}
      {!isGuest && (
        <NavLink to="/coach" className={({ isActive }) => `nav-item nav-item--ia${isActive ? ' active' : ''}`} aria-label="Réviz IA">
          <span className="nav-icon"><EtoileIA id="rv-ia-nav" size={22} /></span>
          <span className="nav-label">Réviz IA</span>
          {hasRevizPlus && <span className="rp-coach-tag" aria-hidden="true">+</span>}
        </NavLink>
      )}
    </nav>
  )
}
