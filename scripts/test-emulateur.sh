#!/bin/bash
# Lance les tests *.emulator.test.js contre l'émulateur Realtime Database
# (projet demo-reviz, 100 % local), qui charge database.rules.json.
set -e
cd "$(dirname "$0")/.."

# Un émulateur orphelin d'un run e2e (java survit à Playwright) bloquerait le port.
pids=$(lsof -ti :9000 2>/dev/null || true)
if [ -n "$pids" ]; then
  echo "Port 9000 occupé (pids: $pids) — nettoyage"
  kill -9 $pids 2>/dev/null || true
  sleep 1
fi

# OpenJDK Homebrew est keg-only : on l'ajoute au PATH explicitement.
export PATH="/opt/homebrew/opt/openjdk/bin:$PATH"
exec npx firebase emulators:exec --only database --project demo-reviz \
  "npx vitest run --config vitest.emulator.config.js $*"
