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
import { planRevision } from '../utils/planRevision'

const PREF_KEY = 'reviz-reminder'
const NOTIF_ID = 1001
export const REMINDER_HOUR = 18
export const REMINDER_MINUTE = 30
export const HEURE_RAPPEL_NATIF = '18 h 30'

// Le rappel du soir n'est plus une notification répétée tous les jours (15/11) : ce sont des
// notifications posées une par une sur les JOURS_RAPPEL prochains jours, replanifiées à chaque
// ouverture et à chaque révision. Ainsi : rien le jour où l'élève a déjà révisé, rien le
// week-end (la série ne le compte pas), rien un soir qui a déjà sa notification (veille de
// contrôle, lendemain de la première séance), et silence après une semaine sans ouvrir l'app.
export const JOURS_RAPPEL = 7
const DAILY_IDS = Array.from({ length: JOURS_RAPPEL }, (_, i) => NOTIF_ID + i)

export function remindersAvailable() {
  return Capacitor.isNativePlatform()
}

function lirePref() {
  try { return JSON.parse(localStorage.getItem(PREF_KEY) || 'null') ?? {} }
  catch { return {} }
}

export function isReminderEnabled() {
  return lirePref().enabled === true
}

function savePref(champs) {
  try { localStorage.setItem(PREF_KEY, JSON.stringify({ ...lirePref(), ...champs })) } catch { /* stockage indispo */ }
}

/** « AAAA-MM-JJ » en heure locale (celle des notifications). */
export function jourLocal(d) {
  const p = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
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

/**
 * Les soirs où poser le rappel, à 18 h 30, sur les JOURS_RAPPEL prochains jours.
 * @param {{ maintenant?: Date, faitAujourdhui?: boolean, occupes?: Set<string> }} p
 *   occupes : jours (« AAAA-MM-JJ ») qui ont déjà une autre notification
 * @returns {Date[]}
 */
export function soirsDeRappel({ maintenant = new Date(), faitAujourdhui = false, occupes = new Set() } = {}) {
  const soirs = []
  for (let i = 0; i < JOURS_RAPPEL; i++) {
    const at = new Date(maintenant.getFullYear(), maintenant.getMonth(), maintenant.getDate() + i, REMINDER_HOUR, REMINDER_MINUTE)
    if (at <= maintenant) continue
    if (i === 0 && faitAujourdhui) continue
    const jour = at.getDay()
    if (jour === 0 || jour === 6) continue
    if (occupes.has(jourLocal(at))) continue
    soirs.push(at)
  }
  return soirs
}

/** Les soirs déjà pris par une autre notification de l'app. */
async function soirsOccupes() {
  const occupes = new Set()
  try {
    const { notifications = [] } = await LocalNotifications.getPending()
    for (const n of notifications) {
      if (DAILY_IDS.includes(Number(n.id))) continue
      const at = n.schedule?.at ? new Date(n.schedule.at) : null
      if (at && !Number.isNaN(at.getTime())) occupes.add(jourLocal(at))
    }
  } catch { /* liste indisponible : on pose quand même */ }
  return occupes
}

async function scheduleDaily(dueCount, maintenant = new Date()) {
  await LocalNotifications.cancel({ notifications: DAILY_IDS.map(id => ({ id })) }).catch(() => {})
  const faitAujourdhui = lirePref().faitLe === jourLocal(maintenant)
  const soirs = soirsDeRappel({ maintenant, faitAujourdhui, occupes: await soirsOccupes() })
  if (!soirs.length) return
  await LocalNotifications.schedule({
    notifications: soirs.map((at, i) => ({
      id: DAILY_IDS[i],
      title: "C'est l'heure de réviser",
      body: reminderBody(dueCount),
      schedule: { at, allowWhileIdle: true },
    })),
  })
}

/**
 * Active le rappel quotidien (demande la permission si besoin).
 * @param {number} [dueCount]
 * @param {{ faitAujourdhui?: boolean }} [options]  vrai en fin de séance : pas de rappel ce soir
 * @returns {Promise<{ok: boolean, reason?: 'unavailable'|'denied'}>}
 */
export async function enableReminder(dueCount = 0, { faitAujourdhui = false } = {}) {
  if (!remindersAvailable()) return { ok: false, reason: 'unavailable' }
  let perm = await LocalNotifications.checkPermissions()
  if (perm.display !== 'granted') perm = await LocalNotifications.requestPermissions()
  if (perm.display !== 'granted') {
    savePref({ enabled: false, refuse: true })
    return { ok: false, reason: 'denied' }
  }
  savePref({ enabled: true, refuse: false, due: dueCount, ...(faitAujourdhui ? { faitLe: jourLocal(new Date()) } : {}) })
  await scheduleDaily(dueCount)
  return { ok: true }
}

/** L'élève a déjà refusé les notifications sur cet appareil (seuls les Réglages d'iOS les rouvrent). */
export function rappelRefuse() {
  return lirePref().refuse === true
}

export async function disableReminder() {
  savePref({ enabled: false })
  if (!remindersAvailable()) return
  try { await LocalNotifications.cancel({ notifications: DAILY_IDS.map(id => ({ id })) }) }
  catch { /* rien à annuler */ }
}

// --- Contrôles : un rappel la veille à 18 h 30 (natif seulement), et un rappel
// les jours des étapes du plan de révision (flashcards J-5, quiz J-3) ---
// Identifiants 2000-2099 réservés (trois par contrôle), tous annulés puis
// replanifiés à chaque changement de la liste : pas d'état à tenir à jour.
const CONTROLE_ID_MIN = 2000
const CONTROLE_MAX = 100

/** Rappel d'une étape du plan de révision, le jour prévu (« Contrôle de maths dans 5 jours »). */
export function rappelEtape(etape, intitule) {
  return {
    title: `${intitule} dans ${etape.avant} jours`,
    body: `Ton plan de révision : ${etape.quoi.toLowerCase()} aujourd’hui. Dix minutes ?`,
  }
}

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
  const a18h = jour => {
    const [a, m, j] = jour.split('-').map(Number)
    return new Date(a, m - 1, j, REMINDER_HOUR, REMINDER_MINUTE)
  }
  const notifications = controles.slice(0, Math.floor(CONTROLE_MAX / 3)).flatMap((c, i) => {
    const veille = new Date(a18h(c.date).getTime() - 86_400_000)
    const liste = veille > maintenant ? [{ id: CONTROLE_ID_MIN + i * 3, ...rappelControle(c, nommer(c)), schedule: { at: veille, allowWhileIdle: true } }] : []
    // La veille, c'est le contrôle blanc : le rappel ci-dessus suffit.
    planRevision(c).filter(e => e.id !== 'blanc' && !e.fait).forEach((e, k) => {
      const at = a18h(e.prevu)
      if (at > maintenant) liste.push({ id: CONTROLE_ID_MIN + i * 3 + 1 + k, ...rappelEtape(e, nommer(c)), schedule: { at, allowWhileIdle: true } })
    })
    return liste
  })
  if (!notifications.length) { await refreshReminder(); return }
  let perm = await LocalNotifications.checkPermissions()
  if (perm.display !== 'granted') perm = await LocalNotifications.requestPermissions()
  if (perm.display !== 'granted') return
  await LocalNotifications.schedule({ notifications })
  await refreshReminder()
}

