# Architecture du backend de Réviz

Mise à jour : 18/10/2026.

## En une phrase

**Vercel fait tourner le code, Firebase garde les données.** Tout le reste
(Stripe, Anthropic, Resend, PostHog, Sentry) est un service qu'on appelle,
pas un endroit où vit de la logique.

```
Navigateur / app iOS (React + Capacitor)
   │
   ├── Firebase SDK ──────────► Firebase (projet reviz-c0828)
   │   (auth, Firestore,          ├─ Authentication
   │    Realtime Database)        ├─ Firestore (eur3)        ← règles : firestore.rules
   │                              └─ Realtime Database        ← règles : database.rules.json
   │
   ├── /api/* ────────────────► Vercel Functions (dossier api/)
   │                              ├─ firebase-admin ──► Firebase
   │                              ├─ Stripe (paiement, webhook)
   │                              ├─ Anthropic (scan, coach)
   │                              └─ Resend (mails parents)
   │
   ├── /ingest/* ─────────────► relais Vercel ──► PostHog EU (mesure d'audience)
   └── Sentry SDK ────────────► Sentry (erreurs front)
```

Le client ne parle directement qu'à Firebase. Tout ce qui demande un secret
(clé Stripe, clé Anthropic, clé Resend, droits admin Firebase) passe par
`api/` sur Vercel.

## Les briques une par une

### 1. Vercel : hébergement et fonctions serveur

| | |
|---|---|
| Ce qu'il fait | Sert l'app web (build Vite dans `dist/`) et exécute les fonctions de `api/`. Deux crons. Relais PostHog `/ingest`. En-têtes de sécurité (CSP). |
| Où c'est configuré | `vercel.json` |
| Tableau de bord | vercel.com → équipe de Johan → projet **reviz** (`prj_R7Kj4KiUPp1EtiAOTtLUg11QU7G3`) |
| Déploiement | **Automatique** à chaque push sur `main`. Rien à faire. |
| Limite à connaître | Plan **Hobby** : 12 fonctions maximum. C'est pour ça que certaines routes en regroupent plusieurs (`abonnement`, `auth`). Les fichiers qui commencent par `_` ne comptent pas : ce sont des modules partagés. **On est à 12 sur 12 au 18/10** : une nouvelle route doit se greffer sur une existante. |

Routes de `api/` :

| Route | Rôle | Services appelés |
|---|---|---|
| `analyse` | Génère une fiche à partir d'un texte | Anthropic, Firestore (quota) |
| `analyse-image` | Scan d'une leçon en photo | Anthropic, Firestore (quota) |
| `chat` | Coach en streaming | Anthropic, Firestore (quota) |
| `abonnement` | Paiement Réviz+ et portail client | Stripe, Firestore |
| `stripe-webhook` | Met à jour le plan quand Stripe signale un changement | Stripe, Firestore |
| `send-parental-consent` | Mail d'autorisation au parent, relances (cron 16 h) | Resend, Firestore |
| `approve-consent` | Page où le parent accepte ou refuse | Firestore |
| `auth` | Pronote (emploi du temps), connexion native iOS/Microsoft, TikTok | Firebase Auth, TikTok |
| `battle-fin` | Verse l'aura sur les comptes en fin de partie | Firestore, Realtime Database |
| `battle-nettoyage` | Supprime les vieux salons (cron 3 h) | Realtime Database |
| `avis` | Formulaire public `/avis` | Firestore |
| `track` | Compteurs anonymes par jour (`stats/`) | Firestore |

Les deux crons sont protégés par `CRON_SECRET`.

### 2. Firebase : comptes et données

| | |
|---|---|
| Ce qu'il fait | **Authentication** (comptes élèves, Google, Microsoft, email). **Firestore** : profils, progression, quotas, abonnements, avis, stats. **Realtime Database** : salons de Battle en temps réel. |
| Où c'est configuré | `firebase.json`, `.firebaserc` (projet `reviz-c0828`), `firestore.rules`, `firestore.indexes.json`, `database.rules.json` |
| Tableau de bord | console.firebase.google.com → **reviz-c0828** |
| Déploiement | **À la main.** Un push ne publie pas les règles. |

```bash
npx firebase deploy --only firestore:rules,firestore:indexes,database
```

Pour tester les règles en local avant de publier :

```bash
npm run test:emulateur
```

### 3. Stripe : paiement Réviz+

| | |
|---|---|
| Ce qu'il fait | Paiement de l'abonnement, portail client, webhook qui passe le compte en premium ou le repasse en gratuit. |
| Code | `api/abonnement.js`, `api/_checkout.js`, `api/_billingPortal.js`, `api/stripe-webhook.js`, prix dans `api/_prix.js` |
| Tableau de bord | dashboard.stripe.com. Compte encore en **mode test**. |
| Déploiement | Rien côté Stripe. Le webhook doit pointer vers `https://app.revizapp.fr/api/stripe-webhook`. Au passage en live : nouvelles clés et nouveau secret de webhook dans Vercel. |
| Interrupteurs | Ventes derrière `VENTES_OUVERTES`, offre de lancement dans `api/_lancement.js`. |

### 4. Anthropic : l'IA

| | |
|---|---|
| Ce qu'il fait | Scan de leçon, génération de fiches et de quiz, coach. |
| Code | `api/analyse.js`, `api/analyse-image.js`, `api/chat.js`, prompts dans `api/_systemPrompt.js` et `api/_chatPrompt.js` |
| Tableau de bord | console.anthropic.com (usage, facturation) |
| Déploiement | Avec Vercel. |

