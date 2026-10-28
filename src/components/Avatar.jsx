import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { avatarAffiche } from '../utils/avatars'
import { EVENEMENT_AVATAR, lireAvatar } from '../services/avatarService'
import './Avatar.css'

/** Le choix de l'élève { tete, fond }, à jour quand il en change. */
export function useChoixAvatar() {
  const { currentUser } = useAuth()
  const uid = currentUser?.uid
  const [choix, setChoix] = useState(() => lireAvatar(uid))
  useEffect(() => {
    setChoix(lireAvatar(uid))
    const suivre = () => setChoix(lireAvatar(uid))
    window.addEventListener(EVENEMENT_AVATAR, suivre)
    window.addEventListener('storage', suivre)
    return () => { window.removeEventListener(EVENEMENT_AVATAR, suivre); window.removeEventListener('storage', suivre) }
  }, [uid])
  return choix
}

/**
 * La photo de profil en autocollant, comme la pastille du logo : la tête sur son disque de
 * couleur, liseré blanc. `tete` et `fond` (objets d'utils/avatars) l'imposent, pour le choix.
 */
export function Avatar({ size = 40, className = '', tete, fond }) {
  const { hasRevizPlus } = useAuth()
  const affiche = avatarAffiche(useChoixAvatar(), hasRevizPlus)
  const t = tete ?? affiche.tete
  const f = fond ?? affiche.fond
  return (
    <span className={`rv-avatar ${className}`.trim()} style={{ width: size, height: size, '--av-fond': f.couleur }}>
      <img src={t.src} width={size} height={size} alt="" decoding="async" draggable={false} />
    </span>
  )
}
