// -------------------------------------------------------
// Réviz — Les questions ratées en quiz, par leçon
//
// Vu chez Nomad (liste des exercices avec erreurs par chapitre) : chaque fin de
// quiz note les questions ratées et retire celles réussies. Elles servent au
// « Refaire mes erreurs » de fin de quiz et à l'étape J-3 du plan de révision
// (« Quiz sur les points ratés »). Sur l'appareil, par élève ; repérées par
// leur énoncé (stable, contrairement à leur rang).
// -------------------------------------------------------
import { loadLessons, restoreLesson } from './historyService'
import { matiereDuCours } from '../utils/agenda'

const cle = uid => `reviz-erreurs-${uid ?? 'local'}`
const lire = uid => { try { return JSON.parse(localStorage.getItem(cle(uid)) || '{}') ?? {} } catch { return {} } }
const ecrire = (uid, v) => { try { localStorage.setItem(cle(uid), JSON.stringify(v)) } catch { /* stockage indispo */ } }

/** Fin de quiz : les questions ratées s'ajoutent, celles réussies sortent de la liste. */
export function noterErreurs(uid, lessonId, questions, reponses) {
  if (!lessonId) return
  const tout = lire(uid)
  const avant = new Set(tout[lessonId]?.questions ?? [])
  questions.forEach((q, i) => {
    if (reponses[i] === null || reponses[i] === undefined) return
    if (reponses[i] === q.correct) avant.delete(q.question)
    else avant.add(q.question)
  })
  if (avant.size) tout[lessonId] = { questions: [...avant], at: Date.now() }
  else delete tout[lessonId]
  ecrire(uid, tout)
}

/** Énoncés des questions ratées d'une leçon. */
export function erreursDe(uid, lessonId) {
  return lire(uid)[lessonId]?.questions ?? []
}

/** La leçon la plus récente de la matière (slug du programme) qui a des erreurs. */
export function leconAvecErreurs(uid, matiere) {
  const tout = lire(uid)
  const lecons = loadLessons()
  const candidates = Object.entries(tout)
    .filter(([id, e]) => e?.questions?.length && lecons.some(l => l.id === id
      && (l.matiere === matiere || matiereDuCours(l.metadata?.subject ?? '') === matiere)))
    .sort((a, b) => (b[1].at ?? 0) - (a[1].at ?? 0))
  return candidates[0]?.[0] ?? null
}

/** Ouvre le quiz des erreurs de la matière ; false s'il n'y en a pas (rien n'est ouvert). */
export function preparerQuizErreurs(uid, matiere) {
  const id = leconAvecErreurs(uid, matiere)
  return id ? restoreLesson(id) : false
}

/**
 * Les questions ratées de ces derniers jours, pour Réviz IA sans leçon : elles ne vivent que sur
 * l'appareil, l'appli les joint à la demande (api/_agent.js les borne). Les plus récentes d'abord.
 */
export function erreursRecentes(uid, jours = 7) {
  const depuis = Date.now() - jours * 86_400_000
  const lecons = loadLessons()
  return Object.entries(lire(uid))
    .filter(([, e]) => e?.questions?.length && (e.at ?? 0) >= depuis)
    .sort((a, b) => (b[1].at ?? 0) - (a[1].at ?? 0))
    .slice(0, 12)
    .map(([lessonId, e]) => {
      const l = lecons.find(x => x.id === lessonId)
      return { lessonId, titre: l?.metadata?.title ?? 'Leçon', matiere: l?.matiere ?? matiereDuCours(l?.metadata?.subject ?? '') ?? '', questions: e.questions.slice(0, 10), at: e.at }
    })
}
