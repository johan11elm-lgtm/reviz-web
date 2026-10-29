# Plan — Réviz IA en agent : la meilleure IA de révision du collège

_Rédigé le 2026-10-28, à la demande de Johan. Statut : proposition, rien n'est codé, décisions en fin de document. Avis de Codex dans `../REVIZ-IA-AGENT-2026-10-28-avis-codex.md`._

## 1. L'idée

Aujourd'hui, Réviz IA ne répond qu'à partir d'une leçon ouverte. Demain, elle est sur l'accueil, elle connaît l'élève (ses contrôles, ce qu'il a raté, ce qu'il a révisé) et elle agit dans l'app à sa place : noter un contrôle avec son plan, lancer la bonne révision, dessiner un schéma. Elle ne fait jamais les devoirs.

Le pari est d'être la meilleure IA de révision du collège, devant ChatGPT et Nono (Nomad, sorti le 28/10). « Meilleure » se mesure sur cinq points :

1. **Juste et au niveau.** Elle s'appuie sur les 383 chapitres relus du programme, là où ChatGPT répond large et se trompe de niveau.
2. **Elle connaît l'élève.** Elle sait quels contrôles arrivent et ce qu'il a raté hier. ChatGPT ne le sait pas, et Nono ne voit que les évaluations et la moyenne.
3. **Elle agit.** Elle crée le plan, lance le quiz, ouvre le chapitre, sous forme de cartes que l'élève valide.
4. **Elle dessine.** Elle fait des frises, des cartes mentales et des cycles, dessinés par nos composants.
5. **Elle fait travailler.** Elle demande d'abord une tentative, puis donne un indice, puis corrige.

Sa première tâche est le retour du lendemain, qui est le verrou n° 1 du plan de scaling : un contrôle noté, une séance aujourd'hui, une reprise demain. C'est ce qui la fait entrer dans le gel jusqu'au 30/11.

## 2. Ce qui existe déjà (origin/main 8b113c3)

- **Plan de révision** (`utils/planRevision.js`) : flashcards à J-5, quiz sur les erreurs à J-3, contrôle blanc à J-1. Une étape manquée se rattrape. Il affiche « Prêt », « En bonne voie » ou « Pas encore prêt ». Il est offert pour le premier contrôle (`agenda.planOffert`), et les rappels sont branchés.
- **Contrôles** avec chapitres obligatoires et cours scannés (`services/controleChapitres.js`), et mode contrôle (`/controle?c=`).
- **Refaire mes erreurs** (`services/erreursService.js`) : les questions ratées sont gardées par leçon, **sur l'appareil seulement** (localStorage).
- **Données en ligne** : l'agenda dans `users/{uid}.agenda`, les révisions dans Firestore (`revisionService`), les cours scannés dans `users/{uid}/lessons`.
- **Programme** : 383 chapitres dans `src/data/programme`.
- **Carte mentale** (`pages/MindMap.jsx`) : elle dessine des branches à partir d'un JSON.
- **Rappels** : un mail à J+1 (`api/_rappels.js`) et des rappels sur l'appareil (`reminderService`).
- **Réviz IA** (`api/chat.js`) : appel direct à l'API sans le SDK, Claude Haiku 4.5, texte seul. Elle exige une leçon et n'a aucun outil. Quotas : 10 messages par jour en gratuit, 200 avec Réviz+.
- **Barre de recherche de l'accueil** : un simple lien vers `/programme`.

L'agent n'a donc presque rien à inventer côté révision. Il devient la porte d'entrée vers des briques qui existent déjà.

## 3. Ce que l'élève voit

### Sur l'accueil

La barre de recherche devient un vrai champ. Quand l'élève tape :
- les chapitres qui correspondent s'affichent tout de suite, par une recherche locale dans le programme et ses cours scannés, sans IA ;
- en première ligne, « Demander à Réviz IA : … » apparaît quand la saisie ressemble à une question ou une demande.

Sous le champ, trois suggestions qui changent selon la situation : « J'ai un contrôle », « Je fais quoi ce soir ? », « Explique-moi… ».

### Ce qu'elle sait faire en V1

