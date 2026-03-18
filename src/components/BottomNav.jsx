import { NavLink } from 'react-router-dom'

const TABS = [
  { to: '/',       icon: '🏠', label: 'Accueil' },
  { to: '/cours',  icon: '📚', label: 'Mes cours' },
  { to: '/progres',icon: '🏆', label: 'Progrès' },
  { to: '/profil', icon: '👤', label: 'Profil' },
]

export function BottomNav() {
  return (
    <nav className="bottom-nav">
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
