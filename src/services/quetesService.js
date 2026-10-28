// -------------------------------------------------------
// Réviz — les récompenses de quêtes récupérées (29/10)
// La progression des quêtes se lit dans les révisions (utils/quetes.js). Ici,
// seulement ce que l'élève a récupéré : { 'j2026-10-29:combo5': 50, … }, gardé
// sur l'appareil (mode essai compris) et, avec un compte, dans
// users/{uid}.quetes pour le retrouver ailleurs (AuthContext le reprend du
// profil). L'événement « reviz-quetes » prévient les écrans affichés.
// -------------------------------------------------------
import { doc, setDoc } from 'firebase/firestore'
import { db } from './firebaseConfig'
import { isGuestUid } from './guestService'
import { xpDesQuetes } from '../utils/quetes'

const cle = uid => `reviz-quetes-${uid ?? 'invite'}`
export const EVENEMENT_QUETES = 'reviz-quetes'

/** Les récompenses déjà récupérées par l'élève. */
export function lireReclamees(uid) {
  try { return JSON.parse(localStorage.getItem(cle(uid)) || '{}') ?? {} } catch { return {} }
}

function retenir(uid, reclamees) {
  try { localStorage.setItem(cle(uid), JSON.stringify(reclamees)) } catch { /* stockage plein ou bloqué */ }
  window.dispatchEvent(new Event(EVENEMENT_QUETES))
}

/** Le total des XP de quêtes de l'élève (pour son niveau). */
export const xpQuetes = uid => xpDesQuetes(lireReclamees(uid))

/**
 * Récupère la récompense d'une quête faite : sur l'appareil tout de suite, puis sur le compte.
 * @param {string|null} uid
 * @param {{ cle: string, xp: number, faite: boolean, recuperee: boolean }} quete
 * @returns {Promise<boolean>} true si la récompense vient d'être ajoutée
 */
export async function recupererQuete(uid, quete) {
  if (!quete?.faite || quete.recuperee) return false
  const reclamees = lireReclamees(uid)
  if (quete.cle in reclamees) return false
  retenir(uid, { ...reclamees, [quete.cle]: quete.xp })
  if (uid && !isGuestUid(uid)) {
    await setDoc(doc(db, 'users', uid), { quetes: { [quete.cle]: quete.xp } }, { merge: true }).catch(() => {})
  }
  return true
}

/** Nouvel appareil : les récompenses du profil s'ajoutent à celles de l'appareil. */
export function reprendreQuetesDuProfil(uid, quetes) {
  if (!uid || !quetes || typeof quetes !== 'object') return
  const reclamees = lireReclamees(uid)
  const manquantes = Object.entries(quetes).filter(([k, v]) => !(k in reclamees) && Number.isFinite(v))
  if (manquantes.length) retenir(uid, { ...reclamees, ...Object.fromEntries(manquantes) })
}
