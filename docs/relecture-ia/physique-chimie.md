# Relecture IA : physique-chimie (5e, 4e, 3e)

- **Chapitres relus** : 38 (13 en 5e, 12 en 4e, 13 en 3e), lus en entier : flashcards, quiz, résumé, termes clés, carte mentale. Les 3 catalogues ont aussi été relus.
- **Chapitres corrigés** : 11
- **Corrections** : 17
- **Vérification** : `verifier-programme.mjs physique-chimie` → 38 valides, 0 invalide.

**Verdict** : le contenu scientifique est solide. Tous les calculs, conversions, formules, équations et valeurs de référence ont été refaits et sont justes. Les corrections portent sur deux questions de quiz où deux réponses se défendaient, une explication de quiz incohérente avec les choix proposés, et quelques formulations qui risquaient d'installer une conception erronée (« le récepteur utilise le courant », « la masse sur Terre »).

## Corrections

### 5e
- `5eme / changements-d-etat / mindmap.branches[0].detail` : « Chaque passage entre deux états a un nom. » → « Quatre passages courants, plus la sublimation et la condensation. » (la branche s'intitule « Six changements » mais n'en liste que quatre)
- `5eme / l-air-qui-nous-entoure / quiz[5].explanation` : « Une fois le dioxygène consommé, la flamme s'éteint » → « Quand il n'en reste plus assez sous le verre, la flamme s'éteint » (la bougie s'éteint avant d'avoir consommé tout le dioxygène, idée fausse classique)
- `5eme / circuit-electrique-simple / quiz[0].explanation` : « fournit le courant […] récepteurs : ils l'utilisent » → « fait circuler le courant […] ils reçoivent l'énergie électrique et la convertissent » (évite l'idée d'un courant « consommé »)
- `5eme / circuit-electrique-simple / resume.keyTerms[1].def` : « Dipôle qui utilise le courant » → « Dipôle qui reçoit l'énergie électrique et la convertit » (même raison)
- `5eme / circuit-electrique-simple / flashcards[4].front` : « inverse les bornes de la pile d'un moteur » → « Que se passe-t-il pour un moteur si on inverse les bornes de la pile ? » (formulation)
- `5eme / corps-purs-et-melanges / quiz[4].explanation` : « dioxygène... » → « dioxygène… » (typographie)
- `5eme / lumiere-sources-et-propagation / quiz[4].question` : ajout de « l'écran restant à la même place » (sans cette précision, la taille de l'ombre portée n'est pas déterminée)

### 4e
- `4eme / molecules-et-atomes / quiz[3].choices[1]` : « CH4 » → « C₄H₄ » (« CH4 » et « CH₄ » désignent la même molécule : deux réponses se défendaient)
- `4eme / molecules-et-atomes / quiz[3].explanation` : adaptée au nouveau distracteur (explique la place de l'indice avec l'exemple de C₄H)
- `4eme / equation-de-reaction / quiz[2].question` : « Quelle équation est correctement ajustée ? » → « Quelle équation ajustée traduit la formation de l'eau à partir de dihydrogène et de dioxygène ? » (H₂ + O₂ → H₂O₂ est aussi ajustée : deux réponses justes)
- `4eme / equation-de-reaction / quiz[2].explanation` : précise que H₂O₂ n'est pas l'eau et que H₂ + O → H₂O est faux, car le dioxygène s'écrit O₂
- `4eme / lois-des-tensions / quiz[6].choices[2]` : « le série est interdit » → « le montage en série est interdit » (grammaire)

