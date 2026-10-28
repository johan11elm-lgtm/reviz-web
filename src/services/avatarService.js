// -------------------------------------------------------
// Réviz — La photo de profil choisie
//
// Gardée sur l'appareil (affichage immédiat, mode essai compris) et, avec un compte, dans
// users/{uid}.avatar pour la retrouver sur un autre appareil (AuthContext la reprend du profil).
// L'événement « reviz-avatar » prévient les avatars affichés (menu du haut, accueil, Moi).
// -------------------------------------------------------
import { doc, setDoc } from 'firebase/firestore'
import { db } from './firebaseConfig'

const cle = uid => `reviz-avatar-${uid}`
export const EVENEMENT_AVATAR = 'reviz-avatar'

export function lireAvatar(uid) {
  if (!uid) return null
  try { return localStorage.getItem(cle(uid)) } catch { return null }
}

function retenir(uid, id) {
  try { localStorage.setItem(cle(uid), id) } catch { /* stockage plein ou bloqué : l'écran suit quand même */ }
  window.dispatchEvent(new Event(EVENEMENT_AVATAR))
}

/** L'élève choisit sa photo : sur l'appareil tout de suite, puis sur son compte. */
export async function choisirAvatar(user, id) {
  if (!user?.uid) return
  retenir(user.uid, id)
  if (!user.isGuest) await setDoc(doc(db, 'users', user.uid), { avatar: id }, { merge: true })
}

/** Nouvel appareil : la photo du profil, si ce navigateur n'en connaît pas encore. */
export function reprendreAvatarDuProfil(uid, id) {
  if (uid && id && !lireAvatar(uid)) retenir(uid, id)
}
