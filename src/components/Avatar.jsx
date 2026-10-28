import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { avatarParId } from '../utils/avatars'
import { EVENEMENT_AVATAR, lireAvatar } from '../services/avatarService'
import './Avatar.css'

/** La photo de profil choisie par l'élève (se met à jour quand il en change). */
export function useAvatar() {
  const { currentUser } = useAuth()
  const uid = currentUser?.uid
  const [id, setId] = useState(() => lireAvatar(uid))
  useEffect(() => {
    setId(lireAvatar(uid))
    const suivre = () => setId(lireAvatar(uid))
    window.addEventListener(EVENEMENT_AVATAR, suivre)
    window.addEventListener('storage', suivre)
    return () => { window.removeEventListener(EVENEMENT_AVATAR, suivre); window.removeEventListener('storage', suivre) }
  }, [uid])
  return avatarParId(id)
}

/** La pastille de profil, en autocollant comme le logo (liseré blanc, ombre légère). */
export function Avatar({ size = 40, className = '' }) {
  const avatar = useAvatar()
  return <img className={`rv-avatar ${className}`.trim()} src={avatar.src} width={size} height={size} alt="" decoding="async" draggable={false} />
}
