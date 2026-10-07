# Résumés enrichis : doutes à soumettre à un prof

_7 octobre 2026. La partie « résumé » de 347 chapitres (6e → 3e, toutes matières sauf la technologie, dont le programme est à refaire) a été réécrite par 14 sous-agents Claude Opus 5.5 avec `scripts/programme/resumes.mjs`. Chaque résumé est parti du résumé déjà relu (voir [README.md](README.md)) et a été validé avant écriture. Il a maintenant une section par notion du catalogue (5 ou 6 sections), un exemple dans 90 % des sections (1 864 sur 2 069), une méthode dans 330 chapitres et 2 ou 3 pièges à éviter. Flashcards, quiz et cartes mentales n'ont pas été touchés (contrôle d'intégrité : 0 autre champ modifié). Le champ `relu` des catalogues reste à `false`._

Les sections ci-dessous reprennent les rapports des sous-agents, matière par matière. Elles distinguent deux choses :
- les **doutes**, à faire trancher par un professeur de la matière ;
- les **erreurs dans la référence du catalogue** (`src/data/programme`). Elles ne sont pas corrigées dans le catalogue, mais elles sont déjà évitées dans le résumé.

## Physique-chimie 3e — 13/13
Doutes prof :
- univers-et-elements-chimiques : « planètes géantes, dites gazeuses » au lieu de « gazeuses ».
- puissance-et-energie-electriques : prix fictif 0,20 €/kWh (signalé comme tel) ; multiprise 16 A.
- Déjà au rapport de relecture, gardés : « masse = quantité de matière » (gravitation-et-poids), rendement (production-energie-electrique), principe d'inertie (forces-et-interactions).
Erreur dans la référence du catalogue :
- univers-et-elements-chimiques : « éléments de la Terre et du vivant (C, H, O, N…) fabriqués dans les étoiles » — l'hydrogène vient du Big Bang (la référence le dit plus haut). Résumé limité à C, O, N.

## Français 4e-3e — 27/27
Doutes prof :
- 3e/se-raconter-se-representer : Perec, « Je n'ai pas de souvenirs d'enfance. » (W ou le souvenir d'enfance) cité de mémoire — c'est bien la phrase connue du chapitre II, à confirmer.
- 3e/progres-et-reves-scientifiques : « Big Brother vous regarde » dépend de la traduction de 1984.
- 3e/denoncer-les-travers-de-la-societe : Montesquieu en orthographe modernisée.
Erreurs dans la référence du catalogue :
- 4e/la-ville-lieu-de-tous-les-possibles : « pieuvre » de Verhaeren classée personnification (c'est une animalisation / métaphore animale) — piège ajouté.
- 3e/discours-rapporte : « demain → le lendemain » sans préciser verbe introducteur au passé.

## Anglais 4e-3e — 25/25
Doutes prof :
- 3eme/preterit-simple-et-continu : ancien exemple « They were dancing when the ship hit the iceberg » retiré (non attesté), remplacé par ceux de la référence.
- 3eme/futur-et-projets : piège ajouté « When I'm older » (pas de will après when).
Erreurs dans la référence du catalogue :
- 3eme/discours-indirect-et-medias : BBC « Corporation fondée en 1922 » — Company en 1922, Corporation en 1927 ; résumé : « née en 1922 ».
- 3eme/voix-passive-et-inventions : « invented by Bell » discutable (Meucci, Gray) ; résumé : « brevet déposé par Bell ».
- 3eme/comparatif-et-superlatif : « the most populated state » → « the most populous state ».

## Géographie 6e-5e — 25/25
Doutes prof :
- 5e/l-insecurite-alimentaire : « environ 700 millions » gardé (FAO : 673 millions en 2024).
- 5e/la-croissance-de-la-population-mondiale : « ralentit depuis les années 1970 » (taux en baisse dès la fin des années 1960, inflexion visible après 1990).
Erreurs dans la référence du catalogue :
- 5e/l-eau-une-ressource-a-menager : 3,5 milliards sans assainissement sûr → 3,4 milliards (OMS-Unicef JMP 2025, données 2024), corrigé et daté dans le résumé.
- 5e/prevenir-les-risques-industriels-et-technologiques : « aléa × vulnérabilité (enjeux exposés) » confond enjeux et vulnérabilité.
- 6e/habiter-un-espace-a-fortes-contraintes et habiter-un-espace-de-grande-biodiversite : formulations à l'imparfait (« les Inuits vivaient… ») qui figent des peuples vivants.
- 5e/le-changement-global-et-climatique : « 2024 est l'année la plus chaude » vieillira ; résumé : « a battu le record ».

## SVT 3e + Sciences et technologie 6e — 27/27
Vaccins vérifiés : 11 obligatoires depuis 2018 + méningocoques ACWY (remplace C) et B depuis le 1er janvier 2025 ; pas de nouveau total donné.
Doutes prof :
- 3e vaccination : exemple rougeole en France 2008-2011 (« des milliers de personnes »), hors référence.
- 3e information-genetique : exemple de la brebis Dolly ajouté (hors référence).
- 6e developpement-et-reproduction : puberté « vers 10 à 16 ans » vs catalogue 4e (8-13 filles, 9-14 garçons).
Erreur dans la référence du catalogue :
- 6e la-terre-dans-le-systeme-solaire : Lune « tourne autour de la Terre en environ 29,5 jours » = cycle des phases ; révolution ≈ 27,3 jours. Résumé corrigé.

## Anglais 6e-5e — 24/24
Doutes prof :
- 5eme/le-comparatif : « 2 syllabes → more » simplifié (cleverer, quieter) → « la plupart des adjectifs de deux syllabes ».
- 5eme/superlatif-irlande : « indépendante depuis 1922 » (État libre 1922, république 1949).
- 6eme/fetes-et-traditions : méthode « présenter une fête » ajoutée hors référence.
Erreurs dans la référence du catalogue :
- 5e superlatif-irlande : « membre de l'UE depuis 1973 » → CEE en 1973, UE en 1993.
- 6e londres-imperatif-directions : Buckingham « résidence du roi » → résidence officielle (le roi vit à Clarence House).

## Géographie 4e-3e — 25/25
Corrections de relecture conservées : zone euro à 21 (2026), ≈ 1,5 milliard de touristes, 340 millions d'Américains, 304 millions de migrants.
Doutes prof :
- la-croissance-urbaine-dans-le-monde : l'ONU a changé de méthode (nov. 2025 : villes = 45 % de l'humanité, 33 mégapoles) ; gardé « plus de la moitié depuis 2007-2008 » comme la référence.
- dynamiques-des-espaces-urbains : loi TRACE révise le ZAN ; objectif 2050 cité maintenu.
- territoires-ultramarins : statut de la Nouvelle-Calédonie en évolution (accord de Bougival, 2025).
Erreurs / incohérences dans la référence :
- l-adaptation-du-territoire-des-etats-unis : « l'Asie premier partenaire commercial » (par pays, c'est le Mexique).
- ZEE française « environ 10 millions de km² » (4e) vs « plus de 10 millions » (3e).

