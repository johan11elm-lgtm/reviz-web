# Fragilités de la refonte (Réviz Games et socle) — audit du 23/10/2026

Lot E du plan de fiabilisation, lecture seule. Branche `refonte-valide`, rien n'a été modifié
dans le code. Les preuves exécutables sont dans le scratchpad de la session
(`/private/tmp/claude-501/-Users-johan-Documents-Mes-Projets-reviz/92f36a13-a8fa-4844-9c33-cd6f7ea958eb/scratchpad/`) :
`service.test.js` (série, minuit, synchro, invité), `determinisme.test.js` (tirage du jour),
`pantin.test.js` (rechargement du moteur), `poids.test.js` (poids préchargés), `promesses.cjs`
(analyse AST des promesses sans catch), `build.log` (build Vite, sortie dans `scratchpad/dist`).
Les tests existants (`partieDuJourService.test.js`, `prechargement.test.js`) passent (9 tests).

Barème : **bloquant** (pour la rentrée du 2/11), **avant le gel** (31/10), **plus tard**.

## Synthèse

Aucun bloquant strict : tout dégrade proprement (écran d'erreur avec bouton, mascotte de repli).
Mais cinq points sont à traiter avant le gel parce qu'ils tombent le jour de la mise à jour ou
touchent tous les iPhone :

| # | Problème | Gravité |
| --- | --- | --- |
| A | Un onglet ouvert avant la mise à jour plante sur `/jeux` (chunk lazy disparu), pas de rechargement automatique | avant le gel |
| B | Audio iOS : état `interrupted` jamais repris, aucun suivi de l'arrière-plan, muet si le téléphone est en mode silencieux | avant le gel |
| C | Invité qui crée un compte : la série des jeux est perdue | avant le gel |
| D | Synchro entre appareils : le score du jour n'est pas repris (« Ton score : 0 »), le record du compte peut être écrasé par un plus petit, les jours locaux ne sont jamais renvoyés | avant le gel |
| E | Le moteur du pantin (`/pantin/moteur/*.js`, non haché) est servi cache-first à vie par le service worker, et un échec de chargement bloque tout réessai | avant le gel (cache), plus tard (réessai) |
| F | Aucune pause quand l'app passe en arrière-plan : le chrono du tour court, les fruits du ninja « s'échappent » | avant le gel |

Le reste est « plus tard » ou « OK ».

---

## 1. Partie du jour

### 1.1 La fin est enregistrée exactement une fois : OK

- `src/pages/Jeux.jsx:609-611` : effet sur `[phase]`, sorti tôt si `phase !== 'fin'` ou si
  `jourEnregistre.current === partie`. La référence est posée avant l'appel, donc le double
  déclenchement de StrictMode (`src/main.jsx:49`) ne compte pas deux fois.
- `Jeux.jsx:661-664` (`onTermine`, garde ligne 662) : `finie.current === idx` empêche une fin de manche double.
- Le score lu est celui du rendu où `phase` passe à `fin` : `setScore` est fait 650 ms avant
  `setPhase('fin')` (`Jeux.jsx:669-671`), donc pas de score périmé.
- Le test `partieDuJourService.test.js` couvre le service ; la garde de l'effet n'a pas de
  test de composant (couvert par le futur `jeux.spec.js` du lot B2).

### 1.2 « Rejouer » sur l'écran de fin : fonctionne, mais rejoue le même tirage — plus tard (décision produit)

- `Jeux.jsx:782-789` : `rejouer` fait `setPartie(RAPIDES[chapitre.rapide]())`. Pour `jour`,
  `chapitre.rapide` reste `'jour'` : la rejouée **est** encore une partie du jour. Nouveau tableau
  `partie`, donc la garde de 1.1 laisse repasser l'enregistrement.
- Effet sur les stats (test `service.test.js › rejouer`, vert) : le jour n'est pas compté deux
  fois (`jours` reste `['2026-10-23']`, série 1), `scores[jour]` = max des tentatives (une rejouée à
  400 ne l'écrase pas, une à 1500 le remplace), `record` = max.
- Conséquence : le tirage du jour est **identique** à chaque rejouée (test
  `determinisme.test.js`, même JSON). L'élève apprend les réponses et gonfle son « score du jour » et
  son record ; la mesure PostHog `partie_terminee` envoie `record: true` à chaque amélioration.
  Aucune incidence sur la série, mais le « compare avec les copains » (commentaire en tête de
  `partieDuJourService.js`) perd son sens.
- Correctif proposé (si Johan veut le meilleur score non rejouable) : `Jeux.jsx:784` et
  `HubJeux.jsx:72`, quand `jour.faite`, lancer `melange` au lieu de `jour` (le libellé « Rejouer »
  du hub devient « Partie rapide »). Risque : faible, mais change la promesse « rejoue ».

### 1.3 Abandon en cours de partie : OK pour l'essentiel, une fuite étroite — plus tard

- `Jeux.jsx:705-712` : la croix remet `phase = 'choix'` et envoie `partie_abandonnee` ; rien n'est
  enregistré (l'effet 1.1 ne s'exécute que sur `fin`). Les minuteries internes de chaque jeu
  (`vider()` à l'unmount, `Ninja.jsx:244`, `Taupe.jsx:188`, `Pizzeria.jsx:236`,
  `RevizSeTrompe.jsx:177`) sont bien nettoyées.
- Fuite : les `setTimeout` de `Jeux.jsx:669-688` (`onTermine`, 650 ms puis la transition) et ceux
  de `JeuLance.jsx:215-239` et `Jeux.jsx:401-412` (magie) ne sont jamais annulés. Si l'élève touche la croix dans
  les ~0,65 s qui suivent la dernière réponse, `setPhase('fin')` ou `setPhase('consigne')`
  arrive après coup : l'écran de fin d'une partie « abandonnée » apparaît, et pour la partie du jour
  elle est enregistrée. Fenêtre étroite (la transition couvre ensuite tout l'écran en
  `position: fixed; z-index: 1000`, `TransitionJeux.css:7`).
- Aussi : quitter `/jeux` pendant la transition laisse jouer `jouer('glisse')`/`jouer('jingle')`
  jusqu'à 7,5 s sur la page suivante (`auto` à `Jeux.jsx:686`).
- Correctif : garder les identifiants dans un `useRef([])` (`plus(ms, f)` comme dans les jeux),
  les vider dans `fermer` (`Jeux.jsx:705`) et dans le cleanup de `Jeux.jsx:605`. Risque : faible ;
  vérifier que `derouler` (`Jeux.jsx:679-684`) ne laisse pas `transition` bloqué après annulation
  (remettre `setTransition(null)`).

### 1.4 Série, jour sauté, minuit, changement d'heure : OK (un cas limite)

Preuves (`service.test.js`, tout vert) :
- `serieDe(['2026-10-22'], '2026-10-23') = 1` : la série tient si on a joué hier et pas encore
  aujourd'hui ; `serieDe(['2026-10-21'], '2026-10-23') = 0` : un jour sauté la remet à zéro.
- `jourParis` bascule à 00:00 heure de Paris : 21:59 UTC → `2026-10-24`, 22:00 UTC → `2026-10-25`
  (CEST), 22:59 UTC → `2026-10-25`, 23:00 UTC → `2026-10-26` (CET, après le changement d'heure du
  25/10). La série traverse les deux changements d'heure (`jourAvant` calcule à 12:00 UTC).
- Cas limite : `enregistrerPartieDuJour(uid, score)` évalue `jourParis()` **à la fin** de la partie
  (`Jeux.jsx:611` n'envoie pas de jour). Une partie tirée à 23:59 et finie à 00:01 compte pour le
  lendemain (test « minuit pendant une partie » : `jour = 2026-10-24`) alors que le tirage était
  celui de la veille. Sans gravité réelle (un élève qui joue à minuit).
- Même cause côté hub/accueil ouverts toute la nuit : le hub garde `jour` en état jusqu'au
  prochain `phase === 'choix'` (`Jeux.jsx:628`), l'accueil le mémorise sur l'uid seul (voir 1.6).
- Correctif (cas limite) : mémoriser `jourParis()` dans `lancerRapide` (`Jeux.jsx:~570`,
  `chapitre.jour`) et le passer en 3e argument de `enregistrerPartieDuJour` (`Jeux.jsx:611`). Risque
  nul.

### 1.5 Record sur le hub et sur la carte de début : OK, mais deux « records » pour la partie du jour — plus tard

- À jour sans recharger : `Jeux.jsx:612` (`setJour(nouveau)`) puis `Jeux.jsx:628`
  (`setJour(etatDuJour(uid))` au retour sur `choix`) ; la carte lit `jour.record` (`Jeux.jsx:735`).
- Mais l'écran de fin (`FinDePartie.jsx:338-344`) calcule « Meilleur » et « Nouveau record ! » sur
  une clé locale distincte, `reviz-jeux-record-jour` (`Jeux.jsx:792`), non synchronisée et non
  séparée par compte. Après synchro sur un nouvel appareil le hub affiche 9 000 pendant que le podium
  affiche « Meilleur : 3 000 » ; deux comptes sur un même appareil partagent ce record de podium.
- Correctif : passer à `FinDePartie` le record issu du service quand `chapitre.rapide === 'jour'`
  (`Jeux.jsx:790-793` : `record={{ meilleur: ..., nouveau: nouveau.nouveauRecord }}`), ou préfixer la clé par
  l'uid. Risque : faible.

### 1.6 L'accueil voit la partie faite : OK au retour et après rechargement, périmé la nuit — plus tard

- `Home.jsx:125` : `useMemo(() => etatDuJour(uid), [uid])`. La navigation `/jeux` → retour remonte
  l'accueil (route démontée), donc le calcul est refait : OK même onglet. Après rechargement : lit
  `localStorage` : OK.
- Défauts : (a) une app laissée ouverte (PWA) passé minuit montre encore « Faite ! » et cache la
  suggestion « La partie du jour est prête » (`Home.jsx:292`) ; (b) l'accueil n'appelle jamais
  `synchroniserStats` : sur un nouvel appareil, la série n'apparaît qu'après un passage sur `/jeux`
  (et `streak` à `Home.jsx:126` n'inclut pas les jours du compte) ; (c) si le jour vient d'un autre
  appareil, le score est `null` et l'accueil écrit « Faite !  points. » (`Home.jsx:427`).
- Correctif : (a) ajouter `document.visibilityState` / `jourParis()` en dépendance du `useMemo`
  (`Home.jsx:125`) ; (b) appeler `synchroniserStats(uid).then(...)` dans l'effet de `Home.jsx:113`
  et recalculer ; (c) `jourJeux.score != null ? ... : 'Faite !'` (`Home.jsx:427`) et
  `HubJeux.jsx:68` (voir 1.8).

### 1.7 Invité qui crée ensuite un compte : la série est perdue — avant le gel

- Preuve : `service.test.js › invité -> compte` : deux jours joués avec `invite-xyz` (série 2),
  `migrateGuestLocalData('invite-xyz', 'uid-reel')`, puis `serie = 0` pour `uid-reel` ; la clé
  `reviz-jeux-jour-invite-xyz` reste orpheline.
- Cause : `guestService.js:67-70` (`MIGRATED_PREFIXES`) n'a pas `reviz-jeux-jour-` ; la clé est
  `reviz-jeux-jour-${uid}` (`partieDuJourService.js:37`). De plus la migration ne renvoie rien
  vers Firestore pour les jeux (`AuthContext.jsx:490-494` ne pousse que leçons et révisions).
- Correctif : (1) ajouter `'reviz-jeux-jour-'` à `MIGRATED_PREFIXES` ; comme le compte neuf n'a pas
  encore de clé la copie directe suffit, sinon fusionner les `jours` comme pour les leçons
  (`guestService.js:89-97`) ; (2) après la migration (`AuthContext.jsx:~494`), appeler une version de
  `synchroniserStats` qui **pousse** (voir 1.8). Risque : faible, la fusion est idempotente.
  Test à ajouter : miroir exact de `service.test.js › invité -> compte`, attendu `serie = 2`.

### 1.8 Synchro entre appareils : trois défauts — avant le gel

Preuves (`service.test.js`) :
1. **Score du jour absent** : après `synchroniserStats`, `etatDuJour` donne
   `{ faite: true, score: null, serie: 1, record: 9000 }`. `synchroniserStats`
   (`partieDuJourService.js:101-105`) fusionne `jours` et `record` mais ne transporte pas `scores`.
   Le hub affiche « Ton score : 0 » (`HubJeux.jsx:68`, `score ?? 0`) et l'accueil « Faite !  points. ».
2. **Le record du compte peut être écrasé par un plus petit** : si la lecture échoue au démarrage
   (hors ligne, `catch` silencieux ligne 106) puis qu'on joue, `updateDoc(..., { 'jeux.record': 300 })`
   (ligne 89) remplace le 9 000 du serveur (le test voit `'jeux.record': 300`).
3. **Rien n'est renvoyé vers le compte** : la synchro est à sens unique (compte → appareil) ; un
   `updateDoc` raté (`.catch(() => {})`, ligne 89) ou des jours joués hors ligne ne repartent jamais
   (test : après `synchroniserStats`, zéro `updateDoc`). Fusion des jours et du record : OK dans
   l'autre sens (`[...new Set(...)]`, `Math.max`).
- Règles `firestore.rules:35` : `allow update: if isOwner && billingUnchangedOnUpdate() &&
  auraUnchangedOnUpdate()`. `jeux` n'est dans aucune liste de champs verrouillés
  (`billingFields`, `auraFields`) et `diff().affectedKeys()` d'une écriture `jeux.jours` /
  `jeux.record` ne contient que `jeux` : **l'écriture est acceptée**. `updateDoc` échoue seulement si
  le document `users/{uid}` n'existe pas (rattrapé par le `catch`). Le lot B2 le confirmera dans
  l'émulateur ; je ne l'ai pas rejoué (pas de compte test créé).
- Correctif proposé dans `partieDuJourService.js` :
  - `synchroniserStats` : après la fusion, si le local contient des jours ou un record que le compte
    n'a pas (`j.jours` / `j.record`), faire un `updateDoc` avec `arrayUnion(...manquants)` et
    `Math.max`. Reprendre aussi un dernier score : écrire `'jeux.dernier': { jour, score }` à chaque
    fin et, à la synchro, remplir `scores[jour]` si absent (le `jour` est une chaîne sans point, donc
    pas de souci de chemin Firestore).
  - Ligne 89 : ne pas envoyer `jeux.record` seul ; faire `getDoc` → `max` → `updateDoc` (ou un
    drapeau `s.enAttente` rejoué à la prochaine synchro). Une `runTransaction` est la version propre.
  - `HubJeux.jsx:68` et `Home.jsx:427` : masquer le score s'il est `null`.
- Risque : modéré (écritures supplémentaires sur `users/{uid}`, donc relire les règles et ajouter
  des tests : hors ligne puis en ligne, deux appareils, record plus petit).

### 1.9 `avecHasardDuJour` et le « même tirage pour tous » : OK

- `partieDuJourService.js:31-35` remplace `Math.random` le temps d'un appel synchrone et le
  restaure dans `finally` (test : restauré même si la fabrique lève). En JavaScript rien d'autre ne
  s'exécute pendant ce temps ; une fabrique qui deviendrait **asynchrone** retomberait sur le vrai
  hasard sans erreur (test `determinisme.test.js › une fabrique asynchrone` : `Math.random === vrai`).
  Aujourd'hui `partieMelangee()` (`Jeux.jsx:107`) est synchrone.
- Même tirage pour tous : `partieMelangee()` ne dépend ni de la classe, ni de la langue, ni de
  données chargées : `themesJeux.js`, `fautesNinja.js`, `taupes.js`, `commandesPizzeria.js`,
  `affirmationsJeux.js` sont des banques statiques. Test : trois exécutions donnent le même JSON
  (6 959 caractères), même avec un `Math.random` truqué ; le lendemain donne un autre tirage.
  Tirage du 23/10 : taupe, buzzer, magie, lance, ninja, pizzeria. Les `Math.random` restants
  (`Ninja.jsx:288-294`, `Pizzeria.jsx:91`, `RevizSeTrompe.jsx:161`) sont visuels.
- Réserve : la graine ne dépend que de la date, pas de la version du code. Après une mise à jour qui
  change une banque, le tirage d'un jour change, et deux élèves (cache périmé / à jour) ne jouent pas
  la même partie ce jour-là. Aussi, le jour vient de l'horloge de l'appareil : décaler l'heure
  permet de fabriquer une série (`arrayUnion` d'une date quelconque). Sans enjeu tant qu'il n'y a pas de
  classement. Plus tard.

### 1.10 Couverture de test existante

`partieDuJourService.test.js` couvre : tirage identique / lendemain différent, restauration de
`Math.random`, série (hier, jour sauté, fin de mois), enregistrement + `updateDoc` + deux parties le
même jour, invité sans `updateDoc`, fusion à la synchro. Manquent : les cas des points 1.4 (minuit,
DST), 1.7, 1.8 (score, hors ligne, renvoi), `jourParis`. Les neuf tests de `service.test.js` du
scratchpad peuvent être repris tels quels (alias vers des fausses `firebase/firestore` dans la config
du scratchpad ; dans le dépôt, reprendre le `vi.mock` du fichier existant).

---

## 2. Chargement des jeux

Mesures (`du`, `afinfo`, `poids.test.js`, `build.log`) :

- `public/` 38 Mo ; `public/jeux` 13 Mo ; `public/pantin` 1,7 Mo. Les 15 plus gros fichiers sont
  les 7 musiques mp3 (2,1 / 2,1 / 1,4 / 1,4 / 1,3 / 0,6 / 0,24 Mo) puis des décors webp de 140 à 215 Ko
  (`pizzeria/comptoir-long`, `taupe/fond-paysage`, `taupe/fond`, `pizzeria/comptoir`, `lance/pupitre`,
  `buzzer/pupitre`, `buzzer/fond-paysage`, `buzzer/fond`). Aucun fichier d'image au-delà de 215 Ko.
- Avant le premier jeu (carte de début) : moteur du pantin 225 Ko de JS + 29 Ko de JSON + 69 pièces
  (439 Ko) + décor et costume du premier jeu (390 à 650 Ko) = **1,08 à 1,41 Mo** selon le jeu, plus le
  chunk gsap (~70 Ko). Rien n'est manquant (`prechargement.test.js` vert, 0 fichier manquant).
- Rien ne bloque l'affichage : `CarteDebut.jsx:51-52` précharge pendant la lecture, la jauge du
  bouton « Démarrer » n'est jamais bloquante. Les jeux suivants se chargent ensuite en arrière-plan
  (`prechargement.js:86-89`).
- Bundle : `Jeux-BYkvux5a.js` **178,6 Ko (58,3 Ko gzip)** + `Jeux-IvvKFVfg.css` 111,4 Ko (21,3 Ko gzip),
  chargé à l'ouverture de `/jeux` (route lazy, `App.jsx:57`). Les 6 jeux sont dans un seul chunk (pas de
  découpage par jeu : acceptable à cette taille). Accueil (avec `Pantin`) dans `index-CqKExs4e.js`
  184,6 Ko (64,6 Ko gz). Seul chunk > 500 Ko : `vendor-firebase` (519,7 Ko, 119,6 Ko gz), inchangé.
  Build en 20 s, vert.
- Conclusion : **OK**. Trois observations :
  1. *Les musiques ne sont pas préchargées et pèsent en mémoire décodée* (avant le gel). Chaque mp3
     est décodé entier (`decodeAudioData`) et gardé dans une variable de module (`tampon`) : durée ×
     48 000 × 2 × 4 octets, soit ~67 Mo pour le ninja (181 s), ~68 Mo pour Réviz lance (176 s), ~46 Mo
     pour la pizzeria, ~47 Mo pour la taupe, ~44 Mo pour la fin ; ~290 Mo si les sept sont passées dans une
     session. Risque de rappel mémoire sur iPhone ancien. Correctif : exporter un `liberer()` par module
     (`tampon = null; chargement = null`) et l'appeler dans le cleanup de `Jeux.jsx:605`. Risque : faible
     (rechargement du mp3 à la partie suivante, il est en cache SW).
  2. *Les images de l'écran de fin et des transitions ne sont pas préchargées*
     (`public/jeux/fin/*.webp` ~0,35 Mo, `public/jeux/transition/*.webp` 0,12 Mo) : elles se chargent au
     moment du podium et de la première transition (flash de fond possible). Correctif : ajouter ces
     deux listes à la phase d'arrière-plan de `prechargerPartie` (`prechargement.js:86-89`) et au test.
  3. *La musique du premier jeu est demandée en même temps que le préchargement* (`ouvrirCarte`,
     `Jeux.jsx:723-731`) ; sur une mauvaise 4G le mp3 de 2 Mo concurrence les pièces du pantin. Plus tard.

---

## 3. Audio iOS

Code lu : `utils/bruitages.js`, `utils/musique{Magie,Lance,Buzzer,Pizzeria,Ninja,Taupe,Fin}.js`.

### 3.1 Contexte créé et repris dans un geste : OK sur le chemin normal

- `ouvrirCarte` (`Jeux.jsx:723-731`) lance la musique dans le clic du hub : `contexteAudio()` crée
  l'`AudioContext` et appelle `resume()` à ce moment (`bruitages.js:23-29`), ce que le commentaire
  de `Jeux.jsx:722` documente pour Safari. De plus `bruitages.js:30-33` écoute `pointerdown`,
  `touchend`, `keydown` en capture et reprend un contexte `suspended`. Un seul contexte pour toute la
  page (bon pour la limite iOS).
- Défaut mineur : entrée par lien direct (`?rapide=...`), la musique démarre dans un effet, sans geste ;
  le contexte est créé `suspended` et les sons déjà programmés (`jouer`) partent tous ensemble à la reprise
  (l'horloge audio est figée). Correctif possible : ne rien programmer tant que `ctx.state !== 'running'`
  (`bruitages.js:35-38`). Plus tard.

### 3.2 État `interrupted`, arrière-plan, appel téléphonique : problème — avant le gel

- `bruitages.js:27` et `:31` ne testent que `ctx.state === 'suspended'`. Safari iOS passe en
  **`interrupted`** (appel, Siri, verrouillage, retour de l'arrière-plan) : jamais repris par le code,
  donc musique et bruitages restent muets jusqu'au rechargement. `grep` : aucun
  `visibilitychange`, `statechange`, `interrupted` dans les jeux ni `utils`
  (seuls `AuthContext.jsx:521` et `EmailBanner.jsx:36` écoutent `visibilitychange`).
- Autres plateformes (Android, ordinateur) : l'audio continue en arrière-plan (la musique tourne
  écran verrouillé) et le séquenceur `boucle()` (ex. `musiqueNinja.js:105-111`,
  `while (prochaine < ctx.currentTime + 0.12)`) rattrape les pas manqués si le minuteur a été ralenti : il programme
  d'un coup toutes les notes en retard (salve sonore).
- Correctif (`bruitages.js`) : remplacer le test par `ctx.state !== 'running'` aux lignes 27 et 31
  (`resume()` accepte `interrupted`) ; ajouter dans le même fichier un
  `document.addEventListener('visibilitychange', ...)` : masqué → `ctx.suspend()`, visible →
  `ctx.resume()` ; et dans chaque `boucle()` : `if (prochaine < ctx.currentTime - 0.1) prochaine = ctx.currentTime + 0.05`
  (6 fichiers, une ligne chacun). Risque : faible. À vérifier sur iPhone réel (le simulateur
  ne reproduit pas l'interruption d'un appel).

### 3.3 Téléphone en mode silencieux — avant le gel

- Sur iOS, l'API Web Audio est coupée par le commutateur de sonnerie (WKWebView comme Safari), alors
  qu'un élément `<audio>` joue. Aucun `navigator.audioSession` dans le code (`grep` vide, y compris
  `ios/App/App`). Beaucoup de collégiens ont le téléphone en silencieux : les jeux seraient muets sans
  qu'ils sachent pourquoi.
- Correctif : au tout premier geste (`bruitages.js:31`), `if (navigator.audioSession) navigator.audioSession.type = 'playback'`
  (Safari 16.4+) ; pour les versions plus anciennes, lire en boucle un `<audio>` silencieux. Risque : le son
  jeu sort alors même téléphone en silencieux, ce qui est voulu pour un jeu mais à confirmer par Johan.

### 3.4 Son coupé par l'élève : respecté partout

- Bruitages : `jouer()` → `audio()` renvoie `null` si `actif` est faux (`bruitages.js:35-38`).
- Musiques : chaque `demarrer()` teste `sonActif()` ; `Jeux.jsx:597-603` arrête toutes les musiques
  si `son` est faux ; `musiqueFin.js:28` teste aussi. Le choix est mémorisé (`reviz-jeux-son`).
- Point d'ergonomie : le bouton son n'existe que dans les écrans de jeu (`boutonSon`,
  `Jeux.jsx:~808`), pas sur le hub, la carte de début ni l'écran de fin : impossible de remettre le son
  avant de lancer une partie. Plus tard.

### 3.5 Fuites : OK, deux courses étroites

- Démontage : `Jeux.jsx:605` arrête les sept musiques ; chaque jeu vide ses minuteries (1.3). Les
  nœuds de notes s'arrêtent d'eux-mêmes (`o.stop`), les gains des musiques sont déconnectés 500-600 ms
  après `arreter()`. Pas d'accumulation de nœuds constatée.
- Course (musiques mp3) : `arreter()` puis `demarrer()` pendant le **premier** téléchargement du mp3
  → les deux appels attendent `charger()`, passent `if (!flux.actif)` et créent chacun une source ;
  la première est orpheline (écrasée dans `flux.source`) et boucle sans fin sur un gain déjà
  déconnecté (`musiqueNinja.js:154-165`, même motif `musiqueFin.js:27-40`, `musiqueLance`,
  `musiqueBuzzer`, `musiquePizzeria`, `musiqueTaupe`). Cas réel : ouvrir la carte du ninja, revenir,
  rouvrir pendant le chargement de 2 Mo. Correctif : un compteur de génération (`const n = ++gen` avant
  l'`await`, `if (n !== gen || !actif) return` après). Plus tard.

---

## 4. Erreurs non attrapées

### 4.1 Promesses sans `.catch` : OK

Analyse AST de `src/` (hors tests et `dev/`) avec `@babel/parser` : 53 appels sans `await`/`catch`
signalés, tous faux positifs (`Set.add`, `classList.remove`, fonctions `async` à `try/catch` interne :
`chargerAgenda` `agendaService.js:44-58`, `syncFromFirestore` `historyService.js:155-172`,
`syncRevisionsFromFirestore`, `lancer` `Jeux.jsx:531-541`, `send`/`envoyer` du coach) sauf :
- `main.jsx:68` `import('@sentry/react').then(...)` sans `catch` : rejet non géré si le réseau tombe
  juste à cet instant (sans conséquence). Ajouter `.catch(() => {})`. Plus tard.
- Toutes les écritures Firestore (`setDoc`, `updateDoc`, `deleteDoc`) ont un `.catch`
  (`revisionService.js:30-32`, `historyService.js`, `retourService.js:56`,
  `partieDuJourService.js:89`). Les lectures du démarrage (`AuthContext.jsx:427-432`) aussi.
  Réserve : `partieDuJourService.js:89` avale l'erreur sans journal (voir 1.8).

### 4.2 `ErrorBoundary` et échec d'un chunk lazy après mise à jour : problème — avant le gel

- Un seul `ErrorBoundary`, au sommet (`App.jsx:145`), au-dessus de `BrowserRouter` : il n'y en a pas
  par route (`grep` : seuls `App.jsx` et le composant). Une erreur dans `Jeux` (ou un chunk qui ne
  charge pas) remplace **toute** l'app, barre de navigation comprise, par « Oups, quelque chose a
  planté ».
- Échec de chunk : les pages sont en `lazy()` (`App.jsx:38-63`). Après un déploiement, un onglet ou une PWA
  ouverts avant la mise à jour demandent `/assets/Jeux-<ancien hash>.js`. `vercel.json` (dernière
  réécriture : `/((?!api/)...).*` → `/index.html`) répond **200 avec du HTML** à la place du fichier
  disparu ; `X-Content-Type-Options: nosniff` fait refuser le module : l'import lève, l'`ErrorBoundary`
  s'affiche. Aucun gestionnaire `vite:preloadError` (`grep` vide) ni rechargement automatique.
  `ErrorBoundary.jsx:23-26` : le bouton « Retour à l'accueil » fait `window.location.href = '/'` (un
  rechargement complet) : l'élève s'en sort en un tap, mais le jour de la grosse mise à jour (2/11)
  c'est le chemin que prendront tous les onglets déjà ouverts.
- Pire : `public/sw.js:57-71` met en cache `response.ok` des `/assets/*` en cache-first ; la page HTML
  servie à la place du script y est donc mémorisée sous l'URL du chunk (inoffensif pour les nouveaux
  hashs, mais le SW n'est pas versionné par déploiement : `CACHE_NAME = 'reviz-v5'`).
- Correctif :
  1. `main.jsx` (avant le `render`, ligne ~46) :
     `window.addEventListener('vite:preloadError', e => { e.preventDefault(); if (!sessionStorage.getItem('reviz-rechargement')) { sessionStorage.setItem('reviz-rechargement', '1'); location.reload(); } })`
     et effacer le drapeau après 10 s de vie normale (évite la boucle) ;
  2. `ErrorBoundary.jsx` : `componentDidCatch` détecte `error.message` (« Failed to fetch dynamically
     imported module » / « error loading dynamically imported module ») et recharge une fois ;
  3. `sw.js:62` : ne mettre en cache que si `response.ok && response.headers.get('content-type')` n'est pas `text/html`
     pour `/assets/` ; bumper `CACHE_NAME` à chaque grosse mise à jour (à faire le 2/11 avec le
     déploiement) ;
  4. (optionnel) un `ErrorBoundary` par route dans `AuthRoutes` (`App.jsx:~102`) avec `key={location.pathname}`
     pour garder la barre de navigation.
  Risque : faible (le rechargement unique est gardé par `sessionStorage`) ; tester en ouvrant un onglet,
  déployant un nouveau build puis naviguant vers `/jeux`.

### 4.3 Moteur du pantin si un fichier manque : bon repli, un réessai bloqué — avant le gel / plus tard

- Fichier JSON obligatoire absent (`pantin3d.json`, `bras.json`, `caoutchouc.json`, lus par
  `public/pantin/moteur/reviz-rig3d.js:39-41`) : `RevizD1_3D.creer` rejette, `Pantin.jsx:255`
  (`.catch(() => setEchec(true))`) bascule sur `<Mascot>` : l'élève voit la mascotte fixe, les gestes
  des jeux sont ignorés (`pantin.current?.…`). Images de pièces manquantes : pas d'erreur (balises
  `<image>`), pièce invisible. Gestes `grandes/*`, `jambes`, `poses` : optionnels (`.catch(() => null)`
  aux lignes 48-61).
- **Un échec de chargement d'un script ne se rattrape pas** : `chargerScript` (`Pantin.jsx:22-37`)
  retrouve l'élément `<script data-pantin>` déjà ajouté mais en erreur (`dataset.charge` absent) et lui
  rajoute des écouteurs `load`/`error` qui ne se redéclencheront jamais. `chargerMoteur` remet bien
  `moteur = null` après un rejet (`Pantin.jsx:48`), mais le réessai suivant reste **en attente
  indéfiniment**. Preuve (`pantin.test.js`) : 1er essai « rejeté », 2e essai « EN ATTENTE » après 500 ms, 1 script
  resté dans le DOM. Effet : après un réseau instable, la mascotte et la jauge de la carte de début
  restent figées (la jauge ne bloque pas « Démarrer ») jusqu'au rechargement de l'app.
- Correctif : `Pantin.jsx:26-28`, dans `s.onerror = () => { s.remove(); ko(); }` et traiter `deja` en erreur
  comme absent (`if (deja && !deja.dataset.charge && deja.dataset.erreur) deja.remove()`). Risque : très
  faible.
- Cache périmé du moteur : `public/sw.js:58` met en cache-first **à vie** tout `request.destination
  === 'script'` ; les 9 scripts de `/pantin/moteur/` ne sont pas hachés. Le moteur est nouveau dans cette
  branche (117 fichiers ajoutés vs `main`), donc aucun souci au premier déploiement, mais tout
  correctif ultérieur du moteur n'atteindra jamais les élèves qui ont déjà le SW (alors que `Pantin.jsx`,
  lui, sera à jour : décalage de version). Correctif : `chargerScript(BASE + 'moteur/' + s + '?v=' + __BUILD_ID__)`
  (définir un `define` dans `vite.config.js`) ou bumper `CACHE_NAME` à chaque modification de
  `public/pantin/moteur`. Risque : faible. Avant le gel.

---

## 5. Autres points fragiles

### 5.1 Aucune pause quand l'app passe en arrière-plan — avant le gel

- `Jeux.jsx:638-644` : le chrono du tour est un `setTimeout` calé sur `performance.now()`
  (`chrono.fin`). Pendant un appel ou un changement d'app, le temps continue : au retour, la manche est
  déjà expirée (le jeu a perdu des points, parfois un tour entier). Ninja / Taupe / Pizzeria calculent
  leurs positions à partir de `performance.now() - debut` (`Ninja.jsx:238-262`, `Taupe.jsx:182-204`) :
  `requestAnimationFrame` se fige en arrière-plan puis tous les fruits ont « passé » d'un coup au retour.
- Correctif : dans `Jeux.jsx`, un effet `visibilitychange` : masqué pendant `phase === 'jeu'` →
  `horloge.pause()` (existe déjà, `Jeux.jsx:506-511`) + écran « Pause, touche pour reprendre » ; les
  jeux à moteur propre doivent soit lire `horloge.reste()` soit être relancés. Version simple et sûre :
  masqué plus de 2 s en phase `jeu` → retour au hub (`setPhase('choix')`) avec `partie_abandonnee`.
  Risque : moyen pour la version « vraie pause » (4 jeux), faible pour l'abandon.

### 5.2 Quitter `/jeux` par le geste « retour » pendant une transition — plus tard

Voir 1.3 : sons et `setState` sur un composant démonté (sans avertissement en React 18).
`FinDePartie.jsx:104-110` : les trois `setTimeout` du podium ne sont pas annulés au démontage
(carillon d'étoiles après « Quitter »). Correctif : les ranger dans un `useRef` et les vider dans un
cleanup. Risque nul.

### 5.3 La croix du hub sort de l'app si l'entrée était un lien direct — plus tard

`Jeux.jsx:707` et `Jeux.jsx:739` : `navigate(-1)`. Un lien `?rapide=...` ouvert depuis TikTok ou
Instagram (bio `revizapp.fr/t`) n'a pas d'historique d'app : la croix ramène à TikTok. Correctif :
`window.history.length > 1 && location.key !== 'default' ? navigate(-1) : navigate('/')`.

### 5.4 Écritures répétées sur `localStorage` corrompu — plus tard

`lireStats` (`partieDuJourService.js:41`) fusionne avec `vide()` mais une valeur `null` (`"jours":null`) écrase
le défaut et ferait lever `s.jours.includes`. Improbable. Ajouter `Array.isArray` si on touche le fichier.

### 5.5 Mesure : `jeux_ouvert` part avant la fin de la synchro — plus tard

`Jeux.jsx:621-626` envoie `serie` / `partie_du_jour_faite` avec l'état local, avant que
`synchroniserStats` (`Jeux.jsx:460-464`) ait répondu : sur un nouvel appareil la série mesurée est 0.

---

## Ordre de correction proposé (avant le gel)

1. **A / 4.2** : `vite:preloadError` + garde du SW + `CACHE_NAME` (`main.jsx`, `ErrorBoundary.jsx`, `public/sw.js`).
2. **B / 3.2, 3.3** : `bruitages.js` (`!== 'running'`, `visibilitychange`, `audioSession`) + clamp dans les 6 `boucle()`.
3. **C + D / 1.7, 1.8** : `guestService.js`, `partieDuJourService.js` (synchro à double sens, score repris), `HubJeux.jsx:68`, `Home.jsx:427`.
4. **E / 4.3** : `Pantin.jsx:22-37` et `?v=` du moteur.
5. **F / 5.1** : pause ou abandon propre en arrière-plan.
6. Mémoire des mp3 (`liberer()`), précharger fin et transition, annulation des minuteries de `onTermine`.

Tests à ajouter au dépôt avec ces correctifs : `service.test.js` (scratchpad) repris dans
`partieDuJourService.test.js` (minuit, DST, invité, score, hors ligne, renvoi), un test de
`chargerScript` après échec (`Pantin`), et dans le lot B2 : `users/{uid}.jeux` écrit dans l'émulateur
(confirme la règle de 1.8) et partie du jour rejouée sans double compte.
