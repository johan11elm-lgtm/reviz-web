// -------------------------------------------------------
// Réviz — Webhook Stripe (gère les événements de paiement)
// -------------------------------------------------------
import Stripe from 'stripe'
import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

function getDb() {
  if (!getApps().length) {
    const credential = JSON.parse(process.env.FIREBASE_ADMIN_CREDENTIAL)
    initializeApp({ credential: cert(credential) })
  }
  return getFirestore()
}

// Vercel : désactiver le body parsing pour recevoir le raw body
export const config = {
  api: { bodyParser: false },
}

async function getRawBody(req) {
  const chunks = []
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk)
  }
  return Buffer.concat(chunks)
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const sig = req.headers['stripe-signature']
  const rawBody = await getRawBody(req)

  let event
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    )
  } catch (err) {
    console.error('[stripe-webhook] Signature verification failed:', err.message)
    return res.status(400).send(`Webhook Error: ${err.message}`)
  }

  const db = getDb()

  switch (event.type) {
    // Abonnement créé ou paiement réussi
    case 'checkout.session.completed': {
      const session = event.data.object
      const uid = session.metadata?.firebaseUid
      if (uid) {
        await db.collection('users').doc(uid).set(
          {
            plan: 'premium',
            stripeCustomerId: session.customer,
            stripeSubscriptionId: session.subscription,
            upgradedAt: Date.now(),
          },
          { merge: true }
        )
        console.log(`[stripe-webhook] User ${uid} upgraded to premium`)
      }
      break
    }

    // Abonnement annulé
    case 'customer.subscription.deleted': {
      const subscription = event.data.object
      // Trouver l'utilisateur par stripeCustomerId
      const snap = await db.collection('users')
        .where('stripeCustomerId', '==', subscription.customer)
        .get()
      if (!snap.empty) {
        const userDoc = snap.docs[0]
        await userDoc.ref.update({ plan: 'free' })
        console.log(`[stripe-webhook] User ${userDoc.id} downgraded to free`)
      }
      break
    }

    default:
      // Ignorer les autres événements
      break
  }

  return res.status(200).json({ received: true })
}
