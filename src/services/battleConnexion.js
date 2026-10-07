// -------------------------------------------------------
// Réviz — Connexion de la Battle à Realtime Database
//
// Fournit le contexte { db, uid } attendu par battleService.js. En mode
// émulateur (VITE_FIREBASE_EMULATOR=1, e2e), la base locale du projet
// demo-reviz ; sinon l'instance de VITE_FIREBASE_DATABASE_URL (région
// europe-west1, à créer dans la console Firebase).
// -------------------------------------------------------
import { getDatabase, connectDatabaseEmulator } from 'firebase/database'
import { app, auth } from './firebaseConfig'

const useEmulator = import.meta.env.VITE_FIREBASE_EMULATOR === '1'
let db = null

export function battleDb() {
  if (db) return db
  if (useEmulator) {
    db = getDatabase(app, 'https://demo-reviz-default-rtdb.firebaseio.com')
    connectDatabaseEmulator(db, '127.0.0.1', 9000)
  } else {
    db = getDatabase(app, import.meta.env.VITE_FIREBASE_DATABASE_URL)
  }
  return db
}

/** Le contexte de jeu de l'élève connecté (null s'il ne l'est pas). */
export function contexteBattle() {
  const uid = auth.currentUser?.uid
  return uid ? { db: battleDb(), uid } : null
}
