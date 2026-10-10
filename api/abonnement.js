// -------------------------------------------------------
// Réviz — Abonnement Réviz+ (Stripe) : paiement et portail client
// Les deux routes partagent une seule fonction serverless (le plan Vercel
// Hobby en limite le nombre à 12). Les URL historiques restent valables
// grâce aux réécritures de vercel.json :
//   /api/create-checkout       → /api/abonnement?op=checkout
//   /api/create-billing-portal → /api/abonnement?op=portail
// -------------------------------------------------------
import checkout from './_checkout.js'
import portail from './_billingPortal.js'

export default function handler(req, res) {
  const op = req.query?.op
  if (op === 'checkout') return checkout(req, res)
  if (op === 'portail') return portail(req, res)
  return res.status(404).json({ error: 'NOT_FOUND' })
}
