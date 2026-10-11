// -------------------------------------------------------
// Réviz — Catalogue des thèmes (gratuits + Réviz+)
//
// Chaque thème correspond à un bloc `:root[data-theme="<id>"]` dans
// global.css. Les thèmes premium sont un avantage Réviz+ : la sélection
// est verrouillée dans l'UI (page Réglages) ET re-validée au chargement
// par resolveTheme() — un abonnement expiré retombe sur « Crème ».
// -------------------------------------------------------

// preview : couleurs de la vignette du sélecteur (fond, carte, héros, accent).
export const THEMES = [
  { id: 'light',      label: 'Crème',        premium: false, preview: { app: '#F8EFE7', card: '#FFFFFF', hero: ['#3F3C78', '#1E1C3F'], accent: '#FF8A3D' } },
  { id: 'dark',       label: 'Sombre',       premium: false, preview: { app: '#14121C', card: '#1E1B2A', hero: ['#4A7CF6', '#2A54C4'], accent: '#FFA866' } },
  { id: 'nuit-encre', label: "Nuit d'encre", premium: true,  preview: { app: '#10121D', card: '#191B29', hero: ['#2A3058', '#131629'], accent: '#E8B45A' } },
  { id: 'abricot',    label: 'Abricot',      premium: true,  preview: { app: '#F9EADC', card: '#FFFFFF', hero: ['#A9502F', '#5E2410'], accent: '#FF8A3D' } },
  { id: 'sauge',      label: 'Sauge',        premium: true,  preview: { app: '#EAEEE3', card: '#FFFFFF', hero: ['#43775C', '#1E3E2E'], accent: '#FF8A3D' } },
  { id: 'prune',      label: 'Prune',        premium: true,  preview: { app: '#F1EBF1', card: '#FFFFFF', hero: ['#7A4580', '#3D1C40'], accent: '#FF8A3D' } },
];

// Anciens thèmes Réviz+ (avant octobre 2026) → leur remplaçant le plus proche.
const ALIASES = { 'carnet-kraft': 'abricot', 'violet-air': 'prune', 'menthe-focus': 'sauge' };

// Thèmes à interface sombre (pilote isDark : status bar, images, etc.)
export const DARK_THEMES = ['dark', 'nuit-encre'];

export function themeById(id) {
  return THEMES.find(t => t.id === id) ?? null;
}

/**
 * Thème effectivement applicable : ancien id → son remplaçant ; id inconnu → 'light' ; thème premium
 * sans abonnement actif → 'light' (repli silencieux, jamais bloquant).
 */
export function resolveTheme(storedId, isPremium) {
  const t = themeById(ALIASES[storedId] ?? storedId);
  if (!t) return 'light';
  if (t.premium && !isPremium) return 'light';
  return t.id;
}
