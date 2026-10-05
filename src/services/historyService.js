// -------------------------------------------------------
// Réviz — Service historique des leçons (scannées ou du programme)
// -------------------------------------------------------
import { db } from './firebaseConfig'
import { doc, setDoc, deleteDoc, collection, getDocs, query, orderBy } from 'firebase/firestore'
import { updateChallengeProgress } from './challengeService'
import { incrementScanCount } from './scanLimitService'
import { isGuestUid } from './guestService'

let _uid = null
const MAX_LESSONS = 100

// Appelé par AuthContext dès que l'état de connexion change
export function setActiveUser(uid) { _uid = uid }

// Clé localStorage propre à l'utilisateur connecté
const getKey = () => _uid ? `reviz-lessons-${_uid}` : 'reviz-lessons'

// Firestore uniquement pour un vrai compte : en mode essai (uid « invite-… »),
// tout reste dans le navigateur.
const canSync = () => !!_uid && !isGuestUid(_uid)

// Écritures Firestore encore en vol (write-through fire-and-forget) : une
// synchronisation lancée juste après (ouvrir un chapitre puis Mes cours)
// les attend, sinon la liste locale serait écrasée par une lecture trop tôt.
const _pending = new Set()
function track(promise) {
  const p = promise.catch(err => console.warn('[Réviz] Firestore saveLesson error', err))
  _pending.add(p)
  p.finally(() => _pending.delete(p))
  return p
}
export function whenLessonsSynced() { return Promise.all([..._pending]) }

// Normalise un titre pour la déduplication (casse + espaces insensible)
const normalize = s => s?.toLowerCase().trim().replace(/\s+/g, ' ') ?? ''

/**
 * Sauvegarde une leçon analysée dans l'historique localStorage + Firestore.
 * Déduplique par titre normalisé (ou par `id` quand il est imposé), limite
 * à MAX_LESSONS entrées.
 *
 * @param {object} metadata  { title, subject, excerpt }
 * @param {object} aiData    les quatre formats validés
 * @param {object} [options]
 * @param {string} [options.id]            identifiant stable (chapitre du programme : « prog-<id> »)
 * @param {'scan'|'programme'} [options.source='scan']
 * @param {string} [options.chapterId]     identifiant du chapitre dans le catalogue
 * @param {boolean} [options.countsAsScan] compte dans le quota et le défi « scan » (défaut : source === 'scan')
 */
export function saveLesson(metadata, aiData, options = {}) {
  const { id = null, source = 'scan', chapterId = null, countsAsScan = source === 'scan' } = options
  const lessons = loadLessons()

  // Supprimer une éventuelle entrée équivalente (rescanner la même leçon,
  // rouvrir le même chapitre)
  const existing = lessons.findIndex(l =>
    id ? l.id === id : normalize(l.metadata.title) === normalize(metadata.title)
  )
  if (existing !== -1) lessons.splice(existing, 1)

  const entry = {
    id:              id ?? String(Date.now()),
    scannedAt:       Date.now(),
    source,
    metadata,
    flashcardsCount: aiData.flashcards?.length ?? 0,
    quizCount:       aiData.quiz?.length       ?? 0,
    aiData,
  }
  if (chapterId) entry.chapterId = chapterId

  lessons.unshift(entry)                               // plus récent en premier
  if (lessons.length > MAX_LESSONS) lessons.splice(MAX_LESSONS)
  localStorage.setItem(getKey(), JSON.stringify(lessons))
  localStorage.setItem('reviz-current-lesson-id', entry.id)
  if (countsAsScan) {
    updateChallengeProgress('scan');
    incrementScanCount();
  }

  // Firestore write-through (fire-and-forget)
  if (canSync()) {
    track(setDoc(doc(db, 'users', _uid, 'lessons', entry.id), entry))
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

  if (canSync()) {
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
  if (!canSync()) return loadLessons()
  try {
    await whenLessonsSynced()
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

/**
 * Envoie à Firestore des leçons déjà présentes en local (reprise d'une
 * session d'essai au moment de l'inscription). Fire-and-forget.
 */
export function pushLessonsToFirestore(entries) {
  if (!canSync() || !Array.isArray(entries)) return
  entries.forEach(entry => {
    if (!entry?.id) return
    setDoc(doc(db, 'users', _uid, 'lessons', entry.id), entry)
      .catch(err => console.warn('[Réviz] Firestore pushLessons error', err))
  })
}
