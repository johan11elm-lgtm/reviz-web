// -------------------------------------------------------
// Réviz — Map des matières (partagé entre pages)
// -------------------------------------------------------

export const SUBJECT_MAP = {
  'maths':    { color: 'orange', dot: '#FF6B00', bg: '#FFF7ED', emoji: '📐' },
  'français': { color: 'pink',   dot: '#EC4899', bg: '#FDF2F8', emoji: '📖' },
  'histoire': { color: 'indigo', dot: '#6366F1', bg: '#EEF2FF', emoji: '🌍' },
  'géo':      { color: 'indigo', dot: '#6366F1', bg: '#EEF2FF', emoji: '🌍' },
  'svt':      { color: 'green',  dot: '#22C55E', bg: '#F0FDF4', emoji: '🧬' },
  'physique': { color: 'blue',   dot: '#3B82F6', bg: '#EFF6FF', emoji: '⚛️' },
  'chimie':   { color: 'blue',   dot: '#3B82F6', bg: '#EFF6FF', emoji: '🧪' },
  'techno':   { color: 'cyan',   dot: '#06B6D4', bg: '#ECFEFF', emoji: '⚙️' },
  'anglais':  { color: 'yellow', dot: '#EAB308', bg: '#FEFCE8', emoji: '🗣️' },
  'espagnol': { color: 'yellow', dot: '#EAB308', bg: '#FEFCE8', emoji: '💬' },
  'langues':  { color: 'yellow', dot: '#EAB308', bg: '#FEFCE8', emoji: '🌐' },
  'latin':    { color: 'yellow', dot: '#6366F1', bg: '#EEF2FF', emoji: '🏛️' },
  'arts':     { color: 'purple', dot: '#A855F7', bg: '#FAF5FF', emoji: '🎨' },
};

export function subjectKey(s) {
  return Object.keys(SUBJECT_MAP).find(k => s?.toLowerCase().includes(k)) ?? null;
}

export function subjectColor(s) {
  return SUBJECT_MAP[subjectKey(s)]?.color ?? 'indigo';
}

export function subjectEmoji(s) {
  return SUBJECT_MAP[subjectKey(s)]?.emoji ?? '📚';
}

export function subjectInfo(s) {
  const key = subjectKey(s);
  return SUBJECT_MAP[key] ?? { color: 'indigo', dot: '#6366F1', bg: '#EEF2FF', emoji: '📚' };
}
