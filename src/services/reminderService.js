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
import { intituleControle } from '../utils/agenda'

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

// --- Contrôles : un rappel la veille à 18 h 30 (natif seulement) ---
// Identifiants 2000-2099 réservés, tous annulés puis replanifiés à chaque
// changement de la liste : pas d'état à tenir à jour.
const CONTROLE_ID_MIN = 2000
const CONTROLE_MAX = 100

export function rappelControle(controle, intitule) {
  return {
    title: `${intitule} demain`,
    body: controle.titre
      ? `${controle.titre}. Dix minutes de révision ce soir ?`
      : 'Dix minutes de révision ce soir ?',
  }
}

/**
 * Replanifie les rappels de la veille des contrôles à venir. Demande la
 * permission la première fois (on vient d'ajouter un contrôle).
 * @param {{ id, date, titre, matiere }[]} controles à venir, triés
 * @param {(c) => string} nommer « Contrôle de maths »…
 */
export async function planifierRappelsControles(controles, nommer = intituleControle) {
  if (!remindersAvailable()) return
  await LocalNotifications.cancel({
    notifications: Array.from({ length: CONTROLE_MAX }, (_, i) => ({ id: CONTROLE_ID_MIN + i })),
  }).catch(() => {})
  const maintenant = new Date()
  const notifications = controles.slice(0, CONTROLE_MAX).map((c, i) => {
    const [a, m, j] = c.date.split('-').map(Number)
    const at = new Date(a, m - 1, j - 1, REMINDER_HOUR, REMINDER_MINUTE)
    return at > maintenant ? { id: CONTROLE_ID_MIN + i, ...rappelControle(c, nommer(c)), schedule: { at, allowWhileIdle: true } } : null
  }).filter(Boolean)
  if (!notifications.length) return
  let perm = await LocalNotifications.checkPermissions()
  if (perm.display !== 'granted') perm = await LocalNotifications.requestPermissions()
  if (perm.display !== 'granted') return
  await LocalNotifications.schedule({ notifications })
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
