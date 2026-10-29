// -------------------------------------------------------
// Réviz — Quota de messages du coach CÔTÉ SERVEUR (source de vérité)
// Free : 10 messages par semaine (lundi → dimanche, UTC, comme les scans).
// Réviz+ (et l'offre de lancement) : 50 par jour (UTC). Décidé par Johan le
// 29/10 : Réviz IA sans leçon fait plusieurs passages par message (≈ 0,35 c$),
// 50 par jour plafonne un abonné à ≈ 5 $ par mois au pire.
// Même pattern que _quota.js : logique pure (testable) + wrappers transaction.
// Collection Firestore dédiée `chatUsage` (admin uniquement, aucune règle client).
// -------------------------------------------------------
import { weekStartUTC } from './_quota.js'

export const CHAT_FREE_LIMIT = 10
export const CHAT_FREE_PERIODE = 'semaine'
export const CHAT_PREMIUM_LIMIT = 50
export const CHAT_PREMIUM_PERIODE = 'jour'

// Début de journée (00:00 UTC) pour un timestamp donné.
export function dayStartUTC(nowMs) {
  const d = new Date(nowMs)
  d.setUTCHours(0, 0, 0, 0)
  return d.getTime()
}

/** Début de la période en cours : jour (00:00 UTC) ou semaine (lundi 00:00 UTC). */
export function debutPeriode(nowMs, periode = 'jour') {
  return periode === 'semaine' ? weekStartUTC(nowMs) : dayStartUTC(nowMs)
}

// Logique PURE : à partir de l'état courant du doc usage, calcule le prochain état.
// current = { count, debut, periode } | null — les docs d'avant le 29/10 ont { count, dayStart }.
// Une période différente (l'élève passe à Réviz+ en cours de semaine) repart de zéro.
export function nextChatUsageState(current, nowMs, limit = CHAT_FREE_LIMIT, periode = CHAT_FREE_PERIODE) {
  const debut = debutPeriode(nowMs, periode)
  const meme = current && (current.debut ?? current.dayStart) === debut && (current.periode ?? 'jour') === periode
  let count = meme ? (current.count || 0) : 0
  if (count >= limit) {
    return { allowed: false, used: count, remaining: 0, data: { count, debut, periode } }
  }
  count += 1
  return { allowed: true, used: count, remaining: Math.max(0, limit - count), data: { count, debut, periode } }
}

// Wrapper transactionnel : vérifie ET consomme atomiquement.
export async function consumeChatQuota({ db, uid, limit = CHAT_FREE_LIMIT, periode = CHAT_FREE_PERIODE, nowMs = Date.now() }) {
  const ref = db.collection('chatUsage').doc(uid)
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref)
    const state = nextChatUsageState(snap.exists ? snap.data() : null, nowMs, limit, periode)
    if (state.allowed) tx.set(ref, state.data, { merge: true })
    return state
  })
}

// Rembourse un message si l'appel IA échoue avant d'avoir produit quoi que ce soit.
export async function refundChatQuota({ db, uid, periode = CHAT_FREE_PERIODE, nowMs = Date.now() }) {
  const ref = db.collection('chatUsage').doc(uid)
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref)
    if (!snap.exists) return
    const data = snap.data()
    if (data.debut === debutPeriode(nowMs, periode) && data.periode === periode && (data.count || 0) > 0) {
      tx.set(ref, { count: data.count - 1, debut: data.debut, periode }, { merge: true })
    }
  })
}
