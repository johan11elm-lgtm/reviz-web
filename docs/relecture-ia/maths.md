# Relecture IA : Mathématiques (6e, 5e, 4e, 3e)

- Chapitres relus : **56** (14 par classe), chaque fichier lu en entier. Tous les calculs, exemples numériques et réponses de quiz ont été refaits.
- Chapitres corrigés : **18**, plus 1 catalogue (`src/data/programme/6eme/maths.json`, texte de référence)
- Corrections : **23** (22 dans les chapitres, 1 dans un catalogue)
- Vérification `verifier-programme.mjs maths` : 56 valides, 0 invalide

**Verdict.** Le contenu mathématique est juste et sûr. Aucune réponse de quiz n'était fausse à l'index `correct`, aucune formule n'est erronée et tous les calculs tombent juste. Les corrections portent sur trois explications fausses, deux énoncés à double lecture, des hypothèses implicites (« équilibré », « non équilatéral ») et quelques formulations trompeuses. Le vrai sujet est ailleurs : le découpage 4e/3e s'écarte des repères de progression 2019, et le chapitre de 3e traite les inéquations, absentes du programme en vigueur (voir les doutes).

## Corrections

- `6eme / division-euclidienne-division-decimale-et-durees / flashcards[1].front` : « Dans 187 = 12 × 15 + 7, quel est le quotient ? le reste ? » → « Dans la division euclidienne de 187 par 12, on écrit 187 = 12 × 15 + 7. Quel est le quotient ? le reste ? » (l'égalité est aussi la division euclidienne de 187 par 15, avec 12 pour quotient : la question avait deux réponses)
- `6eme / proportionnalite-et-pourcentages / quiz[2].choices[2]` (bonne réponse) : « Le prix de l'essence et le nombre de litres achetés » → « Le prix payé et le nombre de litres d'essence achetés » (« le prix de l'essence » se lit d'habitude comme le prix au litre, qui n'est pas proportionnel au nombre de litres)
- `6eme / proportionnalite-et-pourcentages / resume.sections[0].content` : « comme le prix et la masse au prix au kilo » → « comme le prix payé et la masse achetée quand le prix au kilo est fixe » (phrase bancale)
- `6eme / donnees-et-probabilites / quiz[4].question` : « On a lancé une pièce et obtenu… » → « On a lancé une pièce équilibrée et obtenu… » (la réponse 1/2 suppose une pièce équilibrée)
- `6eme / donnees-et-probabilites / quiz[5].question` : « On lance un dé 600 fois. » → « On lance un dé équilibré à 6 faces 600 fois. » (la réponse 100 suppose un dé équilibré)
- `6eme / symetrie-axiale / resume.sections[0].content` : « un rectangle 2, un triangle isocèle 1 » → « un rectangle non carré 2, un triangle isocèle non équilatéral 1 » (un carré est un rectangle et un triangle équilatéral est isocèle : la phrase était fausse dans ces cas)
- `6eme / calculer-avec-les-fractions / resume.keyTerms[3].def` : « entre deux nombres plus petit et plus grand » → « entre un nombre plus petit et un nombre plus grand » (syntaxe)
- `6eme / nombres-entiers-et-decimaux / resume.keyTerms[3].def` : même correction (syntaxe)
- `5eme / symetrie-centrale / quiz[1].explanation` : « Une droite perpendiculaire apparaît avec la symétrie axiale d'axe perpendiculaire, pas ici. » → « Comme O n'est pas sur d, l'image est une droite parallèle distincte de d : elle n'est jamais sécante à d. » (l'affirmation était fausse : par une symétrie axiale d'axe perpendiculaire à d, l'image de d est d elle-même)
- `5eme / angles-et-triangles / mindmap.branches[3].children[2]` : « rectangle : 90° + 90° » → « rectangle : aigus complémentaires » (laissait croire qu'un triangle rectangle a deux angles de 90°)
- `5eme / angles-et-triangles / mindmap.branches[3].children[0]` : « isocèle : base égale » → « isocèle : angles à la base égaux » (formulation sans sens)
- `5eme / nombres-relatifs-reperage / quiz[0].explanation` : « Ce n'est ni l'inverse, ni le nombre aux chiffres échangés. » → « Déplacer la virgule (0,45) ou échanger les chiffres (−5,4) ne donne pas l'opposé. » (0,45 n'est pas l'inverse de −4,5 : l'explication décrivait mal le distracteur)
- `5eme / carres-et-cubes / resume.sections[0].content` : « l'exposant, indique combien de fois le nombre est multiplié par lui-même » → « l'exposant, indique combien de facteurs égaux à ce nombre on multiplie » (dans a³, a est multiplié deux fois par lui-même : c'est la source de l'erreur classique 2³ = 6)
- `5eme / droites-remarquables-du-triangle / resume.sections[2].content` : « Une médiane partage donc le triangle… » → « Comme l'aire ne dépend que de la base et de la hauteur, une médiane partage le triangle… » (le « donc » ne découlait pas de la phrase précédente)
- `5eme / parallelogrammes / mindmap.branches[0].children[1]` : « côtés égaux » → « côtés opposés égaux » (laissait croire que tous les côtés sont égaux, ce qui décrit le losange)
- `4eme / operations-sur-les-fractions / quiz[1].choices[3]` : « 9/50 » → « 27/50 » (distracteur réaligné sur l'erreur que décrit l'explication)
- `4eme / operations-sur-les-fractions / quiz[1].explanation` : « 9/50 vient d'un produit en croix. » → « 27/50 vient d'un produit en croix (3 × 9 et 5 × 10). » (le produit en croix donne 27/50, pas 9/50 : l'explication était fausse)
- `3eme / probabilites / quiz[6].question` : « Une pièce est tombée… » → « Une pièce équilibrée est tombée… » (la réponse 1/2 suppose une pièce équilibrée)
- `3eme / puissances-et-racines-carrees / resume.keyTerms[0].def` : « …qui indique combien de fois on multiplie a. » → « … ; pour n entier positif, il indique le nombre de facteurs égaux à a. » (même raison qu'en 5e ; la définition était aussi fausse pour les exposants négatifs vus dans le chapitre)
- `3eme / statistiques / quiz[1].explanation` : « 8,3 est la moyenne de la série » → « 8,3 est une valeur approchée de la moyenne de la série (50/6 ≈ 8,33) » (la moyenne n'est pas décimale)
- `3eme / theoreme-de-thales / resume.sections[0].formulaCaption` : « Petit triangle au numérateur, grand triangle au dénominateur » → « Longueurs du triangle AMN au numérateur, du triangle ABC au dénominateur » (en configuration papillon, AMN n'est pas forcément le plus petit)
- `3eme / transformations-homotheties / flashcards[1].front` : « Comment est défini l'image » → « Comment est définie l'image » (accord)
- Catalogue `6eme / symetrie-axiale / reference` : « un triangle isocèle 1 » → « un triangle isocèle non équilatéral 1 » (même raison que dans le chapitre)

## Doutes pour un prof

1. **Découpage 4e/3e différent des repères de progression 2019.** Ces repères restent en vigueur en 4e jusqu'en 2027 et en 3e jusqu'en 2028, et le catalogue les cite. Sources : textes de progression de l'académie de Bordeaux qui reprennent les repères (« Espace et géométrie en 4e / en 3e »). Écarts relevés :
   - `4eme/triangles-semblables` : les repères placent la définition et la caractérisation des triangles semblables en **3e**.
   - `4eme/translations-et-rotations` : en 4e, seule la translation est au programme ; la rotation (et l'homothétie) relèvent de la **3e**.
   - Le catalogue de 4e n'a **aucun chapitre** sur Thalès en configuration emboîtée (avec sa réciproque), le cosinus et les cas d'égalité des triangles, alors que les repères les placent en 4e. Ces notions n'apparaissent qu'en 3e (`theoreme-de-thales`, `trigonometrie`).
   - `4eme/statistiques` : l'étendue apparaît en 3e dans la progression de Bordeaux (à confirmer).
   Je n'ai rien modifié : c'est un choix de catalogue, pas une erreur dans le contenu.
2. **`3eme/equations-et-inequations` : les inéquations sont hors programme en 3e aujourd'hui.** Elles ne figurent ni dans le programme de 2020 ni dans les repères de 3e. Elles reviennent dans le programme 2026 (« inéquation ax < b »), qui ne s'appliquera en 3e qu'à la rentrée 2028. Champs concernés : titre, excerpt, F5, Q3, KP3, S2, KT3, branche M3. Le contenu est juste. À garder comme approfondissement ou à retirer.
3. **`3eme/puissances-et-racines-carrees` : règles générales sur les puissances.** Les repères de 3e précisent que « la connaissance des formules générales sur les produits ou quotients de puissances n'est pas un attendu du programme ». Le chapitre les présente comme des règles à connaître (aᵐ × aⁿ, aᵐ/aⁿ, (aᵐ)ⁿ : F1, Q2, Q5, S0, M1). C'est juste, mais cela va au-delà des attendus. Pour les puissances de 10, ces règles sont bien au programme.
4. **`5eme/pensee-informatique` : variables et « si… alors… sinon ».** D'après une présentation académique (Nancy-Metz, juin 2026), en 5e le nouveau programme se limite à un « programme simple » avec une « boucle inconditionnelle simple ». Variables, affectation et instruction conditionnelle (F2, F6, Q4, Q5, S0, M1, M3) relèveraient plutôt de la 4e. Je n'ai pas pu lire le texte du BO du 5 mars 2026 pour le confirmer. Le reste du programme de 5e (triangles, parallélogrammes, cylindre, symétrie centrale, valeur absolue, carrés et cubes, moyenne simple) concorde avec les sources académiques.
5. **`4eme/developper-et-factoriser` : « vérifier avec x = 1 »** (F5, M3.2, ainsi que le texte de référence du catalogue). Avec x = 1, on a x² = x, donc une confusion entre x et x² passe inaperçue. Un prof conseillerait plutôt x = 2 ou 3, en rappelant qu'un test peut révéler une erreur sans prouver l'égalité. Non modifié, car le contenu n'est pas faux.
6. **Hypothèses implicites conservées volontairement.** Dans `5eme/statistiques-et-probabilites` Q7 et `4eme/probabilites` Q6, la pièce ou le dé ne sont pas dits « équilibrés ». Je n'ai pas ajouté le mot parce qu'un distracteur (« truqué ») porte justement sur ce point. La bonne réponse reste la seule défendable.
7. **`3eme/theoreme-de-thales` mindmap M1.2 « petit / grand triangle ».** C'est le moyen mnémotechnique habituel, mais il est inexact en configuration papillon. J'ai corrigé la légende de la formule, pas l'étiquette de la carte mentale.
8. **Vocabulaire en 6e.** « Hypoténuse » (`triangles`) et « nombre mixte » (`fractions-sens-et-quotient`) ne sont pas exigés par le programme de 2025 à ma connaissance. C'est sans gravité, mais à garder en tête si l'on veut coller strictement au programme. Le reste de la 6e est conforme au programme de 2025 (angles adjacents, supplémentaires et opposés par le sommet, probabilités, addition de fractions dont un dénominateur est multiple de l'autre, P = π × d, médiatrice et cercle circonscrit).

## Points forts / faiblesses récurrentes

- **Fort** : l'exactitude. Plusieurs centaines de calculs refaits, aucun faux. Aucune réponse de quiz n'est fausse à l'index `correct`, les conventions françaises sont respectées (virgule décimale, 0 positif et négatif, notations [AB], (AB), [AB), AB).
- **Fort** : des distracteurs tirés de vraies erreurs d'élèves (2/5 pour 1/2 + 1/3, 1 h 30 = 1,3 h, −3² et (−3)², oubli du changement de sens d'une inégalité), et des explications qui nomment l'erreur.
- **Faiblesse** : les explications des distracteurs sont parfois inexactes (« produit en croix » pour 9/50, « l'inverse », la phrase sur la symétrie axiale). C'est l'endroit à relire en priorité dans les futures générations.
- **Faiblesse** : des hypothèses et des cas particuliers sont oubliés (pièce ou dé équilibré, rectangle non carré, isocèle non équilatéral, divisions euclidiennes à double lecture), et la vulgarisation « l'exposant indique combien de fois on multiplie » nourrit l'erreur 2³ = 6.
- **Faiblesse** : l'alignement sur le programme est fiable en 6e et en 5e, mais le découpage 4e/3e s'écarte des repères 2019 et le chapitre de 3e contient une notion absente du programme (les inéquations).
