#!/bin/bash
# Garde-fou avant `cap sync ios` : vérifie que dist/ sort bien de
# `vite build --mode ios` (clé Anthropic neutralisée par .env.ios) et non
# d'un `npm run build` réflexe qui inlinerait la vraie clé de .env.local
# dans le bundle embarqué de l'app. Purge aussi sourcemaps et fichiers
# web-only (sw.js, robots.txt…) avant la copie. Utilisé par
# `npm run build:ios` et `npm run sync:ios` — ne jamais lancer
# `npx cap sync ios` directement.
set -euo pipefail

cd "$(dirname "$0")/.."
DIST="${1:-dist}"
ASSETS="$DIST/assets"

erreur() {
  echo "" >&2
  echo "guard-ios-bundle : $1" >&2
  echo "Ne pas synchroniser ce bundle vers ios/. Relancer \`npm run build:ios\`" >&2
  echo "(jamais \`npm run build\` puis \`npx cap sync ios\`)." >&2
  exit 1
}

[ -d "$ASSETS" ] || erreur "$ASSETS introuvable — lancer d'abord \`vite build --mode ios\`."

# 1) Aucune clé Anthropic en clair (bundles ET sourcemaps).
fuites=$(grep -rl 'sk-ant' "$ASSETS" || true)
if [ -n "$fuites" ]; then
  echo "Clé détectée dans :" >&2
  echo "$fuites" >&2
  erreur "clé Anthropic (sk-ant…) trouvée dans le bundle — build fait en mode web avec .env.local."
fi

# 2) Marqueurs du mode ios : VITE_API_BASE n'est défini que par .env.ios,
#    et la clé y vaut REMPLACER (cf. USE_PROXY dans aiService.js).
grep -rq 'reviz-gamma.vercel.app' "$ASSETS" \
  || erreur "marqueur VITE_API_BASE (reviz-gamma.vercel.app) absent — dist/ ne vient pas de --mode ios."
grep -rq 'REMPLACER' "$ASSETS" \
  || erreur "marqueur REMPLACER absent — dist/ ne vient pas de --mode ios."

# 3) Aucune sourcemap dans le bundle natif (vite.config.js les coupe en
#    mode ios ; filet de sécurité si dist/ vient d'une config antérieure)
#    et retrait des fichiers web-only (SEO/PWA), inertes mais inutiles
#    dans l'IPA.
find "$ASSETS" -name '*.map' -delete
rm -f "$DIST/sw.js" "$DIST/robots.txt" "$DIST/sitemap.xml" \
      "$DIST/googlee9de8164637c0bbf.html" "$DIST/manifest.json"
find "$DIST" -name '.DS_Store' -delete

echo "guard-ios-bundle : bundle sain (mode ios, aucune clé sk-ant, sans sourcemaps ni fichiers web-only)."
