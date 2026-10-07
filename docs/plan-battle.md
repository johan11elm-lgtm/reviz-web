# Plan — Battle : duel en temps réel et aura

_Rédigé le 2026-10-07, à la demande de Johan. Statut : proposition, décisions en fin de document._

## 1. L'idée

Deux élèves entrent dans la même partie, reçoivent la même question au même moment, et le plus rapide parmi les bonnes réponses gagne le round. Chaque round fait gagner ou perdre de l'aura, en clair à l'écran : « +20 aura », « −10 aura ». Le mot vient du mème du moment ; le mécanisme tient sans lui, et renommer l'aura ne touche qu'un texte.

Pas de liste d'amis : on joue avec quelqu'un à qui on a donné un code de partie, comme sur Kahoot ou Gartic. Jamais d'adversaire au hasard, pas de recherche d'élèves, pas de chat.

Le contenu vient des chapitres de « Mon programme » : 383 chapitres, 2 695 QCM relus, 6 questions au minimum par chapitre. Les deux joueurs ont exactement les mêmes questions, et aucune n'est générée pendant la partie.

## 2. Déroulé d'une partie

1. **Lancer.** Sur un chapitre du programme, « Lancer une battle ». Un salon s'ouvre avec un code de 4 caractères en gros (`K7RM`, sans O/0 ni I/1) et un lien à partager.
2. **Rejoindre.** L'adversaire touche « Rejoindre une battle » sur Home et tape le code, ou ouvre le lien `/battle/K7RM`. Les deux se voient dans le salon (prénom, mascotte), l'hôte touche « C'est parti ».
3. **3, 2, 1.** Le décompte démarre au même instant sur les deux téléphones.
4. **Cinq rounds.** Même question, quatre choix, 15 secondes. Une seule réponse, impossible à changer. Après avoir répondu : « En attente de Léa… », puis « Léa a répondu » (sans dire quoi).
5. **Révélation du round** (5 s, ou dès que les deux touchent « Suivant ») : qui gagne le round, l'aura gagnée et perdue de chacun, la bonne réponse et son explication.
6. **Mort subite.** Égalité après cinq rounds : la 6e question du chapitre départage. Si les deux se trompent encore, c'est une égalité.
7. **Fin.** Score (3–2), aura de la partie pour chacun, « Rejouer » (même salon, même chapitre, questions dans un autre ordre), « Changer de chapitre », « Voir la correction ».

## 3. Règles de l'aura

**À chaque round :**

| Ce qui s'est passé | Aura |
|---|---|
| Bonne réponse, la plus rapide : round gagné | +20 |
| Bonne réponse, mais plus lente | 0 (« juste, mais 1,2 s plus lent ») |
| Mauvaise réponse ou pas de réponse | −10 |

On ne perd donc de l'aura que sur une erreur, jamais sur une bonne réponse : la battle reste une révision, et c'est l'erreur qui coûte, pas la lenteur. Les deux se trompent : −10 chacun.

**En fin de partie :** +30 pour le vainqueur, +10 chacun en cas d'égalité. Une partie rapporte au plus 150 aura et en coûte au plus 60.

**Abandon.** Un joueur coupé a 15 secondes pour revenir. Au-delà, il perd par forfait : il garde l'aura perdue dans les rounds joués (on ne fuit pas un −10) sans pénalité en plus ; l'autre reçoit le bonus de victoire si au moins trois rounds ont été joués.

**Garde-fous.**
- L'aura totale ne descend jamais sous 0.
- Elle ne bouge que pour 5 parties par jour, dont 2 au maximum contre le même adversaire. Au-delà, la partie se joue en « amical », annoncé dans le salon avant le départ. Sans ça, deux copains (ou un élève et son deuxième compte) font tourner l'aura à l'infini.
- L'aura est séparée de l'XP : l'XP mesure le travail perso, l'aura les battles.
- Aucun classement public : son aura, son profil, les parties qu'on a jouées.

## 4. Écrans

- **Chapitre du programme** : bouton « Lancer une battle » à côté des quatre formats.
- **Home** : « Rejoindre une battle » (saisie du code). L'aura s'affiche à côté de l'XP dans l'en-tête (à valider) et sur le Profil.
- **Salon** : le code, le lien à partager, les deux joueurs, l'état « amical » si les plafonds sont atteints.
- **Question** : en haut, les deux prénoms avec l'aura de la partie et cinq points de rounds ; la question, les quatre choix (deux colonnes et touches 1 à 4 sur ordinateur), une barre de temps.
- **Révélation** : deux colonnes, une mascotte par joueur, le gain ou la perte d'aura, le temps de réponse, puis la correction.
- **Fin** : mascottes de victoire et de défaite, score, aura, boutons.

**Invités.** Un élève sans compte peut rejoindre avec un prénom. Son aura s'affiche pendant la partie mais n'est pas gardée : « Crée ton compte pour garder tes 85 aura ». C'est la boucle d'acquisition.

