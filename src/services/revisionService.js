// -------------------------------------------------------
// Réviz — Service de tracking des révisions
// -------------------------------------------------------
import { db } from './firebaseConfig'
import { doc, setDoc, getDoc, collection, getDocs, query, orderBy } from 'firebase/firestore'
import { updateChallengeProgress } from './challengeService'
import { isGuestUid } from './guestService'
import { isDecouverte } from './decouverteService'
import { loadLessons } from './historyService'
import { planifierRappelLendemain } from './reminderService'
import { track as trackStat } from './statsService'
import { jourParis } from '../utils/retour'

let _uid = null
const MAX_REVISIONS = 500

function getMondayOfWeek() {
  const d = new Date();
  const dow = d.getDay();
  d.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1));
  d.setHours(0, 0, 0, 0);
  return d;
}

export function setActiveUser(uid) { _uid = uid }

const getKey = () => _uid ? `reviz-revisions-${_uid}` : 'reviz-revisions'
// Firestore uniquement pour un vrai compte : en mode essai, tout reste local.
const canSync = () => !!_uid && !isGuestUid(_uid)

// Écritures en vol attendues avant une synchronisation (voir historyService).
const _pending = new Set()
function track(promise) {
  const p = promise.catch(err => console.warn('[Réviz] Firestore recordRevision error', err))
  _pending.add(p)
  p.finally(() => _pending.delete(p))
  return p
}

// Leçon de la révision : d'où elle vient et, pour un chapitre du programme,
// de quoi le rouvrir (rappel du lendemain, pilotage).
function contexteLecon(lessonId) {
  const source = lessonId?.startsWith('prog-') ? 'programme' : 'scan'
  const lesson = lessonId ? loadLessons().find(l => l.id === lessonId) : null
  const ctx = { source }
  if (lesson?.chapterId) ctx.chapterId = lesson.chapterId
  if (lesson?.classe) ctx.classe = lesson.classe
  if (lesson?.matiere) ctx.matiere = lesson.matiere
  const titre = lesson?.metadata?.title
  if (titre) ctx.titre = String(titre).slice(0, 120)
  return ctx
}

// Mode essai (hors découverte prof) : la révision part aussi, avec
// l'identifiant d'essai, vers essais/{id} (api/track.js). Pas de prénom.
function essaiPayload(entry) {
  if (!isGuestUid(_uid) || isDecouverte()) return {}
  const { id, type, source, chapterId, classe, matiere } = entry
  return { essai: { id: _uid, revision: { id, type, source, chapterId, classe, matiere } } }
}

const premiereKey = () => `reviz-premiere-session-${_uid}`

/**
 * Profil d'un vrai compte : date de la dernière révision, et première
 * session (jour, chapitre) notée une seule fois — le cron du lendemain
 * s'en sert pour le rappel J+1. Fire-and-forget.
 */
async function noterActivite(entry) {
  const ref = doc(db, 'users', _uid)
  const maj = { derniereRevisionAt: entry.revisedAt }
  let premiere = null
  try { premiere = localStorage.getItem(premiereKey()) } catch { /* stockage indispo */ }
  if (!premiere) {
    const snap = await getDoc(ref)
    const deja = snap.exists() ? snap.data()?.premiereSession : null
    if (deja?.jour) premiere = deja.jour
    else {
      premiere = jourParis(new Date(entry.revisedAt))
      const { lessonId, source, chapterId, classe, matiere, titre } = entry
      maj.premiereSession = Object.fromEntries(Object.entries({
        jour: premiere, at: entry.revisedAt, lessonId, source, chapterId, classe, matiere, titre,
      }).filter(([, v]) => v != null))
    }
    try { localStorage.setItem(premiereKey(), premiere) } catch { /* stockage indispo */ }
  }
  await setDoc(ref, maj, { merge: true })
  return premiere
}

// Jour de la première session sur cet appareil (essai compris), pour la
// notification locale du lendemain.
function premierJourLocal() {
  try {
    let j = localStorage.getItem(premiereKey())
    if (!j) { j = jourParis(); localStorage.setItem(premiereKey(), j) }
    return j
  } catch { return null }
}

/**
 * Enregistre une session de révision (ouverture d'un format, résumé lu, quiz terminé…).
 * @param {'flashcards'|'quiz'|'resume'|'mindmap'} type
 * @param {object} [details] champs en plus, ex. { score, total } pour un quiz terminé
 */
