#!/bin/bash
# -------------------------------------------------------
# Réviz — Live reload iOS (dev uniquement)
#
# Patche UNIQUEMENT la copie native `ios/App/App/capacitor.config.json`
# pour que la WebView charge le dev server Vite au lieu du bundle figé
# dans dist/. Le `capacitor.config.json` source n'est JAMAIS touché :
# un `cap sync ios` (donc `npm run build:ios`) régénère la copie native
# sans bloc `server` et remet tout d'aplomb automatiquement.
#
#   on     : ajoute server.url        (npm run ios:live)
#   off    : retire le bloc server    (npm run ios:live:off)
#   assert : échoue si server présent (filet post-sync de build:ios)
#
# Hôte : localhost, car le simulateur partage la pile réseau du Mac.
# Pour un iPhone physique : REVIZ_DEV_HOST=192.168.x.x npm run ios:live
# (les IP littérales et « localhost » échappent à l'ATS d'iOS — aucune
# exception NSAllowsArbitraryLoads à ajouter dans Info.plist).
# -------------------------------------------------------
set -euo pipefail

cd "$(dirname "$0")/.."
NATIF="ios/App/App/capacitor.config.json"
HOTE="${REVIZ_DEV_HOST:-localhost}"
PORT="${REVIZ_DEV_PORT:-5173}"

[ -f "$NATIF" ] || { echo "ios-live-reload : $NATIF introuvable — lancer d'abord \`npm run build:ios\`." >&2; exit 1; }

case "${1:-}" in
  on)
    node -e '
      const fs = require("fs"), f = process.argv[1];
      const c = JSON.parse(fs.readFileSync(f, "utf8"));
      c.server = { url: `http://${process.argv[2]}:${process.argv[3]}`, cleartext: true };
      fs.writeFileSync(f, JSON.stringify(c, null, "\t") + "\n");
    ' "$NATIF" "$HOTE" "$PORT"
    echo "ios-live-reload : ON — la WebView chargera http://$HOTE:$PORT"
    echo "  Rebuild une fois dans Xcode (Cmd+R) — ~10 s, il ne recopie que le config."
    echo "  Ensuite chaque modif de src/ arrive dans la simu sans rebuild natif."
    ;;
  off)
    node -e '
      const fs = require("fs"), f = process.argv[1];
      const c = JSON.parse(fs.readFileSync(f, "utf8"));
      delete c.server;
      fs.writeFileSync(f, JSON.stringify(c, null, "\t") + "\n");
    ' "$NATIF"
    echo "ios-live-reload : OFF — retour au bundle dist/ embarqué."
    ;;
  assert)
    if node -e 'process.exit(JSON.parse(require("fs").readFileSync(process.argv[1],"utf8")).server ? 0 : 1)' "$NATIF"; then
      echo "" >&2
      echo "ios-live-reload : bloc \`server\` encore présent dans $NATIF." >&2
      echo "Ce build pointerait vers un dev server. Lancer \`npm run ios:live:off\`." >&2
      exit 1
    fi
    echo "ios-live-reload : aucun bloc server dans le config natif — build sain."
    ;;
  *)
    echo "usage: $0 {on|off|assert}" >&2; exit 1 ;;
esac
