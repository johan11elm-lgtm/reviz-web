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

existe() {
  curl -sS -G "$API/prices" -u "$STRIPE_SECRET_KEY:" -d "lookup_keys[]=$1" -d active=true \
    | grep -q '"lookup_key": "'"$1"'"'
}

creer() { # montant_centimes intervalle lookup_key surnom
  if existe "$3"; then echo "déjà là : $3"; return; fi
  curl -sS "$API/prices" -u "$STRIPE_SECRET_KEY:" \
    -d product="$PRODUIT" -d currency=eur -d unit_amount="$1" \
    -d "recurring[interval]=$2" -d lookup_key="$3" --data-urlencode "nickname=$4" \
    | grep -E '"(id|lookup_key|unit_amount)"' | tr -d ' ,' | paste -sd' ' -
}

creer 4900 year  revizplus_annuel            "Réviz+ annuel"
creer 699  month revizplus_mensuel           "Réviz+ mensuel"
creer 2900 year  revizplus_fondateur_annuel  "Réviz+ fondateur annuel"
creer 399  month revizplus_fondateur_mensuel "Réviz+ fondateur mensuel"

curl -sS "$API/products/$PRODUIT" -u "$STRIPE_SECRET_KEY:" --data-urlencode "name=Réviz+" >/dev/null
echo "Produit renommé « Réviz+ ». Pense à archiver l'ancien prix à 4,99 € dans le Dashboard."

# Webhook de l'app (api/stripe-webhook.js)
URL_WEBHOOK=https://app.revizapp.fr/api/stripe-webhook
if curl -sS -G "$API/webhook_endpoints" -u "$STRIPE_SECRET_KEY:" -d limit=100 | grep -q "\"$URL_WEBHOOK\""; then
  echo "Webhook déjà là : $URL_WEBHOOK (son secret se lit dans le Dashboard, Développeurs → Webhooks)."
else
  curl -sS "$API/webhook_endpoints" -u "$STRIPE_SECRET_KEY:" -d url="$URL_WEBHOOK" \
    -d "enabled_events[]=checkout.session.completed" \
    -d "enabled_events[]=customer.subscription.updated" \
    -d "enabled_events[]=customer.subscription.deleted" \
    -d "enabled_events[]=invoice.payment_failed" \
    | grep -E '"(id|secret)"' | tr -d ' ,'
  echo "Webhook créé. Copie la ligne « secret » (whsec_…) dans Vercel : STRIPE_WEBHOOK_SECRET."
fi