## 5. Mascottes de la série « battle »

Six nouvelles poses, toutes avec le même accessoire pour reconnaître le mode : un **bandeau de combat bleu encre (#2D2B57) noué autour des lobes**. Chaque pose existe en deux couleurs de bandeau, une par joueur (coin bleu, coin rouge) : encre pour l'hôte, rouge pour l'invité (orange en réserve). Les variantes sont recolorées en local par `scripts/recolor-bandeau.py` à partir des bruts encre : même pose au pixel près, les deux images du 6-7 restent alignées. **Intégrées le 2026-10-07** : `<BattleMascot pose couleur>` (`src/components/BattleMascot.jsx`, le 6-7 s'anime tout seul), assets dans `public/mascot/battle/`, import `scripts/import-battle-mascots.mjs`. Réservées à la Battle : absentes de `MASCOT_POSES` et de la landing. Même recette que les séries précédentes (prompt maître de `assets-src/mascot/BRIEF-MASCOTTES.md`, `pose-9-hello.png` jointe, une conversation par pose).

| Fichier cible | Moment | Scène |
|---|---|---|
| pose-b1-garde | salon, décompte, « juste mais plus lent » | il se met en garde comme un boxeur, petits poings levés devant lui, regard déterminé, sourire en coin |
| pose-b2-aura | round gagné | bras croisés, menton relevé, yeux mi-clos, demi-sourire très sûr de lui, calme absolu |
| pose-b3-moinsaura | round perdu | il se cache les yeux d'une main, joues roses de gêne, petite goutte de sueur, l'autre bras ballant : drôle, jamais humiliant |
| pose-b4-champion | victoire finale | il brandit au-dessus de sa tête une ceinture de champion dorée façon boxe, quelques étincelles dorées |
| pose-b5-gg | défaite finale | bandeau un peu de travers, il tend la main pour serrer celle de l'adversaire, sourire de bon perdant |
| pose-b6-sixseven | grosse aura ou gros écart (le mème « 6-7 ») | les deux bras écartés, paumes vers le haut, une main plus haute que l'autre comme une balance qui pèse, air malicieux et sûr de lui |

Quand sortir le 6-7 (à valider) : fin de partie gagnée avec au moins trois rounds d'écart (3–0, 4–1, 5–0), ou un palier d'aura franchi (500, 1 000…). Pas de « 67 » écrit à l'écran : le geste suffit.

Poses existantes réutilisées : `confused` (les deux se sont trompés), `search` (adversaire parti).

**L'aura est dessinée par l'app, pas dans l'image.** Ajouter au prompt : « aucun halo, aucune lueur, aucun rayon autour du personnage ». Une lueur sur fond magenta se détoure mal, et dans l'app elle doit s'animer : le halo de `Mascot` (`.mascot--glow`, un drop-shadow qui suit la silhouette) s'intensifie sur un +20 et s'éteint sur un −10. Animation coupée si `prefers-reduced-motion`. Une icône « aura » (un anneau) rejoint `Icons.jsx`.

## 6. Technique

**La partie en cours vit dans Firebase Realtime Database**, pas dans Firestore : latence plus basse, et `onDisconnect` détecte un joueur qui ferme l'app (Firestore n'a pas de présence). Le salon est temporaire et supprimé à la fin. Le module `firebase/database` n'est chargé que sur les pages battle.

```
battles/{code}
  chapitre   { classe, matiere, id }
  questions  [3, 0, 5, 1, 6, 2]      indices dans le quiz du chapitre (5 + mort subite)
  etat       salon | jeu | fin | abandon
  hote       { uid, prenom, present }
  invite     { uid, prenom, present }  present repasse à false via onDisconnect
  round      n
  rounds/{n} { debut, reponses/{uid}: { choix, ms } }
  creeLe
```

**Règles d'accès.** Seuls les deux joueurs lisent le salon. La place `invite` ne s'écrit qu'une fois, tant que l'état est `salon`. Chaque joueur n'écrit que sa propre réponse, une seule fois, avant la fin du chrono (`now <= debut + 15 s + marge`), avec `300 <= ms <= 15000`.

**Équité réseau.** On ne compare pas l'ordre d'arrivée sur le serveur, qui avantagerait la meilleure connexion. Le début de chaque question est fixé sur l'horloge du serveur (`.info/serverTimeOffset`, départ = maintenant + 3 s pour le décompte) ; chaque téléphone affiche la question à cet instant et mesure lui-même le temps jusqu'au clic (`performance.now()`). On compare ces temps.

**Qui fait avancer la partie.** L'hôte écrit le début du round suivant quand les deux ont répondu ou que le chrono est écoulé. Le résultat d'un round est une fonction pure (`resoudreRound`) calculée à l'identique sur les deux téléphones à partir des réponses.