En dev local seulement, si `VITE_ANTHROPIC_API_KEY` est présente, le
navigateur appelle Anthropic directement (`src/services/aiService.js`,
`src/services/chatService.js`). **Cette variable ne doit jamais exister sur
Vercel** : elle finirait en clair dans le JavaScript public. Vérifié le
18/10 : aucune clé dans les bundles principaux servis en production.

### 5. Resend : emails

| | |
|---|---|
| Ce qu'il fait | Mail d'autorisation parentale et relances. Expéditeur sur le domaine revizapp.fr. |
| Code | `api/send-parental-consent.js` |
| Tableau de bord | resend.com |
| Déploiement | Avec Vercel. Les enregistrements DNS du domaine sont chez OVH. |

### 6. PostHog : mesure d'audience

| | |
|---|---|
| Ce qu'il fait | Visites et parcours, sans cookie. Projet EU 299517. |
| Code | `src/main.jsx` (chargé après le premier affichage) |
| Passage | Web : relais `/ingest` déclaré dans `vercel.json` pour passer les bloqueurs. App iOS : direct vers eu.i.posthog.com. |
| Tableau de bord | eu.posthog.com |
| Déploiement | Avec Vercel. |

À ne pas confondre avec `api/track.js`, qui tient des compteurs anonymes
par jour dans Firestore (`stats/`) et alimente le dashboard fondateur.

### 7. Sentry : erreurs

| | |
|---|---|
| Ce qu'il fait | Remonte les erreurs JavaScript du front. Les sourcemaps sont envoyées au build. |
| Code | `src/main.jsx`, plugin dans `vite.config.js` |
| Tableau de bord | sentry.io |
| Déploiement | Avec Vercel. |

Les fonctions `api/` ne sont pas suivies par Sentry. Leurs erreurs se lisent
dans Vercel → projet reviz → Logs.

## Variables d'environnement

Côté serveur, à déclarer dans Vercel → reviz → Settings → Environment
Variables. Lues par `process.env` dans `api/`.

| Variable | Service | Utilisée par |
|---|---|---|
| `FIREBASE_ADMIN_CREDENTIAL` | Firebase (compte de service, JSON) | toutes les routes via `api/_firebaseAdmin.js` |
| `FIREBASE_DATABASE_URL` | Realtime Database | Battle |
| `ANTHROPIC_API_KEY` | Anthropic | `analyse`, `analyse-image`, `chat` |
| `STRIPE_SECRET_KEY` | Stripe | `abonnement`, `stripe-webhook` |
| `STRIPE_WEBHOOK_SECRET` | Stripe | `stripe-webhook` |
| `STRIPE_PRICE_MONTHLY` | Stripe | prix mensuel |
| `RESEND_API_KEY` | Resend | `send-parental-consent` |
| `TIKTOK_CLIENT_KEY`, `TIKTOK_CLIENT_SECRET` | TikTok Login Kit | `auth` |
| `CRON_SECRET` | Vercel | les deux crons |
| `APP_URL` | — | liens dans les mails et redirections |
| `SENTRY_AUTH_TOKEN` | Sentry | envoi des sourcemaps au build |

Côté client, préfixe `VITE_`. **Elles sont publiques** : elles finissent dans
le JavaScript envoyé au navigateur. On n'y met jamais de secret.

| Variable | Service |
|---|---|
| `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`, `VITE_FIREBASE_DATABASE_URL` | Firebase (identifiants publics, la sécurité vient des règles) |
| `VITE_POSTHOG_KEY` | PostHog |
| `VITE_SENTRY_DSN` | Sentry |
| `VITE_AUTH_PROVIDERS` | choix des boutons de connexion affichés |
| `VITE_API_BASE` | adresse de l'API pour l'app iOS |
| `VITE_FIREBASE_EMULATOR` | dev : brancher les émulateurs |
| `VITE_ANTHROPIC_API_KEY` | **dev local uniquement**, jamais sur Vercel |

En local, tout est dans `.env.local` (hors git), récupéré avec
`vercel env pull`. L'app iOS lit `.env.ios`.

## Qui déploie quoi

| Je change… | Ce que je fais | Où vérifier |
|---|---|---|
| du code (`src/`, `api/`) | push sur `main` | Vercel → Deployments |
| `vercel.json` (crons, CSP, relais) | push sur `main` | Vercel → Deployments, puis Cron Jobs |
| les règles Firestore ou Realtime Database, les index | `npx firebase deploy --only firestore:rules,firestore:indexes,database` | console Firebase → Règles |
| une variable d'environnement | Vercel → Settings → Environment Variables, puis **redéployer** | Vercel → Deployments |
| un prix ou le passage Stripe en live | Stripe + variables Vercel + redéploiement | dashboard Stripe → Webhooks |
| l'app iOS | `npm run build` puis `npm run sync:ios`, build Xcode | simulateur |

La landing (`reviz-landing`) et le pilotage (`reviz-medias`) sont des projets
Vercel à part, déployés eux aussi par push. Les DNS de revizapp.fr sont chez
OVH : `www` pointe vers la landing, `app` vers ce projet.

## Pourquoi ce n'est pas « un peu de partout »

Chaque service a un seul rôle et aucun ne fait le travail d'un autre. La
logique serveur vit à un seul endroit (`api/`), les données à un seul
endroit (Firebase). C'est le découpage le plus courant pour une app de cette
taille.

Les deux vrais points d'attention :

1. **Les règles Firebase ne partent pas avec le push.** C'est le seul
   déploiement manuel, donc le plus facile à oublier.
2. **La limite de 12 fonctions** du plan Hobby, déjà atteinte. Pour en
   ajouter une, passer à Vercel Pro règle la question sans rien déplacer.
