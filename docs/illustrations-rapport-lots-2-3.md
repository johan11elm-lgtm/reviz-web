# Rapport — illustrations, lots 2 et 3

_Session cloud du 8 octobre 2026, suite de `docs/illustrations-lots-2-3.md`. Branche `illustrations-suite-zcjoog`, un commit par matière._

## En bref

- **119 ressources faites sur 128**, dont une en partie (n° 59) ; **9 non faites**. Les 9 dépendent toutes d'un site bloqué par le réseau de la session : Wikimedia Commons, Gallica, Météo-France, Santé publique France.
- **130 illustrations nouvelles** accrochées aux chapitres. Avec le lot 1, le dépôt en compte **170**.
- `node scripts/programme/illustrations.mjs verifier` répond « 170 illustration(s), aucun problème ».
- `npx vitest run` : 449 tests réussis. Sans variables Firebase, 5 fichiers de test échouent dès l'import (`auth/invalid-api-key`). Avec des valeurs factices (`VITE_FIREBASE_API_KEY=test-key`…), tout passe : c'est l'environnement de la session qui est en cause, pas les illustrations.
- Chaque figure a été relue en PNG à 330 px, à 720 px et à 330 px en mode test. Une relecture d'ensemble sur planche a ensuite fait reprendre 5 figures :
  - Afrique de l'Ouest, Méditerranée et archipel métropolitain : étiquettes qui se chevauchaient ;
  - appareil reproducteur masculin : anatomie refaite ;
  - globe en coupe : cotes déplacées.
- Planche de contrôle : `docs/illustrations-planche.html`, générée par `node scripts/illustrations/planche.mjs`. Ouvre-la depuis le dépôt : les images sont lues dans `public/`.
- `scripts/programme/valider.mjs` n'a jamais été lancé. Dans les chapitres, seul le champ `illustrations` a changé, via `illustrations.mjs ajouter`.

## Conditions de la session (à savoir)

- **Branche** : le travail est poussé sur `illustrations-suite-zcjoog`, la branche imposée par l'environnement cloud, et non sur `illustrations-suite` comme le demandait la consigne. Elle part de `origin/illustrations`.
- **Réseau** : seuls GitHub (dont `raw.githubusercontent.com`) et les registres npm et PyPI répondent. Wikimedia Commons, upload.wikimedia.org, Gallica, l'INSEE, l'ONU, la Banque mondiale, la NASA, la NOAA, Météo-France et les musées sont refusés par le proxy. Conséquences :
  - aucune œuvre ni photo n'a pu être reproduite ;
  - toutes les données chiffrées viennent de copies publiées sur GitHub, avec la source d'origine citée.
- **Playwright** : la version installée attend un navigateur (build 1223) absent de l'image. La commande `rendu` fonctionne grâce à un lien vers le build 1194 présent dans `/opt/pw-browsers`. Le dépôt n'a pas été modifié pour cela.
- **Organisation** : le travail a été réparti entre huit agents, un par groupe de matières. Ils partageaient le guide de style v2, la consigne et les mêmes fonds de carte. J'ai relu toutes leurs figures sur planche avant chaque commit.

## Nouveaux outils

- **`scripts/illustrations/carto.mjs`** a deux nouvelles fonctions :
  - `carteMonde`, un planisphère en projection Natural Earth, avec graticule, parallèles, méridiens et bord ;
  - `carteZone`, pour une région du monde (Lambert azimutale équivalente).
