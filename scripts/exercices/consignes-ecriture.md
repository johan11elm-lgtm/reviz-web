# Écrire les données d'exercices d'un chapitre

Ces consignes servent à écrire, pour un chapitre du programme, le bloc `exercices` qui nourrit
les exercices en jeu de Réviz (élèves de 11 à 15 ans, de la 6e à la 3e). Le chapitre est un
fichier `public/programme/<classe>/<matière>/<id>.json` : lis son résumé (`resume`), ses mots-clés
(`resume.keyTerms`), sa carte mentale (`mindmap`), son quiz (`quiz`) et ses flashcards. Tout ce
que tu écris doit être exact, au niveau du programme de cette classe, et tiré de ce que le
chapitre enseigne. N'invente pas de notion que le chapitre n'aborde pas.

## La règle d'or

**Chaque exercice a une seule réponse défendable, pour un élève qui connaît son cours.**
Un test automatique fera passer chaque élément à un « élève » qui ne voit pas la réponse : s'il
hésite entre deux réponses, s'il ne comprend pas la carte, ou si la réponse se devine sans rien
savoir, l'élément est rejeté. Avant d'écrire un élément, demande-toi : « un bon élève pourrait-il
répondre autre chose, et avoir raison ? » Si oui, réécris-le ou supprime-le.

Ce qui a fait échouer les exercices actuels (tirés de la carte mentale), à ne pas refaire :
- des catégories qui se recoupent : « Nantes » allait dans « Ports européens » mais aussi dans
  « Commerce triangulaire » ; « Murs » dans « Pertes de chaleur » mais aussi dans « Isolants » ;
- des catégories fourre-tout : « Exemples clés », « Calculs », « Vocabulaire », « Applications »,
  « À la maison », « Définition », « Méthode », « Pièges », « Repères », « Bilan » ;
- des cartes d'un ou deux mots, incompréhensibles seules : « vérifier », « Supprimables »,
  « 15 articles », « Développement », « signes contraires : − ».

## Le format