/**
 * À l'ouverture de l'app (natif), ou quand un autre rappel vient d'être posé : re-planifie le
 * rappel du soir avec un texte à jour (nombre de cartes dues). Jamais bloquant, jamais de prompt.
 * @param {number|null} [dueCount]  null : le dernier nombre connu
 */
export async function refreshReminder(dueCount = null) {
  if (!remindersAvailable() || !isReminderEnabled()) return
  try {
    const perm = await LocalNotifications.checkPermissions()
    if (perm.display !== 'granted') return
    const due = dueCount ?? lirePref().due ?? 0
    if (dueCount != null) savePref({ due: dueCount })
    await scheduleDaily(due)
  } catch { /* le rappel existant reste en place */ }
}

/** L'élève vient de réviser : pas de rappel ce soir. */
export async function noterRevisionDuJour(maintenant = new Date()) {
  if (!remindersAvailable() || !isReminderEnabled()) return
  if (lirePref().faitLe === jourLocal(maintenant)) return
  savePref({ faitLe: jourLocal(maintenant) })
  await refreshReminder()
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
    if (joursRestants == null) { await refreshReminder(); return }
    const perm = await LocalNotifications.checkPermissions()
    if (perm.display !== 'granted') return
    const maintenant = new Date()
    const notifications = PARENT_JOURS_AVANT.map((avant, i) => {
      const at = new Date(maintenant.getFullYear(), maintenant.getMonth(),
        maintenant.getDate() + joursRestants - avant, REMINDER_HOUR, REMINDER_MINUTE)
      return at > maintenant ? { id: PARENT_ID_MIN + i, ...rappelParent(avant), schedule: { at, allowWhileIdle: true } } : null
    }).filter(Boolean)
    if (notifications.length) await LocalNotifications.schedule({ notifications })
    await refreshReminder()
  } catch { /* jamais bloquant */ }
}

// --- Lendemain de la première session : identifiant 4000 ---
// Posé le jour où l'élève révise pour la première fois, pour le lendemain à
// 18 h 30 ; annulé dès qu'il revient un autre jour. Seulement si la
// permission est déjà accordée : jamais de demande ici.
const LENDEMAIN_ID = 4000

export function rappelLendemain(titre) {
  return titre
    ? { title: 'Ton chapitre d\'hier t\'attend', body: `${titre}. Cinq minutes de quiz pour vérifier que tu t'en souviens ?` }
    : { title: 'Ta révision d\'hier t\'attend', body: 'Cinq minutes de quiz pour vérifier que tu t\'en souviens ?' }
}

/**
 * @param {{ titre: string|null }|null} premiereSession  null pour annuler
 */
export async function planifierRappelLendemain(premiereSession, maintenant = new Date()) {
  if (!remindersAvailable()) return
  try {
    await LocalNotifications.cancel({ notifications: [{ id: LENDEMAIN_ID }] }).catch(() => {})
    if (!premiereSession) { await refreshReminder(); return }
    const perm = await LocalNotifications.checkPermissions()
    if (perm.display !== 'granted') return
    const at = new Date(maintenant.getFullYear(), maintenant.getMonth(), maintenant.getDate() + 1, REMINDER_HOUR, REMINDER_MINUTE)
    await LocalNotifications.schedule({
      notifications: [{ id: LENDEMAIN_ID, ...rappelLendemain(premiereSession.titre), schedule: { at, allowWhileIdle: true } }],
    })
    await refreshReminder()
  } catch { /* jamais bloquant */ }
}
