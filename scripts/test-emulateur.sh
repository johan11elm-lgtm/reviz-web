#!/bin/bash
# Lance les tests *.emulator.test.js contre les émulateurs Realtime Database
# et Firestore (projet demo-reviz, 100 % local), qui chargent database.rules.json
# et firestore.rules.
set -e
cd "$(dirname "$0")/.."

# Un émulateur orphelin d'un run e2e (java survit à Playwright) bloquerait le port.
pids=$(lsof -ti :9000 -ti :8080 2>/dev/null || true)
if [ -n "$pids" ]; then
  echo "Ports 9000/8080 occupés (pids: $pids) — nettoyage"
  kill -9 $pids 2>/dev/null || true
  sleep 1
fi

# OpenJDK Homebrew est keg-only : on l'ajoute au PATH explicitement.
export PATH="/opt/homebrew/opt/openjdk/bin:$PATH"
exec npx firebase emulators:exec --only database,firestore --project demo-reviz \
  "npx vitest run --config vitest.emulator.config.js $*"
