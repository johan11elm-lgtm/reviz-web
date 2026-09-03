import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// Geist auto-hébergée (woff2 servis par Vite) — remplace le CSS Google Fonts
// render-blocking. Seules les graisses réellement utilisées sont chargées.
import '@fontsource/geist/400.css'
import '@fontsource/geist/500.css'
import '@fontsource/geist/600.css'
import '@fontsource/geist/700.css'
import '@fontsource/geist/800.css'
import './styles/global.css'
import App from './App.jsx'
import { IS_NATIVE } from './services/apiClient.js'
import { hideSplash } from './services/splash.js'

// App native (Capacitor) : layout plein écran forcé quelle que soit la
// largeur (les iPhone Pro Max à 440 pt et les iPad tomberaient sinon dans
// la branche « tablette » de global.css). Posé avant le render pour
// éviter tout flash de la carte centrée.
if (IS_NATIVE) {
  document.documentElement.classList.add('native');
  // App native : pas de pinch-zoom ni de double-tap zoom (comportement
  // d'app attendu). Le WEB garde le zoom — accessibilité WCAG 1.4.4 ;
  // en natif, la taille de texte suit les réglages système iOS.
  document.querySelector('meta[name="viewport"]')?.setAttribute(
    'content',
    'width=device-width, initial-scale=1.0, viewport-fit=cover, maximum-scale=1.0, user-scalable=no'
  );
  // Filet de sécurité : l'écran de lancement natif (launchAutoHide: false)
  // est retiré par <SplashHider /> au premier écran peint ; si le boot
  // échoue avant, on ne le laisse jamais affiché indéfiniment.
  setTimeout(hideSplash, 6000);
}

// Désactive le scroll restoration auto du browser pour que ScrollToTop soit
// le seul à contrôler la position, évite les sauts de quelques pixels au retour
if (typeof history !== 'undefined' && 'scrollRestoration' in history) {
  history.scrollRestoration = 'manual';
}

// ── Render first, load monitoring after ─────────────────────────────
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// ── Lazy-load Sentry + PostHog after first paint ────────────────────
// Sentry étant chargé après le first paint, les erreurs des toutes premières
// secondes (chemin critique : boot, restore, premiers fetchs) passeraient à
// la trappe — on les tamponne et on les rejoue à l'init.
const earlyErrors = [];
const bufferEarlyError = (e) => { earlyErrors.push(e.reason ?? e.error ?? e.message); };
window.addEventListener('error', bufferEarlyError);
window.addEventListener('unhandledrejection', bufferEarlyError);

const loadMonitoring = () => {
  if (import.meta.env.VITE_SENTRY_DSN) {
    import('@sentry/react').then(Sentry => {
      Sentry.init({
        dsn: import.meta.env.VITE_SENTRY_DSN,
        environment: import.meta.env.MODE,
        tracesSampleRate: 0.1,
        beforeSend(event) {
          const frames = event.exception?.values?.[0]?.stacktrace?.frames ?? [];
          if (frames.some(f => f.filename?.includes('extension') || f.filename?.includes('chrome-extension'))) {
            return null;
          }
          return event;
        },
      });
      // Rejoue les erreurs pré-init, puis laisse les intégrations globales
      // de Sentry (error + unhandledrejection) prendre le relais.
      window.removeEventListener('error', bufferEarlyError);
      window.removeEventListener('unhandledrejection', bufferEarlyError);
      earlyErrors.splice(0).forEach(err => Sentry.captureException(err));
    });
  }

  // Analytics PostHog — DÉSACTIVÉ par défaut (public mineur, RGPD/CNIL & ePrivacy).
  // On n'initialise RIEN tant qu'un consentement explicite n'a pas été donné, pour
  // rester cohérent avec Legal.jsx (« aucun cookie de tracking »).
  // Réactivation future : une bannière de consentement pose
  // localStorage 'reviz-analytics-consent' = 'granted', puis ce bloc s'exécute.
  const analyticsConsent = (() => {
    try { return localStorage.getItem('reviz-analytics-consent') === 'granted'; }
    catch { return false; }
  })();
  if (analyticsConsent && import.meta.env.VITE_POSTHOG_KEY) {
    import('posthog-js').then(({ default: posthog }) => {
      posthog.init(import.meta.env.VITE_POSTHOG_KEY, {
        api_host: 'https://eu.i.posthog.com',
        person_profiles: 'identified_only',
        capture_pageview: true,
        capture_pageleave: true,
      });
    });
  }
}

if ('requestIdleCallback' in window) {
  requestIdleCallback(loadMonitoring)
} else {
  setTimeout(loadMonitoring, 2000)
}

// Service Worker registration — uniquement en production.
// En dev le SW intercepte le HMR et sert du CSS périmé, ce qui cause des
// bugs de layout au retour de navigation (cards écrasées, styles obsolètes).
// Dans l'app native (Capacitor), les assets sont embarqués : pas de SW.
if ('serviceWorker' in navigator && window.location.protocol !== 'capacitor:') {
  if (import.meta.env.PROD) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .catch((err) => console.warn('[Réviz] SW registration failed:', err))
    })
  } else {
    // En dev : désinscrire tout SW résiduel et vider les caches qui pourraient
    // avoir été créés lors d'une session antérieure.
    navigator.serviceWorker.getRegistrations().then((regs) => {
      regs.forEach((reg) => reg.unregister());
    });
    if ('caches' in window) {
      caches.keys().then((keys) => keys.forEach((k) => caches.delete(k)));
    }
  }
}