**L'aura est écrite par le serveur.** En fin de partie, `api/battle-fin.js` (firebase-admin, comme la facturation) vérifie que l'appelant est un joueur, relit le salon, recalcule chaque round à partir du JSON du chapitre, applique les plafonds et le plancher, puis écrit dans une transaction Firestore `users/{uid}.aura`, `battles: { jouees, gagnees }` et le compteur du jour. La partie est marquée comptée pour que le deuxième appel ne fasse rien. Dans `firestore.rules`, ces champs rejoignent la liste des champs serveur, comme `plan` : le client ne peut pas s'attribuer d'aura.

**Invités.** Connexion anonyme Firebase (`signInAnonymously`), sans email : les règles exigent une connexion, l'invité n'a donc rien à créer. Le mode essai actuel (uid `invite-…` en localStorage) n'est pas connecté à Firebase et ne suffit pas.

**Triche.** Les bonnes réponses sont dans des JSON publics (et sur les fiches publiques) : impossible de rendre la battle inviolable. Le chrono de 15 s et des enjeux faibles (entre deux personnes qui se connaissent, rien à gagner, pas de classement) suffisent. Ce qui est protégé, c'est l'écriture de l'aura.

**Nettoyage.** Un cron Vercel quotidien supprime les salons de plus d'une heure (Realtime Database n'a pas d'expiration automatique).

**Quotas.** Sur le plan gratuit, Realtime Database accepte 100 connexions simultanées, soit 50 parties en même temps : assez pour démarrer.

## 7. Mineurs et RGPD

- Une battle montre à l'autre joueur un prénom, une mascotte et des scores. À ajouter à la politique de confidentialité et au texte du consentement parental.
- Prénom de l'invité : 20 caractères, lettres seulement.
- Le salon est supprimé à la fin de la partie ; seuls restent l'aura totale et les compteurs de parties.
- Pas de chat, pas de texte libre en dehors du prénom, pas d'adversaire inconnu.

## 8. Vérification

- Tests unitaires : `resoudreRound`, calcul de l'aura, plafonds, plancher, forfait, mort subite.
- Règles Realtime Database et Firestore testées sur l'émulateur (écrire deux fois sa réponse, écrire celle de l'autre, s'attribuer de l'aura : refusés).
- Playwright avec deux navigateurs, un par joueur, sur l'émulateur : une partie complète, une égalité avec mort subite, une déconnexion.
- Simulateur iOS : une partie entre l'app native et le web.

## 9. Découpage

1. **Moteur** : Realtime Database (émulateur), modèle du salon, règles et leurs tests, `battleService.js` (créer, rejoindre, répondre, avancer), `resoudreRound` et calcul de l'aura testés.
   **Fait le 2026-10-07.** Règles du jeu pures dans `src/utils/battle.js` (rounds, partie, mort subite, forfait, enchaînement `prochaineEtape`, `appliquerAura` avec plafonds et plancher), 26 tests unitaires. Règles d'accès `database.rules.json` (déclarées dans `firebase.json`, émulateur sur le port 9000). Service `src/services/battleService.js` (contexte `{ db, uid }` injecté) et branchement `src/services/battleConnexion.js` (`VITE_FIREBASE_DATABASE_URL`). `npm run test:emulateur` : 15 tests contre l'émulateur, dont trois parties complètes jouées par deux élèves simulés (victoire 3–2, mort subite, forfait après coupure réseau). Non fait volontairement : le bouton « Suivant » pendant la révélation (5 s fixes pour l'instant), et une borne basse sur le temps de réponse déclaré (un retard réseau ferait refuser des réponses honnêtes).
2. **Écrans** : salon, question, révélation, fin, route `/battle/:code`, entrées chapitre et Home, chargement à la demande.
3. **Aura et mascottes** : `api/battle-fin.js`, règles Firestore, aura sur Home et Profil ; génération des six poses de la série b, animation du halo.
4. **Finitions** : e2e à deux joueurs, iOS, forfait, cron de nettoyage, textes RGPD.

**À faire par Johan dans la console Firebase** : activer Realtime Database (région europe-west1) et la connexion anonyme ; déployer les règles (la CLI firebase n'est pas authentifiée sur le Mac) ; ajouter l'URL de la base aux variables d'environnement Vercel.

## 10. Décisions

**Prises le 2026-10-07 :**
- Temps réel, deux joueurs, avec un code de partie, sans liste d'amis.
- Le round va au plus rapide parmi les bonnes réponses.
- Un chapitre précis du programme par partie.
- À chaque round, on voit qui gagne et qui perd de l'aura.
- Des mascottes dédiées au mode.

**Encore ouvertes :**
- Les valeurs : +20 / 0 / −10 par round, +30 en fin de partie, 5 parties par jour.
- L'aura dans l'en-tête de Home, ou seulement sur le Profil.
- Quand afficher la pose 6-7 (écart de rounds, palier d'aura).
- Plus tard : battle de classe (le prof lance un chapitre, toute la classe joue), et « ton pote n'est pas dispo ? envoie-lui la partie » en différé.
