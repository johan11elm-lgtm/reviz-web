import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/global.css'
import App from './App.jsx'

// ── Render first, load monitoring after ─────────────────────────────
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// ── Lazy-load Sentry + PostHog after first paint ────────────────────
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
    });
  }

  if (import.meta.env.VITE_POSTHOG_KEY) {
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

// Service Worker registration
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .catch((err) => console.warn('[Réviz] SW registration failed:', err))
  })
}