## SVT 5e-4e — 24/24
Doutes prof :
- 4e/risques-geologiques : « Haïti 2010, plus de 200 000 morts » (référence ; estimations très variables selon les sources).
- 4e/mouvement-commande-nerveuse : « réflexe = moelle épinière » gardé (simplification, illustré par le réflexe rotulien).
- 4e/maitrise-procreation-ist : contraception d'urgence « gratuite » — vérifié : gratuite pour toutes depuis 2023 (la référence dit « gratuite et anonyme pour les mineures »).
Erreurs dans la référence du catalogue :
- 5e/peuplement-des-milieux : l'expérience des cloportes fait varier deux facteurs à la fois, juste avant la règle « un seul facteur » ; le résumé donne la version correcte.
- 4e/maitrise-procreation-ist : fausse détection de « méthode attendue » par l'outil (« Autres méthodes hormonales : ») — détection corrigée ; méthode « argumenter » (notion 6).
- Déjà signalés : intestin grêle « 6 à 7 m » (non repris), « échelle de Richter » (« souvent appelée »).

## Histoire-EMC 6e-5e — 22/22
Doutes prof :
- 6eme/emc-droit-a-la-vie-privee : selon l'agent, le Conseil constitutionnel a censuré le 14/08/2026 l'interdiction des réseaux sociaux avant 15 ans (nouveau texte attendu avant le printemps 2027) — non vérifié par moi ; règle des 15 ans pour le consentement aux données gardée. Chapitre à revoir.
- 5eme/emc-solidarite : RSA peut-être remplacé par l'allocation sociale unique en 2027 → « revenu minimum » sans le nommer.
- 6eme/chretiens-dans-l-empire : « né en Judée, région dominée par Rome » (prudence Galilée/Judée).
Erreurs dans la référence du catalogue :
- 5eme/emc-egalite… : « jusqu'à 3 ans et 45 000 euros » → maximum 5 ans et 75 000 € dans les cas aggravés.
- 6eme/emc-representer-les-autres : conseil de classe pas toujours trimestriel (semestres).
- 5eme/emc-solidarite : Sécurité sociale financée aussi par la CSG, pas seulement les cotisations.

