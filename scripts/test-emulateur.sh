#!/bin/bash
# Lance les tests *.emulator.test.js contre l'émulateur Realtime Database
# (projet demo-reviz, 100 % local), qui charge database.rules.json.
set -e
cd "$(dirname "$0")/.."

# OpenJDK Homebrew est keg-only : on l'ajoute au PATH explicitement.
export PATH="/opt/homebrew/opt/openjdk/bin:$PATH"
exec npx firebase emulators:exec --only database --project demo-reviz \
  "npx vitest run --config vitest.emulator.config.js $*"
