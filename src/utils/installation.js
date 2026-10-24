// -------------------------------------------------------
// Réviz — Installation de la web app (tant qu'on n'est pas sur les stores)
// Détecte l'appareil pour ouvrir le bon tutoriel, et garde sous la main
// l'invitation d'installation de Chrome / Edge (beforeinstallprompt) pour
// proposer une installation en un geste quand le navigateur le permet.
// -------------------------------------------------------

/**
 * iPhone / iPad, Android ou ordinateur, d'après le user agent.
 * Un iPad récent se présente comme un Mac : on le reconnaît à son écran tactile.
 */
export function detecterPlateforme(ua = '', maxTouchPoints = 0) {
  if (/iPhone|iPad|iPod/i.test(ua)) return 'ios';
  if (/Macintosh/i.test(ua) && maxTouchPoints > 1) return 'ios';
  if (/Android/i.test(ua)) return 'android';
  return 'ordinateur';
}

/**
 * Navigateur intégré d'une app (TikTok, Instagram…) : on ne peut pas y
 * installer Réviz, il faut d'abord ouvrir la page dans le vrai navigateur.
 */
export function navigateurIntegre(ua = '') {
  if (/BytedanceWebview|musical_ly|TikTok/i.test(ua)) return 'TikTok';
  if (/Instagram/i.test(ua)) return 'Instagram';
  if (/Snapchat/i.test(ua)) return 'Snapchat';
  if (/FBAN|FBAV|FB_IAB/i.test(ua)) return 'Facebook';
  return null;
}

/** Réviz est-elle déjà ouverte comme une app installée (écran d'accueil, Dock) ? */
export function estInstallee(win = typeof window !== 'undefined' ? window : undefined) {
  if (!win) return false;
  try {
    if (win.navigator?.standalone === true) return true;
    return Boolean(win.matchMedia?.('(display-mode: standalone)').matches);
  } catch {
    return false;
  }
}

/**
 * App installée sur iPhone (barre d'état translucide) : 100svh y vaut l'écran moins la barre d'état,
 * et les écrans figés à cette hauteur (jeux, carte de début, fin de partie) laissaient voir une bande
 * de la page du dessous en bas (Johan, 24/10). On pose la vraie hauteur dans --hauteur-ecran, que ces
 * écrans préfèrent à 100svh ; dans le navigateur, rien ne change (pas de variable, 100svh).
 */
export function brancherHauteurEcran(win = typeof window !== 'undefined' ? window : undefined) {
  if (!win || !estInstallee(win)) return () => {};
  const poser = () => {
    // Téléphone en portrait : l'app installée occupe tout l'écran, sa hauteur est celle de l'écran
    // (pas sur iPad, où l'écran partagé la rend plus petite que l'écran).
    const telephone = win.innerHeight >= win.innerWidth && win.innerWidth <= 430;
    const h = telephone ? Math.max(win.innerHeight, win.screen?.height ?? 0) : win.innerHeight;
    win.document.documentElement.style.setProperty('--hauteur-ecran', `${h}px`);
  };
  poser();
  win.addEventListener('resize', poser);
  win.addEventListener('orientationchange', poser);
  return () => { win.removeEventListener('resize', poser); win.removeEventListener('orientationchange', poser); };
}

// ── Invitation d'installation de Chrome / Edge ──
let invitation = null;
const abonnes = new Set();
const prevenir = () => abonnes.forEach(f => f());

/**
 * À appeler une fois au démarrage : l'événement beforeinstallprompt peut
 * arriver avant que la popup ne soit montée, on le met donc de côté.
 * `onInstallee` est appelé quand le navigateur confirme l'installation.
 */
export function ecouterInstallation(onInstallee) {
  if (typeof window === 'undefined') return;
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    invitation = e;
    prevenir();
  });
  window.addEventListener('appinstalled', () => {
    invitation = null;
    prevenir();
    onInstallee?.();
  });
}

export function installationDirectePossible() {
  return invitation !== null;
}

export function suivreInstallation(f) {
  abonnes.add(f);
  return () => abonnes.delete(f);
}

/** Ouvre la fenêtre d'installation du navigateur. Renvoie true si l'élève a accepté. */
export async function installerDirectement() {
  if (!invitation) return false;
  const e = invitation;
  invitation = null;
  prevenir();
  try {
    await e.prompt();
    const choix = await e.userChoice;
    return choix?.outcome === 'accepted';
  } catch {
    return false;
  }
}
