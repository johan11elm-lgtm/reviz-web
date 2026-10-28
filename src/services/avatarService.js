// -------------------------------------------------------
// Réviz — La photo de profil choisie (une tête et une couleur de fond)
//
// Gardée sur l'appareil (affichage immédiat, mode essai compris) et, avec un compte, dans
// users/{uid}.avatar = { tete, fond } pour la retrouver sur un autre appareil (AuthContext la
// reprend du profil). L'événement « reviz-avatar » prévient les avatars affichés.
// -------------------------------------------------------
import { doc, setDoc } from 'firebase/firestore'
import { db } from './firebaseConfig'
import { enTexte, lireChoix } from '../utils/avatars'

const cle = uid => `reviz-avatar-${uid}`
export const EVENEMENT_AVATAR = 'reviz-avatar'

/** Le choix de l'élève, { tete, fond } (le défaut s'il n'a rien choisi). */
export function lireAvatar(uid) {
  let brut = null
  try { brut = uid ? localStorage.getItem(cle(uid)) : null } catch { /* stockage bloqué */ }
  return lireChoix(brut)
}

function retenir(uid, choix) {
  try { localStorage.setItem(cle(uid), enTexte(choix)) } catch { /* stockage plein ou bloqué : l'écran suit quand même */ }
  window.dispatchEvent(new Event(EVENEMENT_AVATAR))
}

/** L'élève change sa tête ou sa couleur : sur l'appareil tout de suite, puis sur son compte. */
export async function choisirAvatar(user, choix) {
  if (!user?.uid) return
  const propre = lireChoix(choix)
  retenir(user.uid, propre)
  if (!user.isGuest) await setDoc(doc(db, 'users', user.uid), { avatar: propre }, { merge: true })
}

/** Nouvel appareil : la photo du profil, si ce navigateur n'en connaît pas encore. */
export function reprendreAvatarDuProfil(uid, avatar) {
  let connu = null
  try { connu = localStorage.getItem(cle(uid)) } catch { /* stockage bloqué */ }
  if (uid && avatar && !connu) retenir(uid, lireChoix(avatar))
}
