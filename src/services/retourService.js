// -------------------------------------------------------
// Réviz — jours d'ouverture (mesure des retours)
// Une fois par jour et par appareil, à l'ouverture de l'app :
// - compte : le jour (AAAA-MM-JJ) rejoint users/{uid}.joursActifs, ce qui
//   donne le retour à J+1 / J+7 de chaque élève inscrit ;
// - essai comme compte : /api/track compte une « ouverture » avec
//   l'ancienneté (jours depuis le début de l'essai ou du compte), sans
//   identifiant, pour suivre les retours des essais sans compte.
// Le seul repère gardé sur l'appareil est la date de la dernière ouverture.
// -------------------------------------------------------
import { db } from './firebaseConfig'
import { doc, updateDoc, arrayUnion } from 'firebase/firestore'
import { isGuestUid, readGuest } from './guestService'
import { track } from './statsService'

/** Date à Paris, au format AAAA-MM-JJ. */
export function jourParis(t = Date.now()) {
  return new Intl.DateTimeFormat('fr-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' }).format(t)
}

/** Nombre de jours entre deux dates AAAA-MM-JJ. */
export function ecartJours(debut, fin) {
  return Math.round((Date.parse(fin) - Date.parse(debut)) / 864e5)
}

/** Tranche d'ancienneté envoyée au compteur (liste fermée côté serveur). */
export function tranche(mode, n) {
  const t = n <= 0 ? 'j0' : n === 1 ? 'j1' : n <= 7 ? 'j2_7' : n <= 30 ? 'j8_30' : 'j31_plus'
  return `${mode}_${t}`
}

const cle = uid => `reviz-ouverture-${uid}`

/**
 * Note l'ouverture du jour pour cet utilisateur (sans effet au-delà de la
 * première fois dans la journée). Ne lève jamais d'erreur.
 * @param {{uid: string, isAnonymous?: boolean, metadata?: {creationTime?: string}}|null} user
 */
export function noterOuverture(user, now = Date.now()) {
  // Les invités anonymes de Battle n'ont ni essai ni compte à suivre.
  if (!user?.uid || (user.isAnonymous && !isGuestUid(user.uid))) return
  const jour = jourParis(now)
  try {
    if (localStorage.getItem(cle(user.uid)) === jour) return
    localStorage.setItem(cle(user.uid), jour)
  } catch { return }

  const essai = isGuestUid(user.uid)
  const debut = essai ? readGuest()?.createdAt : Date.parse(user.metadata?.creationTime ?? '')
  const n = Number.isFinite(debut) ? ecartJours(jourParis(debut), jour) : null
  track('ouverture', n == null ? {} : { anciennete: tranche(essai ? 'essai' : 'compte', n) })

  // updateDoc et non setDoc : on ne crée jamais le profil à la place de
  // l'inscription (sans profil, le jour de création suffit : createdAt).
  if (!essai) {
    updateDoc(doc(db, 'users', user.uid), { joursActifs: arrayUnion(jour) }).catch(() => {})
  }
}