- **Données extraites de Natural Earth** (`extraire-natural-earth.mjs <dossier> monde`) : `monde-pays.json`, `monde-lacs.json`, `monde-fleuves.json` et `allemagne-lander.json`. Dans `monde-pays.json`, les quatre nations du Royaume-Uni sont séparées et la France métropolitaine est distincte des DROM.
- **`_commun.mjs`** : `ecrireSvg(nom, svg, dossier)` peut maintenant écrire ailleurs que dans `3eme/geographie`.
- **Modules et extractions par groupe** :
  - modules : `cartes/_histoire.mjs`, `_empires.mjs`, `_geographie-3e-4e.mjs`, `_geographie-5e-6e.mjs`, `_svt-monde.mjs`, `_anglais-francais.mjs` ; `figures/_maths-3e-4e.mjs`, `_espace.mjs`, `_m56.mjs`, `_pc.mjs` ; `svt/_svt.mjs` ;
  - extractions : `extraire-outre-mer.mjs`, `extraire-etats-unis.mjs`, `extraire-densites-wpp.mjs`, `extraire-tectonique.mjs`, `extraire-fleuves-iles-britanniques.mjs`.
- **Une figure = un script.** Les scripts sont rangés dans :
  - `scripts/illustrations/cartes/` pour les cartes ;
  - `graphiques/` pour les courbes ;
  - `figures/` pour les figures de maths et de physique ;
  - `svt/` pour les schémas de SVT ;
  - la racine de `scripts/illustrations/` pour quelques schémas d'histoire.
  
  Tous les SVG du lot sont régénérables. Les seules exceptions sont les trois plans et schémas d'anglais, l'arbre généalogique et la page d'article de français, qui ont été écrits directement.
- **Figures partagées** (dans `public/programme/illustrations/communs/`) :
  - courbe de la population mondiale (5e et 6e) ;
  - chronophotographies (6e et 5e) ;
  - éprouvette graduée (6e et 5e) ;
  - phases de la Lune (6e et 5e) ;
  - modèle particulaire (5e et 4e) ;
  - calligramme « Il pleut » (6e et 3e).

## Ce qui a été fait, par matière

