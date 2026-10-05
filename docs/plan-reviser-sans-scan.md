# Plan — « Réviser sans scan » (mon programme) et Réviz sur ordinateur

_Rédigé le 2026-10-05 au soir, à la demande de Johan. Statut : proposition, décisions en fin de document._

## 1. Le problème

Aujourd'hui Réviz ne sert à rien sans une leçon à scanner. Il faut le cahier, une photo lisible, trente secondes d'IA. Au CDI, sur un poste fixe, sans cahier et sans caméra, l'élève n'a rien à faire dans l'app.

Les chiffres du 5 octobre le confirment : 12 comptes, 6 ont scanné au moins une leçon, aucun élève actif depuis le 27 juin. Le scan est la marche d'activation que la moitié des inscrits ne franchit pas, et l'app n'a aucune valeur « à vide ».

L'intention : qu'un élève connecté puisse réviser **son programme** en trente secondes sans rien apporter, et qu'un professeur documentaliste puisse recommander Réviz comme « le site pour réviser le programme », sur les ordinateurs du CDI comme sur le téléphone.

## 2. Ce que voit l'élève

- **Une entrée « Mon programme »** sur l'accueil (le héros lui-même quand il n'a pas de leçon, une carte sous le héros sinon), dans l'onglet Cours à vide, et comme troisième choix de la page Scanner.
- **Page Mon programme** : les matières de sa classe, avec la mascotte de chaque matière et la progression (chapitres commencés / maîtrisés / total).
- **Page matière** : les chapitres du programme officiel de sa classe, dans l'ordre de l'année, avec un état par chapitre (jamais ouvert, commencé, à revoir, maîtrisé) calculé par la répétition espacée existante.
- **Un chapitre** s'ouvre exactement comme une leçon analysée : choix flashcards / quiz / résumé / carte mentale, puis les pages de révision actuelles. À la première ouverture, le chapitre devient une leçon de l'élève (origine « programme ») : révisions, XP, série, badges, coach, tout fonctionne sans changement.
- **Parcours brevet** (3e, plus tard) : les chapitres à revoir d'ici juin, répartis par semaine, avec les deux matières de sciences tirées au sort simulées.

Ce que l'élève ne voit pas : aucune génération en direct la plupart du temps. Les contenus d'un chapitre sont produits une fois et partagés entre tous les élèves.

## 3. Le contenu : d'où viennent chapitres et révisions

**Catalogue de chapitres.** Un fichier par classe et par matière : pour chaque chapitre, un titre, l'ordre dans l'année, les notions clés, les mots-clés, et un « contenu de référence » de dix à vingt lignes (ce que le chapitre dit vraiment : définitions, propriétés, repères, vocabulaire). Structuré d'après les programmes officiels (Bulletin officiel, pages Éduscol), versionné par programme : les nouveaux programmes de français, mathématiques et langues du cycle 4 (arrêté du 18 février 2026) entrent en 5e à la rentrée 2026, en 4e en 2027 et en 3e en 2028. Le programme de 3e du brevet 2027 est donc stable toute l'année : c'est par lui qu'on commence.

