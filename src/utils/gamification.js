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
export function computeStreak(items, dateKey = 'scannedAt', options = {}) {
  return detailSerie(items, dateKey, options).serie;
}

/**
 * La série et les jours gelés. Avec `gel` (comme le bonus de gel automatique de Nomad) : un jour
 * manqué au plus par semaine ne casse pas la série, sans compter dedans ; deux jours manqués
 * d'affilée la cassent toujours. Aujourd'hui pas encore révisé ne casse rien.
 * @returns {{ serie: number, gels: string[] }} gels : jours gelés (« JJ/MM/AAAA »), du plus récent
 */
export function detailSerie(items, dateKey = 'scannedAt', { gel = false, aujourdhui = new Date() } = {}) {
  if (!items.length) return { serie: 0, gels: [] };
  const days = new Set(items.map(l => new Date(l[dateKey]).toLocaleDateString('fr-FR')));
  const jour = i => {
    const d = new Date(aujourdhui);
    d.setDate(aujourdhui.getDate() - i);
    return d.toLocaleDateString('fr-FR');
  };
  let streak = 0;
  const gels = [];
  let dernierGel = null;
  for (let i = 0; i < 365; i++) {
    if (days.has(jour(i))) { streak++; continue; }
    if (i === 0) continue;
    // Un jour manqué, gelé si la série continue juste avant et qu'aucun gel n'a servi dans la semaine.
    const gelPossible = gel && streak > 0 && days.has(jour(i + 1)) && (dernierGel === null || i - dernierGel >= 7);
    if (!gelPossible) break;
    gels.push(jour(i));
    dernierGel = i;
  }
  return { serie: streak, gels };
}

/** XP gagnée en révisant, portée par chaque révision depuis le 29/10 (utils/xp.js). */
export function xpRevisions(revisions = []) {
  return revisions.reduce((s, r) => s + (Number.isFinite(r?.xp) ? r.xp : 0), 0);
}

/**
 * Calcule le niveau et la progression XP : 100 XP par leçon ouverte, plus l'XP gagnée en
 * révisant et celle des quêtes récupérées.
 */
export function computeLevel(lessons, revisions = [], xpQuetes = 0) {
  const xp      = lessons.length * XP_PAR_LECON + xpRevisions(revisions) + (Number.isFinite(xpQuetes) ? xpQuetes : 0);
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
  // Les exercices en jeu remplacent le quiz depuis le 29/10 : l'un ou l'autre compte pour ce format.
  const formatsEssayes = ['flashcards', 'resume', 'mindmap'].filter(t => types.has(t)).length + (types.has('quiz') || types.has('exercices') ? 1 : 0);
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

  // Ce qu'il faut faire (`hint`) et où on en est (`current` / `target`) :
  // la page Profil sur ordinateur les affiche sous chaque badge.
  const minParFormat = Math.min(...Object.values(countByType));
  const badge = (id, pose, label, hint, current, target) => ({
    id, pose, label, hint, current: Math.min(current, target), target, locked: current < target,
  });

  return [
    badge('lanceur',      'scanphone',   'Lanceur',      '1re leçon ouverte',         lessons.length, 1),
    badge('curieux',      'thinking',    'Curieux',      '3 formats essayés',         types.size, 3),
    badge('rapide',       'quiz',        'Rapide',       '1re révision',              revisions.length, 1),
    badge('etudiant',     'graduation',  'Étudiant',     '5 leçons ouvertes',         lessons.length, 5),
    badge('regulier',     'reading',     'Régulier',     '3 jours de suite',          streak, 3),
    badge('chercheur',    'search',      'Chercheur',    '50 flashcards',             totalFlashcards, 50),
    badge('precis',       'examen',      'Précis',       'Les 4 formats essayés',     formatsEssayes, 4),
    badge('7jours',       'fire',        '7 jours',      '7 jours de suite',          streak, 7),
    badge('fidele',       'retour',      'Fidèle',       '14 jours de suite',         streak, 14),
    badge('acharne',      'soir',        'Acharné',      '10 révisions en un jour',   maxRevsInDay, 10),
    badge('expert',       'flashcard',   'Expert',       '10 leçons ouvertes',        lessons.length, 10),
    badge('approfondi',   'muscu',       'Approfondi',   '5 révisions d\'une leçon',  maxRevsPerLesson, 5),
    badge('maitre',       'writing',     'Maître',       '20 révisions par format',   isMaitre ? 20 : minParFormat, 20),
    badge('champion',     'trophy',      'Champion',     '50 révisions',              revisions.length, 50),
    badge('bibliotheque', 'francais',    'Bibliothèque', '50 leçons ouvertes',        lessons.length, 50),
    badge('niveau10',     'levelup',     'Niveau 10',    'Atteindre le niveau 10',    level, 10),
    badge('diamant',      'celebration', 'Diamant',      '25 leçons ouvertes',        lessons.length, 25),
    badge('legende',      'pointing',    'Légende',      '30 jours de suite',         streak, 30),
  ];
}
