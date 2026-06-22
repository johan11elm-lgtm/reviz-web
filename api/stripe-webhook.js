// -------------------------------------------------------
// Réviz — Webhook Stripe (gère les événements d'abonnement)
// Plan dérivé du STATUT d'abonnement, avec période de grâce :
//   active / trialing / past_due  → premium  (past_due = Stripe relance le paiement)
//   unpaid / canceled / autres    → free
// -------------------------------------------------------
import Stripe from 'stripe'
import { getDb } from './_firebaseAdmin.js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

// Vercel : désactiver le body parsing pour recevoir le raw body (vérif. signature).
export const config = {
  api: { bodyParser: false },
}

// Période de grâce : un impayé en cours de relance (past_due) reste premium.
// On ne déclasse qu'une fois l'abonnement réellement perdu.
export function planForStatus(status) {
  if (status === 'active' || status === 'trialing' || status === 'past_due') return 'premium'
  return 'free' // unpaid, canceled, incomplete, incomplete_expired, paused…
}

async function getRawBody(req) {
  const chunks = []
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk)
  }
  return Buffer.concat(chunks)
}

async function userRefByCustomer(db, customerId) {
  const snap = await db.collection('users')
    .where('stripeCustomerId', '==', customerId)
    .get()
  return snap.empty ? null : snap.docs[0].ref
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const sig = req.headers['stripe-signature']
  const rawBody = await getRawBody(req)

  let event
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    console.error('[stripe-webhook] Signature verification failed:', err.message)
    return res.status(400).send(`Webhook Error: ${err.message}`)
  }

  const db = getDb()

  // Idempotence : un même event re-livré par Stripe ne doit pas être retraité
  // (évite d'écraser upgradedAt ou de rejouer une transition de plan).
  const eventRef = db.collection('stripeEvents').doc(event.id)
  if ((await eventRef.get()).exists) {
    return res.status(200).json({ received: true, duplicate: true })
  }
  await eventRef.set({ type: event.type, at: Date.now() })

  switch (event.type) {
    // Abonnement créé / premier paiement réussi
    case 'checkout.session.completed': {
      const session = event.data.object
      const uid = session.metadata?.firebaseUid
      if (uid) {
        await db.collection('users').doc(uid).set(
          {
            plan: 'premium',
            stripeCustomerId: session.customer,
            stripeSubscriptionId: session.subscription,
            subscriptionStatus: 'active',
            upgradedAt: Date.now(),
          },
          { merge: true }
        )
        console.log(`[stripe-webhook] User ${uid} upgraded to premium`)
      }
      break
    }

    // Changement de statut d'abonnement (renouvellement, impayé, reprise…)
    case 'customer.subscription.updated': {
      const sub = event.data.object
      const ref = await userRefByCustomer(db, sub.customer)
      if (ref) {
        const plan = planForStatus(sub.status)
        await ref.update({ plan, subscriptionStatus: sub.status, planUpdatedAt: Date.now() })
        console.log(`[stripe-webhook] customer ${sub.customer} → ${sub.status} → ${plan}`)
      }
      break
    }

    // Abonnement supprimé / définitivement annulé
    case 'customer.subscription.deleted': {
      const sub = event.data.object
      const ref = await userRefByCustomer(db, sub.customer)
      if (ref) {
        await ref.update({ plan: 'free', subscriptionStatus: 'canceled', planUpdatedAt: Date.now() })
        console.log(`[stripe-webhook] customer ${sub.customer} downgraded to free (deleted)`)
      }
      break
    }

    // Échec de paiement : période de grâce → on NE déclasse PAS ici.
    // Stripe fait passer l'abonnement en past_due puis unpaid/canceled,
    // ce qui est géré par customer.subscription.updated / .deleted.
    case 'invoice.payment_failed': {
      const invoice = event.data.object
      console.warn(`[stripe-webhook] payment_failed customer ${invoice.customer} (période de grâce, pas de déclassement)`)
      break
    }

    default:
      break
  }

  return res.status(200).json({ received: true })
}