### Histoire : 18 sur 20
- **6e** :
  - peuplement de la Terre par Homo sapiens ;
  - foyers du Néolithique (avec un zoom sur la diffusion vers l'Europe) ;
  - frise de la Préhistoire, avec deux zooms d'échelle ;
  - démocratie athénienne ;
  - Empire romain en 117 ;
  - plan d'une ville romaine ;
  - Eurasie et routes de la soie.
- **5e** :
  - domaine royal en 987 et vers 1500 ;
  - Europe vers 800 ;
  - monde du XVIe siècle (Colomb, Gama, Magellan ; Charles Quint et Soliman) ;
  - plan d'une seigneurie ;
  - plan d'une ville médiévale ;
  - coupe d'une cathédrale gothique.
- **4e** : commerce triangulaire ; empires coloniaux en 1914.
- **3e** :
  - institutions de la Ve République ;
  - Europe de la guerre froide, avec un encart sur Berlin ;
  - éclatement de la Yougoslavie.
- Les limites historiques sont tracées à partir des pays, départements ou Länder actuels, entiers ou découpés par des polygones simples. Chaque légende dit qu'elles sont schématiques.

### Géographie : 25 sur 27
- **3e** : planisphère des territoires ultramarins, avec les ZEE.
- **4e** :
  - croquis modèle d'une ville (centre, banlieues, périurbain) ;
  - archipel métropolitain mondial ;
  - États-Unis : localisation, et organisation du territoire ;
  - Afrique de l'Ouest dans la mondialisation ;
  - population urbaine et rurale de 1950 à 2050 ;
  - mégapoles en cercles proportionnels ;
  - croquis modèle d'une station balnéaire ;
  - espaces maritimes (Montego Bay) ;
  - migrations en Méditerranée ;
  - routes maritimes.
- **5e** :
  - population mondiale de 1800 à 2100 (aussi en 6e) ;
  - modèle de transition démographique ;
  - pyramides des âges du Niger, de l'Inde et du Japon en 2024 ;
  - température mondiale de 1850 à 2024 ;
  - régions exposées au changement climatique ;
  - population et production agricole de 1961 à 2022.
- **6e** :
  - répartition de la population ;
  - anamorphose en carrés ;
  - croquis « Habiter le monde » et son fond vierge ;
  - densités et espaces peu peuplés ;
  - planisphère des repères, et sa version muette ;
  - globe : latitude et longitude.

### SVT et sciences 6e : 25 sur 27 (n° 49 à 72, 76 à 78), plus le n° 48
- **3e** :
  - caryotypes (garçon ; trisomie 21) ;
  - chromosome à une et deux chromatides ;
  - énergie solaire et latitude ;
  - étapes de la mitose ;
  - arbre de parenté ;
  - ensembles emboîtés ;
  - réponses immunitaires ;
  - neurone et synapse ;
  - rougeole aux États-Unis de 1950 à 2000 ;
  - CO₂ et température de 1850 à 2024 (n° 48).
- **4e** :
  - appareils reproducteurs masculin et féminin ;
  - cycle menstruel ;
  - bloc-diagramme d'un séisme ;
  - sismogramme ;
  - structure du globe ;
  - planisphère des plaques, avec séismes et volcans ;
  - dorsale, subduction et collision ;
  - réseau alimentaire ;
  - pyramide de biomasse.
- **5e** : fréquence cardiaque à l'effort ; coupe géologique ; échelle des temps géologiques.
- **6e** : groupes emboîtés ; cellules animale et végétale ; microscope ; saisons et orbite.

### Maths : 25 sur 25
- **3e** :
  - homothéties de rapports 2 et −0,5 ;
  - frise et rosace à 8 motifs ;
  - sphère coupée par un plan ;
  - sections planes des solides ;
  - globe : latitude de Paris ;
  - arbre de deux lancers de pièce ;
  - tableau des sommes de deux dés.
- **4e** :
  - pyramide régulière ;
  - cône et son patron ;
  - patron de la pyramide ;
  - translation et parallélogramme ;
  - rotation de 90° ;
  - frise et rosace à 6 motifs.
- **5e** :
  - angles formés par deux parallèles et une sécante ;
  - somme des angles du triangle ;
  - droites remarquables ;
  - hauteur extérieure et cercle circonscrit ;
  - symétrie centrale ;
  - nombres relatifs et repère.
- **6e** :
  - rapporteur à 50° ;
  - paires d'angles et bissectrice ;
  - symétrie axiale ;
  - axes de symétrie ;
  - escalier de cubes et ses trois vues ;
  - schéma en barres ;
  - fractions ;
  - guide-âne.
- Toutes les figures sont calculées par script, avec des coordonnées exactes.

### Physique-chimie : 16 sur 16 (n° 105 à 116, plus 73, 74, 75 et 79 de sciences 6e)
- Chronophotographies, en version simple (6e et 5e) et avec échelle (3e).
- Éprouvette graduée.
- Fusion de la glace (6e) ; solidification de l'eau pure et de l'eau salée (5e).
- Phases de la Lune.
- Modèle particulaire ; modèle de l'air et changement d'état.
- Modèles moléculaires.
- Diagramme objets-interactions ; forces à l'échelle.
- Construction de l'ombre ; faisceaux lumineux.
- Séparation des mélanges : filtration et ampoule à décanter ; distillation ; chromatographie.

### Anglais : 6 sur 8
- Royaume-Uni et ses quatre nations.
- Plans de quartier : un pour l'itinéraire (6e), un pour les prépositions (4e).
- Irlande et Wild Atlantic Way.
- Arbre de la famille royale.
- Îles Britanniques : Great Britain, United Kingdom et Irlande.

### Français : 3 sur 4
- Page d'article de presse annotée.
- Calligramme « Il pleut », recomposé en typographie et accroché en 6e et en 3e.

## Sources de données

| Figure | Source | Récupérée via |
|---|---|---|
| Population mondiale 1950-2100, pyramides 2024, densités et populations par pays en 2024 | ONU, World Population Prospects 2024 (variante moyenne) | dépôt GitHub `open-numbers/ddf--unpop--world_population_prospects` (Gapminder) |
| Population mondiale 1800-1940 | Our World in Data (HYDE 3.3, Gapminder) | `owid/co2-data` |
| Population urbaine et rurale, mégapoles 2020 | ONU, World Urbanization Prospects 2018 (fichiers F03, F04, F12) | classeurs ONU d'origine copiés dans le dépôt tiers `mailbox4655/TheGreatGameGlobe` (Git LFS). Empreinte conforme au pointeur LFS, en-têtes ONU présents. **Copie tierce : à revérifier sur le site de l'ONU quand il sera accessible.** |
| Température 1850-2024 | Met Office / CRU, HadCRUT5 5.1.0.0, recalé sur 1850-1900 | copie dans `alexrsanchez/pyClim`, contrôlée contre la série GCAG de `datasets/global-temp` |
| CO₂ | carotte de Law Dome (Etheridge et al., 1998) jusqu'en 1955 ; Mauna Loa (NOAA / Scripps) de 1959 à 2024 | `witch-team/hector` ; `datasets/co2-ppm` |
| Production agricole | FAOSTAT, indice de production agricole brute, Monde | `open-numbers/ddf--unfao--faostat` |
| Rougeole aux États-Unis | Project Tycho (bulletins MMWR du CDC, CC BY 4.0) | paquet R `rafalab/dslabs` |
| Plaques, séismes, volcans | Bird 2003 (PB2002, ODC-By) ; USGS (M ≥ 6, 1965-2016) ; Smithsonian GVP | `fraxen/tectonicplates` ; `plotly/datasets` |
| ZEE françaises | Marine Regions (VLIZ), World EEZ v11, CC BY 4.0 | `emlab-ucsb/mpa-fishing-effort-redistribution` |
| Fonds de carte | Natural Earth (domaine public), 1:50m et 1:10m | `nvkelso/natural-earth-vector` |

Les valeurs utilisées sont écrites en dur dans les scripts, avec leur source en commentaire, et citées dans la `legende` de chaque figure.

## Remplacements d'œuvres

Aucun : Wikimedia était inaccessible, donc aucune œuvre de remplacement n'a pu être cherchée.

- **Nighthawks** (5eme/anglais/decrire-un-tableau-saisons) n'est pas remplacé. Le chapitre cite ce tableau nommément (flashcards, quiz) : un remplacement demandera aussi de retoucher le texte.
- Les photos de New York et de Benidorm manquent. À leur place, il y a deux croquis modèles autonomes (ville, station balnéaire), qui ne sont pas tirés d'une photo. Les chapitres 4eme/geographie/centres-et-peripheries-des-villes et les-espaces-du-tourisme font toujours référence à « la photo » ; le second cite Benidorm.

## Doutes de fond (une ligne par doute)

- `3eme/histoire/eclatement-yougoslavie.svg` : les dates d'indépendance (Slovénie, Croatie et Macédoine 1991, Bosnie 1992, Monténégro 2006, Kosovo 2008) ne viennent pas du chapitre. Ce sont les dates usuelles, à relire.
- `3eme/histoire/europe-guerre-froide.svg` : l'Espagne est classée « hors des deux alliances » (elle n'entre dans l'OTAN qu'en 1982). Les secteurs de Berlin sont schématiques.
- `4eme/histoire/empires-coloniaux-1914.svg` :
  - la carte est recadrée sur l'Afrique, l'Asie et l'Océanie, sans l'Amérique ni le Pacifique ;
  - l'Égypte est comptée britannique ;
  - tout le Maroc est compté français.
