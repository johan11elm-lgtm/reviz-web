# Bilan de la fiabilisation de la refonte (23-24/10/2026)

Branche locale `refonte-valide`, rien n'est poussé. Plan : `docs/plan-fiabilisation-refonte.md`.
Travail découpé en lots confiés à des sous-agents. Chaque diff a été relu et chaque suite relancée par la
session principale avant le commit.

## État final (vérifié le 24/10)

| Contrôle | Avant | Après |
| --- | --- | --- |
| e2e Playwright (`E2E_PORT=5205 npx playwright test`) | 21 échecs sur 21 | **69 passés sur 69**, 11,3 min, aucun `fixme` ni `skip` |
| Vitest (`npx vitest run`) | 681 verts | **822 verts** (99 fichiers) |
| `npm run build` | vert | vert |
| CSS (`src/**/*.css`) | 15 148 lignes | 10 986 lignes, aucun pixel changé |

## Ce qui a été corrigé

### Tests e2e remis à la refonte
- Inscription, découverte, consentement parental, double compte, vérification d'e-mail, bienvenue, Réglages
  (nouveau), Réviz+ et lancement : à date figée pour le lancement, les derniers jours et la rentrée du 2/11
  (sans ça, les tests auraient cassé le 26/10).
- Accueil, programme, matière, chapitre, fiche, quiz joué jusqu'au bout, scan texte, leçon trop longue,
  composition ordinateur (1280 px) et téléphone (390 px), sans débordement horizontal.
- Battle : deux élèves, un invité, la revanche, l'aura rangée dans le compte.
- Réviz Games (nouveau) : hub, carte de début, partie du jour jouée de bout en bout (horloge Playwright),
  série et record vérifiés à l'écran et dans `users/{uid}.jeux`, partie rejouée le même jour sans doublon,
  série en cours reprise du compte, Partie rapide, récap.
- `compteRapide()` (`e2e/helpers.js`) crée un compte prêt en environ 1 s. `E2E_PORT` donne un port par run.

### Partie du jour (chantier 4)
- La série et le record suivent l'invité qui crée son compte (migration de `reviz-jeux-jour-`).
- La synchro avec le compte marche dans les deux sens. Le record n'est jamais écrasé par un plus petit, et
  rien n'est écrit si la lecture échoue. Le score du jour est repris d'un autre appareil.
- Plus de « Ton score : 0 » ni de « Faite !  points. » quand le score est inconnu.
- L'accueil synchronise au montage. Un hub ou un accueil restés ouverts après minuit se remettent à jour au retour.
- Une partie tirée à 23 h 59 et finie à 0 h 01 compte pour le jour du tirage. Le podium montre le même
  record que le hub.

### Fragilités
- **Mise à jour du 2/11** : si un chunk paresseux a disparu, l'app se recharge une fois (garde anti-boucle)
  au lieu d'afficher « Oups ». Le service worker passe en v6 et ne fige plus une page HTML à la place d'un
  script. Le moteur du pantin passe en réseau d'abord, et on peut le réessayer après un échec.
- **Jeux** :
  - le chrono, la physique et les enchaînements se mettent en pause quand l'app passe en arrière-plan ;
  - plus d'écran de fin ni de tour fantôme après la croix ;
  - une partie abandonnée ne compte pas ;
  - la croix du hub ramène à l'accueil après un lien direct ;
  - les images de fin et de transition sont préchargées.
- **Audio iOS** : le contexte reprend aussi après une interruption (appel, verrouillage) et au retour au
  premier plan. Les musiques ne jouent plus de salve après une veille, ne laissent plus de source orpheline,
  et libèrent leurs morceaux décodés (~290 Mo) en quittant les jeux.

