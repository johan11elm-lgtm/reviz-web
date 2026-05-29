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