## Maths 6e-5e — 28/28
Tous les calculs refaits. Corrections de relecture conservées.
Doutes prof :
- 5eme/proportionnalite : produit en croix demandé par le catalogue, plutôt 4e selon les repères 2019.
- 5eme/pensee-informatique : variables et « si… alors… sinon » plutôt 4e (doute 4 du rapport) ; gardés car demandés par le catalogue.
- 6eme/triangles et 6eme/fractions-sens-et-quotient : « hypoténuse » et « nombre mixte » gardés, non exigés en 6e.
Référence : coquille « si et seulement si il » (5eme/droites-remarquables-du-triangle), corrigée dans le résumé.

## Français 6e-5e — 28/28
Doutes prof :
- 5e types-et-formes-de-phrases : forme passive gardée (déjà signalée comme notion de 4e).
- 6e creer-recreer-le-monde : sens des symboles (lumière, eau, souffle) ajouté hors référence.
- 5e classes-de-mots : « on dit aussi antécédent » ajouté à « référent ».
- 5e devenir-heroine-heros : romans cités sans « du programme ».
Erreurs dans la référence du catalogue :
- 5e theatre-societe-sens-dessus-dessous : « corriger les mœurs en divertissant » → Molière : « corriger les hommes en les divertissant » (premier placet sur Tartuffe) ; résumé avec la version exacte.
- 6e chanter-et-enchanter-le-monde : « vers sans rime » dans la référence vs quiz corrigé (« rimes obligatoires ») — à regarder.
- 5e devenir-heroine-heros : « perd en superbe et gagne en banalité » entre guillemets sans source, non repris.

## Physique-chimie 5e-4e — 25/25
Doutes prof :
- 4eme/lois-de-l-intensite : bouilloire ≈ 9 A, radiateur ≈ 7 A (calculés : 2 000 W et 1 500 W sous 230 V ; 1 500/230 ≈ 6,5 A).
- 5eme/systeme-solaire-et-univers : « un 29 février tous les 4 ans » (simplification, exceptions séculaires).
- 5eme/masse-volume-masse-volumique : « la masse mesure la quantité de matière » (déjà au rapport de relecture).
Erreurs dans la référence du catalogue :
- 4eme/transformation-physique-ou-chimique : « vinaigre » comme réactif (mélange) → « acide acétique (du vinaigre) ».
- 4eme/conservation-de-la-masse : vinaigre + bicarbonate en « flacon fermé » = montée en pression, dangereux ; résumé : version avec ballon de baudruche sur le goulot. À corriger dans le catalogue (sécurité).

## Maths 4e-3e — 28/28
Calculs refaits ; flashcards/quiz/cartes vérifiés intacts.
Doutes prof :
- 3eme/equations-et-inequations : inéquations hors programme 2020 (déjà signalé), traitées car demandées par le catalogue.
- 3eme/puissances-et-racines-carrees : règles générales sur les puissances au-delà des attendus (gardées, avec « revenir à la définition »).
- 4eme/developper-et-factoriser : conseil de tester avec x = 2 ou 3 plutôt que x = 1 (contre la référence).
Erreurs dans la référence du catalogue :
- 3eme/calcul-litteral : « 6x + 9 toujours multiple de 3 » seulement si x entier (précisé dans le résumé).
- 3eme/theoreme-de-thales : « petit triangle AMN » faux en configuration papillon.
- 4eme/nombres-premiers : « 47 = 6 × 7 + 5 » ambigu → « division de 47 par 6 ».
- 3eme/transformations-homotheties : une droite passant par le centre a pour image elle-même.

## Histoire-EMC 4e-3e — 25/25 (+ Révolution française, faite à la main comme exemple)
Corrections de relecture conservées (Stalingrad, Nuremberg, SNU, tiers-monde, BRICS, esclavage rétabli par Bonaparte).
Doutes prof :
- 4e emc-securite-et-defense-nationale / 3e emc-engagement-collectif : « JDC, renommée journée de mobilisation en 2026 » — loi n° 2026-791 du 16 août 2026 vérifiée (Légifrance, LCP) ; mise en place progressive.
- 3e monde-apres-1989 : Rwanda « au moins 800 000 morts » ; invasion de l'Ukraine (2022) ajoutée hors référence.
- 4e troisieme-republique : lois Ferry = instruction obligatoire, pas l'école.
Erreurs dans la référence du catalogue :
- 4e emc-securite et 3e emc-engagement-collectif : citent encore la « JDC ».
- 4e europe-revolution-industrielle : « droit de grève reconnu en 1864 » → la loi de 1864 supprime le délit de coalition.

