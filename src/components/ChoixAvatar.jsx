import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useAuth } from '../context/AuthContext'
import { useModalA11y } from '../hooks/useModalA11y'
import { FONDS, TETES } from '../utils/avatars'
import { choisirAvatar } from '../services/avatarService'
import { Avatar, useChoixAvatar } from './Avatar'
import { RevizPlusBadge, RevizPlusSheet } from './RevizPlus'
import { ACHAT_DANS_L_APP } from '../utils/achat'
import './Avatar.css'

const Cadenas = () => (
  <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2.5" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>
)

/**
 * « Ta photo de profil » : la couleur du fond, puis la tête (huit pour tous, quinze avec Réviz+).
 * Chaque choix s'applique tout de suite (menu du haut, accueil, Moi) et se garde sur le compte ;
 * une tête Réviz+ touchée sans Réviz+ ouvre l'offre.
 */
export function ChoixAvatar({ onClose }) {
  const { currentUser, hasRevizPlus } = useAuth()
  const choix = useChoixAvatar()
  const [offre, setOffre] = useState(false)
  const ref = useModalA11y(onClose, !offre)
  const fond = FONDS.find(f => f.id === choix.fond) ?? FONDS[0]
  const changer = maj => { choisirAvatar(currentUser, { ...choix, ...maj }).catch(() => {}); }
  const tuile = t => {
    const ferme = t.plus && !hasRevizPlus
    const choisi = choix.tete === t.id && !ferme
    return (
      <li key={t.id}>
        <button type="button" className={`av-choix${choisi ? ' is-choisi' : ''}${ferme ? ' av-choix--ferme' : ''}`} aria-pressed={choisi}
          aria-label={ferme ? `${t.nom}, avec Réviz+` : t.nom} onClick={() => (ferme ? ACHAT_DANS_L_APP && setOffre(true) : changer({ tete: t.id }))}>
          <Avatar size={68} tete={t} fond={fond} />
          {ferme && <span className="av-cadenas" aria-hidden="true"><Cadenas /></span>}
          <span aria-hidden="true">{t.nom}</span>
        </button>
      </li>
    )
  }
  // L'offre Réviz+ est rendue à côté du voile (pas dedans) : un clic chez elle ne referme pas le choix.
  return (<>{createPortal(
    <div className="av-voile" onClick={onClose}>
      <div className="av-feuille" ref={ref} role="dialog" aria-modal="true" aria-labelledby="av-titre" onClick={e => e.stopPropagation()}>
        <div className="av-tete">
          <Avatar size={72} />
          <div className="av-tete-txt">
            <h2 id="av-titre">Ta photo de profil</h2>
            <p className="av-sous">Ta tête et ta couleur, comme la pastille du logo.</p>
          </div>
          <button type="button" className="av-fermer" onClick={onClose} aria-label="Fermer">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        </div>
        <h3 className="av-titre">La couleur du fond</h3>
        <ul className="av-fonds" aria-label="La couleur du fond">
          {FONDS.map(f => (
            <li key={f.id}>
              <button type="button" className={`av-fond${choix.fond === f.id ? ' is-choisi' : ''}`} style={{ '--av-fond': f.couleur }}
                aria-pressed={choix.fond === f.id} aria-label={f.nom} onClick={() => changer({ fond: f.id })} />
            </li>
          ))}
        </ul>
        <h3 className="av-titre">Ta tête</h3>
        <ul className="av-grille" aria-label="Ta tête">{TETES.filter(t => !t.plus).map(tuile)}</ul>
        <h3 className="av-titre">Avec <RevizPlusBadge /></h3>
        <ul className="av-grille" aria-label="Têtes Réviz+">{TETES.filter(t => t.plus).map(tuile)}</ul>
      </div>
    </div>,
    document.body,
  )}{offre && <RevizPlusSheet onClose={() => setOffre(false)} />}</>)
}
