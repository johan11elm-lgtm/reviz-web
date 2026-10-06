# Relecture IA : Français (6e, 5e, 4e, 3e)

- Chapitres relus : **55** (14 en 6e, 14 en 5e, 14 en 4e, 13 en 3e), chaque fichier lu en entier. Les 4 catalogues (notions et textes de référence) ont aussi été relus.
- Chapitres corrigés : **19**, plus les 4 catalogues (8 passages du texte de référence)
- Corrections : **33** (25 dans les chapitres, 8 dans les catalogues)
- Vérification `verifier-programme.mjs francais` : 55 valides, 0 invalide

**Verdict.** Le contenu est juste et au bon niveau. Aucune réponse de quiz n'était fausse à l'index `correct`, toutes les formes verbales et tous les accords refaits sont exacts, et les œuvres, auteurs et dates sont presque tous corrects. Les corrections portent sur une date fausse (Ronsard), une citation déformée (Baudelaire), une terminologie dépassée (le « mode » conditionnel), deux explications qui désignaient la mauvaise proposition et quelques énoncés ambigus.

Référence vérifiée : programme de cycle 3 (annexe du BO n°16 du 17 avril 2025) et programme de cycle 4 (BO n°10 du 5 mars 2026) téléchargés et lus. Les deux classent le conditionnel parmi les temps de l'indicatif et emploient « complément circonstanciel ».

## Corrections

### Chapitres

