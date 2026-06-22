// -------------------------------------------------------
// Réviz — Accès au portail de facturation Stripe (gérer / résilier Réviz+)
// Le customerId est résolu côté serveur depuis le token vérifié.
// -------------------------------------------------------
import { auth } from './firebaseConfig'

/**
 * Ouvre le portail Stripe Billing (redirection pleine page).
 * @throws {Error} 'UNAUTHORIZED' | 'NO_SUBSCRIPTION' | 'HTTP_xxx'
 */
export async function openBillingPortal() {
  const idToken = await auth.currentUser?.getIdToken().catch(() => null)
  if (!idToken) throw new Error('UNAUTHORIZED')

  const res = await fetch('/api/create-billing-portal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok || !data.url) throw new Error(data.error || `HTTP_${res.status}`)
  window.location.href = data.url
}
