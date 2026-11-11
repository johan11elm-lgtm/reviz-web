// -------------------------------------------------------
// Réviz — Crée une session Stripe Checkout pour Réviz+
// -------------------------------------------------------
import Stripe from 'stripe'
import { getAuthAdmin } from './_firebaseAdmin.js'
import { compteVerifie } from './_compteVerifie.js'
import { FORMULES, FORMULE_PAR_DEFAUT, prixDe } from './_prix.js'
import { VENTES_OUVERTES, FIN_LANCEMENT, tarifFondateurOuvert } from './_lancement.js'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

const BASE_URL = 'https://app.revizapp.fr'

// Prix Stripe retrouvé par lookup_key (mêmes clés en test et en réel).
async function stripePriceId(lookupKey) {
  const { data } = await stripe.prices.list({ lookup_keys: [lookupKey], active: true, limit: 1 })
  return data[0]?.id ?? null
}

/**
 * Crée la session Stripe Checkout de Réviz+ pour un compte (uid vérifié par l'appelant).
 * parent : c'est un parent qui paie depuis son e-mail (api/_demandePlus.js) — retour vers
 * des pages sans connexion, texte au « vous ».
 * cadeau : un parent paie sur /parents sans élève rattaché (api/_cadeau.js) ; le code de son enfant
 * rattachera l'abonnement à un compte.
 * @returns {Promise<string>} l'URL de paiement
 */
export async function creerSessionReviz({ uid, email = null, formule, successUrl = null, cancelUrl = null, parent = false, cadeau = false }) {
  // Tarif fondateur : abonnement pris avant la bascule, décidé ici d'après
  // l'heure du serveur, jamais d'après ce que le client envoie.
  const fondateur = tarifFondateurOuvert()
  const price = await stripePriceId(prixDe(formule, fondateur).lookupKey)
  if (!price) {
    console.error('[create-checkout] prix introuvable', formule, fondateur)
    throw new Error('PRICE_NOT_FOUND')
  }
  const tu = !parent
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    customer_email: email || undefined,
    // formule et fondateur aussi sur la session : le webhook les recopie
    // dans le profil (récapitulatif de l'abonnement dans les Réglages).
    metadata: { ...(uid && { firebaseUid: uid }), formule, fondateur: String(fondateur), ...(parent && { payeur: 'parent' }), ...(cadeau && { cadeau: '1' }) },
    subscription_data: {
      metadata: { ...(uid && { firebaseUid: uid }), formule, fondateur: String(fondateur), ...(parent && { payeur: 'parent' }), ...(cadeau && { cadeau: '1' }) },
      // Avant la bascule : carte enregistrée, rien de prélevé avant le
      // 26 octobre (période d'ici là non facturée), puis à chaque échéance.
      ...(fondateur && {
        billing_cycle_anchor: Math.floor(Date.parse(FIN_LANCEMENT) / 1000),
        proration_behavior: 'none',
      }),
    },
    line_items: [{ price, quantity: 1 }],
    allow_promotion_codes: true,
    success_url: successUrl ?? `${BASE_URL}/upgrade-success?formule=${formule}${fondateur ? '&fondateur=1' : ''}`,
    payment_method_collection: 'always',
    // Rappel des CGV au-dessus du bouton de paiement.
    custom_text: {
      submit: {
        message: fondateur
          ? `Rien n'est prélevé avant le 26 octobre ; ${tu ? 'tu peux' : 'vous pouvez'} annuler d'ici là depuis les Réglages. Ensuite, renouvellement automatique, résiliable à tout moment. En validant, ${tu ? 'tu acceptes' : 'vous acceptez'} les CGV : ${BASE_URL}/legal/cgv`
          : `Renouvellement automatique, résiliable à tout moment${tu ? ' depuis les Réglages' : ''}. En validant, ${tu ? 'tu acceptes' : 'vous acceptez'} les CGV : ${BASE_URL}/legal/cgv`,
      },
    },
    cancel_url: cancelUrl ?? `${BASE_URL}/scan?revizplus=annule`,
    locale: 'fr',
  })
  return session.url
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  // Ventes fermées tant que Stripe n'est pas en réel (api/_lancement.js).
  if (!VENTES_OUVERTES) return res.status(403).json({ error: 'VENTES_FERMEES' })

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
    const url = await creerSessionReviz({ uid, email, formule })
    return res.status(200).json({ url })
  } catch (err) {
    if (err?.message === 'PRICE_NOT_FOUND') return res.status(500).json({ error: 'PRICE_NOT_FOUND' })
    console.error('[create-checkout]', err)
    return res.status(500).json({ error: 'Failed to create checkout session' })
  }
}
