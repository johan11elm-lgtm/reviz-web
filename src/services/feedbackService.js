// -------------------------------------------------------
// Réviz — Feedback élève sur les formats générés par l'IA
// Un retour utile / moyen / pas terrible par (leçon, format), écrit dans la collection
// Firestore `aiFeedback` (création seule côté client — voir firestore.rules).
// C'est la seule boucle de visibilité sur la qualité réelle des générations.
// -------------------------------------------------------
import { auth, db } from './firebaseConfig'
import { addDoc, collection, serverTimestamp } from 'firebase/firestore'

export const FEEDBACK_RATINGS = ['up', 'meh', 'down']
export const FEEDBACK_FORMATS = ['flashcards', 'quiz', 'resume', 'mindmap']

const currentLessonId = () => localStorage.getItem('reviz-current-lesson-id') ?? 'default'
const sentKey = (lessonId, format) => `reviz-feedback-${lessonId}-${format}`

/** Un retour a-t-il déjà été donné pour ce format sur la leçon courante ? */
export function hasGivenFeedback(format) {
  try { return localStorage.getItem(sentKey(currentLessonId(), format)) !== null }
  catch { return false }
}

/**
 * Envoie le retour (fire-and-forget côté UI). Retourne false si non connecté,
 * rating/format invalide, ou échec Firestore — l'UI reste optimiste dans tous
 * les cas : un feedback perdu ne vaut pas un message d'erreur pour l'élève.
 */
export async function sendFormatFeedback(format, rating) {
  if (!FEEDBACK_RATINGS.includes(rating) || !FEEDBACK_FORMATS.includes(format)) return false
  const uid = auth.currentUser?.uid
  if (!uid) return false

  let metadata = {}
  try { metadata = JSON.parse(localStorage.getItem('reviz-ai-data') || 'null')?.metadata ?? {} }
  catch { /* ignore */ }

  let classe = null
  try { classe = JSON.parse(localStorage.getItem(`reviz-level-${uid}`) || 'null')?.classe ?? null }
  catch { /* ignore */ }

  try {
    await addDoc(collection(db, 'aiFeedback'), {
      uid,
      format,
      rating,
      lessonTitle: metadata.title ?? null,
      subject: metadata.subject ?? null,
      classe,
      createdAt: serverTimestamp(),
    })
    try { localStorage.setItem(sentKey(currentLessonId(), format), rating) } catch { /* ignore */ }
    return true
  } catch {
    return false
  }
}
