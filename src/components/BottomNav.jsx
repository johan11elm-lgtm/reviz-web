import { NavLink, useLocation } from 'react-router-dom'
import { useState, useEffect, useRef } from 'react'

const TABS = [
  { to: '/',        icon: '🏠', label: 'Accueil' },
  { to: '/cours',   icon: '📚', label: 'Mes cours' },
  { to: '/progres', icon: '🏆', label: 'Progrès' },
  { to: '/profil',  icon: '👤', label: 'Profil' },
]

export function BottomNav() {
  const [hidden, setHidden] = useState(false);
  const lastY = useRef(0);
  const { pathname } = useLocation();

  useEffect(() => {
    setHidden(false);
    lastY.current = 0;
    let scrollUpAccum = 0;

    const el = document.querySelector('.pg-content') || document.querySelector('.content');
    if (!el) return;

    function onScroll() {
      const y = el.scrollTop;
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

    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [pathname]);

  return (
    <nav className={`bottom-nav${hidden ? ' bottom-nav--hidden' : ''}`}>
      {TABS.map(tab => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.to === '/'}
          className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
        >
          <span className="nav-icon">{tab.icon}</span>
          <span className="nav-label">{tab.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
