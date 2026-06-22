// -------------------------------------------------------
// Réviz — Crée une session Stripe Checkout pour Réviz+
// -------------------------------------------------------
import Stripe from 'stripe'
import { getAuthAdmin } from './_firebaseAdmin.js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

const PRICE_MONTHLY = process.env.STRIPE_PRICE_MONTHLY // prix mensuel créé dans Stripe Dashboard
const BASE_URL = 'https://reviz-gamma.vercel.app'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  // Authentification obligatoire : l'uid/email viennent du token vérifié,
  // JAMAIS du body (sinon on peut créer une session sur le compte d'autrui).
  const { idToken } = req.body ?? {}
  if (!idToken) return res.status(401).json({ error: 'Unauthorized' })

  let uid, email
  try {
    const decoded = await getAuthAdmin().verifyIdToken(idToken)
    uid = decoded.uid
    email = decoded.email
  } catch {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer_email: email || undefined,
      metadata: { firebaseUid: uid },
      line_items: [
        {
          price: PRICE_MONTHLY,
          quantity: 1,
        },
      ],
      success_url: `${BASE_URL}/upgrade-success`,
      cancel_url: `${BASE_URL}/scan`,
      locale: 'fr',
    })

    return res.status(200).json({ url: session.url })
  } catch (err) {
    console.error('[create-checkout]', err)
    return res.status(500).json({ error: 'Failed to create checkout session' })
  }
}
