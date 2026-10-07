// -------------------------------------------------------
// Réviz — Init partagé de firebase-admin (Node runtime uniquement)
// Réutilise le même pattern que le webhook Stripe.
// -------------------------------------------------------
import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { getAuth } from 'firebase-admin/auth'

function ensureApp() {
  if (!getApps().length) {
    const credential = JSON.parse(process.env.FIREBASE_ADMIN_CREDENTIAL)
    initializeApp({ credential: cert(credential) })
  }
}

export function getDb() {
  ensureApp()
  return getFirestore()
}

export function getAuthAdmin() {
  ensureApp()
  return getAuth()
}

// Base temps réel de la Battle (instance europe-west1). Import à la demande :
// seules les routes battle chargent le module database.
export async function getRtdb() {
  ensureApp()
  const { getDatabaseWithUrl } = await import('firebase-admin/database')
  return getDatabaseWithUrl(process.env.FIREBASE_DATABASE_URL || process.env.VITE_FIREBASE_DATABASE_URL)
}
