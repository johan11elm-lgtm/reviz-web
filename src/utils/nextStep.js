/**
 * La prochaine étape conseillée sur une leçon (carte « Ta prochaine étape »
 * de la page Analyse), dans l'ordre d'une séance : découvrir (résumé),
 * revoir les cartes déjà vues arrivées à échéance, apprendre les autres,
 * se tester (quiz).
 * @param {{ flashcardsCount?: number, quizCount?: number, resumeMinutes?: number }} lesson
 * @param {{ seen: number, seenDue: number } | null} progress  null : pas d'avancement connu
 * @param {(format: string) => boolean} didFormat  un format déjà ouvert sur cette leçon ?
 * @returns {{ title: string, sub: string, to: string, action: string }}
 */
export function nextStep(lesson, progress, didFormat) {
  const total = lesson.flashcardsCount ?? 0;
  if (!progress || (progress.seen === 0 && !didFormat('resume'))) {
    return { title: 'Lis le résumé', sub: `${lesson.resumeMinutes ?? 2} min pour découvrir l'essentiel, avant les cartes.`, to: '/resume', action: 'Lire le résumé' };
  }
  if (progress.seenDue > 0) {
    return { title: `Revois tes ${progress.seenDue} carte${progress.seenDue > 1 ? 's' : ''}`, sub: "C'est le bon moment : elles commencent à s'effacer.", to: '/flashcards', action: 'Réviser les cartes' };
  }
  if (progress.seen < total) {
    const left = total - progress.seen;
    return { title: 'Apprends les flashcards', sub: `${left} carte${left > 1 ? 's' : ''} encore jamais vue${left > 1 ? 's' : ''}.`, to: '/flashcards', action: 'Ouvrir les flashcards' };
  }
  if (!didFormat('quiz')) {
    return { title: 'Teste-toi avec le quiz', sub: `${lesson.quizCount} questions pour vérifier que tout est en place.`, to: '/quiz', action: 'Faire le quiz' };
  }
  return { title: 'Tout est à jour', sub: 'Refais le quiz pour garder le chapitre en tête.', to: '/quiz', action: 'Refaire le quiz' };
}
