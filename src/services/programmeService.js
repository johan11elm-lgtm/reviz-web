// -------------------------------------------------------
// Réviz — « Mon programme » : catalogue et contenus de chapitres
// Les fichiers sont statiques (public/programme/…), générés une fois par
// scripts/programme/generer.mjs et partagés par tous les élèves : aucun
// appel IA, aucun quota, et ça marche aussi en mode essai.
// -------------------------------------------------------
import { loadLessons, saveLesson, whenLessonsSynced } from './historyService'
import { countDueCards, getCardState } from './srsService'
import { track } from './statsService'
import {
  catalogueUrl, chapterContentUrl, chapterLessonId, chapterState, isProgrammeLessonId,
} from '../utils/programme'
import { parseIllustrations } from '../utils/lessonSchema'

const _cache = new Map()

async function fetchJson(url, errorCode) {
  if (_cache.has(url)) return _cache.get(url)
  const p = fetch(url, { headers: { Accept: 'application/json' } })
    .then(r => {
      if (!r.ok) throw new Error(errorCode)
      return r.json()
    })
    .catch(err => { _cache.delete(url); throw err instanceof Error ? err : new Error(errorCode) })
  _cache.set(url, p)
  return p
}

/** Catalogue d'une classe : { classe, matieres: [{ matiere, slug, chapitres: [...] }] } */
export function loadCatalogue(classe) {
  return fetchJson(catalogueUrl(classe), 'CATALOGUE_INDISPONIBLE')
}

/** Les quatre formats générés d'un chapitre (même forme que le résultat d'un scan). */
export async function loadChapterContent(classe, matiere, chapterId) {
  const data = await fetchJson(chapterContentUrl(classe, matiere, chapterId), 'CHAPITRE_INDISPONIBLE')
  if (!data?.flashcards || !data?.quiz || !data?.resume || !data?.mindmap) throw new Error('CHAPITRE_INDISPONIBLE')
  return data
}

/** Progression de l'élève sur un chapitre, d'après l'historique et la répétition espacée. */
export function chapterProgress(chapter, lessons = loadLessons()) {
  const lessonId = chapterLessonId(chapter.id)
  const lesson = lessons.find(l => l.id === lessonId) ?? null
  const total = lesson?.flashcardsCount ?? 0
  let seen = 0
  for (let i = 0; i < total; i++) if (getCardState(lessonId, i)) seen++
  const dueCards = lesson ? countDueCards(lessonId, total) : 0
  return { lesson, dueCards, state: chapterState({ lesson, dueCards, reviewedCards: seen }) }
}

/** Compteurs d'une matière : chapitres total / commencés / maîtrisés. */
export function matiereProgress(entry, lessons = loadLessons()) {
  const states = (entry?.chapitres ?? []).map(c => chapterProgress(c, lessons).state)
  return {
    total: states.length,
    commences: states.filter(s => s !== 'nouveau').length,
    maitrises: states.filter(s => s === 'maitrise').length,
  }
}

/**
 * Ouvre un chapitre comme une leçon : charge le contenu, le pose dans
 * reviz-ai-data (ce que lisent Analyse et les pages de format) et
 * l'enregistre dans l'historique sous un id stable, sans compter un scan.
 */
export async function openChapter(classe, matiere, chapter) {
  const content = await loadChapterContent(classe, matiere, chapter.id)
  track('chapitre_ouvert', { classe, matiere })
  // eslint-disable-next-line no-unused-vars
  const { programme, ...aiData } = content
  const metadata = { ...(aiData.metadata ?? {}), title: chapter.titre, subject: matiere }
  const data = { ...aiData, metadata }
  localStorage.removeItem('reviz-lesson-text')
  localStorage.removeItem('reviz-captured-image')
  localStorage.setItem('reviz-ai-data', JSON.stringify(data))
  const entry = saveLesson(metadata, data, {
    id: chapterLessonId(chapter.id),
    source: 'programme',
    chapterId: chapter.id,
    classe,
    matiere,
  })
  // Un rechargement immédiat perdrait l'écriture Firestore en vol : on lui
  // laisse jusqu'à 1,5 s, sans bloquer l'élève au-delà.
  await Promise.race([whenLessonsSynced(), new Promise(r => setTimeout(r, 1500))])
  return entry
}

/**
 * Illustrations à jour d'une leçon du programme : relues dans le fichier du
 * chapitre, pour qu'une figure ajoutée après la première ouverture apparaisse
 * aussi. null si ce n'est pas un chapitre ou si l'entrée est trop ancienne
 * (enregistrée sans classe : rouvrir le chapitre suffit à la compléter).
 */
export async function illustrationsAJour(lessonId = localStorage.getItem('reviz-current-lesson-id')) {
  if (!isProgrammeLessonId(lessonId)) return null
  const entry = loadLessons().find(l => l.id === lessonId)
  if (!entry?.chapterId || !entry.classe || !entry.matiere) return null
  const content = await loadChapterContent(entry.classe, entry.matiere, entry.chapterId)
  return parseIllustrations(content.illustrations)
}

// Tests : vider le cache mémoire entre deux cas.
export function _resetProgrammeCache() { _cache.clear() }
