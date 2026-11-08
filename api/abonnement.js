// -------------------------------------------------------
// Réviz — Abonnement Réviz+ (Stripe) : paiement et portail client
// Les deux routes partagent une seule fonction serverless (le plan Vercel
// Hobby en limite le nombre à 12). Les URL historiques restent valables
// grâce aux réécritures de vercel.json :
//   /api/create-checkout       → /api/abonnement?op=checkout
//   /api/create-billing-portal → /api/abonnement?op=portail
// Et ?op=offrir : la page où un parent offre Réviz+ depuis l'e-mail de son enfant (api/_demandePlus.js).
// -------------------------------------------------------
import checkout, { creerSessionReviz } from './_checkout.js'
import { routeOffrir } from './_demandePlus.js'
import { getDb } from './_firebaseAdmin.js'
import portail from './_billingPortal.js'

export default function handler(req, res) {
  const op = req.query?.op
  if (op === 'checkout') return checkout(req, res)
  if (op === 'portail') return portail(req, res)
  if (op === 'offrir' && (req.method === 'GET' || req.method === 'POST')) {
    return routeOffrir(req, res, { db: getDb(), creerSession: creerSessionReviz }).catch(err => {
      console.error('[offrir]', err?.message || err)
      return res.status(500).send('Erreur')
    })
  }
  return res.status(404).json({ error: 'NOT_FOUND' })
}
