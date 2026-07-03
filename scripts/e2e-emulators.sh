#!/bin/bash
# Démarre l'Emulator Suite Firebase pour les e2e, en nettoyant d'abord les
# processus orphelins d'un run précédent (l'émulateur Firestore — java — peut
# survivre à l'arrêt de Playwright et bloquer les ports 8080/9099).
set -e

for port in 8080 9099; do
  pids=$(lsof -ti :$port 2>/dev/null || true)
  if [ -n "$pids" ]; then
    echo "Port $port occupé (pids: $pids) — nettoyage"
    kill -9 $pids 2>/dev/null || true
  fi
done
sleep 1

# OpenJDK Homebrew est keg-only : on l'ajoute au PATH explicitement.
export PATH="/opt/homebrew/opt/openjdk/bin:$PATH"
exec npx firebase emulators:start --only auth,firestore --project demo-reviz
