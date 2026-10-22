// -------------------------------------------------------
// Réviz — Quota de scans CÔTÉ SERVEUR (source de vérité)
// Free : 5 scans / semaine (lundi → dimanche, UTC). Premium : illimité.
// Logique pure (testable) + wrappers transaction Firestore.
// -------------------------------------------------------

export const FREE_LIMIT = 5

// Scan d'essai : un compte dont l'email n'est pas encore confirmé peut analyser
// une leçon (une seule fois, jamais remise à zéro) avant qu'on lui demande de
// confirmer. Compté à part dans le même doc usage/{uid} (`sansEmail`).
export const SCANS_SANS_EMAIL = 1

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
// current = { count, weekStart, sansEmail? } | null
// sansEmail : compte à l'email non confirmé → seul le scan d'essai passe
// (refus marqué `sansEmail: true` pour répondre EMAIL_NOT_VERIFIED).
export function nextUsageState(current, nowMs, limit = FREE_LIMIT, { sansEmail = false } = {}) {
  const weekStart = weekStartUTC(nowMs)
  const sameWeek = current && current.weekStart === weekStart
  let count = sameWeek ? (current.count || 0) : 0
  const essais = current?.sansEmail || 0
  if (sansEmail && essais >= SCANS_SANS_EMAIL) {
    return { allowed: false, sansEmail: true, used: count, remaining: 0, data: { count, weekStart } }
  }
  if (count >= limit) {
    return { allowed: false, used: count, remaining: 0, data: { count, weekStart } }
  }
  count += 1
  const data = sansEmail ? { count, weekStart, sansEmail: essais + 1 } : { count, weekStart }
  return { allowed: true, used: count, remaining: Math.max(0, limit - count), data }
}

// Wrapper transactionnel : vérifie ET consomme atomiquement (anti double-scan simultané).
export async function consumeQuota({ db, uid, limit = FREE_LIMIT, nowMs = Date.now(), sansEmail = false }) {
  const ref = db.collection('usage').doc(uid)
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref)
    const state = nextUsageState(snap.exists ? snap.data() : null, nowMs, limit, { sansEmail })
    if (state.allowed) tx.set(ref, state.data, { merge: true })
    return state
  })
}

// Rembourse un scan si l'appel IA échoue pour une raison non imputable à l'élève
// (et le scan d'essai avec, s'il en était un).
export async function refundQuota({ db, uid, nowMs = Date.now(), sansEmail = false }) {
  const ref = db.collection('usage').doc(uid)
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref)
    if (!snap.exists) return
    const data = snap.data()
    const maj = {}
    if (data.weekStart === weekStartUTC(nowMs) && (data.count || 0) > 0) {
      Object.assign(maj, { count: data.count - 1, weekStart: data.weekStart })
    }
    if (sansEmail && (data.sansEmail || 0) > 0) maj.sansEmail = data.sansEmail - 1
    if (Object.keys(maj).length) tx.set(ref, maj, { merge: true })
  })
}
