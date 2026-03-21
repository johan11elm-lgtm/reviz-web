// -------------------------------------------------------
// Réviz — Service de défis hebdomadaires
// -------------------------------------------------------

let _uid = null;
export function setChallengeUser(uid) { _uid = uid; }

const getKey = () => _uid ? `reviz-challenges-${_uid}` : 'reviz-challenges';

// Pool de défis possibles
const CHALLENGE_POOL = [
  { id: 'scan2',      title: 'Scanne 2 leçons',              description: 'Ajoute 2 nouvelles leçons',     target: 2,  eventType: 'scan',       xpReward: 100 },
  { id: 'scan5',      title: 'Scanne 5 leçons',              description: 'Ajoute 5 nouvelles leçons',     target: 5,  eventType: 'scan',       xpReward: 200 },
  { id: 'rev5',       title: 'Fais 5 révisions',             description: 'Complète 5 sessions',           target: 5,  eventType: 'revision',   xpReward: 100 },
  { id: 'rev10',      title: 'Fais 10 révisions',            description: 'Complète 10 sessions',          target: 10, eventType: 'revision',   xpReward: 150 },
  { id: 'rev20',      title: 'Fais 20 révisions',            description: 'Complète 20 sessions',          target: 20, eventType: 'revision',   xpReward: 200 },
  { id: 'flash3',     title: 'Révise 3 fois en flashcards',  description: 'Utilise les flashcards 3 fois', target: 3,  eventType: 'flashcards', xpReward: 100 },
  { id: 'quiz3',      title: 'Fais 3 quiz',                  description: 'Complète 3 quiz',               target: 3,  eventType: 'quiz',       xpReward: 100 },
  { id: 'allformats', title: 'Utilise les 4 formats',        description: 'Flashcards + Quiz + Résumé + Carte mentale', target: 4, eventType: 'formats', xpReward: 150 },
  { id: 'streak3',    title: 'Maintiens 3 jours de suite',   description: 'Révise 3 jours consécutifs',    target: 3,  eventType: 'streak',     xpReward: 150 },
  { id: 'daily5',     title: 'Révise 5 fois en 1 jour',      description: "Fais 5 révisions aujourd'hui",  target: 5,  eventType: 'daily',      xpReward: 100 },
  { id: 'resume2',    title: 'Lis 2 résumés',                description: 'Consulte 2 résumés',            target: 2,  eventType: 'resume',     xpReward: 100 },
  { id: 'mindmap2',   title: 'Consulte 2 cartes mentales',   description: 'Ouvre 2 cartes mentales',       target: 2,  eventType: 'mindmap',    xpReward: 100 },
];

// Seed déterministe : même semaine = mêmes défis pour tout le monde
function getWeekKey() {
  const now = new Date();
  const jan1 = new Date(now.getFullYear(), 0, 1);
  const weekNum = Math.ceil(((now - jan1) / 86400000 + jan1.getDay() + 1) / 7);
  return `${now.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

function selectChallenges(weekKey) {
  let hash = 0;
  for (let i = 0; i < weekKey.length; i++) {
    hash = ((hash << 5) - hash) + weekKey.charCodeAt(i);
    hash |= 0;
  }
  const selected = [];
  const pool = [...CHALLENGE_POOL];
  for (let i = 0; i < 3; i++) {
    const idx = Math.abs(hash + i * 7) % pool.length;
    selected.push(pool.splice(idx, 1)[0]);
  }
  return selected.map(c => ({ ...c, current: 0, completed: false }));
}

function loadData() {
  try { return JSON.parse(localStorage.getItem(getKey()) || '{}'); }
  catch { return {}; }
}

function saveData(data) {
  localStorage.setItem(getKey(), JSON.stringify(data));
}

/**
 * Retourne les 3 défis de la semaine en cours.
 * Si c'est une nouvelle semaine, génère de nouveaux défis.
 */
export function getWeeklyChallenges() {
  const weekKey = getWeekKey();
  const data = loadData();
  if (data.weekKey !== weekKey) {
    const challenges = selectChallenges(weekKey);
    const newData = {
      weekKey,
      challenges,
      previousWeek: data.weekKey
        ? { weekKey: data.weekKey, challenges: data.challenges }
        : null,
    };
    saveData(newData);
    return newData;
  }
  return data;
}

/**
 * Met à jour la progression d'un défi.
 * @param {'scan'|'revision'|'flashcards'|'quiz'|'resume'|'mindmap'} eventType
 * @param {object} [extra] — données supplémentaires
 */
export function updateChallengeProgress(eventType, extra = {}) {
  const data = getWeeklyChallenges();
  let changed = false;

  data.challenges.forEach(c => {
    if (c.completed) return;

    let shouldIncrement = false;

    if (c.eventType === eventType) {
      shouldIncrement = true;
    } else if (c.eventType === 'revision' && ['flashcards', 'quiz', 'resume', 'mindmap'].includes(eventType)) {
      shouldIncrement = true;
    } else if (c.eventType === 'formats' && extra.formatsUsed) {
      c.current = extra.formatsUsed.size;
      if (c.current >= c.target) c.completed = true;
      changed = true;
      return;
    } else if (c.eventType === 'streak' && extra.streak) {
      c.current = Math.min(extra.streak, c.target);
      if (c.current >= c.target) c.completed = true;
      changed = true;
      return;
    } else if (c.eventType === 'daily' && extra.dailyCount) {
      c.current = Math.min(extra.dailyCount, c.target);
      if (c.current >= c.target) c.completed = true;
      changed = true;
      return;
    }

    if (shouldIncrement) {
      c.current++;
      if (c.current >= c.target) c.completed = true;
      changed = true;
    }
  });

  if (changed) saveData(data);
  return data;
}

/**
 * Retourne le nombre de défis complétés cette semaine.
 */
export function getCompletedCount() {
  const data = getWeeklyChallenges();
  return data.challenges?.filter(c => c.completed).length ?? 0;
}
