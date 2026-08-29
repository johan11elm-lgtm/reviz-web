// -------------------------------------------------------
// Réviz — Map des matières (partagé entre pages)
// -------------------------------------------------------

// ⚠️ L'ordre des clés compte : `subjectKey` retourne le PREMIER match par
// substring (lowercase). Les clés les plus spécifiques d'abord, les plus
// génériques après. Exemple : "philosophie" avant "philo" si conflit.
export const SUBJECT_MAP = {
  // --- Collège & lycée (tronc commun) ---
  'maths':       { color: 'orange', dot: '#FF6B00', bg: '#FFF7ED', emoji: '📐', mascot: 'maths' },
  'français':    { color: 'pink',   dot: '#EC4899', bg: '#FDF2F8', emoji: '📖', mascot: 'francais' },
  'histoire':    { color: 'indigo', dot: '#6366F1', bg: '#EEF2FF', emoji: '🌍', mascot: 'histgeo' },
  'géo':         { color: 'indigo', dot: '#6366F1', bg: '#EEF2FF', emoji: '🌍', mascot: 'histgeo' },
  'svt':         { color: 'green',  dot: '#22C55E', bg: '#F0FDF4', emoji: '🧬', mascot: 'svt' },
  'physique':    { color: 'blue',   dot: '#3B82F6', bg: '#EFF6FF', emoji: '⚛️', mascot: 'physique' },
  'chimie':      { color: 'blue',   dot: '#3B82F6', bg: '#EFF6FF', emoji: '🧪', mascot: 'physique' },
  'techno':      { color: 'cyan',   dot: '#06B6D4', bg: '#ECFEFF', emoji: '⚙️', mascot: 'technonsi' },
  'anglais':     { color: 'yellow', dot: '#EAB308', bg: '#FEFCE8', emoji: '🗣️', mascot: 'langues' },
  'espagnol':    { color: 'yellow', dot: '#EAB308', bg: '#FEFCE8', emoji: '💬', mascot: 'langues' },
  'allemand':    { color: 'yellow', dot: '#EAB308', bg: '#FEFCE8', emoji: '🇩🇪', mascot: 'langues' },
  'langues':     { color: 'yellow', dot: '#EAB308', bg: '#FEFCE8', emoji: '🌐', mascot: 'langues' },
  'llce':        { color: 'yellow', dot: '#EAB308', bg: '#FEFCE8', emoji: '🗣️', mascot: 'langues' },
  'latin':       { color: 'yellow', dot: '#6366F1', bg: '#EEF2FF', emoji: '🏛️', mascot: 'langues' },
  'arts':        { color: 'purple', dot: '#A855F7', bg: '#FAF5FF', emoji: '🎨', mascot: 'arts' },
  'emc':         { color: 'indigo', dot: '#6366F1', bg: '#EEF2FF', emoji: '⚖️', mascot: 'histgeo' },

  // --- Spécialités lycée ---
  'ses':         { color: 'green',  dot: '#22C55E', bg: '#F0FDF4', emoji: '📊', mascot: 'histgeo' },
  'nsi':         { color: 'cyan',   dot: '#06B6D4', bg: '#ECFEFF', emoji: '💻', mascot: 'technonsi' },
  'hggsp':       { color: 'indigo', dot: '#6366F1', bg: '#EEF2FF', emoji: '🌐', mascot: 'histgeo' },
  'hlp':         { color: 'purple', dot: '#A855F7', bg: '#FAF5FF', emoji: '🪶', mascot: 'philo' },
  'philosophie': { color: 'purple', dot: '#A855F7', bg: '#FAF5FF', emoji: '🤔', mascot: 'philo' },
  'philo':       { color: 'purple', dot: '#A855F7', bg: '#FAF5FF', emoji: '🤔', mascot: 'philo' },
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

// Pose de mascotte incarnant la matière (cf. src/components/Mascot.jsx).
// Fallback 'reading' : matière inconnue → posture d'étude générique.
export function subjectMascot(s) {
  return SUBJECT_MAP[subjectKey(s)]?.mascot ?? 'reading';
}
