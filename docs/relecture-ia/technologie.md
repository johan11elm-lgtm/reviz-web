# Relecture IA — Technologie (5e, 4e, 3e)

- Chapitres relus : **36** (12 en 5e, 12 en 4e, 12 en 3e), chaque fichier lu en entier
- Chapitres corrigés : **10**
- Corrections : **15**
- Vérification `verifier-programme.mjs technologie` : 36 valides, 0 invalide

**Verdict.** Le contenu est juste et soigné : tous les calculs ont été refaits et sont exacts, aucune réponse de quiz n'est fausse à l'index `correct`, et la langue est propre. Les corrections portent sur des imprécisions (définition du court-circuit, « tension continue », une date, une question de quiz ambiguë). Le vrai risque est ailleurs : les catalogues visent le programme de 2015 alors que celui de 2024 est en vigueur (voir les doutes).

## Corrections

- `5eme / familles-de-materiaux / quiz[3].question` : « Quelle est l'origine du PVC ? » → « Quelle est l'origine du polystyrène ? » (le PVC contient environ 57 % de chlore tiré du sel, donc le choix « Minérale » se défendait aussi ; le polystyrène vient entièrement du pétrole)
- `5eme / familles-de-materiaux / quiz[3].explanation` : « Le PVC est une matière plastique fabriquée à partir du pétrole… » → « Le polystyrène est une matière plastique fabriquée à partir du pétrole… » (cohérence avec la question)
- `5eme / fabriquer-un-prototype / flashcards[3].back` : « Une feuille de plastique chauffée prend la forme d'un moule en refroidissant. » → « Une feuille de plastique chauffée se plaque sur un moule et en garde la forme en refroidissant. » (la feuille se met en forme à chaud, elle se fige en refroidissant)
- `5eme / chaine-d-information / quiz[4].question` : « …l'ordre « ouvrir » envoyé par la carte au moteur… » → « …envoyé par la carte vers la chaîne d'énergie… » (l'ordre arrive à la fonction distribuer, pas directement au moteur ; cohérence avec F6 et avec le chapitre de 3e)
- `4eme / codage-numerique-de-l-information / quiz[3].explanation` : « Compter seulement les 1 donne 3, une erreur fréquente. » → « Lire les rangs dans le mauvais sens (1011) donne 11, une erreur fréquente. » (3 ne fait pas partie des choix ; 11 en fait partie et correspond à cette erreur)
- `4eme / codage-numerique-de-l-information / quiz[6].explanation` : « Elle peut même faire perdre un peu de qualité, jamais en ajouter. » → « Avec JPEG ou MP3, elle fait même perdre un peu de qualité ; elle n'en ajoute jamais. » (JPEG et MP3 sont des compressions avec perte : la perte est systématique, pas seulement possible)
- `4eme / installation-electrique-de-l-habitat / flashcards[4].back` : « Deux bornes reliées par un fil sans appareil… » → « Les deux bornes du générateur reliées par un fil sans appareil… » (relier les bornes d'un autre dipôle ne crée pas forcément un courant intense)
- `4eme / installation-electrique-de-l-habitat / resume.keyTerms[1].def` : « Liaison directe entre deux bornes… » → « Liaison directe entre les deux bornes du générateur… » (même raison)
- `4eme / isolation-thermique-de-l-habitat / quiz[2].explanation` : « Multiplier e par λ donne 0,008 : c'est l'erreur classique d'inverser la formule. » → « Multiplier e par λ au lieu de diviser donne 0,008 : c'est une erreur classique. » (multiplier n'est pas « inverser » la formule)
- `4eme / stocker-et-proteger-les-donnees / quiz[5].choices[3]` : « La date de la tour Eiffel » → « La date de construction de la tour Eiffel » (formulation incomplète)
- `3eme / chaine-d-information-et-chaine-d-energie / quiz[6].choices[1]` : « …le signal continu d'un capteur… » → « …le signal analogique d'un capteur… » (en électricité, « continu » désigne le courant continu : risque de confusion)
- `3eme / chaine-d-information-et-chaine-d-energie / quiz[6].explanation` : « …transforme la tension continue du capteur en valeurs numériques. » → « …transforme la tension variable fournie par le capteur (signal analogique) en valeurs numériques. » (« tension continue » veut dire courant continu, ce qui est faux ici)
- `3eme / evolution-des-objets-techniques / resume.sections[1].content` : « …smartphone en 2007. » → « …iPhone en 2007. » (des smartphones existaient avant 2007 ; la date repère concerne l'iPhone, comme dans le quiz et la carte mentale)
- `3eme / programmer-un-systeme-embarque / quiz[0].explanation` : « …l'exécute ensuite seule, même débranchée de l'ordinateur. » → « …l'exécute ensuite seule, sans l'ordinateur, dès qu'elle est alimentée. » (débranchée et sans autre alimentation, la carte ne fonctionne pas)
- `3eme / programmer-un-systeme-embarque / quiz[5].explanation` : « Le RGPD, en vigueur depuis 2018… » → « Le RGPD, appliqué depuis 2018… » (le RGPD est entré en vigueur en 2016 et s'applique depuis le 25 mai 2018 ; même formulation qu'en 4e)

## Doutes pour un prof

1. **Programme de référence périmé (le point le plus important).** Les trois catalogues indiquent « BO spécial n°11 du 26/11/2015, ajusté BO n°31 du 30/07/2020 ». Or le programme de technologie du cycle 4 a été remplacé par l'arrêté du 9 février 2024 (BO n°9 du 29 février 2024). Il s'applique en 5e depuis la rentrée 2024, en 4e depuis 2025 et en 3e depuis la rentrée 2026, donc à tout le cycle cette année. Un projet d'aménagement du CSP (juin 2025) est en cours. Je n'ai modifié ni les catalogues ni le contenu sur ce point. Écarts relevés avec le programme de 2024 :
   - **absent des chapitres** : l'intelligence artificielle (grands types d'apprentissage, biais, incidences sociétales) ; les données structurées (descripteur, collection, types, traitement au tableur) ; les listes en programmation ; le débit et ses ordres de grandeur ; les tables de routage et l'adresse IP fixe (attendue en 4e) ; le dépannage et la réparation (fiabilité, durabilité, protocole de réparation) ; l'indice énergétique ; les objets communicants (interfacer un objet avec un réseau en 4e, deux objets en 3e) ; le lien entre programmation par blocs et programmation textuelle (fin de 3e) ;
   - **présent dans les chapitres mais pas explicitement au programme de 2024** : les liaisons mécaniques (4e) ; l'isolation thermique avec λ, R et la RE2020 (4e) ; l'installation électrique et le va-et-vient (4e, plutôt de la physique-chimie) ; la bête à cornes, le FAST, la fonction d'estime et le diagramme SysML (vocabulaire classique que le texte de 2024 ne cite plus) ;
   - **mauvais niveau** : la numérisation et le codage binaire sont traités en 4e alors que le programme les place en 3e. Les réseaux ne sont traités qu'en 3e alors que le programme les répartit : réseau local en 5e, adresse IP en 4e, Internet et routage en 3e ;
   - **vocabulaire** : pour les formes d'énergie, le programme cite « électrique, cinétique, potentielle, thermique, lumineuse », alors que les chapitres disent « mécanique, chimique, nucléaire ». Ce n'est pas faux, mais ce n'est pas le vocabulaire officiel.
2. **Indice de réparabilité** (`3eme / cycle-de-vie-et-eco-conception`, F7 et section 2) : « affiché en France depuis 2021 » reste vrai, mais depuis 2025 il est remplacé par l'indice de durabilité pour les téléviseurs (janvier) et les lave-linge (avril), et par l'étiquette européenne pour les smartphones (juin 2025). Je n'ai rien modifié, car le programme de 2024 cite encore l'indice de réparabilité. Une précision serait peut-être utile.
3. **Famille et lignée : définitions différentes selon la classe.** En 5e, une famille regroupe des objets de même usage mais de principes *différents*. En 3e, une famille regroupe des objets de même besoin, et une lignée est un sous-ensemble de même principe. Les deux usages existent dans les manuels, mais il faudrait choisir une seule définition.
4. **La lignée du vélo** (`5eme / evolution-des-objets-techniques`, Q1) : draisienne, vélocipède et bicyclette à chaîne y sont présentés comme une lignée de « même principe ». Pourtant la propulsion change (poussée au pied, pédales sur la roue, transmission par chaîne). C'est l'exemple classique des manuels, mais il est discutable.
5. **Cartes mentales maladroites** (non modifiées pour ne pas toucher à la structure) : en 3e, `algorithmique-et-programmation` range « sous-programme » sous la branche « Tester », et `energie-et-rendement` range « stockage » sous la branche « Rendement ».
6. **Simplifications acceptables mais à valider** :
   - en 5e, `chaine-d-energie` Q0 dit que « le câble USB alimente » (la référence parle de la prise) ;
   - dans le même chapitre, Q5 dit que « la chaîne du vélo transmet » (avec un moteur dans le moyeu, le moteur entraîne directement la roue) ;
   - en 3e, `demarche-de-projet-et-innovation` donne un brevet de « 20 ans » (c'est un maximum, sous réserve de payer les annuités) ;
   - en 3e, `materiaux-et-proprietes` dit que « l'acier rouille, pas l'aluminium » (l'aluminium s'oxyde aussi, mais en surface, et cette couche le protège).

## Points forts / faiblesses récurrentes

- **Point fort** : les calculs sont tous exacts (ρ = m ÷ V, E = P × t, P = U × I, rendement, R = e ÷ λ, rapports de transmission, binaire, taille d'une image, matrice de décision pondérée), et chaque formule a ses unités.
- **Point fort** : les quiz sont bien construits. Les distracteurs reprennent des erreurs classiques (inverser menante et menée, oublier les 3 octets par pixel…), il n'y a qu'une seule bonne réponse, et les explications sont cohérentes.
- **Point fort** : la langue et la typographie sont propres et homogènes (espaces avant « : » et « ; », guillemets français, aucun emoji), et le ton est sobre.
- **Faiblesse** : quelques imprécisions de vocabulaire technique (« continu » pour analogique, court-circuit sans le générateur) et des explications qui évoquent une erreur absente des choix proposés.
- **Faiblesse majeure** : le contenu suit le programme de 2015 et non celui de 2024, en vigueur sur tout le cycle depuis la rentrée 2026 (voir le doute n°1).
