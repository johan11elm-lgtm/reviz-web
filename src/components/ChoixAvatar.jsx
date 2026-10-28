import { createPortal } from 'react-dom'
import { useAuth } from '../context/AuthContext'
import { useModalA11y } from '../hooks/useModalA11y'
import { AVATARS } from '../utils/avatars'
import { choisirAvatar } from '../services/avatarService'
import { useAvatar } from './Avatar'
import './Avatar.css'

/**
 * « Ta photo de profil » : les pastilles façon logo autocollant, à toucher. Le choix s'applique
 * tout de suite (menu du haut, accueil, Moi) et se garde sur le compte.
 */
export function ChoixAvatar({ onClose }) {
  const { currentUser } = useAuth()
  const actuel = useAvatar()
  const ref = useModalA11y(onClose)
  return createPortal(
    <div className="av-voile" onClick={onClose}>
      <div className="av-feuille" ref={ref} role="dialog" aria-modal="true" aria-labelledby="av-titre" onClick={e => e.stopPropagation()}>
        <div className="av-tete">
          <h2 id="av-titre">Ta photo de profil</h2>
          <button type="button" className="av-fermer" onClick={onClose} aria-label="Fermer">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        </div>
        <p className="av-sous">Choisis ta pastille, comme celle du logo.</p>
        <ul className="av-grille">
          {AVATARS.map(a => (
            <li key={a.id}>
              <button type="button" className={`av-choix${actuel.id === a.id ? ' is-choisi' : ''}`} aria-pressed={actuel.id === a.id}
                onClick={() => { choisirAvatar(currentUser, a.id).catch(() => {}); }}>
                <img className="rv-avatar" src={a.src} width="72" height="72" alt="" decoding="async" draggable={false} />
                {a.nom}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>,
    document.body,
  )
}
