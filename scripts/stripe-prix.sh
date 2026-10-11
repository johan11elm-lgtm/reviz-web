#!/usr/bin/env bash
# -------------------------------------------------------
# Réviz — Crée les prix Réviz+ dans Stripe (docs/prix-revizplus.md)
# Le code les retrouve par lookup_key (api/_prix.js) : lancer ce script avec
# la clé réelle suffit, aucun changement de code. Sans effet sur un prix qui
# existe déjà (même lookup_key). Crée aussi le webhook de l'app s'il manque et
# affiche son secret, à coller dans Vercel (STRIPE_WEBHOOK_SECRET).
#
#   STRIPE_SECRET_KEY=sk_live_… bash scripts/stripe-prix.sh prod_XXXX
#
# prod_XXXX : le produit Réviz+ (live : prod_UCEkP56xqL2PYg).
# -------------------------------------------------------
set -euo pipefail

: "${STRIPE_SECRET_KEY:?STRIPE_SECRET_KEY manquant}"
PRODUIT="${1:?usage : bash scripts/stripe-prix.sh prod_XXXX}"
API=https://api.stripe.com/v1

case "$STRIPE_SECRET_KEY" in
  sk_live_*|sk_test_*) ;;
  *) echo "Erreur : la clé doit commencer par sk_live_ (clé secrète standard, pas pk_ ni rk_)." >&2; exit 1 ;;
esac

# Appel à l'API Stripe : affiche le message d'erreur de Stripe et s'arrête
# au lieu d'échouer en silence.
appel() {
  local r
  r=$(curl -sS "$@") || { echo "Erreur réseau en appelant Stripe." >&2; exit 1; }
  if printf '%s' "$r" | grep -q '"error"'; then
    echo "Erreur Stripe : $(printf '%s' "$r" | grep -E '"message"' | head -1 | sed 's/^ *//')" >&2
    exit 1
  fi
  printf '%s' "$r"
}

existe() {
  local r
  r=$(appel -G "$API/prices" -u "$STRIPE_SECRET_KEY:" -d "lookup_keys[]=$1" -d active=true)
  [[ "$r" == *"\"lookup_key\": \"$1\""* ]]
}

creer() { # montant_centimes intervalle lookup_key surnom
  if existe "$3"; then echo "déjà là : $3"; return; fi
  appel "$API/prices" -u "$STRIPE_SECRET_KEY:" \
    -d product="$PRODUIT" -d currency=eur -d unit_amount="$1" \
    -d "recurring[interval]=$2" -d lookup_key="$3" --data-urlencode "nickname=$4" >/dev/null
  echo "créé : $3 ($1 centimes / $2)"
}

echo "Mode : $([ "${STRIPE_SECRET_KEY#sk_live_}" != "$STRIPE_SECRET_KEY" ] && echo RÉEL || echo test)"
appel "$API/products/$PRODUIT" -u "$STRIPE_SECRET_KEY:" >/dev/null
creer 4900 year  revizplus_annuel            "Réviz+ annuel"
creer 699  month revizplus_mensuel           "Réviz+ mensuel"
creer 2900 year  revizplus_fondateur_annuel  "Réviz+ fondateur annuel"
creer 399  month revizplus_fondateur_mensuel "Réviz+ fondateur mensuel"

appel "$API/products/$PRODUIT" -u "$STRIPE_SECRET_KEY:" --data-urlencode "name=Réviz+" >/dev/null
echo "Produit renommé « Réviz+ ». Pense à archiver l'ancien prix à 4,99 € dans le Dashboard."

# Webhook de l'app (api/stripe-webhook.js)
URL_WEBHOOK=https://app.revizapp.fr/api/stripe-webhook
WEBHOOKS=$(appel -G "$API/webhook_endpoints" -u "$STRIPE_SECRET_KEY:" -d limit=100)
if [[ "$WEBHOOKS" == *"\"$URL_WEBHOOK\""* ]]; then
  echo "Webhook déjà là : $URL_WEBHOOK (son secret se lit dans le Dashboard, Développeurs → Webhooks)."
else
  appel "$API/webhook_endpoints" -u "$STRIPE_SECRET_KEY:" -d url="$URL_WEBHOOK" \
    -d "enabled_events[]=checkout.session.completed" \
    -d "enabled_events[]=customer.subscription.updated" \
    -d "enabled_events[]=customer.subscription.deleted" \
    -d "enabled_events[]=invoice.payment_failed" \
    | grep -E '"(id|secret)"' | tr -d ' ,'
  echo "Webhook créé. Copie la ligne « secret » (whsec_…) dans Vercel : STRIPE_WEBHOOK_SECRET."
fi
