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
import { QUESTIONS_SANS_EMAIL } from '../src/utils/essaiIA.js'

export const CHAT_FREE_LIMIT = 10
export const CHAT_FREE_PERIODE = 'semaine'
export const CHAT_PREMIUM_LIMIT = 50
export const CHAT_PREMIUM_PERIODE = 'jour'

// Questions d'essai : un compte dont l'e-mail n'est pas encore confirmé peut poser quelques
// questions à Réviz IA (au total, jamais remises à zéro) avant qu'on lui demande de confirmer,
// comme le scan d'essai (api/_quota.js). Du 31/10 au 09/11, 106 élèves avec un compte ont été
// refusés à l'entrée de Réviz IA pour cette raison, et 20 seulement ont confirmé ensuite.
// Comptées à part dans le même doc chatUsage/{uid} (`sansEmail`), en plus du quota de la semaine.
export const CHAT_SANS_EMAIL = QUESTIONS_SANS_EMAIL

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
// sansEmail : compte à l'e-mail non confirmé → seules les questions d'essai passent (refus marqué
// `sansEmail: true` pour répondre EMAIL_NOT_VERIFIED) ; `avantEmail` = ce qu'il en reste ensuite.
export function nextChatUsageState(current, nowMs, limit = CHAT_FREE_LIMIT, periode = CHAT_FREE_PERIODE, { sansEmail = false } = {}) {
  const debut = debutPeriode(nowMs, periode)
  const meme = current && (current.debut ?? current.dayStart) === debut && (current.periode ?? 'jour') === periode
  let count = meme ? (current.count || 0) : 0
  const essais = current?.sansEmail || 0
  if (sansEmail && essais >= CHAT_SANS_EMAIL) {
    return { allowed: false, sansEmail: true, used: count, remaining: 0, avantEmail: 0, data: { count, debut, periode } }
  }
  if (count >= limit) {
    return { allowed: false, used: count, remaining: 0, data: { count, debut, periode } }
  }
  count += 1
  const remaining = Math.max(0, limit - count)
  if (!sansEmail) return { allowed: true, used: count, remaining, data: { count, debut, periode } }
  return { allowed: true, used: count, remaining, avantEmail: CHAT_SANS_EMAIL - essais - 1, data: { count, debut, periode, sansEmail: essais + 1 } }
}

// Wrapper transactionnel : vérifie ET consomme atomiquement.
export async function consumeChatQuota({ db, uid, limit = CHAT_FREE_LIMIT, periode = CHAT_FREE_PERIODE, nowMs = Date.now(), sansEmail = false }) {
  const ref = db.collection('chatUsage').doc(uid)
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref)
    const state = nextChatUsageState(snap.exists ? snap.data() : null, nowMs, limit, periode, { sansEmail })
    if (state.allowed) tx.set(ref, state.data, { merge: true })
    return state
  })
}

// Rembourse un message si l'appel IA échoue avant d'avoir produit quoi que ce soit
// (et la question d'essai avec, si c'en était une).
export async function refundChatQuota({ db, uid, periode = CHAT_FREE_PERIODE, nowMs = Date.now(), sansEmail = false }) {
  const ref = db.collection('chatUsage').doc(uid)
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref)
    if (!snap.exists) return
    const data = snap.data()
    if (data.debut === debutPeriode(nowMs, periode) && data.periode === periode && (data.count || 0) > 0) {
      tx.set(ref, {
        count: data.count - 1, debut: data.debut, periode,
        ...(sansEmail && (data.sansEmail || 0) > 0 ? { sansEmail: data.sansEmail - 1 } : {}),
      }, { merge: true })
    }
  })
}