export function recordRevision(type, details = {}) {
  const lessonId  = localStorage.getItem('reviz-current-lesson-id') ?? null
  const revisions = loadRevisions()
  const { titre, ...ctx } = contexteLecon(lessonId)
  const entry = { ...details, id: String(Date.now()), type, lessonId, revisedAt: Date.now(), ...ctx }
  trackStat('revision', { format: type, source: ctx.source, classe: ctx.classe, matiere: ctx.matiere }, essaiPayload(entry))
  revisions.unshift(entry)
  if (revisions.length > MAX_REVISIONS) revisions.splice(MAX_REVISIONS)
  localStorage.setItem(getKey(), JSON.stringify(revisions))

  // Update weekly challenges
  const todayRevisions = revisions.filter(r =>
    new Date(r.revisedAt).toDateString() === new Date().toDateString()
  ).length;
  const formatsUsed = new Set(revisions.filter(r =>
    new Date(r.revisedAt) >= getMondayOfWeek()
  ).map(r => r.type));
  updateChallengeProgress(type, { dailyCount: todayRevisions, formatsUsed });

  // Notification du lendemain (app native, permission déjà donnée) : posée
  // le jour de la première session, annulée dès que l'élève revient.
  const rappel = premierJour => planifierRappelLendemain(
    premierJour === jourParis(new Date(entry.revisedAt)) ? { titre: titre ?? null } : null,
  ).catch(() => {})

  // Firestore write-through (fire-and-forget)
  if (canSync()) {
    track(setDoc(doc(db, 'users', _uid, 'revisions', entry.id), entry))
    track(noterActivite({ ...entry, titre }).then(rappel))
  } else if (_uid) {
    rappel(premierJourLocal())
  }
  return entry
}

/**
 * Révision menée jusqu'au bout (dernière question du quiz, dernière carte) :
 * complète l'entrée ouverte par recordRevision() pour ce format.
 * @param {'flashcards'|'quiz'} type
 * @param {{ score?: number, total?: number }} [resultat]
 */
export function markRevisionDone(type, resultat = {}) {
  const lessonId = localStorage.getItem('reviz-current-lesson-id') ?? null
  const revisions = loadRevisions()
  const entry = revisions.find(r => r.type === type && r.lessonId === lessonId && !r.termineAt)
  if (!entry || Date.now() - entry.revisedAt > 3 * 60 * 60 * 1000) return null
  entry.termineAt = Date.now()
  if (Number.isFinite(resultat.score) && Number.isFinite(resultat.total)) {
    entry.score = resultat.score
    entry.total = resultat.total
  }
  localStorage.setItem(getKey(), JSON.stringify(revisions))
  trackStat('revision_terminee', { format: type, source: entry.source ?? 'scan' }, essaiPayload(entry))
  if (canSync()) {
    track(setDoc(doc(db, 'users', _uid, 'revisions', entry.id), entry))
  }
  return entry
}

/**
 * Essai devenu compte : l'identifiant d'essai est noté sur le profil, pour
 * que le pilotage ne compte pas deux fois le même élève. Fire-and-forget.
 */
export function lierEssai(essaiId) {
  if (!canSync() || !isGuestUid(essaiId)) return
  track(setDoc(doc(db, 'users', _uid), { essaiId }, { merge: true }))
}

/**
 * Dernier et meilleur score au quiz d'une leçon : { dernier: {score, total}, meilleur } ou null.
 */
export function quizScore(lessonId) {
  const faits = loadRevisions().filter(r => r.lessonId === lessonId && r.type === 'quiz' && Number.isFinite(r.score) && r.total)
  if (!faits.length) return null
  const meilleur = faits.reduce((m, r) => (r.score / r.total > m.score / m.total ? r : m), faits[0])
  return { dernier: { score: faits[0].score, total: faits[0].total }, meilleur: { score: meilleur.score, total: meilleur.total } }
}

/**
 * Charge tout l'historique des révisions (du plus récent au plus ancien).
 */
export function loadRevisions() {
  try { return JSON.parse(localStorage.getItem(getKey()) || '[]') }
  catch { return [] }
}

/**
 * Synchronise les révisions depuis Firestore → met à jour le cache localStorage.
 * Retourne le tableau de révisions (fallback localStorage en cas d'erreur).
 */
export async function syncRevisionsFromFirestore() {
  if (!canSync()) return loadRevisions()
  try {
    await Promise.all([..._pending])
    const q = query(
      collection(db, 'users', _uid, 'revisions'),
      orderBy('revisedAt', 'desc')
    )
    const snap = await getDocs(q)
    const remote = snap.docs.map(d => d.data())
    // Révisions locales récentes absentes du serveur = écritures pas encore
    // arrivées (rechargement juste après) : conservées et renvoyées.
    const known = new Set(remote.map(e => e.id))
    const now = Date.now()
    const missing = loadRevisions().filter(e => e?.id && !known.has(e.id) && now - (e.revisedAt ?? 0) < 10 * 60 * 1000)
    missing.forEach(entry => track(setDoc(doc(db, 'users', _uid, 'revisions', entry.id), entry)))
    const revisions = missing.length ? [...missing, ...remote].sort((a, b) => (b.revisedAt ?? 0) - (a.revisedAt ?? 0)) : remote
    localStorage.setItem(getKey(), JSON.stringify(revisions))
    return revisions
  } catch (err) {
    console.warn('[Réviz] Firestore syncRevisionsFromFirestore error', err)
    return loadRevisions()  // fallback offline
  }
}

/**
 * Envoie à Firestore des révisions déjà présentes en local (reprise d'une
 * session d'essai au moment de l'inscription). Fire-and-forget.
 */
export function pushRevisionsToFirestore(entries) {
  if (!canSync() || !Array.isArray(entries)) return
  entries.forEach(entry => {
    if (!entry?.id) return
    setDoc(doc(db, 'users', _uid, 'revisions', entry.id), entry)
      .catch(err => console.warn('[Réviz] Firestore pushRevisions error', err))
  })
}
