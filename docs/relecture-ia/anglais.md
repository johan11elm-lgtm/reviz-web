# Relecture IA — Anglais (6e → 3e)

- Chapitres relus : **49 / 49** (6e : 12, 5e : 12, 4e : 13, 3e : 12), lus en entier (flashcards, quiz, résumé, carte mentale), plus les 4 catalogues.
- Chapitres corrigés : **24**, plus 1 catalogue (3e).
- Corrections : **39** (38 dans les chapitres, 1 dans le catalogue 3e). Le champ `relu` des catalogues reste à `false`.
- Vérification : `verifier-programme.mjs anglais` donne 49 valides et 0 invalide.

**Verdict.** Le contenu est solide : la grammaire enseignée est juste, les faits culturels vérifiés sont exacts (dates, lieux, personnages) et l'orthographe britannique est cohérente. Le défaut principal était le quiz : 12 questions avaient un distracteur qui est en réalité de l'anglais correct (formes britanniques informelles, emplois légitimes mais rares), et 2 « bonnes réponses » donnaient une phrase peu idiomatique. Tout cela est corrigé.

## Corrections

### 6e
- `6eme / alphabet-nombres-et-dates / resume.sections[0].content` : « Les nombres de 21 à 99 prennent un trait d'union » → « Les nombres composés de 21 à 99 (pas les dizaines rondes comme thirty) prennent un trait d'union » (thirty, forty… n'ont pas de trait d'union).
- `6eme / can-capacites / quiz[5].choices[2]` : « do swimming » → « play swimming » (« do swimming » se dit en anglais britannique, ce qui donnait deux réponses défendables).
- `6eme / la-classe-there-is / quiz[3].choices[3]` : « Are there some pupils? » → « Is there some pupils? » (« Are there some…? » est grammatical, ce qui donnait deux réponses correctes).
- `6eme / londres-imperatif-directions / quiz[1].question` : « Où habite le roi du Royaume-Uni à Londres ? » → « Où se trouve la résidence officielle du roi du Royaume-Uni à Londres ? » (Charles III vit à Clarence House ; Buckingham Palace est la résidence officielle).
- `6eme / londres-imperatif-directions / resume.sections[0].content` : « capitale du Royaume-Uni, traversé par la Tamise » → « …, traversée par la Tamise » (l'accord portait sur le Royaume-Uni, ce qui changeait le sens).
- `6eme / present-simple-questions / quiz[2].choices[1]` : « Can't » → « Is » (« Can't you play a musical instrument? » est une question correcte).
- `6eme / present-simple-questions / quiz[4].choices[0]` : « Often I go to the cinema. » → « Often go I to the cinema. » (often en tête de phrase est correct en anglais).

