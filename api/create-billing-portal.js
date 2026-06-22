// -------------------------------------------------------
// Réviz — Crée une session Stripe Billing Portal
// Permet à l'élève (ou son parent) de gérer/résilier l'abonnement Réviz+.
// -------------------------------------------------------
import Stripe from 'stripe'
import { getAuthAdmin, getDb } from './_firebaseAdmin.js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
const BASE_URL = 'https://reviz-gamma.vercel.app'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  // Authentification obligatoire : le customerId est lu côté serveur depuis le
  // profil de l'uid vérifié, jamais fourni par le client.
  const { idToken } = req.body ?? {}
  if (!idToken) return res.status(401).json({ error: 'Unauthorized' })

  let uid
  try {
    uid = (await getAuthAdmin().verifyIdToken(idToken)).uid
  } catch {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    const snap = await getDb().collection('users').doc(uid).get()
    const customerId = snap.exists ? snap.data().stripeCustomerId : null
    if (!customerId) return res.status(404).json({ error: 'NO_SUBSCRIPTION' })

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${BASE_URL}/profil`,
    })

    return res.status(200).json({ url: session.url })
  } catch (err) {
    console.error('[create-billing-portal]', err?.message || err)
    return res.status(500).json({ error: 'Failed to create portal session' })
  }
}
