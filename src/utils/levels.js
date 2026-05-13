// -------------------------------------------------------
// Réviz — Modèle de niveau scolaire (cycle + classe)
// Source de vérité unique pour le niveau de l'utilisateur.
// -------------------------------------------------------

export const CYCLES = [
  { id: 'college',   label: 'Collège',   emoji: '🎒', desc: '6ème à 3ème'        },
  { id: 'lycee',     label: 'Lycée',     emoji: '🎓', desc: 'Seconde à Terminale' },
  { id: 'superieur', label: 'Supérieur', emoji: '📚', desc: 'Licence et au-delà' },
];

export const CLASSES_BY_CYCLE = {
  college:   ['6ème', '5ème', '4ème', '3ème'],
  lycee:     ['2nde', '1ère', 'Terminale'],
  superieur: ['L1', 'L2', 'L3', 'Autre'],
};

export const SPECIALITES_LYCEE = [
  'Maths', 'NSI', 'HGGSP', 'SES', 'SVT',
  'Physique-Chimie', 'HLP', 'LLCE', 'Arts', 'Philosophie',
];

export const FILIERES_SUP = [
  'Droit', 'Médecine/PASS', 'SHS', 'Sciences',
  'Éco-gestion', 'Lettres', 'STAPS', 'Autre',
];

// Anciennes valeurs textuelles → nouveau modèle
const LEGACY_COLLEGE = ['6ème', '5ème', '4ème', '3ème', '6e', '5e', '4e', '3e'];

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
  const normalized = str.trim();
  if (LEGACY_COLLEGE.includes(normalized)) {
    const canonical = normalized.replace('e', 'ème').replace('èmeme', 'ème');
    return { cycle: 'college', classe: canonical };
  }
  return null;
}

export function isCollege(level) {
  return level?.cycle === 'college';
}

export function requiresParentalConsentCheck(level) {
  // Seuls les collégiens peuvent avoir <15 ans → on ne vérifie qu'eux
  return isCollege(level);
}

// Étiquette d'affichage compacte : "3ème", "Terminale · Maths, NSI", "L2 Droit"
export function formatLevelLabel(level) {
  if (!level?.classe) return '';
  if (level.cycle === 'lycee' && level.specialites?.length) {
    return `${level.classe} · ${level.specialites.join(', ')}`;
  }
  if (level.cycle === 'superieur' && level.filiere) {
    return `${level.classe} ${level.filiere}`;
  }
  return level.classe;
}

// Vrai si la classe demande la sélection de spécialités (1ère / Terminale)
export function needsSpecialites(level) {
  return level?.cycle === 'lycee' && ['1ère', 'Terminale'].includes(level.classe);
}

export function needsFiliere(level) {
  return level?.cycle === 'superieur' && !!level.classe;
}