### 5e
- `5eme / decrire-une-personne / quiz[4].choices[0]` : « has » → « takes » (« He has glasses » est correct, ce qui donnait deux réponses).
- `5eme / denombrables-et-quantites / quiz[5].explanation` : « à l'affirmatif » → « à la forme affirmative » (français).
- `5eme / denombrables-et-quantites / resume.keyTerms[2].def` : « some à l'affirmatif, any au négatif et en question » → « some à la forme affirmative, any à la forme négative et dans les questions » (français).
- `5eme / denombrables-et-quantites / quiz[7].question` : « Complète : Would you like ___ tea? » → « Complète cette offre polie de la façon la plus naturelle : Would you like ___ tea? » (« Would you like any tea? » n'est pas fautif ; la consigne vise maintenant la formule naturelle d'une offre).
- `5eme / le-comparatif / resume.sections[2].content` : « A snail is less fast than a rabbit. » → « A snail is not as fast as a rabbit. A cat is less dangerous than a tiger. » (less avec un adjectif court n'est pas idiomatique).
- `5eme / must-have-to-regles / quiz[4].choices[1]` : « Have you to wear a tie? » → « Does you have to wear a tie? » (« Have you to…? » existe en anglais britannique soutenu, même si c'est vieilli).
- `5eme / present-simple-et-be-ing / quiz[6].explanation` : « voyelle courte + consonne accentuée » → « une seule voyelle courte suivie d'une seule consonne, dans une syllabe accentuée » (c'est la syllabe qui porte l'accent, pas la consonne).
- `5eme / superlatif-irlande / resume.keyPoints[3]` : « in + lieu, of + ensemble » → « in + lieu ou groupe, of + pluriel (of all) » (l'ancienne formule poussait à écrire « the happiest girl of the class », contraire au quiz 3).
- `5eme / superlatif-irlande / mindmap.branches[1].label` : « Adjectifs longs » → « Longs et irréguliers » (la branche contient the best et the worst).
- `5eme / superlatif-irlande / mindmap.branches[1].detail` : « Ils se construisent avec the most. » → « The most + adjectif long ; good et bad sont irréguliers. » (la carte laissait croire que the best se forme avec the most).
- `5eme / superlatif-irlande / resume.sections[1].content` : « membre de l'Union européenne depuis 1973 » → « membre de la CEE (aujourd'hui Union européenne) depuis 1973 » (l'UE date de 1993).

### 4e
- `4eme / adverbes-de-maniere / quiz[3].choices[1]` : « She fluently speaks English. » → « She speaks English fluent. » (un adverbe de manière peut se placer avant le verbe, donc la phrase était défendable).
- `4eme / exclamatives-new-york / quiz[5].question` : « What ___ people in Times Square! » → « What ___ huge crowds in Times Square! » (la bonne réponse donnait « What people in Times Square! », qui veut dire « quels gens ! » et non « que de monde ! »).
- `4eme / exclamatives-new-york / quiz[5].explanation` : « People est un pluriel : What + nom pluriel, sans article. » → « Crowds est un pluriel : What + (adjectif) + nom pluriel, sans article. » (suit la nouvelle question).
- `4eme / faire-des-suggestions / quiz[5].choices[1]` : « Don't let's go there. » → « Let's not to go there. » (« Don't let's » est correct en anglais britannique familier).
- `4eme / faire-des-suggestions / mindmap.branches[1].detail` : « Formules suivies de V-ing ou d'un nom. » → « How about / What about + V-ing ou nom ; Shall I…? et Could we…? + base verbale. » (Shall I et Could we étaient rangés sous V-ing).
- `4eme / genitif-et-possessifs / quiz[4].choices[1]` : « Whose are these shoes? » → « Whose these shoes are? » (« Whose are these shoes? » est correct).
- `4eme / gerondif-ou-infinitif / quiz[2].question` : « He's interested ___ photography. » → « He's interested ___ photos. » (la bonne réponse donnait « interested in taking photography », qui n'est pas idiomatique).
- `4eme / indefinis-some-any-no-every / quiz[2].choices[3]` : « Anybody knows the answer. » → « Nobody don't know the answer. » (« Anybody knows… » veut dire « n'importe qui sait… » et est correct).
- `4eme / indefinis-some-any-no-every / quiz[3].question` : « Complète : Would you like ___ to eat? » → « Complète cette offre polie de la façon la plus naturelle : Would you like ___ to eat? » (« Would you like anything to eat? » est courant et correct).
- `4eme / poser-des-questions / flashcards[2].back` : « Which = quel parmi un choix limité… » → « What = quel, quoi, au sens général (What is your name?) ; which = lequel, quel parmi un choix limité… » (le verso n'expliquait pas la différence demandée au recto).

### 3e
- `3eme / comparatif-et-superlatif / mindmap.branches[1].label` : « Adjectifs longs » → « Longs et irréguliers » (la branche contient good → better, best).
- `3eme / comparatif-et-superlatif / mindmap.branches[1].detail` : « On utilise more ou the most. » → « On utilise more ou the most ; good et bad sont irréguliers. » (même raison).
- `3eme / present-perfect / quiz[4].choices[0]` : « already » → « ever » (« Have you finished your project already? » est correct, pour marquer la surprise).
- `3eme / present-perfect / quiz[4].explanation` : réécrite pour yet, ever, just et since (suit le nouveau choix).
- `3eme / present-perfect / quiz[5].explanation` : « un faux calque » → « un calque fautif » (français).
- `3eme / preterit-simple-et-continu / quiz[4].choices[0]` : « When » → « During » (« When the musicians were playing, … » est correct).
- `3eme / preterit-simple-et-continu / quiz[4].explanation` : « When introduit plutôt un événement ponctuel… » → « During est une préposition : il se construit avec un nom (during the night), jamais avec un sujet et un verbe. » (suit le nouveau choix).
- `3eme / pronoms-relatifs-et-heros / flashcards[2].back` : « whose school was attacked » → « whose school bus was attacked » (en 2012, c'est le bus scolaire de Malala qui a été attaqué).
- `3eme / used-to-et-droits-civiques / quiz[1].choices[1]` : « Used they to go to separate schools? » → « Were they used to go to separate schools? » (« Used they to…? » existe en anglais britannique soutenu, même si c'est rare).
- `3eme / voix-passive-et-inventions / quiz[3].choices[0]` : « are published » → « will published » (« The results are published tomorrow » est correct pour un calendrier officiel).
- Catalogue `src/data/programme/3eme/anglais.json / pronoms-relatifs-et-heros / reference` : « whose school was attacked » → « whose school bus was attacked » (même erreur factuelle ; seul ce texte a été modifié, `relu` reste à `false`).

## Doutes pour un prof

- **Questions déclaratives en distracteurs** (« You are English? », « You can cook? », « She has got a pet? », « You were at home? », « You visited London? », « She likes tea? »). Ces questions se disent à l'oral familier avec une intonation montante. Je les ai laissées comptées fausses, comme le veut la norme scolaire. À valider.
- **3e futur-et-projets, quiz 0** (« Look at those black clouds! It ___ rain. ») : « will » est compté faux. La règle scolaire attend going to quand il y a un indice, mais « It'll rain » n'est pas vraiment fautif.
- **4e too-enough-so-such, quiz 0** (« These trousers are ___ long. I can't wear them. ») : « very » est compté faux. L'opposition too / very est classique, mais « very long » n'est pas agrammatical.
- **« Who did go…? » et « Who did call you? »** (5e verbes irréguliers quiz 4, 4e poser-des-questions quiz 3) : le did d'insistance est possible dans un contexte contrastif. Je les ai laissés comptés faux.
- **4e gerondif-ou-infinitif** : les métadonnées et les points clés présentent like / love / hate + V-ing comme la seule construction. Pourtant like / love / hate + to est correct (le catalogue le dit). C'est une simplification, pas une erreur ; on pourrait ajouter une nuance.
- **6e fetes-et-traditions, quiz 1** : « au Canada » sert de distracteur pour Bonfire Night. La fête est pourtant célébrée à Terre-Neuve. Le cas est marginal, je l'ai laissé.
- **5e superlatif-irlande** : « indépendante depuis 1922 » simplifie l'histoire (État libre d'Irlande en 1922, république en 1949). C'est acceptable à ce niveau.
- **3e discours-indirect** : on lit « British Broadcasting Corporation… fondé en 1922 ». En 1922, c'était la British Broadcasting Company ; elle devient Corporation en 1927. La formule courante est tolérable.
- **3e comparatif, flashcard 1** : « the most populated state » est courant, mais « the most populous » est la forme de référence.
- **Niveau** : les contenus correspondent à A1→A2 en 6e-5e et à A2→B1 en 4e-3e. La 5e suit bien le nouveau programme de 2025 ; la 4e et la 3e suivent l'ancien, ce qui est correct en 2026-2027. Certains thèmes reviennent volontairement d'une classe à l'autre (comparatif 5e/3e, impératif 6e/4e, fêtes 6e/4e, St Patrick's Day trois fois). Ce n'est pas une erreur, mais c'est redondant.

## Points forts / faiblesses récurrentes

- **Fort** : les faits culturels sont exacts et précis. J'ai vérifié Titanic, Ellis Island, Rosa Parks, MLK, Mandela, Malala, Bonfire Night, Thanksgiving, Ben Nevis, la Severn et les inventions.
- **Fort** : les règles de grammaire sont justes et les explications en français sont claires et sobres. L'orthographe britannique est cohérente, et les variantes américaines sont signalées comme telles.
- **Faiblesse principale** : des distracteurs de quiz étaient de l'anglais correct. Il s'agissait surtout de formes britanniques familières ou soutenues, ou d'emplois légitimes mais minoritaires. C'est le type d'erreur qu'un professeur d'anglais repère tout de suite.
- **Faiblesse** : les cartes mentales rangent les irréguliers (the best, better) sous « adjectifs longs + the most », et des formules + base verbale sous « + V-ing ». Le classement contredisait la règle.
- **Faiblesse mineure** : certains exemples, et même une bonne réponse, étaient peu idiomatiques (« less fast », « interested in taking photography », « What people… ! »).
