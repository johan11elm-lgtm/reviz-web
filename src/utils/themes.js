// -------------------------------------------------------
// Réviz — Catalogue des thèmes (gratuits + Réviz+)
//
// Chaque thème correspond à un bloc `:root[data-theme="<id>"]` dans
// global.css. Les thèmes premium sont un avantage Réviz+ : la sélection
// est verrouillée dans l'UI (Drawer) ET re-validée au chargement par
// resolveTheme() — un abonnement expiré retombe sur « Crème ».
// -------------------------------------------------------

export const THEMES = [
  { id: 'light',        label: 'Crème',        premium: false, swatch: ['#F8EFE7', '#6B4EFF'] },
  { id: 'dark',         label: 'Sombre',       premium: false, swatch: ['#14121C', '#8A72FF'] },
  { id: 'nuit-encre',   label: "Nuit d'encre", premium: true,  swatch: ['#131020', '#A78BFF'] },
  { id: 'carnet-kraft', label: 'Carnet kraft', premium: true,  swatch: ['#EFDDBE', '#2743C7'] },
  { id: 'violet-air',   label: 'Violet air',   premium: true,  swatch: ['#E4DCFF', '#4C33C4'] },
  { id: 'menthe-focus', label: 'Menthe',       premium: true,  swatch: ['#DFF2E7', '#0E7A55'] },
];

// Thèmes à interface sombre (pilote isDark : status bar, images, etc.)
export const DARK_THEMES = ['dark', 'nuit-encre'];

export function themeById(id) {
  return THEMES.find(t => t.id === id) ?? null;
}

/**
 * Thème effectivement applicable : id inconnu → 'light' ; thème premium
 * sans abonnement actif → 'light' (repli silencieux, jamais bloquant).
 */
export function resolveTheme(storedId, isPremium) {
  const t = themeById(storedId);
  if (!t) return 'light';
  if (t.premium && !isPremium) return 'light';
  return t.id;
}
