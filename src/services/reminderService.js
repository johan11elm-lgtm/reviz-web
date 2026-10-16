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

// --- Email d'un parent pas encore donné (<15 ans, « Plus tard ») ---
// Identifiants 3000-3009 : rappels à 18 h 30, 12, 5 et 1 jour(s) avant la
// mise en pause du compte. Tous annulés puis replanifiés à chaque passage ;
// jamais de demande de permission ici (seulement si déjà accordée).
const PARENT_ID_MIN = 3000
const PARENT_JOURS_AVANT = [12, 5, 1]

export function rappelParent(joursAvant) {
  return joursAvant <= 1
    ? { title: 'Dernier jour pour ton compte Réviz', body: "Donne l'email d'un de tes parents, sinon ton compte sera mis en pause demain." }
    : { title: `Plus que ${joursAvant} jours`, body: "Donne l'email d'un de tes parents pour garder ton compte Réviz. 30 secondes." }
}

/**
 * @param {number|null} joursRestants  jours avant la mise en pause, null pour tout annuler
 */
export async function planifierRappelsParent(joursRestants) {
  if (!remindersAvailable()) return
  try {
    await LocalNotifications.cancel({
      notifications: PARENT_JOURS_AVANT.map((_, i) => ({ id: PARENT_ID_MIN + i })),
    }).catch(() => {})
    if (joursRestants == null) return
    const perm = await LocalNotifications.checkPermissions()
    if (perm.display !== 'granted') return
    const maintenant = new Date()
    const notifications = PARENT_JOURS_AVANT.map((avant, i) => {
      const at = new Date(maintenant.getFullYear(), maintenant.getMonth(),
        maintenant.getDate() + joursRestants - avant, REMINDER_HOUR, REMINDER_MINUTE)
      return at > maintenant ? { id: PARENT_ID_MIN + i, ...rappelParent(avant), schedule: { at, allowWhileIdle: true } } : null
    }).filter(Boolean)
    if (notifications.length) await LocalNotifications.schedule({ notifications })
  } catch { /* jamais bloquant */ }
}
