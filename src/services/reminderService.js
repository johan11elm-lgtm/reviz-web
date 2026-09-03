// -------------------------------------------------------
// Réviz — Rappels de révision (notifications locales natives)
//
// App native (Capacitor) uniquement : planifie une notification locale
// quotidienne (18 h 30) qui ramène l'élève vers ses cartes dues. Aucun
// serveur, aucun APNs : tout est planifié sur l'appareil.
// Sur le web, remindersAvailable() est false et l'UI masque le réglage.
// -------------------------------------------------------
import { Capacitor } from '@capacitor/core'
import { LocalNotifications } from '@capacitor/local-notifications'

const PREF_KEY = 'reviz-reminder'
const NOTIF_ID = 1001
export const REMINDER_HOUR = 18
export const REMINDER_MINUTE = 30

export function remindersAvailable() {
  return Capacitor.isNativePlatform()
}

export function isReminderEnabled() {
  try { return JSON.parse(localStorage.getItem(PREF_KEY) || 'null')?.enabled === true }
  catch { return false }
}

function savePref(enabled) {
  try { localStorage.setItem(PREF_KEY, JSON.stringify({ enabled })) } catch { /* stockage indispo */ }
}

// Corps du rappel selon les cartes dues au moment de la planification.
export function reminderBody(dueCount) {
  if (dueCount > 0) {
    return dueCount > 1
      ? `${dueCount} cartes t'attendent pour garder ta série`
      : `1 carte t'attend pour garder ta série`
  }
  return 'Cinq minutes de révision et ta série continue'
}

async function scheduleDaily(dueCount) {
  await LocalNotifications.schedule({
    notifications: [{
      id: NOTIF_ID,
      title: "C'est l'heure de réviser",
      body: reminderBody(dueCount),
      schedule: { on: { hour: REMINDER_HOUR, minute: REMINDER_MINUTE }, allowWhileIdle: true },
    }],
  })
}

/**
 * Active le rappel quotidien (demande la permission si besoin).
 * @returns {Promise<{ok: boolean, reason?: 'unavailable'|'denied'}>}
 */
export async function enableReminder(dueCount = 0) {
  if (!remindersAvailable()) return { ok: false, reason: 'unavailable' }
  let perm = await LocalNotifications.checkPermissions()
  if (perm.display !== 'granted') perm = await LocalNotifications.requestPermissions()
  if (perm.display !== 'granted') {
    savePref(false)
    return { ok: false, reason: 'denied' }
  }
  await scheduleDaily(dueCount)
  savePref(true)
  return { ok: true }
}

export async function disableReminder() {
  savePref(false)
  if (!remindersAvailable()) return
  try { await LocalNotifications.cancel({ notifications: [{ id: NOTIF_ID }] }) }
  catch { /* rien à annuler */ }
}

/**
 * À l'ouverture de l'app (natif) : re-planifie le rappel avec un texte à
 * jour (nombre de cartes dues). Jamais bloquant, jamais de prompt.
 */
export async function refreshReminder(dueCount = 0) {
  if (!remindersAvailable() || !isReminderEnabled()) return
  try {
    const perm = await LocalNotifications.checkPermissions()
    if (perm.display !== 'granted') return
    await scheduleDaily(dueCount)
  } catch { /* le rappel existant reste en place */ }
}
