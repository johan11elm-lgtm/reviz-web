# Relecture IA : Histoire et EMC (6e, 5e, 4e, 3e)

- Chapitres relus : **48** (12 en 6e, 10 en 5e, 12 en 4e, 14 en 3e, dont 14 chapitres d'EMC), chaque fichier lu en entier. Chaque date, chiffre, personnage, attribution et réponse de quiz a été vérifié.
- Chapitres corrigés : **13**, plus 3 catalogues retouchés (6e, 5e, 3e : texte de référence de 5 chapitres)
- Corrections : **25** (20 dans les chapitres, 5 dans les catalogues)
- Vérification `verifier-programme.mjs histoire` : 48 valides, 0 invalide

**Verdict.** Le corpus est solide. Aucune réponse de quiz n'était fausse à l'index `correct`, les repères annuels (1916, 1917, 1933, 18 juin 1940, 1942, 1944, 1958, 1962, 1989, 1992…) sont exacts et les sujets sensibles (génocides, Shoah, colonisation, traite, religions) sont traités avec sobriété. Les corrections portent sur un contresens dans un résumé, une erreur factuelle (« or de Potosí »), des raccourcis de manuel devenus inexacts (indulgences, loi de 1882, Stalingrad, Robespierre) et deux faits périmés en 2026 (SNU, BRICS).

## Corrections

### Chapitres

- `6eme / rome-du-mythe-a-l-histoire / quiz[6].explanation` : « César […] n'a jamais porté le titre d'empereur » → « César […] était dictateur mais n'a jamais été empereur » (César a porté le titre d'*imperator*, général acclamé par ses troupes : c'est la fonction d'empereur qu'il n'a pas exercée)
- `6eme / naissance-du-monotheisme-juif / quiz[2].explanation` : « Abraham est le premier avec qui Dieu fait alliance » → « Abraham est le patriarche avec qui Dieu fait alliance » (dans la Bible, une première alliance est conclue avec Noé)
- `6eme / naissance-du-monotheisme-juif / resume.sections[2].content` : « Les Juifs se dispersent dans le monde : c'est la diaspora. » → « La dispersion des Juifs hors de leur terre, la diaspora, s'accentue. » (la diaspora existe depuis l'exil, 70 l'accentue ; le chapitre le disait déjà dans la flashcard 6)
- `6eme / emc-laicite-a-l-ecole / flashcards[5].back` (loi de 1882) : « L'école primaire publique devient obligatoire et laïque. » → « L'instruction devient obligatoire de 6 à 13 ans et l'enseignement devient laïque dans les écoles publiques. » (la loi de 1882 rend l'instruction obligatoire, pas la fréquentation de l'école publique)
- `5eme / charles-quint-et-soliman / mindmap.branches[1].children[2]` : « or de Potosí » → « argent de Potosí » (Potosí est une mine d'argent)
- `5eme / humanisme-reformes-conflits-religieux / flashcards[3].back` : « le pardon des péchés contre de l'argent » → « la remise des peines dues aux péchés contre de l'argent » (une indulgence ne pardonne pas le péché, elle remet la peine)
- `5eme / humanisme-reformes-conflits-religieux / resume.keyTerms[1].def` (indulgence) : « Pardon des péchés accordé par l'Église… » → « Remise par l'Église des peines dues aux péchés… » (même raison)
- `5eme / emc-egalite-et-lutte-contre-les-discriminations / quiz[3].question` : « Quelle peine maximale prévoit la loi pour une discrimination ? » → « Quelle peine la loi prévoit-elle en général pour une discrimination ? » (le maximum est de 5 ans et 75 000 euros dans les cas aggravés, Code pénal art. 225-2 et 432-7 : la réponse « 3 ans et 45 000 euros » n'est pas le maximum)
- `5eme / emc-egalite-et-lutte-contre-les-discriminations / quiz[3].explanation` : ajout de « puni encore plus lourdement dans certains cas » (même raison)
- `5eme / emc-egalite-et-lutte-contre-les-discriminations / quiz[5].explanation` : « Les autres situations sont des droits acquis au XXe siècle. » → « Les autres situations sont des droits déjà acquis : l'école pour les filles dès le XIXe siècle, le vote et le compte bancaire au XXe siècle. » (l'instruction obligatoire des filles date de 1882)
- `4eme / revolution-francaise-1789-1799 / resume.sections[1].content` : « La Constitution de 1791 limite le pouvoir du roi, mais Louis XVI tente de fuir et il est arrêté à Varennes. » → « En juin 1791, Louis XVI tente de fuir et il est arrêté à Varennes ; la Constitution de 1791 limite ensuite son pouvoir. » (la fuite, en juin 1791, précède l'adoption de la Constitution, en septembre)
- `4eme / revolution-francaise-1789-1799 / resume.sections[2].content` : « le Comité de salut public de Robespierre » → « le Comité de salut public, où siège notamment Robespierre » (Robespierre est membre du Comité, il ne le dirige pas)
- `4eme / consulat-et-empire / resume.sections[0].content` : « Le Code civil de 1804 garantit l'égalité civile et la propriété. Il rétablit l'esclavage en 1802. » → « … Bonaparte rétablit aussi l'esclavage dans les colonies en 1802. » (contresens : « Il » renvoyait au Code civil)
- `3eme / seconde-guerre-mondiale / flashcards[2].back` (Stalingrad) : « l'armée allemande y capitule : c'est sa première grande défaite face à l'URSS » → « une armée allemande entière y capitule : l'Allemagne perd l'initiative à l'Est et l'Armée rouge passe à l'offensive » (le premier grand échec allemand face à l'URSS est la bataille de Moscou, en décembre 1941)
- `3eme / seconde-guerre-mondiale / flashcards[7].back` : « défini lors du procès de Nuremberg » → « défini en 1945 pour juger les dirigeants nazis au procès de Nuremberg » (la notion est fixée par le statut du tribunal en août 1945, avant le procès)
- `3eme / independances-et-nouveaux-etats / quiz[4].choices[1]` (bonne réponse) : « Les pays pauvres qui refusent de choisir entre les deux blocs » → « Les pays pauvres qui n'appartiennent à aucun des deux blocs » (confondait tiers-monde et non-alignement, que le chapitre distingue dans ses mots-clés)
- `3eme / independances-et-nouveaux-etats / quiz[4].explanation` : « qui veulent rester non alignés » → « qui ne font partie ni du bloc américain ni du bloc soviétique » (même raison)
- `3eme / projet-europeen / quiz[4].explanation` : « Huit des dix pays entrés en 2004 sont d'Europe centrale et orientale, anciennement sous domination soviétique » → « … sont d'anciens pays communistes d'Europe centrale et orientale, dont sept étaient sous domination soviétique » (la Slovénie vient de la Yougoslavie, communiste mais hors du bloc soviétique)
- `3eme / monde-apres-1989 / quiz[5].explanation` : « Les BRICS (Brésil, Russie, Inde, Chine, Afrique du Sud) » → « Les BRICS (Brésil, Russie, Inde, Chine, Afrique du Sud, rejoints depuis 2024 par d'autres pays comme l'Égypte ou l'Iran) » (le groupe s'est élargi en 2024-2025)
- `3eme / emc-engagement-collectif / resume.sections[1].content` : « Le service civique et le service national universel (SNU) font découvrir ces engagements. » → « Le service civique, possible dès 16 ans, permet aussi de découvrir ces engagements. » (le SNU a pris fin le 1er janvier 2026, après l'annonce du Premier ministre du 19 septembre 2025)

### Catalogues (`src/data/programme/<classe>/histoire.json`, champ `reference` ; `relu` laissé à `false`)

- `6eme / emc-laicite-a-l-ecole` : « l'école primaire publique devient gratuite (1881), obligatoire et laïque (1882) » → « l'école primaire publique devient gratuite (1881) puis laïque (1882), et l'instruction devient obligatoire de 6 à 13 ans (1882) » (source de l'erreur de la flashcard)
- `5eme / charles-quint-et-soliman` : « L'or et l'argent d'Amérique (mines de Potosí) » → « … (mines d'argent de Potosí) » (source de l'erreur « or de Potosí »)
- `5eme / humanisme-reformes-conflits-religieux` : « (pardon des péchés contre de l'argent) » → « (remise des peines dues aux péchés contre de l'argent) »
- `3eme / emc-regles-du-jeu-democratique` : « rôle accru du Conseil constitutionnel (1971, 1974, réforme de 2008) » → « rôle accru du Conseil constitutionnel (saisine par 60 députés ou sénateurs en 1974, QPC créée par la réforme de 2008) » (1971 est une décision du Conseil constitutionnel, pas une révision de la Constitution)
- `3eme / emc-engagement-collectif` : « service national universel (SNU, créé en 2019) pour découvrir différentes formes d'engagement » → « le service national universel (SNU, créé en 2019) a pris fin le 1er janvier 2026 »

## Doutes pour un prof

- **Programme de 6e à partir de 2027.** D'après les sources trouvées, un nouveau programme d'histoire-géographie de cycle 3 a été publié au BO n°22 du 28 mai 2026. Il s'appliquerait en CM1 dès 2026-2027, et en CM2 et en 6e à la rentrée 2027. Les 9 chapitres d'histoire de 6e restent conformes pour l'année 2026-2027, mais il faudra les revoir pour la rentrée 2027. Je n'ai pas pu ouvrir le BO (erreur 403) : la date est à confirmer. Les programmes d'histoire-géographie de cycle 4 (5e, 4e, 3e) ne changent pas. Le calendrier de l'EMC 2024 indiqué dans les catalogues (6e et 3e à la rentrée 2026) concorde avec les sources.
- **6e / chretiens-dans-l-empire / quiz[0]** (« Dans quelle province romaine Jésus vit-il ? », réponse « la Judée ») : Jésus a surtout vécu en Galilée, gouvernée par Hérode Antipas et non incluse dans la province romaine de Judée (créée en 6 apr. J.-C.). C'est une simplification courante dans les manuels, que je n'ai pas modifiée. On peut écrire « en Palestine, dans une région dominée par Rome ».
- **4e / troisieme-republique** (flashcards[3], quiz[2]) et catalogue de 4e : la formule « école gratuite, obligatoire et laïque » est celle des manuels. Au sens strict, c'est l'instruction qui est obligatoire, pas l'école. Je n'ai corrigé que la carte de 6e, qui écrivait « l'école primaire **publique** devient obligatoire ». À harmoniser si on le souhaite.
- **4e / europe-revolution-industrielle / quiz[1]** et carte mentale (« droit de grève reconnu en 1864 ») : en 1864, la loi Ollivier supprime le délit de coalition. Le droit de grève n'a une valeur constitutionnelle qu'en 1946. La formulation est celle des manuels, je l'ai gardée.
- **4e / traites-negrieres-xviiie / flashcards[2]** (« Nantes, devant Bordeaux, La Rochelle et Le Havre ») : selon les sources et les périodes, le deuxième port négrier est La Rochelle ou Bordeaux. Si la liste est lue comme un classement, elle est discutable.
- **3e / monde-apres-1989** : pour le génocide des Tutsi, le chapitre donne « environ 800 000 morts » (chiffre de l'ONU). Le recensement rwandais dépasse le million. On peut écrire « 800 000 à 1 million ».
- **Champ `emoji` des branches de carte mentale** : il est présent dans les 48 fichiers. `MindMap.jsx` ne l'affiche pas aujourd'hui, mais il contredit la règle « pas d'emojis » si les pages publiques s'en servent. Certains choix sont maladroits : 🗿 (statue de l'île de Pâques) pour « Un monde polythéiste » au Proche-Orient, 🐉 pour la Chine des Han. Je ne l'ai pas modifié (structure du fichier).

## Points forts / faiblesses récurrentes

- **Fort** : dates, chiffres et repères du brevet exacts, vérifiés un à un. Les quiz sont bien construits : une seule réponse défendable, et des explications qui situent aussi les distracteurs datés.
- **Fort** : les sujets sensibles sont traités avec rigueur et neutralité : « prétendue mission civilisatrice », génocides nommés avec leurs auteurs, distinction entre récit religieux et histoire en 6e.
- **Faiblesse** : des raccourcis de manuel deviennent inexacts une fois compressés en une ligne (indulgence = pardon, école obligatoire, Robespierre chef du Comité, Stalingrad « première » défaite). Des notions voisines sont aussi confondues (tiers-monde et non-alignement, bloc soviétique et pays communistes).
- **Faiblesse** : les résumés très courts produisent des pronoms ambigus. Exemple : le « Il » qui faisait rétablir l'esclavage par le Code civil.
- **Faiblesse** : certains faits vieillissent (SNU, BRICS, puis toute donnée d'actualité en EMC de 3e). Il faut les revérifier à chaque rentrée.
