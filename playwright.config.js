import { defineConfig, devices } from '@playwright/test'

// Les e2e tournent sur un serveur Vite DÉDIÉ (port 5199) branché sur
// l'Emulator Suite Firebase (auth + firestore, projet demo-reviz hors-ligne) :
// jamais sur le dev server 5173 qui pointe vers le vrai Firebase.
// L'appel IA (/api/analyse) est mocké par Playwright dans les specs.
// Java (émulateur Firestore) : installé via `brew install openjdk` (keg-only,
// d'où le PATH explicite ci-dessous).
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false, // l'état de l'émulateur (comptes) est partagé entre specs
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:5199',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: [
    {
      // Le script nettoie les émulateurs orphelins avant de démarrer
      // (le process java de Firestore peut survivre à l'arrêt de Playwright).
      command: 'bash scripts/e2e-emulators.sh',
      url: 'http://127.0.0.1:9099',
      reuseExistingServer: false,
      timeout: 120_000,
    },
    {
      command: 'VITE_FIREBASE_EMULATOR=1 VITE_ANTHROPIC_API_KEY= npx vite --port 5199 --strictPort',
      url: 'http://localhost:5199',
      reuseExistingServer: false,
      timeout: 60_000,
    },
  ],
})