### 3e
- `3eme / atomes-et-ions / resume.sections[0].content` : « Z électrons tournent autour » → « se déplacent autour » (évite l'image d'orbites planétaires ; s'accorde avec la flashcard et le texte de référence)
- `3eme / gravitation-et-poids / quiz[1].question` : « Un objet a une masse de 2 kg sur Terre » → « Sur Terre (g = 10 N/kg), un objet a une masse de 2 kg » (l'ancienne formulation laissait croire que la masse dépend du lieu)
- `3eme / gravitation-et-poids / quiz[1].explanation` : « Diviser au lieu de multiplier donnerait 0,2 » → « 2 N confond masse et poids, 5 N vient d'une division (10 ÷ 2) et 12 N d'une addition » (0,2 ne figurait pas parmi les choix ; les distracteurs proposés n'étaient pas expliqués)
- `3eme / reactions-acides-metaux / quiz[5].question` : « dans un récipient fermé » → « dans un flacon fermé par un ballon de baudruche » ; « masse totale du récipient » → « du dispositif » (un récipient hermétique où se forme du H₂ est dangereux, et le catalogue lui-même l'interdit)
- `3eme / reactions-acides-metaux / quiz[5].explanation` : adaptée (« Le ballon retient le dihydrogène : rien ne s'échappe… »)

Rien n'a été modifié dans les catalogues, ni dans les blocs `metadata` et `programme`. Le champ `relu` reste à `false`.

## Doutes pour un prof

1. **« La masse est la quantité de matière »** (5e `masse-volume-masse-volumique` S0 et T0 ; 3e `gravitation-et-poids` T2 ; catalogues 5e et 3e). Cette formule est courante au collège, mais au lycée « quantité de matière » désigne la grandeur en moles. On pourrait écrire « grandeur liée à la quantité de matière ». Je n'ai pas tranché.
2. **Rendement** (3e `production-energie-electrique` : F3, Q2, S0, M1, catalogue). La notion n'apparaît pas dans le texte du programme du cycle 4 (BO n°31 du 30/07/2020), mais beaucoup de manuels la traitent. À garder ou à alléger.
3. **Principe d'inertie** (3e `forces-et-interactions` : F7, S2, M3, catalogue). Il est absent du texte du programme ; les ressources Eduscol n'en proposent qu'« une approche ». Le contenu est juste, mais c'est la limite haute du niveau.
4. **Terminologie gaz → solide** (5e `changements-d-etat`). S0 appelle « condensation » le passage gaz → solide, alors que Q5 rappelle que, dans le langage courant, « condensation » désigne la buée (liquéfaction). C'est cohérent avec le catalogue, mais la convention varie d'un prof à l'autre (condensation, condensation solide, déposition).
5. **Simplifications usuelles laissées telles quelles** : le pH « compris entre 0 et 14 » ; des particules « ordonnées » dans tout solide (vrai pour les cristaux, pas pour le verre) ; Uranus et Neptune classées « géantes gazeuses » en 3e (ce sont des géantes de glaces) ; HO⁻ alors que le BO écrit OH⁻ (les deux notations sont admises).
6. **Marque citée** : « Destop » apparaît dans 3e `solutions-acides-basiques-ph` (Q6) et dans le catalogue. C'est un choix éditorial pour une page publique.
7. **Doublon assumé** : 5e `decrire-un-mouvement` et 3e `mouvement-et-vitesse` se recouvrent presque entièrement (même exemple de coureur, 100 m en 10 s). Ce n'est pas faux, mais c'est redondant pour un élève qui suit les deux.

## Points forts / faiblesses récurrentes

- **Point fort** : tous les calculs, conversions et équations sont justes (Ec, P = m × g, U = R × I, E = P × t, kWh ↔ J, km/h ↔ m/s, ajustements, conservation de la masse 12 + 32 = 44 g, etc.). Les valeurs de référence sont correctes (c, vitesse du son, g Terre et Lune, 78 % / 21 %, 1,2 g/L, 85 dB).
- **Point fort** : les explications de quiz nomment l'erreur classique visée par chaque distracteur, ce qui est très utile pédagogiquement. Les consignes de sécurité sont exactes (acide dans l'eau, CO, 230 V, court-circuit, multiprise).
- **Faiblesse** : quelques questions ont un piège typographique ou une condition implicite qui rend une deuxième réponse défendable (CH4/CH₄, H₂O₂ ajustée, écran de l'ombre).
- **Faiblesse** : par endroits, le vocabulaire laisse passer des conceptions erronées (courant « utilisé », masse « sur Terre », électrons qui « tournent »), et la carte mentale ne correspond pas toujours à son libellé (« Six changements » pour quatre enfants).
- **Remarque** : les branches de la carte mentale contiennent des emojis dans le champ `emoji`. Je n'y ai pas touché (champ structurel), mais cela va contre la règle de design « pas d'emojis ».