- `5eme/histoire/domaine-royal-987-1500.svg` : les limites suivent les départements actuels, avec la Provence et le Dauphiné inclus vers 1500. Le fichier pèse 39,2 Ko, juste sous la limite de 40 Ko.
- `5eme/histoire/monde-xvie-charles-quint-soliman.svg` : le Saint-Empire est réduit à l'Allemagne, l'Autriche, la Tchéquie et la Slovénie actuelles. L'Empire ottoman est représenté à la mort de Soliman (1566).
- `6eme/histoire/empire-romain-117.svg` : la carte inclut l'Arménie et la Mésopotamie (abandonnées en 118). Le mur d'Hadrien est postérieur (122) ; la légende le dit.
- `6eme/histoire/frise-prehistoire.svg` : le type « frise » n'existe pas dans `ILLUSTRATION_TYPES` (`src/utils/lessonSchema.js`), donc la frise est accrochée comme `schema`. Faut-il ajouter un type « frise » ?
- `3eme/histoire/institutions-ve-republique.svg` : il n'y a pas de version « cohabitation », que la méthode ne demande pas.
- `4eme/geographie/population-urbaine-rurale-monde.svg` : avec les valeurs ONU par pas de 5 ans, le croisement tombe vers 2006,6. L'étiquette garde « 2007-2008 », comme le chapitre (l'ONU dit 2007).
- `3eme/geographie/territoires-ultramarins-monde.svg` : le contour des ZEE inclut des zones contestées (Mayotte, Tromelin, Glorieuses, Matthew-Hunter).
- `scripts/illustrations/donnees/outre-mer.json` : les ZEE simplifiées sont sous licence CC BY 4.0, mais Marine Regions demande poliment de ne pas redistribuer ses données. **À garder ou à retirer : décision de Johan.**
- `4eme/geographie/routes-maritimes-monde.svg` et `archipel-metropolitain-mondial.svg` : ces cartes sont qualitatives (pas de données CNUCED ni GaWC), alors que le chapitre parle d'épaisseurs de traits proportionnelles au trafic.
- `4eme/geographie/migrations-mediterranee.svg` : la carte reste dense autour de la mer Égée à 330 px (lisible en plein écran). L'Afghanistan est hors cadre.
- `4eme/geographie/etats-unis-*.svg` :
  - la Sun Belt, la Rust Belt et l'intérieur du pays sont reconstitués à partir d'États entiers ;
  - l'Alaska et Hawaï sont absents.
