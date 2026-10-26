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
  { id: 'light',  label: 'Crème',  premium: false, preview: { app: '#F8EFE7', card: '#FFFFFF', hero: ['#FFB37A', '#FFC596'], accent: '#C25407' } },
  { id: 'dark',   label: 'Sombre', premium: false, preview: { app: '#16141A', card: '#222027', hero: ['#FFB37A', '#FFC596'], accent: '#FF9A55' } },
  { id: 'ocean',  label: 'Océan',  premium: true,  preview: { app: '#EEF4FA', card: '#FFFFFF', hero: ['#8EC5F2', '#A9D3F6'], accent: '#1F5FBF' } },
  { id: 'foret',  label: 'Forêt',  premium: true,  preview: { app: '#F0F3EA', card: '#FFFFFF', hero: ['#9ED3A8', '#B6DEBC'], accent: '#2F7A4A' } },
  { id: 'fraise', label: 'Fraise', premium: true,  preview: { app: '#FBF0F2', card: '#FFFFFF', hero: ['#FFA3B5', '#FFBCC9'], accent: '#C2234F' } },
];

// Anciens thèmes Réviz+ → leur remplaçant le plus proche (Abricot, Sauge et Prune jusqu'au 26/10/2026,
// et ceux d'avant octobre). Nuit d'encre est devenu le mode Sombre (cf. DARK_THEMES).
const ALIASES = {
  abricot: 'fraise', sauge: 'foret', prune: 'fraise',
  'carnet-kraft': 'fraise', 'violet-air': 'fraise', 'menthe-focus': 'foret',
};

// Thèmes à interface sombre (pilote isDark : status bar, images, etc.)
export const DARK_THEMES = ['dark', 'nuit-encre'];

// Mode d'affichage, à part du thème : Clair, Sombre, ou Auto (suit le réglage de l'appareil).
// Gratuit pour tous. Mémorisé dans localStorage reviz-mode.
export const MODES = [
  { id: 'clair',  label: 'Clair' },
  { id: 'sombre', label: 'Sombre' },
  { id: 'auto',   label: 'Auto' },
];
export const MODE_PAR_DEFAUT = 'clair';

// Le sombre de la refonte (« pastels allumés » : fond sombre, pastels gardés, héros en halo de leur
// couleur) couvre toutes les pages depuis le 26/10. Suspendu du 25 au 26/10 faute de version sombre ;
// à false, il n'est ni proposé ni appliqué (un choix mémorisé s'affiche alors en clair).
export const SOMBRE_DISPONIBLE = true;

/** Thèmes proposés dans les sélecteurs (Réglages, carte d'essai de l'accueil) : le sombre est un mode, pas un thème. */
export const THEMES_PROPOSES = THEMES.filter(t => !DARK_THEMES.includes(t.id));

/** Mode lu au démarrage : un ancien choix de thème sombre devient le mode Sombre. */
export function modeInitial(modeStocke, themeStocke) {
  if (MODES.some(m => m.id === modeStocke)) return modeStocke;
  return DARK_THEMES.includes(themeStocke) ? 'sombre' : MODE_PAR_DEFAUT;
}

/** L'app s'affiche-t-elle en sombre ? */
export function estSombre(mode, appareilSombre) {
  if (!SOMBRE_DISPONIBLE) return false;
  return mode === 'sombre' || (mode === 'auto' && appareilSombre);
}

/**
 * Au démarrage, avant le premier rendu : pose le sombre tout de suite s'il est choisi (pas de flash
 * clair), y compris sur les pages publiques (bienvenue…) que ThemeProvider n'enveloppe pas.
 */
export function sombreAuDemarrage() {
  try {
    const mode = modeInitial(localStorage.getItem('reviz-mode'), localStorage.getItem('reviz-theme'));
    if (estSombre(mode, !!window.matchMedia?.('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  } catch { /* stockage indisponible : clair */ }
}

/** Thème réellement posé sur <html data-theme>. */
export function themeAffiche(id, sombre = false) {
  if (sombre) return 'dark';
  return DARK_THEMES.includes(id) ? 'light' : id;
}

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
