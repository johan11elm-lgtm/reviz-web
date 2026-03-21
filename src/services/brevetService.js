// -------------------------------------------------------
// Réviz — Service Brevet
// Gère les thèmes cochés manuellement + auto-détection
// localStorage key : reviz-brevet-{uid}
// -------------------------------------------------------
import { BREVET_PROGRAM } from '../utils/brevetProgram';

let _uid = null;
const key = () => `reviz-brevet-${_uid ?? 'anon'}`;

export function setBrevetUser(uid) {
  _uid = uid;
}

function load() {
  try { return JSON.parse(localStorage.getItem(key()) || '[]'); } catch { return []; }
}

/** IDs cochés manuellement */
export function getCheckedThemes() {
  return new Set(load());
}

/** Coche ou décoche un thème manuellement */
export function toggleTheme(themeId) {
  const checked = load();
  const idx = checked.indexOf(themeId);
  if (idx >= 0) checked.splice(idx, 1); else checked.push(themeId);
  localStorage.setItem(key(), JSON.stringify(checked));
}

/**
 * Retourne un Map<themeId, lessonTitle> pour les thèmes auto-détectés
 * depuis le titre des leçons scannées.
 */
export function getAutoDetected(lessons) {
  const detected = new Map(); // themeId → first matching lesson title
  lessons.forEach(lesson => {
    const title   = (lesson.metadata?.title   || '').toLowerCase();
    const subject = (lesson.metadata?.subject || '').toLowerCase();
    BREVET_PROGRAM.forEach(cat => {
      // On compare seulement si la matière de la leçon correspond à la catégorie
      if (subject !== cat.subject && !subject.includes(cat.subject) && !cat.subject.includes(subject)) return;
      cat.themes.forEach(theme => {
        if (!detected.has(theme.id) && theme.keywords.some(kw => title.includes(kw))) {
          detected.set(theme.id, lesson.metadata.title);
        }
      });
    });
  });
  return detected;
}

/**
 * Union des thèmes couverts (manuel + auto-détectés)
 */
export function getCoveredCount(lessons) {
  const manual   = getCheckedThemes();
  const auto     = getAutoDetected(lessons);
  const covered  = new Set([...manual, ...auto.keys()]);
  return covered.size;
}