- `5eme/geographie/temperature-mondiale-1850-2024.svg` : le chapitre dit « +1,3 à 1,4 °C ». La courbe donne +1,53 °C en 2024 (record) et +1,26 °C en moyenne sur 2015-2024. Ce n'est pas une contradiction, mais un élève peut s'en étonner.
- `6eme/geographie/anamorphose-population.svg` : c'est un cartogramme en carrés (Demers), pas une anamorphose continue.
- `6eme/geographie/densites-monde-faibles-densites.svg` et `repartition-population-mondiale.svg` : densités moyennes par pays (l'Himalaya tombe dans l'Inde et la Chine). Foyers et vides humains sont placés à la main.
- `6eme/geographie/planisphere-reperes.svg` : l'Amérique est nommée en deux parties alors que le chapitre compte six continents.
- `3eme/svt/rougeole-etats-unis.svg` : faite sans l'épidémie française de 2008-2011. Les sommes des bulletins hebdomadaires sont un peu inférieures aux totaux officiels du CDC.
- `4eme/svt/plaques-seismes-volcans.svg` :
  - le planisphère est centré sur le Pacifique, donc la dorsale atlantique est coupée entre les deux bords ;
  - le modèle compte 52 plaques, plus que la « douzaine » du chapitre.
- `4eme/svt/appareil-reproducteur-masculin.svg` : schéma refait mais encore très simplifié, à relire par un œil de SVT.
- `4eme/svt/reseau-alimentaire.svg` : le chapitre ne dit pas ce que mange la chouette ; seul le lien mulot → chouette est tracé.
- `5eme/svt/coupe-geologique.svg` : on ne peut pas dater la faille et l'intrusion l'une par rapport à l'autre (les deux se placent entre C et D).
- `6eme/sciences-et-technologie/groupes-emboites-vertebres.svg` : l'animal à six pattes est un criquet (le chapitre n'en nomme aucun).
- `5eme/svt/frequence-cardiaque-effort.svg`, `3eme/svt/anticorps-reponses.svg`, `4eme/svt/cycle-menstruel.svg`, `4eme/svt/sismogramme.svg` : valeurs illustratives, dites comme telles.
- `5eme/maths/nombres-relatifs-reperage.json` : la flashcard FC6 écrit « C(4 ; 0) », alors que la section 5 appelle ce point B (C est (0 ; −2)). **La flashcard est à corriger.**
- `6eme/maths/volumes-et-vision-dans-l-espace.json` : la ressource demandait « un cube caché », mais la section 4 décrit un escalier de 6 cubes sans cube caché. La figure suit le chapitre.
- `6eme/maths/symetrie-axiale-point-drapeau.svg` : l'erreur du drapeau « glissé » est montrée par un drapeau reporté sans être retourné, barré.
- `5eme/maths/droites-remarquables-triangle.svg` et `6eme/maths/escalier-cubes-trois-vues.svg` : plusieurs couleurs au lieu d'un seul accent, voulues pour relier la figure à la légende.
- `3eme/maths/globe-latitude-longitude.svg` : la longitude de Paris (2° E) est invisible comme angle, seule la latitude est tracée. Les images A″B″C″ de l'homothétie utilisent une double prime, absente du chapitre.
- `3eme/maths/transformations-homotheties.json` : le quiz parle d'une rosace de 60°, alors que la section 5 dit 8 motifs à 45°. La figure suit la section 5.
- `3eme/physique-chimie/forces-livre-echelle.svg` : le poids du livre (4 N) est choisi pour la figure ; le chapitre ne le donne pas.
- `4eme/anglais/se-reperer-en-ville-imperatif.json` : le quiz n° 3 dit « The café is opposite the bank », alors que la section 3 met la banque entre le café et la librairie. Le plan suit la section 3.
- `communs/calligramme-il-pleut.svg` : le texte des cinq vers a été écrit sans fac-similé, et la disposition est simplifiée (cinq colonnes obliques parallèles). **À confronter au fac-similé de Calligrammes (1918).**

