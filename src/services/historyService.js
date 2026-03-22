// -------------------------------------------------------
// Réviz — Service historique des leçons scannées
// -------------------------------------------------------
import { db } from './firebaseConfig'
import { doc, setDoc, deleteDoc, collection, getDocs, query, orderBy } from 'firebase/firestore'
import { updateChallengeProgress } from './challengeService'
import { incrementScanCount } from './scanLimitService'

let _uid = null
const MAX_LESSONS = 20

// Appelé par AuthContext dès que l'état de connexion change
export function setActiveUser(uid) { _uid = uid }

// Clé localStorage propre à l'utilisateur connecté
const getKey = () => _uid ? `reviz-lessons-${_uid}` : 'reviz-lessons'

// Normalise un titre pour la déduplication (casse + espaces insensible)
const normalize = s => s?.toLowerCase().trim().replace(/\s+/g, ' ') ?? ''

/**
 * Sauvegarde une leçon analysée dans l'historique localStorage + Firestore.
 * Déduplique par titre normalisé, limite à MAX_LESSONS entrées.
 */
export function saveLesson(metadata, aiData) {
  const lessons = loadLessons()

  // Supprimer une éventuelle entrée avec le même titre (rescanner la même leçon)
  const existing = lessons.findIndex(
    l => normalize(l.metadata.title) === normalize(metadata.title)
  )
  if (existing !== -1) lessons.splice(existing, 1)

  const entry = {
    id:              String(Date.now()),
    scannedAt:       Date.now(),
    metadata,
    flashcardsCount: aiData.flashcards?.length ?? 0,
    quizCount:       aiData.quiz?.length       ?? 0,
    aiData,
  }

  lessons.unshift(entry)                               // plus récent en premier
  if (lessons.length > MAX_LESSONS) lessons.splice(MAX_LESSONS)
  localStorage.setItem(getKey(), JSON.stringify(lessons))
  localStorage.setItem('reviz-current-lesson-id', entry.id)
  updateChallengeProgress('scan');
  incrementScanCount();

  // Firestore write-through (fire-and-forget)
  if (_uid) {
    setDoc(doc(db, 'users', _uid, 'lessons', entry.id), entry)
      .catch(err => console.warn('[Réviz] Firestore saveLesson error', err))
  }

  return entry
}

/**
 * Charge tout l'historique (tableau trié du plus récent au plus ancien).
 */
export function loadLessons() {
  try { return JSON.parse(localStorage.getItem(getKey()) || '[]') }
  catch { return [] }
}

/**
 * Supprime une leçon de l'historique par son id (localStorage + Firestore).
 */
export function deleteLesson(id) {
  const lessons = loadLessons().filter(l => l.id !== id)
  localStorage.setItem(getKey(), JSON.stringify(lessons))

  if (_uid) {
    deleteDoc(doc(db, 'users', _uid, 'lessons', id))
      .catch(err => console.warn('[Réviz] Firestore deleteLesson error', err))
  }
}

/**
 * Restaure les données IA d'une leçon dans reviz-ai-data
 * pour que /analyse puisse les afficher directement (cache hit).
 * Retourne true si la leçon a été trouvée, false sinon.
 */
export function restoreLesson(id) {
  const lesson = loadLessons().find(l => l.id === id)
  if (!lesson) return false
  localStorage.setItem('reviz-ai-data', JSON.stringify(lesson.aiData))
  localStorage.setItem('reviz-current-lesson-id', id)
  localStorage.removeItem('reviz-lesson-text')
  return true
}

/**
 * Synchronise les leçons depuis Firestore → met à jour le cache localStorage.
 * Retourne le tableau de leçons (fallback localStorage en cas d'erreur).
 */
export async function syncFromFirestore() {
  if (!_uid) return loadLessons()
  try {
    const q = query(
      collection(db, 'users', _uid, 'lessons'),
      orderBy('scannedAt', 'desc')
    )
    const snap = await getDocs(q)
    const lessons = snap.docs.map(d => d.data())
    localStorage.setItem(getKey(), JSON.stringify(lessons))
    return lessons
  } catch (err) {
    console.warn('[Réviz] Firestore syncFromFirestore error', err)
    return loadLessons()  // fallback offline
  }
}
