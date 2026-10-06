# Relecture IA : Géographie (6e, 5e, 4e, 3e)

- Chapitres relus : **50** (13 en 6e, 12 en 5e, 13 en 4e, 12 en 3e), chaque fichier lu en entier
- Chapitres corrigés : **19**
- Corrections : **41** dans les chapitres, plus **11** dans le texte de référence des catalogues (pour que ces erreurs ne reviennent pas à la régénération ; le champ `relu` reste à `false`)
- Vérification `verifier-programme.mjs geographie` : 50 valides, 0 invalide

**Verdict.** Le contenu est juste, au niveau et conforme aux programmes de 2015 ajustés en 2020 (toujours en vigueur en histoire-géographie à la rentrée 2026). Aucune réponse de quiz n'est fausse à l'index `correct`. Les corrections portent sur des chiffres datés (zone euro, réchauffement, tourisme, population des États-Unis), deux erreurs de localisation (Grande Muraille verte, dorsale « de l'UE » qui inclut Londres) et des formulations imprécises.

## Corrections

Les chiffres actualisés ont été vérifiés en ligne : entrée de la Bulgarie dans l'euro au 1er janvier 2026 (Conseil de l'UE, BCE) ; réchauffement de long terme estimé à 1,34-1,41 °C par l'OMM (rapport sur l'état du climat, 2025) ; 1,46 milliard d'arrivées de touristes internationaux en 2019 (OMT, annoncé « 1,5 milliard ») ; 304 millions de migrants internationaux en 2024 (ONU, International Migrant Stock 2024).

### Chapitres