## Non fait, et pourquoi

| n° | Chapitre | Ressource | Raison |
|---|---|---|---|
| 8 | 6eme/histoire/premiers-etats-premieres-ecritures | photo de la tablette proto-cunéiforme d'Uruk | Wikimedia inaccessible |
| 17 | 4eme/histoire/conquetes-et-societes-coloniales | une du Petit Journal, 19 novembre 1911 | Wikimedia et Gallica inaccessibles |
| 22 | 4eme/geographie/centres-et-peripheries-des-villes | vue aérienne d'une ville | Wikimedia inaccessible (le croquis n° 23 est fait, en modèle autonome) |
| 29 | 4eme/geographie/les-espaces-du-tourisme | photo de Benidorm (sous droits) | Wikimedia inaccessible (le croquis n° 30 est fait, en modèle autonome) |
| 51 | 3eme/svt/meteo-climat | climatogrammes de Paris et Cayenne | aucune normale climatique fiable sur GitHub ; Météo-France inaccessible ; rien de mémoire |
| 53 | 3eme/svt/mitose-division-cellulaire | photo de mitose dans une racine d'oignon | Wikimedia inaccessible (le schéma n° 54 est fait) |
| 119 | 3eme/francais/denoncer-les-travers-de-la-societe | caricature de Daumier | Wikimedia inaccessible |
| 123 | 5eme/anglais/decrire-un-tableau-saisons | The Hay Wain, Constable | Wikimedia inaccessible |
| 124 | 5eme/anglais/decrire-un-tableau-saisons | Nighthawks, Hopper (sous droits) | aucun tableau de remplacement possible sans Wikimedia ; le chapitre le cite nommément |

**Faites en partie :**
- n° 59 : sans l'épidémie française de 2008-2011.
- n° 105 : sans l'option de chauffage avec palier à 100 °C.
- n° 18 : sans la version « cohabitation ».

**Pour finir** : une session qui accède à Wikimedia Commons (et à Gallica pour le Petit Journal) peut faire les 8 images manquantes en suivant la consigne : vérification des licences, WebP de moins de 350 Ko, crédit complet. Les climatogrammes demandent les normales 1991-2020 de Météo-France.
