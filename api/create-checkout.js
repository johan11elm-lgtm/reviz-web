// -------------------------------------------------------
// Réviz — Crée une session Stripe Checkout pour Réviz+
// -------------------------------------------------------
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

const PRICE_MONTHLY = process.env.STRIPE_PRICE_MONTHLY // prix mensuel créé dans Stripe Dashboard
const BASE_URL = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : 'http://localhost:5173'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { uid, email } = req.body ?? {}
  if (!uid) return res.status(400).json({ error: 'Missing uid' })

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
      success_url: `${BASE_URL}/?upgraded=true`,
      cancel_url: `${BASE_URL}/scan`,
      locale: 'fr',
    })

    return res.status(200).json({ url: session.url })
  } catch (err) {
    console.error('[create-checkout]', err)
    return res.status(500).json({ error: 'Failed to create checkout session' })
  }
}