1. **Noter un contrôle.** L'élève tape « contrôle de svt jeudi prochain sur la digestion ». Elle propose une carte : « Contrôle de SVT, jeudi 5 novembre, chapitre : La digestion et l'absorption des nutriments », avec deux boutons, [Ajouter] et [Modifier]. Ajouter ouvre la feuille existante, pré-remplie, puis le plan et les rappels suivent tout seuls.
2. **Je fais quoi ce soir ?** Elle regarde le contrôle le plus proche et l'étape du plan, les erreurs récentes et ce qui a été révisé. Elle fait une recommandation et propose une carte [Commencer] : « Ton contrôle de SVT est jeudi. Ce soir : les flashcards de la digestion, 5 minutes. »
3. **Expliquer le cours** à partir du chapitre relu, pas de connaissances en vrac, puis proposer de s'entraîner avec une carte [Quiz de ce chapitre].
4. **Bats ton toi d'hier.** Le lendemain d'une séance avec des erreurs, l'accueil et le mail J+1 proposent : « Hier, tu as raté 3 questions sur les fractions. On réessaie ? » L'élève fait trois questions, puis se compare à lui-même (« hier 1 sur 3, aujourd'hui 3 sur 3 »), sans classement. Cette fonction s'appuie sur `erreursService`.
5. **Schémas**, juste après la V1 : frise, carte mentale, cycle, cause et conséquence, tableau à deux colonnes. L'IA renvoie une structure, nos composants la dessinent en partant de MindMap.

### Ce qu'elle refuse

- **Faire un devoir à la place de l'élève.** Elle demande une tentative, donne un indice, puis corrige.
- **Dire « tu es prêt »** à partir de quelques réponses. Le verdict reste celui du plan (`etatPreparation`, calculé dans le code).
- **Inventer un chapitre.** Elle choisit dans le programme de la classe ou dans les cours scannés, sinon elle demande.
- **Le hors-sujet.** Elle ramène vers la révision, comme le coach actuel.

## 4. Prouver qu'elle est la meilleure : le banc d'essai

On mesure où on en est avant d'écrire une ligne de code.

- **40 vraies demandes de collégiens**, écrites comme un élève les tape (fautes et abréviations comprises) :
  - 12 questions de cours, de la 6e à la 3e, toutes matières ;
  - 6 « explique plus simple » ;
  - 6 demandes de contrôle ou de plan ;
  - 6 « je fais quoi » ;
  - 5 devoirs à faire à sa place (une rédaction, un exercice de maths) ;
  - 5 demandes de schéma.
- **Les concurrents** : Réviz IA (la version actuelle, puis chaque nouvelle version) et ChatGPT sans compte (méthode `?q=` du baromètre). Chez Nomad, vérifié le 28/10 dans l'app web connectée (v3.34.0) :
  - le « compagnon » Nono n'a que trois compétences (aide, menu rapide, son), sans conversation ;
  - **Nomad'IA** se présente comme une conversation avec « Ton coach ». L'élève choisit une matière, puis une photo, un PDF ou « Écrire le sujet » (exemples proposés : « Fais-moi réviser… », « Explique-moi simplement… »). Elle répond par un chapitre généré en 1 min 30 environ : mini-cours, quiz, paires et flashcards, en partant de « contenus Nomad faits par nos profs » complétés par l'IA. Elle ne répond pas à la question posée, elle fabrique un chapitre.
  - Nomad'IA est gratuite **une fois par mois**. Elle entre donc dans le banc sur une seule demande par relevé (n° 13 le 28/10, avec l'essai gratuit de Johan).
- **Un élève fictif** pour les demandes qui supposent de le connaître : un agenda, des erreurs et des révisions, le même pour tout le monde. On donne ce contexte à ChatGPT et à Nono dans le message, ce qui les met dans leur meilleur cas.
- **La notation** : cinq critères notés de 0 à 2, soit une note sur 10 par réponse.
  - Juste.
  - Au niveau du programme de la classe.
  - Fait travailler (ne donne pas le devoir tout fait).
  - Utile tout de suite (une action, un plan, un schéma).
  - Ton clair et court.
- **Le correcteur** : Claude Sonnet 5.5 avec une grille écrite. Johan relit 10 réponses au hasard pour vérifier qu'il est d'accord avec le correcteur.
- **Un filet contre les régressions** : le banc est rejoué à chaque changement de prompt ou de modèle, et une fois par mois contre Nono et ChatGPT.
- **Les fichiers** : `scripts/banc-ia/`, avec `questions.json`, `grille.md`, `lancer.mjs` et `resultats/AAAA-MM-JJ.json`. Un passage coûte quelques centimes.
- **L'objectif** : Réviz IA en tête sur la moyenne et dans chaque catégorie. Sur les questions de cours pures, ChatGPT reste fort. Si on gagne nettement, ça devient un argument (« testé sur 40 questions d'élèves »), en publiant la méthode plutôt qu'un chiffre invérifiable.

