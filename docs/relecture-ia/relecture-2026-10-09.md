# Relecture de la nuit du 8 au 9 octobre 2026 : illustrations et 6e

_Session Claude Code, branche `claude/optimistic-pasteur-h3oc27`. Rien n'est fusionné dans `main`._

## En bref

- **Illustrations** : les 170 figures ont été relues une par une, chacune à côté du texte de la section où elle s'affiche. Aucune erreur de fond. Les points à risque ont été vérifiés : valeurs des circuits, phases de la Lune, saisons, caryotypes, homothéties, frises, angles, données des graphiques.
- **3 cartes cassées** : densités par département (3e), répartition de la population mondiale et densités du monde (6e). Un « < 30 » non échappé rendait le SVG invalide, et l'image restait vide dans l'app comme sur les fiches. Corrigé dans le générateur. `illustrations.mjs verifier` refuse désormais ce cas.
- **2 figures sans surtitre** (cycle menstruel, temps géologiques) et **2 étiquettes qui se chevauchaient** (densités du monde). `verifier` exige maintenant un type et un titre.
- **Leçons** :
  - les 5 corrections de la relecture de nuit (maths 3e, chapitres 1 à 12) sont reportées depuis la branche `relecture-nuit`, qui n'était plus fusionnable : les chapitres ont changé depuis avec les illustrations ;
  - contre-relecture complète de la 6e en maths (14 chapitres), histoire et EMC (12) et sciences (14), soit 40 chapitres et 10 corrections ;
  - « introduit par par ou de » corrigé en 3e et en 4e.
- Un contrôle automatique des 383 chapitres a été passé : JSON valide, `parseLessonJson`, index `correct`, choix vides ou en double, mots répétés, encodage. Après tri des faux positifs, il ne reste rien.
- Fiches publiques : les mêmes correctifs sont prêts sur la branche `claude/fiches-correctifs` de reviz-landing.

## Corrections des leçons

- `3eme / arithmetique-nombres-premiers / resume.sections[1].content` : « Un nombre a une infinité de multiples… » → « Un nombre non nul a une infinité de multiples… » (relecture de nuit : faux pour 0)
- `3eme / calcul-litteral / flashcards[6].front` : « Que suffit-il pour prouver… » → « Qu'est-ce qui suffit pour prouver… » (relecture de nuit)
- `3eme / notion-de-fonction / flashcards[6].back` : « on monte jusqu'à la courbe » → « on monte (ou on descend) jusqu'à la courbe » (relecture de nuit : image négative)
- `3eme / theoreme-de-thales / quiz[2].explanation` : « petit triangle AMN… grand triangle ABC » → « triangle AMN… triangle ABC » (relecture de nuit : configuration papillon)
- `3eme / statistiques / flashcards[1].back` : « …par la somme des effectifs » → « …par la somme des effectifs ou des coefficients » (relecture de nuit)
- `3eme / voix-active-et-voix-passive` et `4eme / voix-passive-et-forme-impersonnelle` / `mindmap` : « introduit par par ou de » → « introduit par « par » ou « de » »
- `6eme / symetrie-axiale / mindmap.branches[0].children[1]` : « rectangle : 2 » → « rectangle non carré : 2 » (un carré a 4 axes ; aligné sur le résumé corrigé le 6 octobre)
- `6eme / donnees-et-probabilites / flashcards[6].front` : ajout de « avec un dé équilibré » (le verso répond 1/6)
- `6eme / triangles / mindmap.branches[2].children[2]` : « aigus : 90° » → « rectangle : 2 aigus = 90° » (lue seule, l'étiquette laissait croire qu'un angle aigu vaut 90°)
- `6eme / objets-techniques-besoins-et-fonctions / resume.sections[4].exemple` : « bougie → lampe à huile → … » → « lampe à huile → bougie → … » (la lampe à huile date de la Préhistoire, la bougie de l'Antiquité)
- `6eme / objets-techniques-besoins-et-fonctions / mindmap.branches[3].children[2]` : « bougie à LED » → « de la bougie à la LED » (se lisait comme une bougie électronique)
- `6eme / la-cellule / quiz[0].explanation` : « …végétales (et certains micro-organismes) » → « …végétales (ainsi que chez les champignons et certains micro-organismes) »
- `6eme / classer-les-etres-vivants / quiz[1].explanation` : « Elle respire avec des poumons et allaite ses petits : ce sont des attributs des mammifères. » → « Elle a des mamelles et allaite ses petits : c'est l'attribut des mammifères. Elle respire avec des poumons, pas avec des branchies. » (les poumons ne sont pas un attribut des mammifères ; oiseaux et amphibiens, proposés dans les choix, en ont aussi)
- `6eme / chretiens-dans-l-empire / flashcards[0].back` : « une province de l'Empire romain » → « une région dominée par l'Empire romain » (royaume client à la naissance de Jésus, province en 6 apr. J.-C.)
- `6eme / emc-representer-les-autres / quiz[6].explanation` : « l'Ecclésia et le Sénat appartiennent à l'Antiquité » → « l'Ecclésia appartient à l'Antiquité et le Sénat est l'une des deux assemblées du Parlement »

## Doutes pour un prof (rien n'a été modifié)

1. **`6eme / emc-droit-a-la-vie-privee`** : le chapitre donne la règle de 2018 (accord d'un parent avant 15 ans pour les réseaux sociaux). Une loi interdisant les réseaux sociaux aux moins de 15 ans a été débattue en 2026. À vérifier : si elle est en vigueur, le résumé et les keyPoints deviennent faux. Le réseau de la session ne permettait pas de le vérifier.
2. **`6eme / emc-droit-a-la-vie-privee`** : le 3018 est présenté comme le numéro unique contre le harcèlement, à l'école comme en ligne. Dispositif récent, à confirmer.
3. **`6eme / emc-laicite-a-l-ecole`** : « l'État ne reconnaît et ne finance aucun culte » ne dit rien de l'exception d'Alsace-Moselle (concordat).
4. **`6eme / revolution-neolithique`** : la sédentarisation est présentée comme une conséquence de l'agriculture, alors que les Natoufiens ont des villages avant elle. C'est une simplification de manuel.
5. **`3eme / transformations-homotheties`, carte mentale « Déplacements »** (relecture de nuit) : la symétrie axiale n'est pas un déplacement. « Isométries » serait plus juste.
6. **`6eme / etats-de-la-matiere / quiz[5]`** : « sous la pression atmosphérique normale » n'est pas écrit dans la question. C'est dit dans la flashcard et le résumé.
7. **`6eme / donnees-et-probabilites / resume.pieges[0]`** : le piège suppose un dé équilibré, mais le résumé le dit juste avant.

## Illustrations : à savoir

- Le calligramme « Il pleut » (6e et 3e) est très haut : environ deux écrans de téléphone. Une version plus compacte, en colonnes moins espacées, serait plus confortable.
- Les 9 ressources toujours manquantes (œuvres, photos, climatogrammes) demandent l'accès réseau à Wikimedia, Gallica et Météo-France (voir `docs/illustrations-rapport-lots-2-3.md`).
