// -------------------------------------------------------
// Réviz — Quota de scans CÔTÉ SERVEUR (source de vérité)
// Free : 5 scans / semaine (lundi → dimanche, UTC). Premium : illimité.
// Logique pure (testable) + wrappers transaction Firestore.
// -------------------------------------------------------

export const FREE_LIMIT = 5

// Début de semaine (lundi 00:00 UTC) pour un timestamp donné.
export function weekStartUTC(nowMs) {
  const d = new Date(nowMs)
  const day = d.getUTCDay() // 0 = dimanche … 6 = samedi
  const diff = day === 0 ? -6 : 1 - day
  d.setUTCDate(d.getUTCDate() + diff)
  d.setUTCHours(0, 0, 0, 0)
  return d.getTime()
}

// Logique PURE : à partir de l'état courant du doc usage, calcule le prochain état.
// current = { count, weekStart } | null
export function nextUsageState(current, nowMs, limit = FREE_LIMIT) {
  const weekStart = weekStartUTC(nowMs)
  const sameWeek = current && current.weekStart === weekStart
  let count = sameWeek ? (current.count || 0) : 0
  if (count >= limit) {
    return { allowed: false, used: count, remaining: 0, data: { count, weekStart } }
  }
  count += 1
  return { allowed: true, used: count, remaining: Math.max(0, limit - count), data: { count, weekStart } }
}

// Wrapper transactionnel : vérifie ET consomme atomiquement (anti double-scan simultané).
export async function consumeQuota({ db, uid, limit = FREE_LIMIT, nowMs = Date.now() }) {
  const ref = db.collection('usage').doc(uid)
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref)
    const state = nextUsageState(snap.exists ? snap.data() : null, nowMs, limit)
    if (state.allowed) tx.set(ref, state.data, { merge: true })
    return state
  })
}

// Rembourse un scan si l'appel IA échoue pour une raison non imputable à l'élève.
export async function refundQuota({ db, uid, nowMs = Date.now() }) {
  const ref = db.collection('usage').doc(uid)
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref)
    if (!snap.exists) return
    const data = snap.data()
    if (data.weekStart === weekStartUTC(nowMs) && (data.count || 0) > 0) {
      tx.set(ref, { count: data.count - 1, weekStart: data.weekStart }, { merge: true })
    }
  })
}