### Ménage CSS (chantier 2)
- 13 fichiers supprimés : 7 jamais importés (anciennes pages d'entrée) et 6 de `src/styles/components/`
  morts à 100 %.
- Les règles et les 53 variables sans usage sont retirées (−886 lignes dans `desktop.css`).
- Preuve : `node scripts/css-morts.mjs` ne trouve plus aucune règle morte sûre. Deux séries de captures avant et deux après ont été
  comparées sur 200 vues : les seuls écarts viennent de la mascotte animée et des données de test aléatoires.
- Gardé exprès : 230 règles douteuses, celles des classes fabriquées dynamiquement.

### Tour de l'app (chantier 3) et casses corrigées
- Tour en 200 captures (100 vues × 390 et 1280 px) avec `scripts/tour-captures.mjs`. Rapport :
  `docs/tour-refonte-2026-10-23.md`. Résultat : 0 `pageerror`, 0 requête en échec, 59 liens internes, aucun mort.
- Corrigé :
  - l'avis « Ce quiz t'a aidé ? » manquait sur ordinateur ;
  - accueil ordinateur : la carte « Essaie un thème » et le rappel d'e-mail sont alignés sur la grille ;
  - une page légale inconnue affiche la vraie 404 ;
  - la bulle de la Battle n'est plus coupée ;
  - le chapeau de Réviz ne masque plus « La bonne réponse » dans le récap ;
  - plus de débordement à 390 px (flashcards, quiz, récap, et une étiquette longue du ninja qui poussait la page à 408 px) ;
  - les cartes du profil n'ont plus de grand vide ;
  - le surtitre de l'écran de fin est lisible ;
  - la clé React du résumé est en place.

## Ce qui reste

### Décisions pour Johan
- **Rejouer la partie du jour** redonne exactement le même tirage. Le jour n'est pas compté deux fois, mais on
  peut apprendre les réponses et gonfler son score du jour et son record. Faut-il un autre tirage, ou un seul
  score retenu (le premier) ?
- **Son en mode silencieux** sur iPhone : la Web Audio API se tait si le téléphone est en silencieux.
  `navigator.audioSession` permettrait de jouer quand même. J'ai laissé « non », c'est une app utilisée au collège.
- **Ordinateur** : sur `/scan` en mode essai, la carte « Garde tes leçons » est seule au milieu d'un grand vide
  (point 12 du tour).
- **`SocialLogin.jsx`** : son composant par défaut n'est rendu nulle part (code mort à confirmer).

### Non fait, non bloquant
- **Avertissement GSAP** « effetAmpoule » dans le récap (`public/pantin/moteur/gestes3d/reactions.js:55`) : sans effet
  visible. Il vient du moteur exporté par `argile3d/exporter_app.py`, il faut donc le corriger à la source.
- **Avertissement AudioContext** quand on ouvre `/jeux?fin=` à la main : dev seulement.
- **Le 2/11 lui-même** : les onglets ouverts avant la mise à jour tournent encore sur l'ancien service worker,
  qui n'a pas le filet de rechargement. Leur premier écran « Oups » puis « Retour à l'accueil » les passe en v6.
  Le filet protège les mises à jour suivantes.
- **Non testé sur un vrai iPhone** (Safari, simulateur) : l'audio interrompu et la pause en arrière-plan ne sont
  prouvés que par des tests avec de faux `AudioContext`. Le tour et les e2e ne tournent que sous Chromium.
- **Hors du tour** : mode sombre et thèmes Réviz+, largeurs 768 et 1024.
- **`scripts/scope-page-css.py`** cite encore `Onboarding.css`, supprimé.

### Piège d'outillage
L'émulateur Firestore fuit des threads à chaque navigateur de test et tombe à 2 048 (500 « Panic » partout).
Il faut le relancer avant un gros run. Ne jamais utiliser `scripts/e2e-emulators.sh` quand une autre session tourne :
il tue tout ce qui écoute sur les ports.

## Commits (locaux, `refonte-valide`)
38602f6 plan et audits · 76a8bb7 partie du jour · 09b3fc1 e2e entrée · 46ea29d mise à jour sans casse ·
be02dc8 jeux et audio · 85aa32a e2e accueil, programme, quiz · 9d83b31 e2e Battle et jeux · b957a76 tour ·
192824e ménage CSS · 2f1e812 casses visuelles · (ce bilan)