**Où sont les programmes (vérifié le 5 octobre 2026).**
- Les textes officiels sont sur Éduscol, par cycle et par discipline, et au Bulletin officiel (arrêtés, repris sur Légifrance). Le découpage **par classe** n'existe officiellement qu'en français et en mathématiques : les « repères annuels de progression et attendus de fin d'année » du CP à la 3e (BO n° 22 du 29 mai 2019, PDF sur Éduscol). C'est la colonne vertébrale du catalogue pour ces deux matières ; pour les autres (histoire-géographie, SVT, physique-chimie, technologie), le programme est écrit pour le cycle et le découpage par année suit l'usage des manuels.
- Il n'existe **pas de base de données structurée** des programmes chez l'État : pas de « chapitres par classe » en JSON ou en API. data.gouv.fr référence les programmes sous forme de 116 fichiers Word et une ontologie universitaire (OWL/RDF) limitée au secondaire : utilisables pour une extraction automatique, pas comme référence prête à l'emploi.
- Pour recouper le découpage en chapitres et le vocabulaire : les manuels sous licence libre, lelivrescolaire.fr (CC BY-SA, collège : français, anglais, histoire-géographie-EMC, mathématiques, et d'autres depuis) et Sésamath (mathématiques, GNU FDL puis CC BY-SA). Attention : reprendre leur texte impose l'attribution et le partage à l'identique du contenu dérivé. On s'en sert donc pour contrôler, pas pour copier : le contenu de référence est rédigé à partir des programmes officiels, qui sont des documents administratifs réutilisables.
- Méthode du script : programme + attendus (PDF vers texte) en entrée, découpage proposé en chapitres avec notions et contenu de référence en sortie, relecture humaine du JSON avant publication.

**Génération des quatre formats.** La même IA et le même schéma JSON que le scan, mais nourris par le contenu de référence du chapitre et non par un texte d'élève : moins de risque de détournement, qualité stable d'un élève à l'autre, et tous les garde-fous « mineurs » du prompt actuel conservés. Généré une fois par chapitre et par version de programme, stocké côté serveur et servi à tous : le coût IA est celui d'un seul scan par chapitre, soit quelques euros pour tout le collège.

**Qui écrit le catalogue.** Un script produit un premier jet par classe et matière à partir des programmes officiels (modèle plus fort que celui du scan, puisqu'on ne le paie qu'une fois), puis relecture humaine avant mise en ligne : Johan, et idéalement un professeur par matière pour la 3e. Ordre de grandeur : 3e brevet = français, mathématiques, histoire-géographie-EMC, SVT, physique-chimie, technologie, soit environ 70 chapitres ; tout le collège et le lycée, environ 800.

**Qualité et sûreté.** Contenu strictement scolaire et sans donnée d'élève. Bouton « Signaler une erreur » sur chaque format (réutilise le retour élève existant), régénération d'un chapitre par un administrateur, date de dernière relecture visible.

## 4. Modèle économique

- Gratuit : un chapitre par jour (ou trois par semaine, à trancher). Réviz+ : chapitres illimités et parcours brevet. Le scan garde ses cinq par semaine en gratuit.
- Le programme donne enfin une raison durable de prendre Réviz+ : aujourd'hui l'abonnement ne vend que « plus de scans » à des élèves qui scannent peu.
- Point d'attention iOS : si Réviz+ débloque du contenu dans l'app native, Apple exigera l'achat intégré (décision Stripe / IAP déjà ouverte).

## 5. Acquisition : CDI, professeurs, SEO

- **Pages publiques par chapitre** (`/programme/3e/mathematiques/theoreme-de-thales`) : titre, notions, trois flashcards et deux questions en aperçu, puis « Révise tout le chapitre » vers l'inscription. C'est le canal « SEO brevet 2027 » décidé en juillet, avec un vrai contenu derrière chaque page. Prérequis technique : ces pages doivent être pré-rendues au build (l'app est une SPA), à partir du catalogue.
- **CDI** : une affiche avec QR code, et l'app utilisable sur les postes fixes (section suivante). Plus tard, un lien « classe » qu'un professeur partage pour voir qui a révisé quoi (sans note, sans classement).
- **Brevet 2027** : épreuves les 24, 25 et 28 juin 2027 ; les épreuves finales comptent pour 60 % depuis la session 2026. Le parcours brevet se cale sur ce calendrier.

## 6. Réviz sur ordinateur

**État actuel.** Au-delà de 1024 px, l'app s'affiche comme un téléphone de 480 px posé au milieu de l'écran ; entre 431 et 1024 px, une carte de 600 px ; la navigation est une capsule en bas d'écran ; toutes les pages sont pensées en une colonne ; la page Scanner démarre sur la caméra. Les états de survol et de focus clavier sont déjà en place.

**Cible : retouches, même langage visuel, pas de refonte.** Crème, cartes blanches, halo, mascottes et encre restent tels quels. Ce qui change au-delà de 1024 px :

- Plus de « téléphone dans la page » : une barre latérale gauche (logo, Accueil, Cours, Mon programme, Progrès, Profil, Réglages, bouton Scanner) remplace la capsule du bas ; le contenu occupe une colonne centrale de 720 à 960 px selon la page ; le halo reste en haut.
- Des grilles là où ça compte : Cours et Mon programme en deux ou trois colonnes, Progrès avec les cartes côte à côte, Résumé en colonne de lecture confortable, Flashcards avec une carte plus large et les touches espace / flèches, Quiz avec les choix sur deux colonnes et les touches 1 à 4, carte mentale qui profite de la place (elle sait déjà zoomer et se déplacer).
- Scanner sur ordinateur : onglet Texte par défaut quand il n'y a pas de caméra, « Importer une photo » bien visible, glisser-déposer d'une image.
- Le natif iOS ne voit rien changer (ses règles plein écran priment déjà).
- Multi-appareils : l'élève qui révise au CDI doit retrouver sa classe et sa progression sur son téléphone. Le niveau passe par le profil Firestore dès la phase 1 ; les révisions et la répétition espacée sont synchronisées en phase 2 (chantier « SRS synchronisé », déjà ouvert).

**Vérification.** Captures Playwright en 1280 px et en 390 px sur chaque page, comparées avant/après ; aucun changement visible sous 1024 px.

## 7. Découpage et ordre proposés

| Phase | Contenu | Effort estimé | Qui |
|---|---|---|---|
| 0. Décisions | les six questions de la section 10 | 10 min | Johan |
| 1. Socle programme | catalogue 3e (script + relecture), modèle de données, point d'entrée serveur avec cache partagé et quota, pages Mon programme / matière / chapitre, branchement leçon-révisions-coach, tests unitaires et e2e | 4 à 5 nuits, 1 soirée de relecture du contenu | nuits + Johan |
| 2. Ordinateur | barre latérale, colonnes et grilles, Scanner sans caméra, raccourcis, captures | 3 nuits, 1 soirée de contrôle visuel | nuits + Johan |
| 3. Acquisition | pages publiques pré-rendues, affiche CDI, parcours brevet, lien classe | 3 à 4 nuits | nuits |
| 4. Extension | 6e → terminale, versions de programme 2026, spécialités du lycée | au fil de l'eau | nuits |

Recommandation : phases 1 et 2 dans la même quinzaine, car le cas d'usage CDI exige les deux ; la phase 3 seulement quand un premier élève a révisé un chapitre en vrai.

## 8. Mesure du succès

Dans le poste de pilotage et PostHog (la bannière de consentement arrive avec les branches de nuit) : part des comptes qui révisent sans scan, chapitres ouverts par semaine, retour à sept jours, inscriptions venant des pages publiques. Objectif de la phase 1 : dix élèves du collège de Johan qui ouvrent un chapitre au CDI avant les vacances de Noël.

## 9. Risques et parades

- **Contenu faux ou hors programme** : relecture avant mise en ligne, signalement en un geste, régénération, date de relecture visible.
- **Programmes qui changent** (5e dès 2026) : catalogue versionné par programme, l'élève voit la version de sa classe et de son année.
- **Coût IA** : génération partagée et mise en cache ; quota par élève sur la première ouverture d'un chapitre.
- **Niveau et progression non synchronisés** : aujourd'hui la classe de l'élève et sa répétition espacée ne vivent que dans le navigateur. Au CDI, il arriverait sans classe et repartirait sans sa progression. Le niveau se corrige en phase 1 (lecture du profil Firestore), la progression en phase 2.
- **Règles Firestore** : nouvelles collections à déployer à la main par Johan (le CLI Firebase n'est pas authentifié dans les sessions).
- **Doublons avec les trois branches de nuit** (consentement, Firebase différé, inscription) : elles touchent la coquille connectée et l'inscription, pas le cœur révision ; les fusionner d'abord, puis démarrer la phase 1 sur main à jour.

## 10. Décisions à prendre

1. Classe et matières de départ : **3e, les matières du brevet** (recommandé).
2. Accès : **gratuit limité, Réviz+ illimité** (recommandé), ou tout gratuit le temps de la traction.
3. Nom de l'entrée : **« Mon programme »** (recommandé), « Réviser sans scan », « Chapitres ».
4. Pages publiques SEO : **oui, en phase 3** (recommandé).
5. Relecture du contenu : Johan seul, ou un professeur par matière.
6. Ordinateur : **juste après le socle, même quinzaine** (recommandé), ou avant.

## Décisions du 5 octobre au soir (Johan) et avancement

- **On construit tout de suite**, pas en tâches de nuit.
- **Mode essai sans compte** : prénom + classe, et l'élève révise son programme ; tout reste dans le navigateur et suit à l'inscription. Il remplace la synchronisation multi-appareils comme prérequis du cas CDI (un élève de passage n'a pas besoin de retrouver sa progression ailleurs).
- **Contenus statiques pré-générés** plutôt qu'un point d'entrée serveur avec cache : chaque chapitre est un fichier JSON partagé (`public/programme/<classe>/<matière>/<id>.json`), produit une fois par `scripts/programme/generer.mjs` (Claude Opus 5.5, prompt « programme » dérivé de celui du scan, même validation). Aucun appel IA ni quota à l'usage, aucune règle Firestore à déployer, et ça marche sans compte. Le serveur n'a rien à faire.
- **Fait le 5 octobre (commit local, non poussé)** : pages Mon programme et matière, ouverture d'un chapitre comme une leçon, mode essai complet (entrée, bandeau, murs scan et coach, reprise à l'inscription), niveau retrouvé depuis le profil, entrées depuis l'accueil, Cours, Welcome, état vide ; synchronisations Firestore qui attendent les écritures en vol ; 278 tests unitaires et 8 parcours e2e (dont deux pour le programme, avec captures).
- **Bloqué** : la génération des contenus de 3e. La clé Anthropic de `.env.local` est révoquée (401 sur l'URL officielle). Dès qu'une clé valide est posée dans `.env.local`, lancer `node scripts/programme/generer.mjs tout` (≈ 100 chapitres, ≈ 10 €, 45 min en arrière-plan), relire les catalogues `src/data/programme/3eme/*.json`, puis commiter `public/programme/3eme/`.
- **Ordinateur, fait le 5 octobre au soir (commit local)**. Une première version « colonne de téléphone agrandie » a été refusée par Johan (« c'est juste mobile grossi ») : la bonne version compose pour la largeur, à look constant. Barre latérale, colonne de 1120 px, et une grille par page dans `src/styles/desktop.css` : accueil en tableau de bord, matières en grille de trois, chapitres sur deux colonnes, Mes cours avec rail « À reprendre », Analyse en deux volets, Résumé avec rail « à retenir » collant, quiz à choix sur deux colonnes, Progrès, Profil et Réglages sur deux colonnes, Scanner en deux panneaux (photo ou glisser-déposer, texte) sans onglets, clavier sur Flashcards et Quiz. Sous 1024 px et dans l'app native, rien ne change. Vérifié par le parcours e2e `desktop.spec.js` (captures en 1280 px, témoin en 390 px).
- **À suivre** : relecture humaine des catalogues (champ `relu`), bouton « Signaler une erreur » par chapitre, pages publiques par chapitre (phase 3), retirer les fichiers de démonstration de `public/programme/` avant de générer les vrais contenus.

## 11. Branchement technique

_D'après l'exploration du code du 5 octobre (branche `main`, HEAD `c7ada6d`)._

### Ce qui se réutilise tel quel

- Le schéma JSON demandé à l'IA et sa validation (`src/utils/aiPrompts.js` 144-203, `_parseResult` dans `src/services/aiService.js` 87-170) : un chapitre produit exactement le même objet qu'un scan (metadata, 6 à 8 flashcards, 5 à 8 questions, résumé, carte à 4 branches).
- La grille des quatre formats de `src/pages/Analyse.jsx` (46-51, 291-311) et les pages Flashcards, Quiz, Résumé, Carte mentale, qui lisent `reviz-ai-data` et `reviz-current-lesson-id` ; les révisions (`revisionService`), la répétition espacée (`srsService`), le coach (contexte résolu côté serveur depuis `users/{uid}/lessons/{id}`), les partages.
- Le transport client `_callProxy` et le lancement anticipé `_pending` (`aiService.js` 20-50 et 175-230), le quota journalier `api/_chatQuota.js` comme modèle, la chaîne auth → quota → Anthropic → remboursement de `api/analyse.js`.

### Ce qu'il faut ajouter (phase 1)

1. **Catalogue** : `src/data/programme/<cycle>/<classe>/<matiere>.json` (id stable, ordre, titre, notions, mots-clés, contenu de référence, version de programme, date de relecture) et `src/utils/programme.js` (accès par niveau). Les noms de matières doivent être ceux de `subjectsLine` (`aiPrompts.js` 74-80), sinon regroupement, mascottes et Progrès cassent. Script `scripts/programme/generer-catalogue.mjs` pour le premier jet, jamais exécuté en production.
2. **Prompt** : `buildProgrammeSystemPrompt(level)` et `buildChapterUserMessage(chapitre)` dans `aiPrompts.js`, qui partagent schéma, quantités et règles « mineurs » avec le scan mais remplacent la règle « fondé uniquement sur la leçon fournie » (221) par « fondé uniquement sur le contenu de référence du chapitre ». Ré-export dans `api/_systemPrompt.js`.
3. **Serveur** : `api/chapitre.js` sur le modèle d'`analyse.js`. Entrée `chapterId` pris dans une liste fermée, jamais de texte libre ; `metadata` fixée côté serveur depuis le catalogue ; **cache partagé** `chapterCache/{version_classe_chapterId}` lu avant tout appel Anthropic (Admin SDK seul, aucune règle client) ; quota `api/_programmeQuota.js` (un chapitre par jour en gratuit, illimité en premium), remboursé sur erreur et sur JSON invalide.
4. **Client** : `generateChapter()` et `startChapterGeneration()` dans `aiService.js` ; `saveLesson(metadata, aiData, { source: 'programme', chapterId })` dans `historyService.js` avec un champ `source`, un dédoublonnage par `chapterId`, et sans `incrementScanCount` ni défi « scan » ; troisième source `reviz-chapter-request` dans l'effet de chargement d'`Analyse.jsx` (83-108) et textes selon la source ; `reviz-ai-data` vidé avant de lancer un chapitre, comme le fait déjà `Scan.jsx`.
5. **Pages** : `/programme` (matières de la classe) et `/programme/:matiere` (chapitres et état), chargées à la demande dans `App.jsx` (68-96). Plutôt un second segment « Mon programme » dans l'onglet Cours qu'un cinquième onglet : onglet Cours actif sur ces routes (`BottomNav.jsx` 100). Entrées : bouton secondaire du `HeroCTA` (`Home.jsx` 156-172), écran vide de `Cours.jsx` (249-285), `MissingLessonState`, page Scanner.
6. **Niveau fiable** : `getUserLevel()` ne lit que le navigateur (`AuthContext.jsx` 221-238), donc sur un ordinateur du CDI le niveau vaut `null` et l'app redemande la classe. Lire `users/{uid}.level` via `getUserProfile` (jamais appelé aujourd'hui) au chargement, et réécrire le profil quand le niveau change. Indispensable pour le cas CDI.
7. **Tests** : vitest pour `programme.js`, les prompts, `api/chapitre.js` (mocks `_firebaseAdmin`, quota, cache), `historyService` (source, dédoublonnage) ; e2e « un élève de 3e ouvre un chapitre et révise », avec le nouvel endpoint déclaré dans `mockApiRoutes` (`e2e/helpers.js`).
8. **RGPD et règles** : toute nouvelle sous-collection élève va dans `deleteAccount` (`AuthContext.jsx` 193-200) et dans `firestore.rules`, déployées à la main par Johan.

### Pièges relevés

- Sans texte source, le prompt actuel refuse (`NON_SCOLAIRE`) ou invente des dates et des formules : d'où la liste fermée, le contenu de référence et le cache relu.
- Une carte jamais vue compte comme « à revoir » (`srsService.countDueCards`) : créer la leçon seulement quand l'élève démarre le chapitre, jamais tout le catalogue d'avance. Régénérer un chapitre ne doit pas changer l'id de leçon, sinon l'état de répétition est perdu.
- XP = 100 par leçon, badges et défis comptent les leçons : un chapitre vaut une leçon pour l'XP, pas pour le défi « scanne N leçons ».
- `saveLesson` n'attend pas l'écriture Firestore : ouvrir le coach tout de suite peut répondre `LESSON_NOT_FOUND`. Attendre l'écriture pour les chapitres.
- Répétition espacée et niveau vivent dans le navigateur, sans synchronisation : l'élève qui révise au CDI puis sur son téléphone perd sa progression. La couche de synchronisation (item 17 de l'audit de juillet, chantier « SRS synchronisé ») devient prioritaire avec l'ordinateur.
- Textes qui supposent un scan : Analyse, `MissingLessonState`, Cours vide, Coach vide, `PremiumModal` (« scans gratuits »).

### Ordinateur : points d'accroche

- `src/styles/global.css` 441-528 : coquille de 480 px sur grand écran, 600 px entre 431 et 1024 px, plein écran en dessous ; `html.native` prime (536-570). Ajouter une branche « 1024 px et plus » : plus de coquille, grille barre latérale + contenu, colonne centrale par page.
- `BottomNav.jsx` → composant `SideNav` rendu à partir de 1024 px, mêmes entrées plus Scanner. CSS seul pour la mise en page ; un petit hook de media query uniquement pour choisir le composant et activer les raccourcis clavier.
- `Scan.jsx` 33-40 : la caméra démarre à l'ouverture ; sur un ordinateur sans caméra, ouvrir l'onglet Texte et mettre en avant « Importer une photo » et le glisser-déposer.
- Pages : largeurs maximales et grilles dans `Cours.css`, `Progres.css`, `Resume.css`, `Flashcards.css`, `Quiz.css`, `Mindmap.css`, `headers.css` (`PageIntro` plus large). Les règles `@media (hover: hover) and (pointer: fine)` existantes gardent les états de survol.
- Vérification : une spec Playwright de captures en 1280 px et 390 px par page, comparées avant et après.

### Tâches de nuit prêtes à coller, si le plan est validé

- [ ] [reviz] Programme 3e, lot 1 : catalogue — script `scripts/programme/generer-catalogue.mjs` et JSON de 3e pour maths et français (contenu de référence de 10 à 20 lignes par chapitre, d'après les programmes de 2015 encore en vigueur en 3e), `src/utils/programme.js` et tests — branche claude/nuit-…, rapport avec la liste des chapitres à relire.
- [ ] [reviz] Programme 3e, lot 2 : serveur — `api/chapitre.js` (liste fermée, metadata serveur, cache `chapterCache`, quota `_programmeQuota.js`, remboursements), prompts `buildProgrammeSystemPrompt` / `buildChapterUserMessage`, tests API — branche claude/nuit-…
- [ ] [reviz] Programme 3e, lot 3 : client — `generateChapter`, `saveLesson` avec `source` et `chapterId`, troisième source d'Analyse, pages `/programme` et `/programme/:matiere` (segment dans Cours), entrées Home, Cours vide et `MissingLessonState`, textes — vitest et e2e « ouvrir un chapitre et réviser » — branche claude/nuit-…
- [ ] [reviz] Niveau fiable entre appareils : lire `users/{uid}.level` au chargement quand le navigateur n'a rien, réécrire le profil au changement de niveau, tests — branche claude/nuit-…
- [ ] [reviz] Ordinateur, lot 1 : branche « 1024 px et plus » de `global.css`, `SideNav`, colonne centrale, aucune différence visible en dessous (captures 1280 et 390 avant-après) — branche claude/nuit-…
- [ ] [reviz] Ordinateur, lot 2 : grilles Cours, Programme et Progrès, Résumé en colonne de lecture, raccourcis clavier Flashcards et Quiz, Scanner sans caméra (Texte par défaut, import, glisser-déposer) — captures — branche claude/nuit-…