### Premier relevé (28/10)

Le détail est dans `scripts/banc-ia/resultats/2026-10-28/bilan.md`. Sur les 35 demandes communes, Réviz IA actuelle (Haiku 4.5) a 7,8 et ChatGPT sans compte 7,4, soit presque l'égalité. ChatGPT a fait les 5 devoirs à la place de l'élève.

- **Où Réviz IA gagne** : les devoirs (9,0 contre 5,6), les plans de contrôle (8,3 contre 6,2) et le ton.
- **Où elle perd** : la justesse (une erreur de physique, des erreurs de date) et « Utile tout de suite » (elle finit par une question au lieu d'une action).

Ce que ça change pour la suite :
- l'étape 1 doit relever la justesse ;
- les dates viennent du code ;
- chaque réponse se termine par une action.

## 5. Comment c'est construit

### Un seul point d'entrée

Le compte Vercel Hobby plafonne à 12 fonctions, et on y est : `api/` en compte 12. L'agent passe donc par `api/chat.js`. Sans `lessonId`, c'est le mode agent ; avec, c'est le coach de leçon actuel, qui profite des mêmes outils.

### Le modèle

- **Claude Haiku 5.5** (`claude-haiku-5-5`) : 0,10 $ en entrée et 0,50 $ en sortie par million de tokens, dix fois moins cher que Haiku 4.5.
- **Points de vigilance** (documentation Anthropic) :
  - la réflexion adaptative est active par défaut, donc on règle l'effort au plus bas pour garder des réponses rapides ;
  - le préremplissage de la réponse et les paramètres d'échantillonnage renvoient une erreur 400 ;
  - le nouveau découpage du texte compte environ 30 % de tokens en plus ;
  - le modèle peut refuser de répondre (`refusal`) sans solution de repli côté serveur, donc il faut prévoir un message dans l'interface.
- **Passage au SDK officiel** `@anthropic-ai/sdk` : il est déjà dans `devDependencies`, il faut le passer dans `dependencies`. Il remplace l'appel direct, ce qui rend la boucle d'outils et le streaming plus sûrs.
- Le banc dira si Haiku 5.5 suffit. Sinon, on passe à Sonnet 5.5 (2 $ / 10 $) pour les seules questions de cours difficiles, et seulement chiffres à l'appui.

### Les outils de lecture, exécutés sur le serveur

| Outil | Ce qu'il renvoie | Source |
|---|---|---|
| `mes_controles` | contrôles à venir, chapitres, étapes du plan faites | `users/{uid}.agenda` |
| `mes_revisions` | les 10 dernières révisions (chapitre, format, score, jour) | Firestore (`revisionService`) |
| `chercher_chapitre` | les chapitres de la classe qui correspondent, avec leur id | `src/data/programme` |
| `lire_chapitre` | le contenu relu d'un chapitre ou d'un cours scanné | programme, `users/{uid}/lessons` |
| `mes_cours_scannes` | titres et matières des cours scannés | `users/{uid}/lessons` |

Les erreurs de quiz ne sont que sur l'appareil. L'app les joint donc à la demande : les énoncés ratés des 7 derniers jours, 30 au plus. La V1 ne change pas les règles Firestore, qui sont ton domaine. Plus tard, on pourra les copier dans `users/{uid}` pour que le mail J+1 puisse les citer.

### Les actions : des cartes, jamais d'écriture directe

L'IA n'écrit rien dans le compte. Elle propose, l'élève valide, et c'est l'app qui agit avec le code existant.

| Carte | Ce que la validation déclenche |
|---|---|
| `proposer_controle` { matière, date, chapitres, intitulé } | la feuille « Ajouter un contrôle » pré-remplie, puis `agendaService`, le plan et les rappels |
| `proposer_revision` { chapitre, format : flashcards, quiz, résumé, carte, contrôle blanc ou erreurs } | l'écran existant |
| `dessiner_schema` { type, titre, éléments } (V2) | le composant Schéma |

Le serveur vérifie chaque carte avant de l'envoyer : le chapitre existe dans la classe de l'élève, la date est dans le futur et à moins de 6 mois, le format est connu. Une carte invalide repart une fois vers l'IA avec l'erreur. Si elle est encore invalide, l'IA répond sans carte.

Pour les dates, on donne à l'IA la date du jour et le jour de la semaine (heure de Paris). La carte affiche la date en toutes lettres pour que l'élève la confirme.

### Le flux

Le serveur relaie déjà le texte au fil de l'eau. On ajoute deux types d'événements : `carte`, et `outil` (« Je regarde ton agenda… ») pour que l'attente se voie. On plafonne à 4 tours d'outils par message.

### Ce qu'on envoie au modèle (élèves mineurs)

On envoie le minimum : la classe, les matières, les intitulés de contrôles et de chapitres, les dates, les énoncés ratés et les scores. On n'envoie jamais le prénom, l'e-mail, l'établissement, le lien Pronote ni l'âge exact. Les nouvelles notifications ne montrent rien de scolaire dans leur texte visible (« Ta révision du jour t'attend »).

### Quotas et coût

- **Estimation, à mesurer** : une demande avec 2 ou 3 tours d'outils coûte environ 0,3 centime au pire, moins avec la mise en cache du prompt. Avec 10 messages par jour, ça fait au plus 3 centimes par élève actif et par jour.
- **Quotas** : on garde ceux d'aujourd'hui (10 messages par jour en gratuit, 200 avec Réviz+). Un message correspond à une demande de l'élève, quel que soit le nombre de tours d'outils.

## 6. Ordre de construction

Chaque étape est testée (tests unitaires et e2e) et le banc est rejoué. La mise en prod se fait sur ton feu vert.

0. **Banc d'essai.** Il donne la référence, rien ne change dans l'app.
1. **Moteur.** `chat.js` passe au SDK et à Haiku 5.5, sur le coach de leçon actuel et sans nouvelle fonction. Le banc ne doit pas baisser. Cette étape peut partir en prod seule.
   **Fait le 28/10** sur la branche `reviz-ia-haiku55`, pas encore en prod. Ce qui a changé :
   - Haiku 5.5 en effort bas, et une requête commune (`buildChatRequest`) pour la prod, le développement local et le banc ;
   - les jours qui viennent sont calculés par l'app et donnés au modèle ;
   - chaque réponse se termine par une chose à faire ;
   - de nouvelles consignes de justesse ;
   - un message pour l'élève quand le modèle refuse ;
   - la mise en cache du prompt.

   Au banc, Réviz IA passe de 7,2 à 9,4 et bat ChatGPT sur 32 des 35 demandes communes, avec 3 égalités et aucune défaite. Le coût est divisé par cinq environ (`scripts/banc-ia/resultats/2026-10-28-etape1/bilan.md`).
2. **Agent.** Le mode sans leçon, les outils de lecture et les cartes de contrôle et de révision. Réviz IA s'ouvre sans leçon : l'écran vide actuel (« Réviz IA répond à partir d'une leçon… ») disparaît.
   **Fait le 29/10** sur la même branche, pas encore en prod. Ce qui a été construit :
   - **Où vit le code :** `src/utils/agent.js` contient les outils, le prompt et la vérification des cartes, en code pur partagé avec le banc ; `api/_agent.js` contient les sources (Firestore, programme embarqué avec la fonction) et la boucle d'outils, avec 4 tours au plus.
   - **Le serveur :** `api/chat.js` passe en mode agent quand il n'y a pas de `lessonId`.
   - **L'écran :** `/coach` sans leçon affiche ce que l'agent regarde et ses cartes. « Ajouter » appelle `ajouterControle`, « Modifier » ouvre la feuille de l'agenda déjà remplie, « Commencer » ouvre le chapitre, les erreurs ou le contrôle blanc. On peut toujours revenir à une leçon.
   - **Le banc :** une option `--agent` lance l'élève fictif sans le contexte tapé.

   Au banc (`resultats/2026-10-29-etape2/bilan.md`), l'agent a 9,4 sur 10 et bat ChatGPT sur 34 des 35 demandes communes. Sur les 12 demandes où il doit retrouver le contexte lui-même, il a 9,2, contre 8,5 pour le coach de leçon à qui l'élève tape tout. Le coût est d'environ 0,35 centime par demande.
   - **À surveiller :** le correcteur connaît maintenant le plan calculé par l'app (sinon il comptait comme inventé ce que l'app sait vraiment), et le prompt a été corrigé après avoir lu ses critiques. La relecture de Johan reste la vraie vérification.
   - **Mesure en prod :** les événements PostHog `ia_carte_proposee` et `ia_carte_validee`.
3. **Accueil.** Le champ de recherche (local, plus « Demander à Réviz IA ») et les suggestions selon la situation.
   **Fait le 29/10** (`components/RechercheAccueil.jsx`) :
   - les chapitres s'affichent pendant que l'élève tape, trouvés par la même fonction que l'agent (`chercherChapitres`) ;
   - « Demander à Réviz IA » en première ligne, ou la touche Entrée, envoie la question à Réviz IA sans leçon, qui répond aussitôt ;
   - la suggestion selon la situation, c'est l'ouverture de Réviz IA (étape 4) et le raccourci du défi.
   - PostHog : `recherche_accueil`.
4. **Bats ton toi d'hier.** Une carte d'accueil le lendemain et le lien du mail J+1, avec trois questions et la comparaison.
   **Fait le 29/10** :
   - **le quiz** : en mode `?erreurs=1&defi=1`, il pose 3 des questions ratées, puis montre « Hier 0 / 3 → Aujourd'hui x / 3 » avec une phrase de Réviz ;
   - **trois portes d'entrée** : le raccourci « Bats ton toi d'hier » de l'accueil, qui remplace « Fais un quiz » quand il y a des erreurs de la veille ; Réviz IA qui parle la première ; le mail J+1, dont le lien `?via=rappel` lance le défi s'il reste des erreurs sur l'appareil, et le quiz du chapitre sinon ;
   - **Réviz IA parle la première** (`ouvertureAgent`, calculé dans l'app, sans appel au modèle) : sur « Toutes mes matières », elle ouvre sur les erreurs d'hier, sinon sur l'étape du jour du plan du contrôle le plus proche, avec sa carte. Une étape lancée de là est cochée comme depuis l'accueil, et l'ouverture fait partie de la conversation si l'élève répond ;
   - **PostHog** : `defi_ouvert` (avec `depuis` : accueil, ia ou rappel) et `defi_termine`.
5. **Schémas.** Cinq types, un composant de rendu et la carte `dessiner_schema`, aussi dans le coach de leçon.

**Après le 30/11** : l'interrogation orale pour le brevet, une mémoire longue des notions confondues (dans Firestore), « Demain, c'est toi le prof » et la mission duo, liée à la Battle.

## 7. Mesure

- **Événements PostHog** : `ia_ouverte` (origine : accueil, fiche ou mail), `ia_demande` (catégorie), `ia_carte_proposee` et `ia_carte_validee` (type), séance terminée après une carte, `bats_hier_propose` et `bats_hier_termine`.
- **Ce qui compte** : les séances terminées à J+1 et à J+7 chez les élèves qui ont utilisé l'agent, comparées aux semaines d'avant. On affiche les effectifs, pas seulement des pourcentages, puisqu'on a environ 110 comptes. Pas de test A/B à cette taille.
- **Qualité** : la note du banc.
- **Terrain** : parler à 5 élèves qui sont revenus et à 5 qui sont partis.

## 8. Risques

- **Hallucinations** : le chapitre est choisi dans une liste, les dates sont confirmées par l'élève, le verdict « prêt » est calculé dans le code et le cours est expliqué à partir du contenu relu.
- **Triche** : tentative, puis indice, puis correction. Les 5 demandes « fais mon devoir » du banc le vérifient.
- **Coût** : les quotas existants et le plafond de tours d'outils. On met une alerte de dépense mensuelle dans la Console Anthropic.
- **Lenteur** : l'effort au plus bas et les messages « Je regarde ton agenda… ».
- **Maintenance pour un fondateur seul** : un seul point d'entrée, des actions qui réutilisent les écrans existants et un banc qui sert de test.
- **Nono progresse aussi** : le banc se rejoue chaque mois contre lui.

## 9. Décisions pour Johan

**Tranchées le 28/10 au soir :** (1) plan de révision gratuit jusqu'au 30/11 ; (2) quota gratuit gardé à 10 messages par jour ; (3) Claude interroge Nono avec le compte de Johan dans le navigateur intégré (impossible, faute de conversation : voir section 4) ; (4) feu vert pour l'étape 0, lancée le 28/10.

1. **Le plan pendant l'essai.** Gratuit jusqu'au 30/11, ou on garde le paywall actuel (plan offert pour le premier contrôle seulement) ? Codex et moi recommandons le gratuit : le paywall coupe la reprise du lendemain avant que l'habitude soit prise.
2. **Le quota gratuit.** On reste à 10 messages par jour, ou on monte puisque le coût par message est divisé par dix ? Je recommande de rester à 10 pour l'instant et de revoir avec les chiffres.
3. **Nono dans le banc.** Tu poses les questions toi-même, ou je le fais dans le navigateur intégré avec ton compte ?
4. **Le feu vert** pour commencer par l'étape 0.
