import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import * as Sentry from '@sentry/react'
import posthog from 'posthog-js'
import './styles/global.css'
import App from './App.jsx'

// ── Sentry (error monitoring) ──────────────────────────────────────
if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE,
    tracesSampleRate: 0.1,
    beforeSend(event) {
      // Filter out browser extension errors
      const frames = event.exception?.values?.[0]?.stacktrace?.frames ?? [];
      if (frames.some(f => f.filename?.includes('extension') || f.filename?.includes('chrome-extension'))) {
        return null;
      }
      return event;
    },
  });
}

// ── PostHog (analytics) ────────────────────────────────────────────
if (import.meta.env.VITE_POSTHOG_KEY) {
  posthog.init(import.meta.env.VITE_POSTHOG_KEY, {
    api_host: 'https://eu.i.posthog.com',
    person_profiles: 'identified_only', // no anonymous profiles = RGPD-friendly
    capture_pageview: true,
    capture_pageleave: true,
  });
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Service Worker registration
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .catch((err) => console.warn('[Réviz] SW registration failed:', err))
  })
}
