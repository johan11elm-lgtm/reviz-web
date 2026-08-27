// -------------------------------------------------------
// Réviz — Quota de messages du coach CÔTÉ SERVEUR (source de vérité)
// Free : 10 messages / jour (UTC). Premium : 200 / jour (garde-fou coût).
// Même pattern que _quota.js : logique pure (testable) + wrappers transaction.
// Collection Firestore dédiée `chatUsage` (admin uniquement, aucune règle client).
// -------------------------------------------------------

export const CHAT_FREE_LIMIT = 10
export const CHAT_PREMIUM_LIMIT = 200

// Début de journée (00:00 UTC) pour un timestamp donné.
export function dayStartUTC(nowMs) {
  const d = new Date(nowMs)
  d.setUTCHours(0, 0, 0, 0)
  return d.getTime()
}

// Logique PURE : à partir de l'état courant du doc usage, calcule le prochain état.
// current = { count, dayStart } | null
export function nextChatUsageState(current, nowMs, limit = CHAT_FREE_LIMIT) {
  const dayStart = dayStartUTC(nowMs)
  const sameDay = current && current.dayStart === dayStart
  let count = sameDay ? (current.count || 0) : 0
  if (count >= limit) {
    return { allowed: false, used: count, remaining: 0, data: { count, dayStart } }
  }
  count += 1
  return { allowed: true, used: count, remaining: Math.max(0, limit - count), data: { count, dayStart } }
}

// Wrapper transactionnel : vérifie ET consomme atomiquement.
export async function consumeChatQuota({ db, uid, limit = CHAT_FREE_LIMIT, nowMs = Date.now() }) {
  const ref = db.collection('chatUsage').doc(uid)
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref)
    const state = nextChatUsageState(snap.exists ? snap.data() : null, nowMs, limit)
    if (state.allowed) tx.set(ref, state.data, { merge: true })
    return state
  })
}

// Rembourse un message si l'appel IA échoue avant d'avoir produit quoi que ce soit.
export async function refundChatQuota({ db, uid, nowMs = Date.now() }) {
  const ref = db.collection('chatUsage').doc(uid)
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref)
    if (!snap.exists) return
    const data = snap.data()
    if (data.dayStart === dayStartUTC(nowMs) && (data.count || 0) > 0) {
      tx.set(ref, { count: data.count - 1, dayStart: data.dayStart }, { merge: true })
    }
  })
}
