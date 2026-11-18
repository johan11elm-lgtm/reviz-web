// -------------------------------------------------------
// Réviz — Webhook RevenueCat (abonnements Réviz+ achetés dans l'app iOS)
// RevenueCat envoie l'en-tête Authorization réglé dans son tableau de bord : on le compare à
// REVENUECAT_WEBHOOK_AUTH. Quel que soit l'événement (achat, renouvellement, résiliation,
// remboursement, transfert…), on relit l'abonné chez RevenueCat et on reporte (api/_apple.js).
// -------------------------------------------------------
import { timingSafeEqual } from 'node:crypto'
import { getDb } from './_firebaseAdmin.js'
import { synchroniserApple, uidsDeLEvenement } from './_apple.js'

function memeSecret(recu, attendu) {
  const a = Buffer.from(String(recu ?? ''))
  const b = Buffer.from(String(attendu ?? ''))
  return a.length === b.length && a.length > 0 && timingSafeEqual(a, b)
}

export async function traiterEvenement(event, { db, synchroniser = synchroniserApple, ...deps }) {
  const uids = uidsDeLEvenement(event)
  const resultats = {}
  for (const uid of uids) {
    const r = await synchroniser(db, uid, deps)
    resultats[uid] = r.plan
  }
  return resultats
}

export default async function handler(req, res, deps = {}) {
  if (req.method !== 'POST') return res.status(405).end()
  const attendu = deps.secret ?? process.env.REVENUECAT_WEBHOOK_AUTH
  if (!attendu) {
    console.error('[revenuecat-webhook] REVENUECAT_WEBHOOK_AUTH manquante')
    return res.status(500).json({ error: 'CONFIG' })
  }
  if (!memeSecret(req.headers?.authorization, attendu)) return res.status(401).json({ error: 'UNAUTHORIZED' })

  const event = req.body?.event
  if (!event?.type) return res.status(400).json({ error: 'EVENEMENT' })
  if (event.type === 'TEST') return res.status(200).json({ received: true, test: true })

  try {
    const resultats = await traiterEvenement(event, { db: deps.db ?? getDb(), ...deps })
    console.log(`[revenuecat-webhook] ${event.type} ${event.product_id ?? ''} →`, resultats)
    return res.status(200).json({ received: true })
  } catch (err) {
    // 500 : RevenueCat renvoie l'événement plus tard (jusqu'à 5 fois).
    console.error('[revenuecat-webhook]', event.type, err?.message || err)
    return res.status(500).json({ error: 'ERREUR' })
  }
}
