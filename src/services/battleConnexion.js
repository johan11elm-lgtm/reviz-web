// -------------------------------------------------------
// Réviz — Connexion de la Battle à Realtime Database
//
// Fournit le contexte { db, uid, avecCompte, jeton } attendu par
// battleService.js. Un élève connecté joue avec son compte ; sinon (mode
// essai, lien ouvert sans être connecté) il joue en invité : connexion
// anonyme sur une SECONDE instance Firebase, pour ne jamais toucher à la
// session de l'app (AuthContext ne voit pas cet invité). L'invité ne donne
// qu'un prénom, et son aura n'est gardée nulle part (api/battle-fin.js).
// En mode émulateur (VITE_FIREBASE_EMULATOR=1, e2e), la base locale du
// projet demo-reviz ; sinon VITE_FIREBASE_DATABASE_URL (europe-west1).
// -------------------------------------------------------
import { initializeApp } from 'firebase/app'
import {
  getAuth, initializeAuth, indexedDBLocalPersistence, connectAuthEmulator, signInAnonymously,
} from 'firebase/auth'
import { getDatabase, connectDatabaseEmulator } from 'firebase/database'
import { Capacitor } from '@capacitor/core'
import { app, auth } from './firebaseConfig'

const useEmulator = import.meta.env.VITE_FIREBASE_EMULATOR === '1'
const URL_BASE = useEmulator
  ? 'https://demo-reviz-default-rtdb.firebaseio.com'
  : import.meta.env.VITE_FIREBASE_DATABASE_URL

function ouvrirBase(appli) {
  const db = getDatabase(appli, URL_BASE)
  if (useEmulator) connectDatabaseEmulator(db, '127.0.0.1', 9000)
  return db
}

let dbCompte = null
export function battleDb() {
  dbCompte ??= ouvrirBase(app)
  return dbCompte
}

let invite = null
function instanceInvite() {
  if (invite) return invite
  const appli = initializeApp(app.options, 'battle-invite')
  const authInvite = Capacitor.isNativePlatform()
    ? initializeAuth(appli, { persistence: indexedDBLocalPersistence })
    : getAuth(appli)
  if (useEmulator) connectAuthEmulator(authInvite, 'http://127.0.0.1:9099', { disableWarnings: true })
  invite = { auth: authInvite, db: ouvrirBase(appli) }
  return invite
}

/**
 * Le contexte de jeu : le compte de l'élève connecté, sinon un invité anonyme
 * (le même d'une visite à l'autre sur cet appareil).
 * @returns {Promise<{ db, uid: string, avecCompte: boolean, jeton: () => Promise<string> }>}
 */
export async function contexteBattle() {
  await auth.authStateReady()
  const compte = auth.currentUser
  if (compte) return { db: battleDb(), uid: compte.uid, avecCompte: true, jeton: () => compte.getIdToken() }
  const { auth: authInvite, db } = instanceInvite()
  await authInvite.authStateReady()
  const utilisateur = authInvite.currentUser ?? (await signInAnonymously(authInvite)).user
  return { db, uid: utilisateur.uid, avecCompte: false, jeton: () => utilisateur.getIdToken() }
}

// Prénom de l'invité sans compte, gardé sur l'appareil pour la prochaine partie.
const CLE_PRENOM = 'reviz-battle-prenom'
export function prenomInvite() {
  try { return localStorage.getItem(CLE_PRENOM) ?? '' } catch { return '' }
}
export function retenirPrenomInvite(prenom) {
  try { localStorage.setItem(CLE_PRENOM, prenom) } catch { /* stockage indisponible */ }
}
