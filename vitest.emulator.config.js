// Tests contre l'émulateur Firebase (Realtime Database) : règles d'accès et
// service de la Battle. Lancés par `npm run test:emulateur`, qui démarre
// l'émulateur ; exclus de `npm test` (vite.config.js).
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['src/**/*.emulator.test.js'],
    environment: 'node',
    testTimeout: 30_000,
    hookTimeout: 30_000,
    fileParallelism: false,
  },
})