- `6eme / classes-de-mots / resume.sections[0].content` : « Les déterminants sont les articles… » → « Les principaux déterminants sont les articles… » (liste présentée comme complète, alors que chaque, quel ou deux sont aussi des déterminants)
- `6eme / complements-du-verbe / quiz[4].question` : « Quel pronom remplace le groupe souligné : « Il parle à ses amis » ? » → « Quel pronom remplace « à ses amis » dans « Il parle à ses amis » ? » (rien n'est souligné dans l'app : l'énoncé ne désignait aucun groupe)
- `6eme / temps-simples-de-l-indicatif / quiz[4].explanation` : « Pour garder le son [j] devant -ons » → « Pour garder le son [ʒ] (g doux) devant -ons » (erreur phonétique : [j] est le son de « yeux »)
- `6eme / temps-composes-imperatif-conditionnel / resume.keyTerms[3].def` : « Mode du souhait, de la politesse et de l'imaginaire. » → « Temps de l'indicatif (longtemps appelé « mode ») qui exprime le souhait, la politesse ou l'imaginaire. » (le programme 2025 range le conditionnel parmi les temps de l'indicatif)
- `6eme / chanter-et-enchanter-le-monde / quiz[5].choices[1]` (bonne réponse) : « Un poème sans rime ni nombre régulier de syllabes » → « Un poème sans nombre régulier de syllabes ni rimes obligatoires » (un poème en vers libres peut rimer par endroits ; définition alignée sur celles de 5e et 3e)
- `6eme / chanter-et-enchanter-le-monde / quiz[5].explanation` : « sans rime ni mesure fixe » → « sans mesure fixe ni rimes obligatoires » (cohérence avec la réponse)
- `5eme / attribut-du-sujet-et-accords / mindmap.branches[3].children[1]` : « avoir : COD après » → « avoir : COD placé avant » (l'étiquette suggérait l'inverse de la règle)
- `5eme / formation-des-mots-et-relations-de-sens / quiz[1].explanation` : « vient du latin terror, la peur » → « vient du latin terrere, « effrayer » » (terrible vient de terribilis, de terrere ; cohérent avec le chapitre de 6e)
- `5eme / groupe-nominal-et-accords / quiz[4].choices` : « généreuse / généreux au singulier / généreux / généreuses » → « généreuse (féminin singulier) / généreux (masculin singulier) / généreux (masculin pluriel) / généreuses (féminin pluriel) » (deux choix s'écrivaient pareil, « généreux » : la question avait deux réponses défendables)
- `5eme / theatre-societe-sens-dessus-dessous / quiz[4].explanation` : « Le maître piégé dans un sac par son valet » → « Le vieux Géronte piégé dans un sac par le valet de son fils » (Scapin est le valet de Léandre, pas celui de Géronte)
- `5eme / voyager-en-poesie / quiz[5].explanation` : « …vo/ya/g(e) : 12 syllabes » → « …vo/ya(ge) : 12 syllabes » (le découpage affichait 13 segments pour 12 syllabes)
- `5eme / voyager-en-poesie / mindmap.branches[2].children[3]` : « anaphore » → « outil : comme, tel » (l'anaphore est une répétition, rangée à tort sous « Les images : rapprocher deux réalités »)
- `4eme / dire-l-amour / resume.sections[2].content` : « Ronsard invite à profiter de la jeunesse (1550) » → « (1553) » (« Mignonne, allons voir si la rose » paraît en 1553 à la suite des Amours, pas dans les Odes de 1550)
- `4eme / dire-l-amour / mindmap.branches[2].children[0]` : « Ronsard 1550 » → « Ronsard 1553 » (même erreur)
- `4eme / individu-et-societe-confrontations-de-valeurs / resume.sections[2].content` : « la pièce respecte l'unité de temps… » → « la pièce classique doit respecter l'unité de temps… » (à la suite du Cid, la phrase disait que la pièce respecte les règles, alors qu'elle a justement déclenché la querelle du Cid)
- `4eme / la-fiction-pour-interroger-le-reel / quiz[3].question` : « Quel mot exprime le doute ? » → « Quelle expression traduit le doute ? » (la bonne réponse, « il me semblait », compte trois mots)
- `4eme / la-ville-lieu-de-tous-les-possibles / quiz[1].choices[2]` (bonne réponse) : « Une métaphore qui personnifie la ville » → « Une métaphore qui fait de la ville un animal menaçant » (une pieuvre n'est pas humaine : c'est une animalisation, pas une personnification)
- `4eme / subjonctif-et-conditionnel / resume.intro` : « Subjonctif et conditionnel sont des modes qui présentent… » → « Le subjonctif (mode) et le conditionnel (temps rattaché à l'indicatif) présentent… » (terminologie officielle ; le chapitre de 3e le dit déjà)
- `4eme / subjonctif-et-conditionnel / resume.keyTerms[2].def` : « mode de l'action soumise à une condition ou incertaine » → « temps de l'indicatif (longtemps appelé « mode ») pour l'action soumise à une condition ou incertaine » (même raison)
- `3eme / accord-du-participe-passe / quiz[5].explanation` : « Dans la troisième phrase, « ont été lus » est un passif » → « Dans « Ces romans ont été lus en une semaine », c'est un passif » (la phrase passive est la quatrième proposée, pas la troisième)
- `3eme / discours-rapporte / quiz[0].explanation` : « …la dernière ressemble à de l'indirect libre » → « …« Attention ! Il fallait faire attention. » ressemble plutôt à de l'indirect libre » (« la dernière » désignait la bonne réponse, qui est au discours direct)
- `3eme / visions-poetiques-du-monde / resume.sections[1].content` : « Baudelaire voit dans la nature « une forêt de symboles » » → « Baudelaire voit dans la nature un temple où l'homme passe à travers des « forêts de symboles » » (citation fausse : le vers de « Correspondances » dit « des forêts de symboles »)
- `3eme / visions-poetiques-du-monde / mindmap.branches[1].detail` : « Le XXe siècle libère la forme poétique. » → « Du XIXe au XXe siècle, les poètes libèrent la forme. » (le poème en prose, avec Bertrand et Baudelaire, et le vers libre, avec Rimbaud, datent du XIXe siècle)
- `3eme / subordonnees-circonstancielles / mindmap.branches[2].detail` : « La concession exige le subjonctif » → « La concession avec bien que ou quoique exige le subjonctif » (« même si » exprime aussi la concession, avec l'indicatif)
- `3eme / subordonnees-circonstancielles / resume.keyPoints[1]` : « But et concession : subjonctif » → « But et concession (bien que, quoique) : subjonctif » (même raison)

### Catalogues (`src/data/programme/<classe>/francais.json`, champ `reference` ; `relu` laissé à `false`)

- `6eme / partir-a-l-aventure / reference` : « un naufragé survit seul sur une île pendant vingt-huit ans, puis rencontre Vendredi » → « un naufragé survit vingt-huit ans sur une île ; après des années de solitude, il rencontre Vendredi » (Robinson rencontre Vendredi au bout d'environ 25 ans, pas après 28 ans de solitude)
- `5eme / histoires-pour-plaire-et-instruire / reference` : « autrice de la fin du XIIe siècle, auteure d'un des premiers recueils… » → « autrice de la fin du XIIe siècle, qui a composé l'un des premiers recueils… » (répétition « autrice… auteure »)
- `4eme / dire-l-amour / reference` : « (1550, Odes) » → « (publiée en 1553 à la suite des Amours, puis classée dans les Odes) » (date de première publication)
- `4eme / subjonctif-et-conditionnel / reference` : « le conditionnel présente… » → « le conditionnel, que la terminologie officielle range parmi les temps de l'indicatif, présente… » (le conditionnel n'est plus un mode)
- `3eme / agir-dans-la-cite-individu-et-pouvoir / reference` : « « Liberté » (Poésie et vérité 1942) : poème à l'anaphore « J'écris ton nom » » → « « Liberté » (Poésie et vérité, 1942) : poème construit sur l'anaphore « Sur… » et le refrain « J'écris ton nom » » (« J'écris ton nom » clôt chaque strophe : c'est un refrain, pas une anaphore ; virgule manquante)
- `3eme / visions-poetiques-du-monde / reference` : « la nature comme « forêt de symboles » » → « la nature comme un temple traversé de « forêts de symboles » » (citation exacte)
- `3eme / discours-rapporte / reference` : « Il dit qu'il viendra le lendemain. » → « Il dit qu'il viendra demain. » (avec un verbe introducteur au présent, « demain » ne change pas)
- `3eme / modes-et-valeurs-des-temps / reference` : « remplacer le verbe par celui d'un verbe comme « faire » » → « remplacer le verbe par « faire » » (formulation confuse)

## Doutes pour un prof

- **5e / types-et-formes-de-phrases : la « forme passive ».** Le chapitre en fait une forme de phrase de 5e (extrait, flashcard 5, quiz 3, résumé, carte). Le programme de 5e de 2026 ne cite que les formes exclamative et négative. Il place la passive en 4e, sous le nom de « voix passive ». Je n'ai pas modifié, car la notion traverse tout le chapitre : à alléger ou à renvoyer en 4e.
- **5e : le conditionnel manque.** Le programme 2026 de 5e met le conditionnel parmi les temps simples à maîtriser. Aucun chapitre de 5e ne le traite (c'est une lacune, pas une erreur).
- **5e / catalogue devenir-heroine-heros : « Romans du programme ».** La liste (Dumas, Hugo, Brontë, Alcott, Tolkien) n'apparaît pas dans le texte du BO, qui ne nomme aucune œuvre. À vérifier dans les ressources Eduscol, sinon écrire « Romans possibles ». Même remarque pour « Œuvres proposées » (voyager en poésie) et « Autres œuvres » (théâtre).
- **5e / classes-de-mots : « référent ».** Le chapitre appelle « référent » le mot que reprend le pronom, alors que la 6e et le programme de cycle 3 disent « antécédent ». Les deux termes circulent, mais l'élève change de mot sans explication.
- **6e / partir-a-l-aventure : « narrateur interne / externe ».** L'opposition entre narrateur personnage et narrateur non personnage risque d'être confondue avec le « point de vue interne / externe » vu en 4e. « Narrateur personnage / narrateur extérieur à l'histoire » serait plus sûr.
- **4e / la-ville-lieu-de-tous-les-possibles : Verhaeren.** La « pieuvre ardente » vient du poème « La Ville », dans Les Campagnes hallucinées (1893). Les Villes tentaculaires (1895) n'en reprend l'image que dans son titre. Rattacher l'image au recueil de 1895 se défend, mais il faut préciser la source si l'on cite le vers.
- **6e / temps-composes-imperatif-conditionnel, flashcard 3.** « Avec être, le participe s'accorde toujours avec le sujet » : c'est juste au niveau 6e, mais les verbes pronominaux font exception (« elles se sont parlé », vu en 3e).
- **3e / argumenter, quiz 5.** « Du moins fort au plus fort » est présenté comme la règle, alors que c'est une convention scolaire. Acceptable pour le brevet.
- **5e / paroles-rapportees-et-registres, quiz 5.** « Avez-vous aperçu cela ? » est donné comme registre soutenu : le vouvoiement relève plutôt de la politesse. L'exemple reste acceptable grâce à l'inversion et au verbe « apercevoir ».
- **4e et 3e : calendrier.** Les catalogues suivent le programme de 2015 ajusté en 2020, qui est encore celui de 4e et de 3e cette année. Le nouveau programme de cycle 4 (2026) prévoit d'autres entrées, par exemple pour la 4e « Rêver, délibérer, développer son jugement ». Il faudra refaire ces deux classes quand il s'y appliquera.

## Points forts / faiblesses récurrentes

- **Point fort : la langue est exacte.** Grammaire et conjugaison sont justes et suivent la terminologie des programmes (types et formes de phrase, COD/COI, attribut du sujet, complément circonstanciel). Les distracteurs des quiz reprennent les erreurs réelles des élèves (« vous aidez », « si j'aurais », « plus bon »).
- **Point fort : les références littéraires sont solides.** Auteurs, dates et citations vérifiés sont justes : Racine, Corneille, La Fontaine, Voltaire, Montesquieu, Hugo, Perec, Primo Levi.
- **Faiblesse : les explications renvoient à la position des choix** (« la troisième phrase », « la dernière »). C'est fragile, et c'était faux deux fois sur deux. Mieux vaut citer le choix.
- **Faiblesse : la terminologie varie d'une classe à l'autre.** Le conditionnel était appelé « mode » en 6e et en 4e, alors que le chapitre de 3e dit le contraire ; la 6e dit « antécédent » et la 5e « référent ».
- **Faiblesse : les cartes mentales rangent parfois mal les notions** (l'anaphore classée parmi les images, l'étiquette « COD après »). Les cartes ont été moins soignées que les quiz.
