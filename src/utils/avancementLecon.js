import { getCardState, countDueCards } from '../services/srsService'
import { loadRevisions } from '../services/revisionService'
import { chapterState } from './programme'
import { nextStep } from './nextStep'

const pluriel = (n, mot) => `${n} ${mot}${n > 1 ? 's' : ''}`

/**
 * Où en est l'élève sur une leçon (même lecture que la fiche chapitre) : son état, la pastille
 * à afficher, et le statut des 3 étapes du parcours Résumé → Flashcards → Quiz.
 * @param {{ id: string, flashcardsCount?: number, quizCount?: number }} lecon  entrée d'historique
 * @param {Array} [revisions]  loadRevisions(), à passer quand on lit plusieurs leçons d'affilée
 */
export function avancementLecon(lecon, revisions = loadRevisions()) {
  const total = lecon.flashcardsCount ?? 0
  let seen = 0, seenDue = 0
  const now = Date.now()
  for (let i = 0; i < total; i++) {
    const carte = getCardState(lecon.id, i)
    if (!carte) continue
    seen++
    if (!carte.nextReview || carte.nextReview <= now) seenDue++
  }
  const due = countDueCards(lecon.id, total)
  const siennes = revisions.filter(r => r.lessonId === lecon.id)
  const aOuvert = type => siennes.some(r => r.type === type)
  const progress = { seen, seenDue }
  const step = nextStep(lecon, progress, aOuvert)
  const etat = seen === 0 && siennes.length === 0 ? 'decouvrir'
    : chapterState({ lesson: true, dueCards: due, reviewedCards: seen }) === 'maitrise' ? 'maitrise' : 'encours'
  // La troisième étape est la séance d'exercices ; un quiz fait avant le 29/10 la compte aussi.
  const faits = { resume: aOuvert('resume') || seen > 0, flashcards: total > 0 && seen === total && seenDue === 0, exercices: aOuvert('exercices') || aOuvert('quiz') }
  const ids = ['resume', 'flashcards', 'exercices']
  const enCours = etat === 'decouvrir' ? null : ids.find(id => `/${id}` === step.to && !faits[id]) ?? ids.find(id => !faits[id])
  const etapes = ids.map(id => (faits[id] ? 'fait' : id === enCours ? 'cours' : 'afaire'))
  const pastille = etat === 'decouvrir' ? 'À découvrir'
    : etat === 'maitrise' ? 'Maîtrisé'
    : seenDue > 0 ? `${pluriel(seenDue, 'carte')} à travailler`
    : seen < total ? `${seen} / ${total} cartes vues` : 'Commencé'
  return { etat, aRevoir: seenDue, pastille, etapes, step, ouverteLe: siennes[0]?.revisedAt ?? null }
}
