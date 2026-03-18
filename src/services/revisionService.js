// -------------------------------------------------------
// Réviz — Service de tracking des révisions
// -------------------------------------------------------
import { db } from './firebaseConfig'
import { doc, setDoc, collection, getDocs, query, orderBy } from 'firebase/firestore'

let _uid = null
const MAX_REVISIONS = 500

export function setActiveUser(uid) { _uid = uid }

const getKey = () => _uid ? `reviz-revisions-${_uid}` : 'reviz-revisions'

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

  // Firestore write-through (fire-and-forget)
  if (_uid) {
    setDoc(doc(db, 'users', _uid, 'revisions', entry.id), entry)
      .catch(err => console.warn('[Réviz] Firestore recordRevision error', err))
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
  if (!_uid) return loadRevisions()
  try {
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
