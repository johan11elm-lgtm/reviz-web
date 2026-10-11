// -------------------------------------------------------
// Réviz — Crée une session Stripe Checkout pour Réviz+
// -------------------------------------------------------
import Stripe from 'stripe'
import { getAuthAdmin } from './_firebaseAdmin.js'
import { compteVerifie } from './_compteVerifie.js'
import { FORMULES, FORMULE_PAR_DEFAUT, prixDe } from './_prix.js'
import { estFondateur } from '../src/utils/revizPlus.js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

const BASE_URL = 'https://app.revizapp.fr'

// Prix Stripe retrouvé par lookup_key (mêmes clés en test et en réel).
async function stripePriceId(lookupKey) {
  const { data } = await stripe.prices.list({ lookup_keys: [lookupKey], active: true, limit: 1 })
  return data[0]?.id ?? null
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  // Authentification obligatoire : l'uid/email viennent du token vérifié,
  // JAMAIS du body (sinon on peut créer une session sur le compte d'autrui).
  const { idToken, formule: formuleDemandee } = req.body ?? {}
  const formule = FORMULES.includes(formuleDemandee) ? formuleDemandee : FORMULE_PAR_DEFAUT
  if (!idToken) return res.status(401).json({ error: 'Unauthorized' })

  let uid, email
  try {
    const decoded = await getAuthAdmin().verifyIdToken(idToken)
    uid = decoded.uid
    email = decoded.email
    // Pas de paiement sans compte vérifié (claim signé du token, pas le client).
    if (!compteVerifie(decoded)) {
      return res.status(403).json({ error: 'EMAIL_NOT_VERIFIED' })
    }
  } catch {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    // Tarif fondateur : décidé ici, d'après la date de création du compte
    // côté Firebase, jamais d'après ce que le client envoie.
    const user = await getAuthAdmin().getUser(uid)
    const fondateur = estFondateur(user?.metadata?.creationTime)
    const price = await stripePriceId(prixDe(formule, fondateur).lookupKey)
    if (!price) {
      console.error('[create-checkout] prix introuvable', formule, fondateur)
      return res.status(500).json({ error: 'PRICE_NOT_FOUND' })
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer_email: email || undefined,
      metadata: { firebaseUid: uid },
      subscription_data: { metadata: { firebaseUid: uid, formule, fondateur: String(fondateur) } },
      line_items: [{ price, quantity: 1 }],
      allow_promotion_codes: true,
      success_url: `${BASE_URL}/upgrade-success?formule=${formule}${fondateur ? '&fondateur=1' : ''}`,
      cancel_url: `${BASE_URL}/scan`,
      locale: 'fr',
    })

    return res.status(200).json({ url: session.url })
  } catch (err) {
    console.error('[create-checkout]', err)
    return res.status(500).json({ error: 'Failed to create checkout session' })
  }
}
