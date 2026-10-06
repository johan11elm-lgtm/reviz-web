# Relecture IA — SVT (5e-4e-3e) et Sciences et technologie (6e)

- **Chapitres relus** : 51 (SVT : 12 en 5e, 12 en 4e, 13 en 3e ; Sciences et technologie 6e : 14), chacun en entier (flashcards, quiz, résumé, termes clés, carte mentale), ainsi que les 4 catalogues (notions et textes de référence).
- **Chapitres corrigés** : 14 · **Corrections** : 32 (27 dans les chapitres, 5 dans les catalogues).
- **Vérification** : `verifier-programme.mjs svt` → 37/37 valides ; `sciences-et-technologie` → 14/14 valides.

**Verdict** : contenu solide et conforme aux programmes. Les quiz sont bien construits et les chiffres de base sont justes. Les erreurs trouvées sont surtout des données périmées (climat, vaccins obligatoires, sécurité routière, AMP), des formulations absolues devenues fausses (« jamais », « seuls ») et deux questions de quiz où un mauvais choix pouvait aussi se défendre. Aucune réponse de quiz n'était fausse à l'index `correct`.

## Corrections

### Chapitres

- `5e / hygiene-de-vie / resume.keyTerms[2].def` (Glucides) : « Aliments sources d'énergie, comme le pain… » → « Constituants des aliments qui fournissent surtout de l'énergie, abondants dans le pain, les pâtes ou le riz. » (les glucides sont des constituants, pas des aliments)
- `5e / peuplement-des-milieux / quiz[2].choices[3]` : « Ils hibernent comme les marmottes, avec une température constante » → « …, en régulant leur température » (en hibernation, la température de la marmotte baisse fortement : le choix contredisait la flashcard F4)
- `4e / puberte / flashcards[7].back` (Quel organe déclenche la puberté ?) : « L'hypophyse, une petite glande sous le cerveau… » → « Le cerveau, par l'intermédiaire de l'hypophyse : cette petite glande située à sa base stimule les ovaires ou les testicules. » (c'est le cerveau qui déclenche, l'hypophyse relaie ; aligné sur le résumé du chapitre)
- `4e / structure-interne-terre / quiz[4].explanation` : « Personne n'a jamais foré au-delà de quelques kilomètres » → « Le forage le plus profond n'atteint qu'environ 12 km » (forage de Kola : 12,2 km)
- `4e / maitrise-procreation-ist / resume.sections[2].content` : « Pour les couples qui n'arrivent pas à avoir d'enfant » → « Pour les personnes qui ne peuvent pas avoir d'enfant sans aide médicale » (depuis la loi de bioéthique de 2021, l'AMP est aussi ouverte aux couples de femmes et aux femmes seules)
- `3e / changement-climatique / flashcards[0].back` : « D'environ 1,1 à 1,2 °C » → « D'environ 1,2 à 1,3 °C … (moyenne de la dernière décennie) » (Indicators of Global Climate Change 2025 : +1,24 °C en moyenne sur 2015-2024)
- `3e / changement-climatique / resume.keyPoints[0]` : « +1,1 à 1,2 °C » → « +1,2 à 1,3 °C » (même raison)
- `3e / changement-climatique / mindmap.branches[0].children[0]` : « +1,1 °C » → « +1,2 °C » (même raison)
- `3e / changement-climatique / quiz[6].question` : « Quelle conséquence n'est pas liée au réchauffement climatique ? » → « Lequel de ces phénomènes n'est pas une conséquence des émissions humaines de gaz à effet de serre ? » (l'acidification des océans vient du CO₂ dissous, pas du réchauffement : avec l'ancien énoncé, le choix « acidification » se défendait aussi)
- `3e / changement-climatique / resume.keyTerms[0].def` : « méthane... » → « méthane… » (typographie)
- `3e / meiose-fecondation-diversite / quiz[2].choices[2]` : « une fille (XY) » → « une fille, car c'est l'ovule qui décide du sexe » (le choix supprimé reposait sur une affirmation fausse, voir la ligne suivante)
- `3e / meiose-fecondation-diversite / quiz[2].explanation` : « XY ne correspond jamais à une fille. » → « C'est le spermatozoïde, et non l'ovule, qui détermine le sexe. » (l'affirmation absolue était fausse à cause des variations du développement sexuel, et peu neutre)
- `3e / meiose-fecondation-diversite / quiz[5].explanation` : « 2 × 2 × ... » → « 2 × 2 × … » (typographie)
- `3e / micro-organismes-hygiene / quiz[2].question` : « Se laver les mains avant de cuisiner est une mesure : » → « …, pour ne pas apporter de microbes sur les aliments, est une mesure : » (précise le but ; sans lui, « antisepsie » se défendait, puisque la peau est un tissu vivant)
- `3e / micro-organismes-hygiene / quiz[2].explanation` : « L'antisepsie consiste à désinfecter une plaie ou un tissu vivant. » → « L'antisepsie consiste à détruire les microbes déjà présents, par exemple sur une plaie. » (même raison)
- `3e / ressources-naturelles / resume.keyTerms[3].def` : « Développement qui préserve les besoins des générations futures. » → « Développement qui répond aux besoins du présent sans compromettre ceux des générations futures. » (formulation incorrecte, remplacée par la définition Brundtland)
- `3e / systeme-nerveux-sante / quiz[3].explanation` : « l'alcool est la première cause de mortalité routière » → « l'alcool est, avec la vitesse, l'une des deux premières causes de mortalité routière » (ONISR 2024 : vitesse 29 % des accidents mortels, alcool 22 %)
- `3e / vaccination / flashcards[0].back` : « …toxine inactivée ou ARN messager. » → « Un antigène rendu inoffensif (…) ou un ARN messager qui fait fabriquer cet antigène par nos cellules. » (l'ARN messager n'est pas un antigène)
- `3e / vaccination / quiz[6].question` : « Depuis 2018 en France, combien de vaccins sont obligatoires pour les jeunes enfants ? » → « En 2018, la France a élargi l'obligation vaccinale des jeunes enfants. Combien de vaccinations sont alors devenues obligatoires ? » (donnée périmée : depuis le 1er janvier 2025, les vaccins contre les méningocoques ACWY et B sont aussi obligatoires)
- `3e / vaccination / quiz[6].explanation` : ajout de « Depuis 2025, la vaccination des nourrissons contre les méningocoques ACWY et B est aussi obligatoire. » (même raison)
- `3e / vaccination / mindmap.branches[3].children[3]` : « 11 vaccins obligatoires » → « vaccins obligatoires » (même raison)
- `6e / familles-de-materiaux / flashcards[0].back` : « verre... » → « verre… » (typographie)
- `6e / familles-de-materiaux / flashcards[2].back` (Quel métal est attiré par un aimant ?) : « Le fer et l'acier ; … » → « Surtout le fer et l'acier (ainsi que le nickel et le cobalt) ; … » (le nickel et le cobalt sont aussi attirés)
- `6e / familles-de-materiaux / quiz[1].explanation` : « L'aimant teste seulement la présence de fer. » → « L'aimant teste seulement l'attraction magnétique (fer, acier), pas la conduction électrique. » (même raison)
- `6e / familles-de-materiaux / quiz[2].explanation` : « Seuls les matériaux contenant du fer, comme l'acier, sont attirés. » → « L'acier, qui contient du fer, est attiré par l'aimant ; l'aluminium ne l'est pas. » (« seuls » était faux)
- `6e / la-cellule / resume.sections[0].content` : « notre corps en contient des milliards » → « des milliers de milliards » (environ 30 000 milliards de cellules : l'ancien chiffre était faux d'un facteur 1 000)
- `6e / developpement-et-reproduction / quiz[5].explanation` : « La germination demande surtout de l'eau et une température adaptée » → « La germination demande de l'eau, de l'air et une température adaptée » (le besoin en air est une notion attendue en 6e)

### Catalogues (`relu` laissé à `false`)

- `3e / svt.json / information-genetique.notions[1]` : « à un ou deux chromatides » → « à une ou deux chromatides » (accord : « chromatide » est féminin)
- `3e / svt.json / changement-climatique.reference` : « environ 1,1 à 1,2 °C » → « environ 1,2 à 1,3 °C (moyenne de la dernière décennie) » (donnée mise à jour)
- `3e / svt.json / systeme-nerveux-sante.reference` : « L'alcool est la première cause de mortalité routière » → « …, avec la vitesse, l'une des deux premières causes… » (données ONISR)
- `3e / svt.json / vaccination.reference` : ajout de l'obligation méningocoques ACWY (qui remplace le C) et B depuis le 1er janvier 2025
- `4e / svt.json / maitrise-procreation-ist.reference` : « aide les couples qui ne parviennent pas à avoir un enfant » → « aide les personnes qui ne peuvent pas avoir d'enfant sans aide médicale ; en France, elle est ouverte depuis 2021 aux couples de femmes et aux femmes seules »

## Doutes pour un prof

- **3e / changement-climatique** : j'ai remplacé la valeur du GIEC AR6 (+1,1 °C, période 2011-2020) par +1,2 à 1,3 °C (moyenne la plus récente). Un prof qui s'appuie sur le dernier rapport du GIEC peut préférer « environ 1,1 °C (GIEC 2021-2023) ». La valeur choisie doit être cohérente avec la source citée en classe.
- **Chaînes alimentaires** (`4e / relations-alimentaires` Q1, `6e / peuplement-des-milieux` F5) : « une chaîne alimentaire commence toujours par un végétal chlorophyllien ». C'est la simplification habituelle au collège, mais elle ignore les chaînes de décomposeurs et la chimiosynthèse (sources hydrothermales). Je ne l'ai pas modifiée.
- **Vocabulaire ovocyte / ovule** : la 4e emploie « ovocyte », la 3e (méiose, fécondation) emploie « ovule ». Les deux sont courants dans les manuels, mais il faudrait harmoniser.
- **3e / information-genetique Q4 et meiose Q2** : « XY = homme, XX = femme ». C'est la règle attendue en 3e et je l'ai gardée. J'ai seulement retiré l'affirmation absolue « jamais ». Un prof pourrait vouloir écrire « en général ».
- **3e / vaccination Q2** : « Qui est à l'origine du mot vaccin ? Jenner ». C'est la réponse des manuels. Historiquement, Jenner parlait de *variolae vaccinae* et Pasteur a étendu le mot « vaccin » à toutes les vaccinations ; l'explication le dit. Je l'ai laissée.
- **4e / mouvement-commande-nerveuse** : « réflexe = centre nerveux, la moelle épinière ». C'est vrai pour le réflexe rotulien, mais certains réflexes passent par le tronc cérébral. Simplification acceptable.
- **6e / developpement-et-reproduction** : « puberté vers 10 à 16 ans », alors que le catalogue de 4e indique un début entre 8 et 13 ans (filles) et entre 9 et 14 ans (garçons). Pas faux, mais l'âge de début est approximatif en 6e.
- **5e / roches-sedimentaires-fossiles S0** : « la boue argileuse devient argile ». Au sens strict, une argile compactée devient une argilite. C'est acceptable au collège puisque l'argile y est présentée comme une roche sédimentaire.
- **Catalogues uniquement** : « intestin grêle de 6 à 7 m » (mesure sur cadavre ; environ 3 à 5 m chez le vivant) et « échelle de Richter » (on utilise aujourd'hui la magnitude de moment). Ces deux points n'apparaissent pas dans les chapitres.

## Points forts / faiblesses récurrentes

- **Fort** : les chiffres clés sont exacts et cohérents d'une classe à l'autre (Harvey 1628 ; air expiré à 16 % de O₂ et 4 % de CO₂ ; 2²³ combinaisons ; Antilles en zone sismique 5 ; montagne Pelée en 1902 ; 220 − âge ; −18 °C sans effet de serre au lieu de +15 °C). Aucune erreur sur les index `correct`.
- **Fort** : les explications des quiz traitent les conceptions erronées classiques : gène / allèle, digestion / absorption, plantes qui respirent jour et nuit, magnitude / intensité, manteau solide, sens de la flèche « est mangé par », Homme / chimpanzé. La démarche expérimentale (témoin, un seul facteur qui varie) revient régulièrement.
- **Faiblesse** : les données liées à l'actualité vieillissent (réchauffement, vaccins obligatoires, sécurité routière, AMP). Il faut les relire chaque année.
- **Faiblesse** : quelques formulations absolues deviennent fausses (« seuls », « jamais », « première cause »), et deux distracteurs pouvaient se défendre à cause d'un énoncé trop large.
