// -------------------------------------------------------
// Réviz — Réviser les chapitres d'un contrôle
//
// Quand l'élève a coché ce qui tombe à son contrôle (feuille d'ajout de l'agenda) — chapitres du
// programme et cours qu'il a scannés —, « Réviser » et les étapes du plan visent ces chapitres
// plutôt que toute la matière : la fiche du premier chapitre encore à travailler (J-5), les
// questions ratées de ces chapitres (J-3). Sans chapitres (contrôles notés avant), on garde le
// programme de la matière.
// -------------------------------------------------------
import { chapterProgress, openChapter } from './programmeService'
import { loadLessons, restoreLesson } from './historyService'
import { erreursDe, preparerQuizErreurs } from './erreursService'
import { chapterLessonId, PROGRAMME_FALLBACK } from '../utils/programme'

const programmeDeLaMatiere = controle => (controle.matiere === 'autre' ? '/cours' : `/programme?matiere=${controle.matiere}`)

/** L'id de la leçon d'un chapitre du contrôle : le cours scanné lui-même, ou le chapitre du programme. */
export const leconDuChapitre = ch => (ch.scan ? ch.id : chapterLessonId(ch.id))

/**
 * Le chapitre du contrôle à travailler en premier : le premier pas encore maîtrisé, sinon le premier.
 * Un cours scanné effacé depuis ne compte plus.
 */
export function chapitreAReviser(controle, lessons = loadLessons()) {
  const chs = (controle?.chapitres ?? []).filter(ch => !ch.scan || lessons.some(l => l.id === ch.id))
  return chs.find(ch => chapterProgress(ch, lessons, leconDuChapitre(ch)).state !== 'maitrise') ?? chs[0] ?? null
}

/** Ouvre un chapitre du contrôle : le cours scanné tel quel, ou le chapitre comme depuis le programme. */
export async function ouvrirChapitreDuControle(controle, chapitre) {
  if (chapitre.scan) {
    if (!restoreLesson(chapitre.id)) throw new Error('COURS_EFFACE')
    return
  }
  return openChapter(controle.classe ?? PROGRAMME_FALLBACK, controle.programme ?? controle.matiere, chapitre)
}

/** « Réviser » et l'étape J-5 : la fiche du chapitre à travailler, sinon le programme de la matière. */
export async function cibleRevision(controle) {
  const ch = chapitreAReviser(controle)
  if (ch) {
    try { await ouvrirChapitreDuControle(controle, ch); return '/analyse' } catch { /* chapitre indisponible : le programme */ }
  }
  return programmeDeLaMatiere(controle)
}

/**
 * L'étape J-3 : les questions ratées dans les chapitres du contrôle ; sans erreur, le quiz du
 * chapitre à travailler. Sans chapitres, les questions ratées de la matière (comme avant).
 */
export async function cibleQuizErreurs(uid, controle) {
  const ids = (controle.chapitres ?? []).map(leconDuChapitre)
  if (!ids.length) return preparerQuizErreurs(uid, controle.matiere) ? '/quiz?erreurs=1' : programmeDeLaMatiere(controle)
  const lessons = loadLessons()
  const avecErreurs = ids.find(id => erreursDe(uid, id).length && lessons.some(l => l.id === id))
  if (avecErreurs && restoreLesson(avecErreurs)) return '/quiz?erreurs=1'
  const ch = chapitreAReviser(controle, lessons)
  if (ch) {
    try { await ouvrirChapitreDuControle(controle, ch); return '/quiz' } catch { /* chapitre indisponible */ }
  }
  return programmeDeLaMatiere(controle)
}
