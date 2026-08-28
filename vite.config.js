/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { sentryVitePlugin } from '@sentry/vite-plugin'

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    // Upload source maps to Sentry on production builds
    process.env.SENTRY_AUTH_TOKEN && sentryVitePlugin({
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      authToken: process.env.SENTRY_AUTH_TOKEN,
    }),
  ].filter(Boolean),
  server: { allowedHosts: true },
  build: {
    target: ['chrome87', 'firefox78', 'safari14', 'edge88'],
    // Sourcemaps requises pour des stack traces Sentry lisibles (web) —
    // jamais en mode ios : elles embarqueraient tout le source dans l'IPA.
    sourcemap: mode !== 'ios',
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-firebase': ['firebase/app', 'firebase/auth', 'firebase/firestore'],
          'vendor-sentry': ['@sentry/react'],
          'vendor-posthog': ['posthog-js'],
        },
      },
    },
  },
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./src/test/setup.js'],
    css: false,
    exclude: ['node_modules', 'dist', 'e2e', 'ios'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      // Cœur métier testé unitairement — les pages/composants passent par
      // l'e2e Playwright, pas par les seuils unitaires.
      include: ['src/services/**', 'src/utils/**', 'api/**'],
      exclude: ['**/__tests__/**', 'api/_systemPrompt.js'],
      // Cliquet anti-régression : calibré juste sous la couverture du
      // 2026-07-02 (services 38.9 % / utils 27 %) — à remonter au fil des tests.
      thresholds: {
        'src/services/**': { statements: 35, branches: 40 },
        'src/utils/**':    { statements: 25, branches: 30 },
      },
    },
  },
}))
