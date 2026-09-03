// -------------------------------------------------------
// Réviz — Fonctions de gamification partagées
// -------------------------------------------------------

export const XP_PAR_LECON  = 100;
export const XP_PAR_NIVEAU = 500;

/**
 * Calcule la série en cours (jours consécutifs avec activité).
 * @param {Array} items — tableau d'objets avec une date
 * @param {string} dateKey — clé contenant le timestamp (default: 'scannedAt')
 */
export function computeStreak(items, dateKey = 'scannedAt') {
  if (!items.length) return 0;
  const days = new Set(items.map(l => new Date(l[dateKey]).toLocaleDateString('fr-FR')));
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    if (days.has(d.toLocaleDateString('fr-FR'))) streak++;
    else if (i > 0) break;
  }
  return streak;
}

/**
 * Calcule le niveau et la progression XP.
 */
export function computeLevel(lessons) {
  const xp      = lessons.length * XP_PAR_LECON;
  const level   = Math.floor(xp / XP_PAR_NIVEAU) + 1;
  const xpInLvl = xp % XP_PAR_NIVEAU;
  const xpTotal = xp;
  const fillPct = Math.round(xpInLvl / XP_PAR_NIVEAU * 100);
  return { level, xpInLvl, xpTotal, fillPct };
}

/**
 * Calcule les badges débloqués/verrouillés.
 * Chaque badge a un `id` unique pour le tracking et une `pose` de mascotte (illustration).
 */
export function computeBadges(lessons, revisions, streak, level) {
  const types = new Set(revisions.map(r => r.type));
  const allFormats = ['flashcards', 'quiz', 'resume', 'mindmap'].every(t => types.has(t));
  const totalFlashcards = lessons.reduce((s, l) => s + (l.flashcardsCount || 0), 0);
  const revsByDay = {};
  revisions.forEach(r => {
    const day = new Date(r.revisedAt).toLocaleDateString('fr-FR');
    revsByDay[day] = (revsByDay[day] || 0) + 1;
  });
  const maxRevsInDay = Object.values(revsByDay).length ? Math.max(...Object.values(revsByDay)) : 0;
  const revsByLesson = {};
  revisions.forEach(r => {
    if (r.lessonId) revsByLesson[r.lessonId] = (revsByLesson[r.lessonId] || 0) + 1;
  });
  const maxRevsPerLesson = Object.values(revsByLesson).length ? Math.max(...Object.values(revsByLesson)) : 0;
  const countByType = { flashcards: 0, quiz: 0, resume: 0, mindmap: 0 };
  revisions.forEach(r => { if (r.type in countByType) countByType[r.type]++; });
  const isMaitre = Object.values(countByType).every(c => c >= 20);

  return [
    { id: 'lanceur',      pose: 'scanphone', label: 'Lanceur',      locked: lessons.length < 1 },
    { id: 'curieux',      pose: 'thinking', label: 'Curieux',      locked: types.size < 3 },
    { id: 'rapide',       pose: 'quiz', label: 'Rapide',       locked: revisions.length < 1 },
    { id: 'etudiant',     pose: 'graduation', label: 'Étudiant',     locked: lessons.length < 5 },
    { id: 'regulier',     pose: 'reading', label: 'Régulier',     locked: streak < 3 },
    { id: 'chercheur',    pose: 'search', label: 'Chercheur',    locked: totalFlashcards < 50 },
    { id: 'precis',       pose: 'examen', label: 'Précis',       locked: !allFormats },
    { id: '7jours',       pose: 'fire', label: '7 jours',      locked: streak < 7 },
    { id: 'fidele',       pose: 'retour', label: 'Fidèle',       locked: streak < 14 },
    { id: 'acharne',      pose: 'soir', label: 'Acharné',      locked: maxRevsInDay < 10 },
    { id: 'expert',       pose: 'flashcard', label: 'Expert',       locked: lessons.length < 10 },
    { id: 'approfondi',   pose: 'muscu', label: 'Approfondi',   locked: maxRevsPerLesson < 5 },
    { id: 'maitre',       pose: 'writing', label: 'Maître',       locked: !isMaitre },
    { id: 'champion',     pose: 'trophy', label: 'Champion',     locked: revisions.length < 50 },
    { id: 'bibliotheque', pose: 'francais', label: 'Bibliothèque', locked: lessons.length < 50 },
    { id: 'niveau10',     pose: 'levelup', label: 'Niveau 10',    locked: level < 10 },
    { id: 'diamant',      pose: 'celebration', label: 'Diamant',      locked: lessons.length < 25 },
    { id: 'legende',      pose: 'pointing', label: 'Légende',      locked: streak < 30 },
  ];
}