- `6eme / se-reperer-sur-la-terre / flashcards[3].back` : « qui passe près de Londres » → « qui passe par Greenwich, un quartier de Londres » (Greenwich est dans Londres)
- `6eme / se-reperer-sur-la-terre / quiz[6].explanation` : « L'Amérique est entièrement dans l'hémisphère Ouest. » → « L'Amérique est presque entièrement dans l'hémisphère Ouest. » (les îles Aléoutiennes dépassent le 180e méridien)
- `6eme / se-reperer-sur-la-terre / resume.keyPoints[1]` : « environ 71 % de la Terre » → « environ 71 % de la surface de la Terre » (précision)
- `6eme / se-reperer-sur-la-terre / mindmap.branches[0].detail` : « La Terre compte six continents et cinq océans qui couvrent 71 % de sa surface. » → « La Terre compte six continents et cinq océans ; les océans couvrent environ 71 % de sa surface. » (formulation ambiguë (continents + océans = 71 %))
- `6eme / habiter-un-espace-agricole-de-faible-densite / flashcards[7].back` : « ni pesticides ni engrais chimiques. » → « ni pesticides ni engrais chimiques de synthèse. » (le bio autorise des traitements naturels)
- `6eme / habiter-un-espace-agricole-de-faible-densite / quiz[1].explanation` : « Le Middle West, ou « ceinture du maïs », produit » → « Le Middle West, où se trouve la Corn Belt (« ceinture du maïs »), produit » (Corn Belt = partie du Middle West)
- `6eme / habiter-un-espace-de-grande-biodiversite / flashcards[3].back` : « Les Amérindiens, qui vivaient sur ce territoire avant l'arrivée des colonisateurs. » → « Les Amérindiens, qui vivent sur ce territoire depuis bien avant l'arrivée des colonisateurs. » (ils y vivent toujours (imparfait trompeur))
- `6eme / habiter-un-espace-de-grande-biodiversite / resume.sections[0].content` : « elle abrite une grande partie des espèces vivantes connues. » → « elle abrite environ 10 % des espèces vivantes connues. » (chiffre courant (WWF) plutôt qu'une formule vague)
- `6eme / la-repartition-de-la-population-mondiale / quiz[2].explanation` : « avec environ 300 millions d'habitants chacun. » → « avec respectivement environ 340 et 285 millions d'habitants. » (États-Unis ≈ 340 M (2025), « 300 M chacun » trop approximatif)
- `6eme / la-ville-de-demain / flashcards[4].back` : « Des déplacements sans moteur ou peu polluants : la marche, le vélo, la trottinette. » → « Des déplacements sans moteur, qui utilisent la seule énergie humaine : la marche, le vélo, la trottinette. » (« ou peu polluants » contredisait le quiz (la voiture électrique n'est pas une mobilité douce))
- `5eme / la-croissance-de-la-population-mondiale / quiz[6].question` : « Que montre un graphique où la courbe de population monte de moins en moins fort après 1970 ? » → « Que montre un graphique où la courbe de population continue de monter, mais de moins en moins fort ? » (la courbe mondiale ne s'infléchit visiblement qu'après 1990 (seul le taux baisse dès la fin des années 1960))
- `5eme / la-transition-demographique / quiz[0].explanation` : « Le 0,1 compense les décès d'enfants. » → « Le 0,1 compense le fait qu'il naît un peu plus de garçons que de filles et que certains enfants meurent avant l'âge adulte. » (explication incomplète : le 0,1 tient d'abord au rapport de masculinité à la naissance)
- `5eme / le-developpement-durable / resume.keyTerms[0].def` : « Développement qui préserve les besoins des générations futures. » → « Développement qui répond aux besoins actuels sans compromettre ceux des générations futures. » (définition bancale (on ne « préserve » pas des besoins))
- `5eme / les-effets-regionaux-du-changement-climatique / flashcards[7].back` : « Un projet de reboisement de part et d'autre du Sahara pour lutter contre la désertification au Sahel. » → « Un projet de reboisement et de restauration des terres, du Sénégal à Djibouti, au sud du Sahara, pour lutter contre la désertification au Sahel. » (la Grande Muraille verte ne borde que le sud du Sahara (Sahel))
- `4eme / l-adaptation-du-territoire-des-etats-unis / quiz[2].explanation` : « Le Texas, comme la Californie et la Floride, est au Sud. » → « Le Texas fait partie de la Sun Belt, comme la Californie (à l'Ouest) et la Floride. » (la Californie n'est pas « au Sud »)
- `4eme / l-adaptation-du-territoire-des-etats-unis / resume.keyTerms[1].def` : « Ancienne région industrielle du Nord-Est en déclin. » → « Ancienne région industrielle du Nord-Est et des Grands Lacs, en déclin. » (cohérence avec la flashcard (Detroit, Pittsburgh))
- `4eme / l-afrique-de-l-ouest-dans-la-mondialisation / flashcards[2].back` : « Une zone semi-aride située au bord du Sahara, au nord de l'Afrique de l'Ouest. » → « Une zone semi-aride qui borde le sud du Sahara, dans le nord de l'Afrique de l'Ouest. » (préciser que le Sahel est au sud du Sahara)
- `4eme / l-afrique-de-l-ouest-dans-la-mondialisation / resume.sections[1].content` : « or et uranium (Niger) » → « or (Ghana, Mali) et uranium (Niger) » (l'or vient surtout du Ghana et du Mali, pas du Niger)
- `4eme / la-croissance-urbaine-dans-le-monde / quiz[0].choices[2]` : « Les années 2007-2008 » → « La fin des années 2000 » (« les années 2007-2008 » est incorrect en français ; homogène avec les autres choix)
- `4eme / les-etats-unis-puissance-de-la-mondialisation / flashcards[0].back` : « Plus de 330 millions » → « Plus de 340 millions » (chiffre actualisé (≈ 340 M en 2024-2025))
- `4eme / les-etats-unis-puissance-de-la-mondialisation / resume.sections[0].content` : « plus de 330 millions d'habitants » → « plus de 340 millions d'habitants » (chiffre actualisé)
- `4eme / les-etats-unis-puissance-de-la-mondialisation / mindmap.branches[0].children[1]` : « 330 millions d'habitants » → « 340 millions d'habitants » (chiffre actualisé)
- `4eme / un-monde-de-migrants / quiz[3].explanation` : « L'Inde et les pays du Golfe sont deux pays du Sud. » → « L'Inde et les pays du Golfe sont classés parmi les pays du Sud. » (« deux pays » alors que les pays du Golfe sont plusieurs)
- `4eme / un-monde-de-migrants / quiz[0].explanation` : « Avec environ 281 millions de personnes en 2020, les migrants » → « Avec environ 281 millions de personnes en 2020 (environ 304 millions en 2024 selon l'ONU), les migrants » (ajout du chiffre le plus récent, la part restant d'environ 3,6-3,7 %)
- `3eme / amenager-le-territoire / resume.sections[0].content` : « La DATAR, créée en 1963, crée des métropoles d'équilibre (1964), des villes nouvelles et aménage le littoral languedocien. » → « Avec la DATAR, créée en 1963, l'État crée des métropoles d'équilibre (1964), des villes nouvelles et aménage le littoral languedocien. » (les villes nouvelles et la mission Racine ne relèvent pas de la seule DATAR)
- `3eme / contrastes-et-cohesion-dans-l-ue / flashcards[0].back` : « L'axe urbain le plus riche et le plus peuplé de l'UE, du sud-est de l'Angleterre au nord de l'Italie » → « L'axe urbain le plus riche et le plus peuplé d'Europe, du sud-est de l'Angleterre (hors de l'UE depuis le Brexit) au nord de l'Italie » (Londres n'est plus dans l'UE depuis 2020)
- `3eme / contrastes-et-cohesion-dans-l-ue / resume.keyTerms[0].def` : « Axe le plus riche et peuplé de l'UE, de Londres à Milan. » → « Axe le plus riche et peuplé d'Europe, de Londres à Milan. » (Londres n'est plus dans l'UE depuis 2020)
- `5eme / le-changement-global-et-climatique / flashcards[5].back` : « D'environ 1,1 à 1,2 °C. » → « D'environ 1,3 à 1,4 °C, selon l'Organisation météorologique mondiale (2025). » (réchauffement de long terme estimé à 1,34-1,41 °C par l'OMM (2025) ; 1,1-1,2 °C était l'estimation du GIEC pour 2011-2020)
- `5eme / le-changement-global-et-climatique / resume.keyPoints[2]` : « +1,1 à 1,2 °C depuis la fin du XIXe siècle » → « +1,3 à 1,4 °C depuis la fin du XIXe siècle » (réchauffement de long terme estimé à 1,34-1,41 °C par l'OMM (2025) ; 1,1-1,2 °C était l'estimation du GIEC pour 2011-2020)
- `5eme / le-changement-global-et-climatique / resume.sections[1].content` : « la Terre s'est réchauffée d'environ 1,1 à 1,2 °C. » → « la Terre s'est réchauffée d'environ 1,3 à 1,4 °C depuis la fin du XIXe siècle. » (réchauffement de long terme estimé à 1,34-1,41 °C par l'OMM (2025) ; 1,1-1,2 °C était l'estimation du GIEC pour 2011-2020)
- `5eme / le-changement-global-et-climatique / mindmap.branches[1].children[0]` : « +1,1 à 1,2 °C » → « +1,3 à 1,4 °C » (réchauffement de long terme estimé à 1,34-1,41 °C par l'OMM (2025) ; 1,1-1,2 °C était l'estimation du GIEC pour 2011-2020)
- `4eme / le-tourisme-un-phenomene-mondial / flashcards[2].back` : « Environ 1,4 milliard. » → « Près de 1,5 milliard. » (OMT/ONU Tourisme : 1,46 milliard d'arrivées en 2019 (annoncé « 1,5 milliard »))
- `4eme / le-tourisme-un-phenomene-mondial / quiz[0].choices[1]` : « Environ 140 millions » → « Environ 150 millions » (distracteur aligné sur la nouvelle bonne réponse)
- `4eme / le-tourisme-un-phenomene-mondial / quiz[0].choices[2]` : « Environ 1,4 milliard » → « Environ 1,5 milliard » (OMT/ONU Tourisme : 1,46 milliard d'arrivées en 2019 (annoncé « 1,5 milliard »))
- `4eme / le-tourisme-un-phenomene-mondial / quiz[0].explanation` : « à environ 1,4 milliard en 2019 » → « à près de 1,5 milliard en 2019 » (OMT/ONU Tourisme : 1,46 milliard d'arrivées en 2019 (annoncé « 1,5 milliard »))
- `4eme / le-tourisme-un-phenomene-mondial / resume.keyPoints[0]` : « 1,4 milliard en 2019 » → « près de 1,5 milliard en 2019 » (OMT/ONU Tourisme : 1,46 milliard d'arrivées en 2019 (annoncé « 1,5 milliard »))
- `4eme / le-tourisme-un-phenomene-mondial / resume.sections[0].content` : « à 1,4 milliard en 2019 » → « à près de 1,5 milliard en 2019 » (OMT/ONU Tourisme : 1,46 milliard d'arrivées en 2019 (annoncé « 1,5 milliard »))
- `4eme / le-tourisme-un-phenomene-mondial / mindmap.branches[0].children[1]` : « 1,4 milliard en 2019 » → « 1,5 milliard en 2019 » (OMT/ONU Tourisme : 1,46 milliard d'arrivées en 2019 (annoncé « 1,5 milliard »))
- `3eme / union-europeenne-territoire-de-reference / flashcards[4].back` : « la zone euro compte aujourd'hui 20 pays. » → « la zone euro compte 21 pays depuis l'entrée de la Bulgarie, le 1er janvier 2026. » (la Bulgarie a adopté l'euro le 1er janvier 2026 : 21 pays)
- `3eme / union-europeenne-territoire-de-reference / quiz[1].explanation` : « 20 est le nombre de pays de la zone euro. » → « La zone euro, elle, compte 21 pays depuis 2026. » (la Bulgarie a adopté l'euro le 1er janvier 2026 : 21 pays)
- `3eme / union-europeenne-territoire-de-reference / mindmap.branches[1].children[1]` : « zone euro : 20 » → « zone euro : 21 » (la Bulgarie a adopté l'euro le 1er janvier 2026 : 21 pays)

### Catalogues (`src/data/programme/<classe>/geographie.json`, champ `reference`)

- `6eme / catalogue geographie.json / reference` : « méridien de longitude 0°, passant près de Londres » → « méridien de longitude 0°, passant par Greenwich, un quartier de Londres » (Greenwich est dans Londres)
- `6eme / catalogue geographie.json / reference` : « Mobilités douces : déplacements sans moteur ou peu polluants : marche » → « Mobilités douces : déplacements sans moteur, qui utilisent l'énergie humaine : marche » (cohérence avec le chapitre)
- `6eme / catalogue geographie.json / reference` : « agriculture biologique (sans pesticides ni engrais chimiques) » → « agriculture biologique (sans pesticides ni engrais chimiques de synthèse) » (le bio autorise des traitements naturels)
- `5eme / catalogue geographie.json / reference` : « La température moyenne de la Terre a augmenté d'environ 1,1 à 1,2 °C depuis la fin du XIXe siècle (période 1850-1900). » → « La température moyenne de la Terre a augmenté d'environ 1,3 à 1,4 °C depuis la fin du XIXe siècle (période 1850-1900), selon l'OMM (2025). » (chiffre actualisé)
- `5eme / catalogue geographie.json / reference` : « Grande Muraille verte au Sahel (reboisement de part et d'autre du Sahara) » → « Grande Muraille verte au Sahel (reboisement et restauration des terres du Sénégal à Djibouti, au sud du Sahara) » (la Muraille ne borde que le sud du Sahara)
- `4eme / catalogue geographie.json / reference` : « environ 1,4 milliard en 2019 » → « près de 1,5 milliard en 2019 » (chiffre OMT 2019)
- `4eme / catalogue geographie.json / reference` : « plus de 330 millions d'habitants (3e pays le plus peuplé) » → « plus de 340 millions d'habitants (3e pays le plus peuplé) » (chiffre actualisé)
- `4eme / catalogue geographie.json / reference` : « or, uranium (Niger), coton » → « or (Ghana, Mali), uranium (Niger), coton » (l'or ne vient pas du Niger)
- `4eme / catalogue geographie.json / reference` : « Environ 281 millions de migrants internationaux en 2020 (ONU, OIM), soit environ 3,6 % de la population mondiale » → « Environ 281 millions de migrants internationaux en 2020 (ONU, OIM), soit environ 3,6 % de la population mondiale (environ 304 millions en 2024, soit 3,7 %) » (chiffre le plus récent)
- `3eme / catalogue geographie.json / reference` : « la zone euro compte 20 pays. » → « la zone euro compte 21 pays (entrée de la Bulgarie le 1er janvier 2026). » (Bulgarie dans l'euro depuis 2026)
- `3eme / catalogue geographie.json / reference` : « créée en 1963 pour piloter l'aménagement. Réalisations : métropoles d'équilibre » → « créée en 1963 pour piloter l'aménagement. Grandes réalisations de l'État aménageur à cette époque : métropoles d'équilibre » (villes nouvelles et mission Racine ne relèvent pas de la seule DATAR)

## Doutes pour un prof

1. **Deux résumés `metadata.excerpt` ne correspondent plus au contenu corrigé.** Je n'y ai pas touché (consigne). Il faut les mettre à jour à la main avant de régénérer `index.json` :
   - `5eme / le-changement-global-et-climatique` : « environ 1,1 à 1,2 °C » → « environ 1,3 à 1,4 °C ».
   - `4eme / le-tourisme-un-phenomene-mondial` : « environ 1,4 milliard en 2019 » → « près de 1,5 milliard en 2019 ».
2. **Réchauffement climatique (5e).** J'ai remplacé « 1,1 à 1,2 °C » (estimation du GIEC pour 2011-2020) par « 1,3 à 1,4 °C » (estimation de l'OMM en 2025). Beaucoup de manuels citent encore « +1,1 °C » ; un prof peut préférer l'ancien chiffre, à condition de le dater (« vers 2020 »).
3. **Faim dans le monde (5e, insécurité alimentaire).** « Environ 700 millions » est conservé. Le rapport SOFI 2025 de la FAO donne 673 millions pour 2024 (fourchette 638-720). On pourrait écrire « environ 670 millions », mais il faudrait aussi modifier le résumé `metadata`.
4. **Migrations Sud-Sud (4e, un monde de migrants, quiz 3).** L'exemple « Inde → pays du Golfe » classe les monarchies du Golfe dans le « Sud ». C'est l'usage des manuels, mais ce sont des pays à revenu élevé, ce qui se discute.
5. **Pilier du développement durable (5e, quiz 2).** « Créer des emplois » est rangé dans le pilier économique ; certains manuels le mettent dans le pilier social. L'explication le reconnaît. Je l'ai laissé.
6. **Question de méthode (6e, espace à fortes contraintes, quiz 6).** L'« ordre logique » milieu → contraintes → adaptations → aménagements est une convention de cours, pas un fait. La réponse attendue reste la seule raisonnable.
7. **Hors programme partiel (4e, les États-Unis, une puissance dans la mondialisation).** Le programme de 4e porte sur l'adaptation du territoire américain à la mondialisation. L'angle « puissance » (soft power, hard power) relève plutôt du lycée (HGGSP). Il est acceptable comme contexte, mais il est à signaler.
8. **Exode rural (3e, espaces de faible densité).** « De la fin du XIXe siècle aux années 1970 » : de nombreux auteurs le font partir du milieu du XIXe siècle. La formulation reste défendable, donc je ne l'ai pas modifiée.
9. **Diagonale des faibles densités.** On lit « des Ardennes aux Pyrénées » en 6e et « jusqu'aux Landes » en 3e. Les deux formulations existent dans les manuels ; je ne les ai pas harmonisées.
10. **Programmes à venir.** Le CSP a publié en juin 2025 un projet de programmes d'histoire-géographie pour les cycles 3 et 4. D'après ce que j'ai trouvé, il n'est pas entré en vigueur à la rentrée 2026 (les programmes de 2015/2020 s'appliquent toujours). Il faudra revoir les catalogues quand il paraîtra au BO.

## Points forts / faiblesses récurrentes

- **Points forts :** aucune clé de quiz fausse, de bons distracteurs (pièges classiques expliqués), des repères officiels exacts (Montego Bay, loi Littoral, DATAR, PPRT, définitions INSEE 2020 des aires d'attraction des villes avec le seuil de 15 %), une langue propre et un ton sobre.
- **Faiblesse n°1 : des chiffres figés vers 2020-2023** (zone euro à 20, +1,1 °C, 330 millions d'Américains, tourisme 2019). Il faudra les actualiser régulièrement, ou les dater systématiquement (« en 2024 »).
- **Faiblesse n°2 : de petits glissements de localisation ou de périmètre.** Exemples : « de part et d'autre du Sahara », « dorsale de l'UE » incluant Londres après le Brexit, or attribué au Niger, Californie « au Sud ».
- **Faiblesse n°3 : des formulations un peu absolues** (« entièrement », « sans pesticides ») ou imprécises (« le 0,1 compense les décès d'enfants »), à nuancer d'un mot.
