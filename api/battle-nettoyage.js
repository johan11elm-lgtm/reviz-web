// -------------------------------------------------------
// Réviz — Nettoyage quotidien des Battles (cron Vercel, voir vercel.json)
//
// Supprime les salons de Realtime Database créés il y a plus d'une heure
// (une partie dure quelques minutes) et les marques de comptage Firestore
// (battlesComptees) de plus de 48 heures. C'est la promesse de la politique
// de confidentialité : une partie disparaît au plus tard 48 heures après sa
// création. Seul Vercel peut l'appeler : il envoie CRON_SECRET dans
// l'en-tête Authorization de ses appels de cron.
// -------------------------------------------------------
import { getDb, getRtdb } from './_firebaseAdmin.js'

export const config = { maxDuration: 60 }

export const AGE_SALON_MS = 60 * 60 * 1000
export const AGE_MARQUE_MS = 48 * 60 * 60 * 1000
const LOT_FIRESTORE = 400

/** @returns {Promise<{ salons: number, marques: number }>} ce qui a été supprimé */
export async function nettoyer({ rtdb, db, maintenant = Date.now() }) {
  // Index sur creeLe : database.rules.json (.indexOn).
  const vieux = await rtdb.ref('battles').orderByChild('creeLe').endAt(maintenant - AGE_SALON_MS).get()
  const suppressions = {}
  vieux.forEach(salon => { suppressions[salon.key] = null })
  const salons = Object.keys(suppressions).length
  if (salons) await rtdb.ref('battles').update(suppressions)

  const marques = await db.collection('battlesComptees')
    .where('compteLe', '<', new Date(maintenant - AGE_MARQUE_MS)).get()
  for (let i = 0; i < marques.docs.length; i += LOT_FIRESTORE) {
    const lot = db.batch()
    marques.docs.slice(i, i + LOT_FIRESTORE).forEach(doc => lot.delete(doc.ref))
    await lot.commit()
  }
  return { salons, marques: marques.docs.length }
}

export default async function handler(req, res) {
  const secret = process.env.CRON_SECRET
  if (!secret || req.headers.authorization !== `Bearer ${secret}`) return res.status(401).json({ error: 'UNAUTHORIZED' })
  try {
    const resultat = await nettoyer({ rtdb: await getRtdb(), db: getDb() })
    return res.status(200).json(resultat)
  } catch (err) {
    console.error('[battle-nettoyage]', err)
    return res.status(500).json({ error: 'CLEANUP_FAILED' })
  }
}
