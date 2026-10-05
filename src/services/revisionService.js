// -------------------------------------------------------
// Réviz — Service de tracking des révisions
// -------------------------------------------------------
import { db } from './firebaseConfig'
import { doc, setDoc, collection, getDocs, query, orderBy } from 'firebase/firestore'
import { updateChallengeProgress } from './challengeService'
import { isGuestUid } from './guestService'

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

/**
 * Enregistre une session de révision (ouverture d'un format).
 * @param {'flashcards'|'quiz'|'resume'|'mindmap'} type
 */
export function recordRevision(type) {
  const lessonId  = localStorage.getItem('reviz-current-lesson-id') ?? null
  const revisions = loadRevisions()
  const entry = { id: String(Date.now()), type, lessonId, revisedAt: Date.now() }
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

  // Firestore write-through (fire-and-forget)
  if (canSync()) {
    track(setDoc(doc(db, 'users', _uid, 'revisions', entry.id), entry))
  }
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
    const revisions = snap.docs.map(d => d.data())
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