Écris un seul objet JSON (rien d'autre dans le fichier) :

```json
{
  "version": 1,
  "categories": [ … ],
  "causes": [ … ],
  "etiquettes": [ … ],
  "devinettes": [ … ],
  "calculs": [ … ],
  "etapes": [ … ]
}
```

Un tableau peut être vide (`[]`) quand le chapitre ne s'y prête pas : mieux vaut rien qu'un
exercice forcé. Seul `categories` est obligatoire.

### `categories` : 4 catégories de 5 cartes (4 coins, Intrus, Trois indices, Classement, Sélection)

```json
{ "nom": "Le commerce triangulaire", "detail": "Le circuit Europe, Afrique, Amériques et ce qu'il transporte.",
  "cartes": ["Des pacotilles échangées contre des captifs", "La traversée de l'Atlantique en navire négrier", "…", "…", "…"] }
```

- **Choisis UN critère de tri, le même pour les quatre catégories** : quatre personnages, quatre
  temps de l'indicatif, quatre organes, quatre types de circuits, quatre étapes d'une période,
  quatre régions du monde… C'est ce qui rend les catégories étanches.
- `nom` : 2 à 6 mots, qui disent de quoi on parle. Jamais un fourre-tout (voir la liste plus haut).
- `detail` : une phrase qui dit ce que la catégorie rassemble (affichée dans la correction).
- `cartes` : exactement 5 cartes par catégorie, de 3 à 10 mots, qui se comprennent seules.
  Chaque carte ne peut aller que dans sa catégorie, sans hésitation possible. Elle ne répète
  pas le nom de sa catégorie (sinon la réponse se lit) et ne contient pas d'abréviation obscure.
  Pas deux cartes presque identiques.
- Langues : les cartes peuvent être des exemples dans la langue (« She is taller than me »), les
  noms de catégories restent en français.
- Maths : une carte peut être un calcul ou une expression (« (−3) × (−4) = 12 »), à condition
  qu'une seule catégorie lui convienne.

### `causes` : Cause ou conséquence (4 à 6 éléments)

```json
{ "fait": "la Première Guerre mondiale", "carte": "L'assassinat de l'archiduc François-Ferdinand à Sarajevo",
  "role": "cause", "explication": "L'attentat du 28 juin 1914 déclenche le jeu des alliances." }
```

- L'élève lit : « Par rapport à *fait*, cette carte est-elle une cause ou une conséquence ? »
- `fait` : un événement ou un phénomène central du chapitre, en minuscule (sauf nom propre), sans
  point. Un ou deux faits différents pour toute la série.
- `role` : `"cause"` ou `"consequence"`. Au moins 2 de chaque. Le lien doit être enseigné dans le
  chapitre et indiscutable (pas une conséquence qui est aussi la cause d'autre chose dans le même
  fait).
- Chapitres sans causalité (grammaire, langues, géométrie…) : `[]`.

### `etiquettes` : Le Tagueur (4 à 6 éléments)

```json
{ "consigne": "Quelle est la fonction du groupe en couleur ?", "texte": "Le chien ronge [un vieil os] sous la table.",
  "choix": ["Sujet", "COD", "COI", "Complément circonstanciel"], "bonne": 1,
  "explication": "« un vieil os » répond à la question « le chien ronge quoi ? » : c'est le COD." }
```

- Un court texte (une à trois phrases) avec **un seul passage entre crochets** `[ ]` : c'est lui
  que l'élève doit étiqueter. `consigne` dit ce qu'on cherche (une question qui finit par « ? »).
- `choix` : 3 ou 4 étiquettes d'une même famille (fonctions, natures, temps, types de discours,
  sources d'énergie, types de documents…), idéalement les mêmes pour toute la série. `bonne` : le
  numéro (à partir de 0) de la seule étiquette juste.
- Très utile en français (nature, fonction, temps, discours) et en langues (temps, forme). Ailleurs,
  seulement si c'est naturel ; sinon `[]`.

### `devinettes` : Qui suis-je ? (2 à 4 éléments)

```json
{ "reponse": "Toussaint Louverture", "acceptees": ["Louverture", "Toussaint Louverture"],
  "indices": ["Je suis né esclave à Saint-Domingue.", "J'ai mené la révolte des esclaves de l'île.", "Napoléon m'a fait arrêter en 1802."],
  "explication": "Toussaint Louverture dirige la révolte de Saint-Domingue, future Haïti." }
```

- `reponse` : 1 à 4 mots, un personnage, un lieu, un organe, une notion du chapitre. L'élève la
  tape au clavier (majuscules, accents, articles et une petite faute de frappe sont tolérés).
- `acceptees` : les autres façons justes de l'écrire (sans prénom, synonyme exact, pluriel…).
- `indices` : exactement 3, à la première personne, **du plus vague au plus précis**. Aucun ne
  contient la réponse ni un mot de la réponse. Avec les trois, une seule réponse possible.

### `calculs` : Trouve le nombre (4 à 6 éléments en maths, physique-chimie et technologie)

```json
{ "question": "Un cycliste parcourt 36 km en 2 h. Quelle est sa vitesse moyenne ?", "reponse": 18, "unite": "km/h",
  "tolerance": 0, "explication": "v = d ÷ t = 36 ÷ 2 = 18 km/h." }
```

- L'élève tape un nombre sur un pavé (chiffres, virgule, signe moins). `reponse` est un nombre JSON
  (entier ou décimal à 2 décimales au plus, point décimal). Pas de fraction, pas d'expression
  littérale, pas de réponse en plusieurs nombres.
- `question` contient toutes les données ; faisable au brouillon en moins de 2 minutes, avec les
  méthodes du chapitre. Si un arrondi est nécessaire, la question le dit (« arrondis au dixième »)
  et `reponse` est la valeur arrondie.
- `unite` : l'unité affichée après la réponse, ou `""`. `tolerance` : 0 sauf cas d'arrondi
  vraiment ambigu.
- `explication` : le calcul détaillé. **Refais chaque calcul deux fois** : une réponse fausse est
  la pire erreur possible.
- SVT, géographie, histoire : seulement s'il y a de vrais calculs dans le chapitre ; sinon `[]`.
  Français et langues : `[]`.

### `etapes` : Remets dans l'ordre (0 à 2 suites)

```json
{ "titre": "Les étapes d'une distillation", "etapes": ["On chauffe le mélange", "…", "…", "…"] }
```

- 4 ou 5 étapes dont l'ordre est **unique et enseigné** (un protocole, une méthode, un processus,
  une démonstration, une suite d'événements). `titre` : ce que l'on ordonne. Étapes de 3 à 12 mots.

## Le style

- Phrases courtes, vocabulaire du collège, sans jargon que le chapitre n'utilise pas.
- Majuscule en tête des cartes et des étiquettes (sauf une expression mathématique ou une unité).
- Guillemets français « … », pas de point final dans les cartes, un point final dans les
  explications et les indices.
- Pas d'emoji.
