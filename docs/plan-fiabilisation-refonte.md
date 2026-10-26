# Fiabiliser la refonte avant le gel du 31/10/2026

Branche locale `refonte-valide` (worktree `reviz-web-refonte`). Rien n'est poussé.
Rentrée et grosse mise à jour le 2/11. Plan écrit le 23/10 par la session de
fiabilisation ; exécuté par des sous-agents, relu et commité par elle.

## Règles communes à tous les lots

- Ne jamais pousser, ne jamais changer de branche, ne jamais `git stash`.
- Les sous-agents ne commitent pas : ils laissent leurs fichiers modifiés et listent
  les chemins touchés. La session principale relit le diff, relance les tests et commite
  chemin par chemin (`git add <chemins> && git commit`).
- `.maquette-tmp.mjs` n'est pas à nous.
- Ne tuer aucun processus qu'on n'a pas lancé. L'émulateur Firebase (9099, 8080, 9000)
  tourne déjà : le réutiliser, ne jamais lancer `scripts/e2e-emulators.sh` (il tue les ports).
- Ports : chaque lot qui lance Vite prend le sien (voir le tableau). Le e2e lit
  `E2E_PORT` (5199 par défaut).
- 8 Go de RAM : au plus 3 sous-agents en même temps, et au plus 2 navigateurs Playwright.
- Pas d'emojis dans l'interface (Icons.jsx et mascottes). Ordinateur : on compose pour
  la largeur (desktop.css, useIsDesktop). Preuve à 390 px pour tout changement visuel.
- Piège e2e : un clic sous la barre d'onglets fait défiler `.app` de 46 px ; centrer
  l'élément (`scrollIntoView({ block: 'center' })`) avant de cliquer ou de mesurer.
- Fini = Vitest vert (681 tests au départ), `npm run build` vert, ses specs vertes.

## Ports

| Lot | Vite |
| --- | --- |
| e2e (A, B1, B2, B3) | 5201, 5202, 5203, 5204 (`E2E_PORT`) |
| Tour de l'app (D) | 5210 |
| Ménage CSS (C) | 5211 |

## Phase 0 (session principale)

- Run e2e de référence sur l'état actuel : liste des specs cassées et pourquoi.
- `E2E_PORT` dans `playwright.config.js`.

## Phase 1 (en parallèle, 3 sous-agents)

### Lot A — e2e : aides et parcours d'entrée
Fichiers : `e2e/helpers.js`, `welcome-flow`, `double-compte`, `verif-email`,
`minor-consent`, `lancement`, `revizplus`, nouveau `reglages.spec.js`.
- Remettre `signup`, `verifyEmailAndOnboard`, fermetures des annonces à la refonte
  (onboarding en 4 étapes, annonces de l'accueil).
- Une aide `compteRapide(page)` qui crée le compte par l'API de l'émulateur (Auth +
  users/{uid}) sans passer par l'interface, pour que les autres specs démarrent vite.
- Réglages : ouvrir, changer un réglage, le retrouver après rechargement.
- Chaque parcours à 1280 et 390 px quand l'écran change de composition.

### Lot D — tour de l'app (lecture seule, sauf son script)
- Écrire `scripts/tour-captures.mjs` : Vite sur 5210 branché sur l'émulateur, un compte
  créé par l'API de l'émulateur, toutes les routes de `App.jsx` à 390 et 1280 px,
  captures pleine page, erreurs console, `pageerror`, requêtes en échec, liens internes
  morts (chaque `a[href^="/"]` visité répond par autre chose que la 404).
  États : invité, compte neuf (états vides), compte avec une leçon, un chapitre ouvert,
  quiz, jeux (hub, carte de début, fin via `?fin=1`).
- Rendre `docs/tour-refonte-2026-10-23.md` : chaque casse avec capture, gravité,
  fichier probable. Ne rien corriger.

### Lot E — fragilités (lecture seule)
- Partie du jour : relire `partieDuJourService.js`, `Jeux.jsx`, `HubJeux.jsx`, Home
  (`jourJeux`) : la fin d'une partie du jour compte-t-elle une seule fois, la série
  et le record s'affichent-ils au retour sur le hub et sur l'accueil, que se passe-t-il
  après minuit, avec un invité puis un compte, sur deux appareils (synchro).
- Chargement des jeux (`prechargement.js`, poids de `public/jeux`), audio iOS
  (`utils/bruitages.js`, déverrouillage du contexte audio au premier geste, reprise
  après passage en arrière-plan), erreurs non attrapées (promesses sans catch,
  `ErrorBoundary` autour des routes paresseuses, échec de chargement d'un chunk).
- Rendre `docs/fragilites-refonte-2026-10-23.md` : constat, preuve (ligne de code,
  mesure), correctif proposé, risque. Ne rien corriger.

### Lot C (étape 1) — ménage CSS : l'inventaire
- Script `scripts/css-morts.mjs` : pour chaque classe déclarée dans `src/**/*.css`,
  chercher son usage dans `src/**/*.{jsx,js}` et `index.html` (noms entiers, et
  préfixes de classes fabriquées : `` `hm-${x}` ``, `classnames`), lister les mortes
  sûres, les douteuses (préfixe dynamique) et les doublons qui se contredisent
  (même sélecteur dans deux fichiers avec des valeurs différentes).
- Ne rien supprimer à cette étape. Rendre la liste.

## Phase 2 (en parallèle, 3 sous-agents)

### Lot B1 — e2e : accueil, programme, chapitre, quiz
Fichiers : `core-flow`, `programme`, `long-text`, `desktop`.

### Lot B2 — e2e : Battle et Réviz Games
Fichiers : `battle`, nouveau `jeux.spec.js` :
- hub (partie du jour, Partie rapide, 6 vignettes), carte de début, une partie du
  jour jouée jusqu'au bout (horloge Playwright pour ne pas attendre les chronos),
  écran de fin, récap, retour au hub : série 1 et record affichés, puis
  `users/{uid}.jeux` dans l'émulateur. Rejouer la partie du jour le même jour ne
  compte pas deux jours.
- 1280 et 390 px.

### Lot C (étape 2) — ménage CSS : la suppression
- Supprimer les mortes sûres seulement. Captures avant/après avec
  `scripts/tour-captures.mjs`, comparaison pixel par pixel (aucune différence
  attendue) ; toute différence = on remet.

## Phase 3 (session principale, puis sous-agents si besoin)

- Corriger les casses du tour (D) et les fragilités (E) retenues, par lots qui ne
  touchent pas les mêmes fichiers.
- Relancer tout : Vitest, build, e2e complet, tour de captures.
- Commits locaux par lot, rapport final : corrigé / reste, avec preuves.
