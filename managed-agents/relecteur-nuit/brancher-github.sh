#!/usr/bin/env bash
# Branche GitHub sur le relecteur de nuit et programme son passage quotidien.
# À lancer par Johan dans son terminal, après `ant apply` (qui a créé l'agent,
# l'environnement et le coffre). Le jeton GitHub est saisi en masqué : il ne
# passe que par l'API Anthropic, jamais par un fichier ni par l'historique.
set -euo pipefail
cd "$(dirname "$0")/../.."

API=https://api.anthropic.com
REPO=https://github.com/johan11elm-lgtm/reviz-web
MCP_URL=https://api.githubcopilot.com/mcp/
DIR=managed-agents/relecteur-nuit

# Identifiant d'une ressource créée par `ant apply`, d'après claude-lock.json.
id_de() {
  node -e '
    const l = require("./claude-lock.json")
    const k = Object.keys(l.resources ?? {}).find(k => k.endsWith(process.argv[1]))
    if (!k) { console.error("introuvable dans claude-lock.json : " + process.argv[1]); process.exit(1) }
    console.log(l.resources[k].id)' "$1"
}
AGENT_ID=$(id_de "$DIR/agent.md")
ENV_ID=$(id_de "$DIR/environment.yaml")
VAULT_ID=$(id_de "$DIR/vault.yaml")

ACCESS=$(ant auth print-credentials --access-token)
appel() { # appel <méthode> <chemin>, corps JSON sur l'entrée standard
  curl -fsS -X "$1" "$API$2" \
    -H "authorization: Bearer $ACCESS" \
    -H "anthropic-version: 2023-06-01" \
    -H "anthropic-beta: managed-agents-2026-04-01,oauth-2025-04-20" \
    -H "content-type: application/json" -d @-
}

printf 'Jeton GitHub (fine-grained, reviz-web seulement) : '
read -rs GH_PAT; echo
export GH_PAT

echo "→ Jeton du serveur MCP GitHub dans le coffre"
node -e '
  console.log(JSON.stringify({
    display_name: "GitHub MCP (reviz-web)",
    auth: { type: "static_bearer", mcp_server_url: process.argv[1], token: process.env.GH_PAT },
  }))' "$MCP_URL" | appel POST "/v1/vaults/$VAULT_ID/credentials" > /dev/null

echo "→ Déploiement planifié (chaque nuit à 4 h 30, Paris)"
DEPLOY_ID=$(node -e '
  const [agent, env, vault, repo] = process.argv.slice(1)
  const rubric = require("fs").readFileSync(process.argv[5], "utf8")
  console.log(JSON.stringify({
    name: "Relecture de nuit",
    agent, environment_id: env, vault_ids: [vault],
    resources: [{ type: "github_repository", url: repo, authorization_token: process.env.GH_PAT,
                  checkout: { type: "branch", name: "main" } }],
    budget: { type: "limit", max_list_cost: { amount: "300", currency: "USD" } },
    schedule: { type: "cron", expression: "30 4 * * *", timezone: "Europe/Paris" },
    initial_events: [{
      type: "user.define_outcome",
      description: "Relecture de la nuit : les 12 chapitres suivants du programme, en suivant ta consigne.",
      rubric: { type: "text", content: rubric },
      max_iterations: 2,
    }],
  }))' "$AGENT_ID" "$ENV_ID" "$VAULT_ID" "$REPO" "$DIR/rubrique.md" | appel POST /v1/deployments \
  | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const d=JSON.parse(s);console.error("  prochains passages : "+(d.schedule?.upcoming_runs_at??[]).slice(0,3).join(", "));console.log(d.id)})')
unset GH_PAT
echo "$DEPLOY_ID" > "$DIR/deployment-id.txt"
echo "  déploiement $DEPLOY_ID (noté dans $DIR/deployment-id.txt)"

printf 'Lancer un premier passage maintenant pour tester ? (o/N) '
read -r OUI
if [[ "$OUI" == o* ]]; then
  echo '{}' | appel POST "/v1/deployments/$DEPLOY_ID/run" > /dev/null
  echo "  lancé : à suivre dans la Console, Agents gérés → Sessions"
fi
