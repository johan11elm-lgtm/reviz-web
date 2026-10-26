# Tour de l'app, branche `refonte-valide`, 23/10/2026

Lot D du plan de fiabilisation. Lecture seule : rien n'a été corrigé dans `src/`.

- Script : `scripts/tour-captures.mjs` (réutilisable pour comparer avant/après).
- Captures : `/private/tmp/claude-501/-Users-johan-Documents-Mes-Projets-reviz/92f36a13-a8fa-4844-9c33-cd6f7ea958eb/scratchpad/tour-avant/` (200 PNG, 100 vues × 390 et 1280 px, plus `rapport.json`). Dans le tableau, `<c>` désigne ce dossier ; un nom `etat__vue__largeur.png` y figure.
- Serveur : Vite dev (port 5210) branché sur l'émulateur Firebase, comptes créés par l'API REST de l'émulateur, IA et `/api/*` simulés, horloge de la page figée au 23/10/2026 10 h.
- Vérifié en plus avec un build de production (`vite build`, servi par `vite preview`) pour l'état « compte neuf » : les pages de format sans leçon y affichent bien « Aucune leçon chargée » (voir plus bas, le dev montre autre chose).

## Résultat en une phrase

Aucune casse bloquante : 200 captures, 0 `pageerror`, 0 requête en échec (hors coupures de l'émulateur, voir plus bas), 59 liens internes vérifiés dont 0 mort, aucun emoji dans l'interface, aucune étape de scénario en échec. Les défauts sont surtout de composition sur ordinateur et des détails.

## Problèmes

| # | Gravité | Route | Largeur | Description | Capture | Source probable |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | gênant | `/` (accueil) | 1280 | La carte « Essaie un thème Réviz+ » s'étale sur toute la largeur de la fenêtre, de bord à bord, sans les marges des autres cartes (ses bords touchent l'écran, la croix de fermeture est coupée à droite) ; en dessous, la bannière « Confirme ton e-mail » flotte dans un coin du héros. Sur téléphone la carte est dans un `hm-pad` et tout va bien. | `<c>/neuf__accueil__1280.png` (carte à y≈650) | `src/pages/Home.jsx:531` : dans la branche ordinateur, `<ThemeEssai>` est posé sans conteneur de marge, contrairement à la ligne 584 (`<div className="hm-pad">`). |
| 2 | gênant | `/legal/inconnue` (page légale inexistante) | 390 et 1280 | Une page légale à l'URL inconnue affiche un simple texte nu « Page introuvable. » (fond crème, aucune mascotte, aucun bouton) à la place de la page 404 habillée du reste de l'app. À 390 le conteneur `.app` déborde de 50 px (440 px de large pour 390). | `<c>/invite__legal-inconnue__390.png`, `<c>/invite__legal-inconnue__1280.png` | `src/pages/Legal.jsx:338` : `<div className="app"><p style={{ padding: 24 }}>Page introuvable.</p></div>` ; réutiliser `NotFound` / `PageEtat`. |
| 3 | gênant | `/battle` | 1280 | La bulle « Toi contre un ami. / Même question, même moment. » est coupée : la seconde ligne finit sous la tête de la mascotte de gauche (« même momen… » masqué). Vu aussi pour un invité. | `<c>/invite__battle__1280.png`, `<c>/neuf__battle__1280.png` | `src/pages/Battle.css:448-449` : `.bt-page--large .bt-bulle { left: 44%; top: 34px }` avec `max-width: 260px` ; la bulle recouvre les mascottes à 1280 px. Reculer la bulle (ou la placer à gauche des mascottes) ou réduire sa largeur. |
| 4 | gênant | `/jeux?fin=6` récap | 1280 | Dans le récap, le chapeau de Réviz (magicien) recouvre l'étiquette « La bonne réponse » de la première carte (« La bonne réponse » devient illisible, seul le chiffre rond 56 reste). À 390, l'étiquette est visible. | `<c>/jeux__recap-fin-6__1280.png` | `src/pages/jeux/FinDePartie.css` : placement de `.fp-pantin` / `.fp-bulle` dans le récap grand écran (autour des lignes 87, 298-306, 378). |
| 5 | détail | `/flashcards`, `/quiz` (leçon chargée ou non) | 390 | `.app` fait 420 px de large pour 390 : le rond décoratif `fc-deco--b` dépasse de 30 px à droite. Invisible tant que `overflow-x: hidden` tient, mais `.app` peut être déplacé de côté par un focus ou un scroll programmatique (cf. le piège du halo de `.app`). | `<c>/lecon__flashcards-recto__390.png` ; mesure dans `<c>/rapport.json` (`debordement.appScrollWidth: 420`) | `src/pages/Flashcards.css:22` (`.fc-page .fc-deco--b { right: -30px }`) ; même rond dans `Quiz.jsx:173`. |
| 6 | détail | `/jeux?fin=6` récap | 390 | Même cause : `.app` fait 394 px de large pour 390 (4 px). | `<c>/jeux__recap-fin-6__390.png` | `src/pages/jeux/FinDePartie.css` (élément du récap qui dépasse, à chercher avec la mesure `elementsHorsEcran` du rapport, vide car rogné par un parent). |
| 7 | détail | `/jeux?fin=N`, récap, 2e erreur | 390 et 1280 | Avertissement GSAP « Invalid property effetAmpoule set to 0 Missing plugin? » quand Réviz change d'expression dans le récap : le moteur anime une propriété que ce pantin n'a pas. Sans effet visible. | `<c>/jeux__recap-fin-6-erreur-2__390.png` ; message dans `rapport.json` | `public/pantin/moteur/gestes3d/reactions.js:55` : `pop(tl, 'effetAmpoule', …)` ; la garde ligne 6 teste `effetAmpoule` **ou** `yeuxEtoiles`. |
| 8 | détail | `/jeux?fin=N` | 390 et 1280 | Avertissement « The AudioContext was not allowed to start » au chargement direct de l'écran de fin (pas de geste avant). N'arrive qu'en ouvrant `?fin=` à la main (en dev seulement) ; en jeu, le contexte est débloqué par le geste de départ. | `rapport.json` (`avertissements` des vues `jeux/fin-*`) | `src/utils/bruitages.js` (création du contexte au premier `jouer`). |
| 9 | détail | `/resume` sans leçon | 390 et 1280 (dev) | En développement (`npm run dev`), `/analyse`, `/resume`, `/quiz`… sans leçon affichent le faux chapitre « Théorème de Pythagore » avec le badge « Généré par IA » au lieu de l'état vide ; et React signale « Each child in a list should have a unique key » (les cartes de vérification du mock n'ont pas d'`index`). En production, l'état vide « Aucune leçon chargée » s'affiche bien (vérifié sur un build) : sans effet pour les élèves, mais trompeur pour qui teste en local. | `<c>/neuf__resume-sans-lecon__390.png` (dev), `<c>/../tour-prod/neuf__resume-sans-lecon__1280.png` (prod, dossier voisin du scratchpad) | `src/pages/Resume.jsx:91-95` (mock `checks` sans `index`) et `Resume.jsx:350` (`key={card.index}`). |
| 10 | détail | `/profil` | 1280 | La carte « Battle » est très haute pour son contenu : un grand vide blanc entre la phrase et le bouton « Défier quelqu'un », parce qu'elle s'étire à la hauteur de « Mon compte ». | `<c>/neuf__profil__1280.png` | `src/pages/Profile.css` (grille de la rangée « Mes chiffres / Battle / Mon compte »). |
| 11 | détail | `/jeux?fin=N` | 390 | Le surtitre « PARTIE RAPIDE · 6 TOURS » est blanc sur les fanions colorés du décor : contraste faible. | `<c>/jeux__fin-6__390.png` | `src/pages/jeux/FinDePartie.css` (`.fp-surtitre`). |
| 12 | détail | `/scan` (mode essai) | 1280 | La carte « Garde tes leçons » est centrée dans une grande étendue vide (pas de colonnes comme sur le scan complet) ; propre mais muette. | `<c>/essai__scan__1280.png` | `src/components/GuestWall.jsx`. |

Vérifié sans défaut (liste utile pour le prochain passage) : accueil, onboarding en 3 écrans, programme (carte du chapitre, changement de matière), chapitre ouvert (analyse, résumé, flashcards, carte mentale, quiz, Réviz IA), scan (photo/texte), quiz complet avec bonne et mauvaise réponse et écran de fin, cours, agenda, profil, réglages, hub des jeux, carte de début, partie en cours, écrans de fin (0, 1, 6, 11 erreurs), récap, Battle, légal, avis, profs, installer, essai, 404, vérification d'e-mail, finish-setup, upgrade-success, connexion avec erreur. Pas d'emojis dans l'interface, pas de texte en anglais, aucune faute relevée.

Couverture des routes de `App.jsx` : toutes visitées (`/welcome`, `/legal/:page`, `/avis`, `/profs`, `/installer`, `/inscription`, `/connexion`, `/essai`, `/consent-pending`, `/finish-setup`, `/verify-email`, `/`, `/onboarding`, `/cours`, `/progres`, `/agenda`, `/profil`, `/reglages`, `/scan`, `/analyse`, `/flashcards`, `/quiz`, `/resume`, `/mindmap`, `/upgrade-success`, `/coach`, `/programme`, `/jeux`, `/programme/:matiere`, `/battle`, `/battle/:code`, `*`). `/consent-pending` et `/onboarding` d'un compte déjà entré renvoient vers `/` (comportement voulu).

## Erreurs console, `pageerror`, requêtes en échec

- `pageerror` : aucune sur les 200 vues.
- Requêtes en échec (hors `api.anthropic.com`, PostHog, Sentry) : aucune.
- Console `error` :
  - `Failed to load resource … 400 … accounts:signInWithPassword` sur `/connexion` (390 et 1280) : attendu, c'est la connexion avec un mauvais mot de passe, dont le message est bien affiché.
  - `Warning: Each child in a list should have a unique "key" prop` dans `ResumeContent`/`CheckCard` (390 et 1280, dev, voir problème 9).
- Console `warning` : AudioContext (problème 8) et GSAP `effetAmpoule` (problème 7), rien d'autre.
- Appels `/api/*` vus, simulés : `/api/analyse`, `/api/track`.
- Coupures de l'émulateur Firestore (`ERR_EMPTY_RESPONSE` sur `127.0.0.1:8080`, « Could not reach Cloud Firestore backend ») : rencontrées lors d'un premier passage, quand l'émulateur partagé était tombé (500 « Panic ») ; comptées à part dans le rapport (`coupuresEmulateur`, 0 sur le passage final). Ce n'est pas un défaut de l'app.

## Liens morts

59 liens internes uniques (`a[href^="/"]`) rencontrés sur les pages, chacun visité une fois, dans trois contextes (invité, mode essai, compte connecté) : aucun ne tombe sur la page 404 ni sur une erreur HTTP. Les seuls liens vers une page légale inexistante n'existent pas dans l'interface (voir problème 2 pour l'URL tapée à la main).

## Ce qui n'est pas couvert

- WebKit/Safari et le simulateur iOS : seulement Chromium (Safari a des comportements propres : sûreté du viewport, audio).
- Les parties de jeu jouées jusqu'au bout (6 jeux), la Battle à deux joueurs, l'écran de fin d'une vraie partie du jour, le retour sur le hub avec série et record : à voir dans le lot B2 (`e2e/jeux.spec.js`). Le tour n'ouvre que le hub, la carte de début, 2,5 s de la première manche et les écrans de fin de démonstration (`?fin=`, dev seulement).
- Les parcours qui changent de compte (inscription réelle, mineur de moins de 15 ans et consentement, `/consent-pending` réellement bloqué, abonné Réviz+ réel, paiement) : couverts par les e2e, pas par ce tour.
- Les captures de scan par photo (caméra), le téléversement d'images, les rappels (natif), la connexion Google/Apple/Microsoft/TikTok.
- Le mode sombre et les thèmes Réviz+ (le tour ne rend que le thème Crème).
- Les largeurs intermédiaires (768, 1024) et la hauteur d'écran réduite.
- Les captures sont pleine page : la hauteur du viewport est agrandie pour les pages défilantes, donc la barre d'onglets du bas et les éléments `position: fixed` apparaissent en bas de page, pas à leur place d'un écran réel.
- Les animations de Pantin (GSAP) ne sont pas gelées par la feuille CSS ; le tour demande aussi `prefers-reduced-motion`, ce qui les pose d'un coup, mais une capture comparée au pixel près peut encore varier sur la mascotte (voir `--mouvement true` pour revenir au mouvement réel).
