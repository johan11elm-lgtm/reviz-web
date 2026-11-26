// -------------------------------------------------------
// Réviz — Crée une session Stripe Checkout pour Réviz+
// -------------------------------------------------------
import Stripe from 'stripe'
import { getAuthAdmin, getDb } from './_firebaseAdmin.js'
import { compteVerifie } from './_compteVerifie.js'
import { FORMULES, FORMULE_PAR_DEFAUT, prixDe } from './_prix.js'
import { VENTES_OUVERTES, FIN_LANCEMENT, tarifFondateurOuvert } from './_lancement.js'
import { PASS_BREVET, passActif, remiseDe } from './_offres.js'

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
export async function creerSessionReviz({ uid, email = null, formule, profil = null, successUrl = null, cancelUrl = null, parent = false, cadeau = false, maintenant = Date.now() }) {
  // Pass brevet (26/11) : paiement unique, Réviz+ jusqu'au brevet (api/_offres.js).
  if (formule === PASS_BREVET.formule) return creerSessionPass({ uid, email, profil, successUrl, cancelUrl, parent, cadeau, maintenant })
  // Tarif fondateur : abonnement pris avant la bascule, décidé ici d'après
  // l'heure du serveur, jamais d'après ce que le client envoie.
  const fondateur = tarifFondateurOuvert()
  const price = await stripePriceId(prixDe(formule, fondateur).lookupKey)
  if (!price) {
    console.error('[create-checkout] prix introuvable', formule, fondateur)
    throw new Error('PRICE_NOT_FOUND')
  }
  // Black Friday ou fin d'essai : remise décidée ici (heure du serveur, profil Firestore).
  const remise = remiseDe(formule, { profil, maintenant, fondateur })
  const tu = !parent
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    customer_email: email || undefined,
    // formule et fondateur aussi sur la session : le webhook les recopie
    // dans le profil (récapitulatif de l'abonnement dans les Réglages).
    metadata: { ...(uid && { firebaseUid: uid }), formule, fondateur: String(fondateur), ...(parent && { payeur: 'parent' }), ...(cadeau && { cadeau: '1' }), ...(remise && { remise: remise.raison }) },
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
    // Stripe refuse une remise ET la saisie d'un code promo : la remise du moment l'emporte.
    ...(remise ? { discounts: [{ coupon: remise.coupon }] } : { allow_promotion_codes: true }),
    success_url: successUrl ?? `${BASE_URL}/upgrade-success?formule=${formule}${fondateur ? '&fondateur=1' : ''}${remise ? `&prix=${encodeURIComponent(remise.montant)}` : ''}`,
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

/** Le Pass brevet : un paiement unique, Réviz+ jusqu'au brevet, rien à résilier. */
async function creerSessionPass({ uid, email, successUrl, cancelUrl, parent, cadeau, maintenant }) {
  if (!passActif(maintenant)) throw new Error('PASS_FINI')
  const price = await stripePriceId(PASS_BREVET.lookupKey)
  if (!price) {
    console.error('[create-checkout] prix du Pass brevet introuvable')
    throw new Error('PRICE_NOT_FOUND')
  }
  const remise = remiseDe(PASS_BREVET.formule, { maintenant })
  const tu = !parent
  const metadata = { ...(uid && { firebaseUid: uid }), formule: PASS_BREVET.formule, ...(parent && { payeur: 'parent' }), ...(cadeau && { cadeau: '1' }), ...(remise && { remise: remise.raison }) }
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    customer_email: email || undefined,
    customer_creation: 'always',
    metadata,
    payment_intent_data: { metadata },
    line_items: [{ price, quantity: 1 }],
    ...(remise ? { discounts: [{ coupon: remise.coupon }] } : { allow_promotion_codes: true }),
    success_url: successUrl ?? `${BASE_URL}/upgrade-success?formule=pass${remise ? `&prix=${encodeURIComponent(remise.montant)}` : ''}`,
    custom_text: {
      submit: {
        message: `Paiement unique : Réviz+ jusqu'au ${PASS_BREVET.finTexte}, sans abonnement ni renouvellement. En validant, ${tu ? 'tu acceptes' : 'vous acceptez'} les CGV : ${BASE_URL}/legal/cgv`,
      },
    },
    cancel_url: cancelUrl ?? `${BASE_URL}/scan?revizplus=annule`,
    locale: 'fr',
  })
  return session.url
}

/** Le profil Firestore de l'élève (pour l'offre de fin d'essai) ; null si illisible. */
async function lireProfil(uid) {
  try {
    const snap = await getDb().collection('users').doc(uid).get()
    return snap.exists ? snap.data() : null
  } catch (err) {
    console.warn('[create-checkout] profil illisible', err?.message || err)
    return null
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  // Ventes fermées tant que Stripe n'est pas en réel (api/_lancement.js).
  if (!VENTES_OUVERTES) return res.status(403).json({ error: 'VENTES_FERMEES' })

  // Authentification obligatoire : l'uid/email viennent du token vérifié,
  // JAMAIS du body (sinon on peut créer une session sur le compte d'autrui).
  const { idToken, formule: formuleDemandee } = req.body ?? {}
  const formule = [...FORMULES, PASS_BREVET.formule].includes(formuleDemandee) ? formuleDemandee : FORMULE_PAR_DEFAUT
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
    const profil = await lireProfil(uid)
    const url = await creerSessionReviz({ uid, email, formule, profil })
    return res.status(200).json({ url })
  } catch (err) {
    if (err?.message === 'PRICE_NOT_FOUND') return res.status(500).json({ error: 'PRICE_NOT_FOUND' })
    if (err?.message === 'PASS_FINI') return res.status(410).json({ error: 'PASS_FINI' })
    console.error('[create-checkout]', err)
    return res.status(500).json({ error: 'Failed to create checkout session' })
  }
}
