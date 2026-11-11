// -------------------------------------------------------
// Réviz — Abonnement Réviz+ (Stripe) : paiement et portail client
// Les deux routes partagent une seule fonction serverless (le plan Vercel
// Hobby en limite le nombre à 12). Les URL historiques restent valables
// grâce aux réécritures de vercel.json :
//   /api/create-checkout       → /api/abonnement?op=checkout
//   /api/create-billing-portal → /api/abonnement?op=portail
// Et ?op=offrir : la page où un parent offre Réviz+ depuis l'e-mail de son enfant (api/_demandePlus.js).
// Et ?op=cadeau (POST) : Réviz+ offert par un parent sur /parents, sans compte, puis activé par
// l'enfant avec son code (api/_cadeau.js).
// -------------------------------------------------------
import checkout, { creerSessionReviz, stripe } from './_checkout.js'
import { routeCadeau } from './_cadeau.js'
import { routeOffrir } from './_demandePlus.js'
import { getDb, getAuthAdmin } from './_firebaseAdmin.js'
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
  if (op === 'cadeau' && req.method === 'POST') {
    return routeCadeau(req, res, { db: getDb(), auth: getAuthAdmin(), stripe, creerSession: creerSessionReviz }).catch(err => {
      console.error('[cadeau]', err?.message || err)
      return res.status(500).json({ error: 'ERREUR' })
    })
  }
  return res.status(404).json({ error: 'NOT_FOUND' })
}
