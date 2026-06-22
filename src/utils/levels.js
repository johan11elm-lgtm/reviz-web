// -------------------------------------------------------
// Réviz — Modèle de niveau scolaire (cycle + classe)
// Source de vérité unique pour le niveau de l'utilisateur.
// -------------------------------------------------------

export const CYCLES = [
  { id: 'college', label: 'Collège', emoji: '🎒', desc: '6ème à 3ème'        },
  { id: 'lycee',   label: 'Lycée',   emoji: '🎓', desc: 'Seconde à Terminale' },
];

export const CLASSES_BY_CYCLE = {
  college: ['6ème', '5ème', '4ème', '3ème'],
  lycee:   ['2nde', '1ère', 'Terminale'],
};

export const SPECIALITES_LYCEE = [
  'Maths', 'NSI', 'HGGSP', 'SES', 'SVT',
  'Physique-Chimie', 'HLP', 'LLCE', 'Arts', 'Philosophie',
];

// Anciennes valeurs textuelles → classe canonique (table explicite : le
// remplacement par regex corrompait les formes déjà accentuées, ex. '3ème'→'3èmème').
const LEGACY_CLASSE_MAP = {
  '6e': '6ème', '6ème': '6ème',
  '5e': '5ème', '5ème': '5ème',
  '4e': '4ème', '4ème': '4ème',
  '3e': '3ème', '3ème': '3ème',
};

export function parseLevel(stored) {
  if (!stored) return null;
  try {
    const obj = typeof stored === 'string' ? JSON.parse(stored) : stored;
    if (obj && obj.cycle) return obj;
  } catch {
    // Pas du JSON → on tente la migration legacy plus bas
  }
  return migrateLegacyClasse(stored);
}

export function serializeLevel(level) {
  if (!level || !level.cycle) return '';
  return JSON.stringify(level);
}

export function migrateLegacyClasse(str) {
  if (!str || typeof str !== 'string') return null;
  const canonical = LEGACY_CLASSE_MAP[str.trim()];
  return canonical ? { cycle: 'college', classe: canonical } : null;
}

export function isCollege(level) {
  return level?.cycle === 'college';
}

export function requiresParentalConsentCheck(level) {
  // Seuls les collégiens peuvent avoir <15 ans → on ne vérifie qu'eux
  return isCollege(level);
}

// Étiquette d'affichage compacte : "3ème", "Terminale · Maths, NSI"
export function formatLevelLabel(level) {
  if (!level?.classe) return '';
  if (level.cycle === 'lycee' && level.specialites?.length) {
    return `${level.classe} · ${level.specialites.join(', ')}`;
  }
  return level.classe;
}

// Vrai si la classe demande la sélection de spécialités (1ère / Terminale)
export function needsSpecialites(level) {
  return level?.cycle === 'lycee' && ['1ère', 'Terminale'].includes(level.classe);
}

// Vrai si la date de naissance correspond à un âge < 15 ans (seuil RGPD France,
// art. 8 RGPD / art. 45 LIL : consentement parental requis sous 15 ans).
export function isUnder15(dateStr) {
  if (!dateStr) return false;
  const birth = new Date(dateStr);
  if (isNaN(birth.getTime())) return false;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age < 15;
}
