# Plan — Illustrations dans les chapitres (schémas, cartes, figures, œuvres)

_Rédigé le 2026-10-08, à la demande de Johan, après l'audit `docs/relecture-ia/ressources-manquantes.md`. Statut : proposition, décisions en fin de document. Annonce « Bientôt » déjà sur la landing (reviz-landing 4a54638, non poussé)._

## 1. Le problème

Une leçon Réviz est 100 % texte : `lessonSchema` n'a aucun champ image, et ni l'app ni les fiches publiques n'affichent de figure. Or une bonne partie du programme se lit sur un support, et c'est ainsi qu'elle est évaluée : légender le cœur, lire un circuit, compléter un croquis, analyser le portrait de Louis XIV, reconnaître une configuration de Thalès.

L'audit du 8 octobre (383 chapitres lus) :

- 12 chapitres d'histoire étaient **cassés** (la méthode demandait de lire une carte ou un tableau absent). Réparé le jour même en texte (reviz-web 08753d5), mais la vraie réponse reste l'image.
- 118 chapitres sont **fortement aidés** par une ressource : géographie 28, physique et techno 27, SVT et sciences 23, maths 18, anglais 9, français 7, histoire 6.
- 179 ressources au total : 145 à dessiner (SVG), 16 graphiques ou cartes à partir de données publiques, 15 œuvres ou textes du domaine public, 3 sous droits (à remplacer).

Les chiffres détaillés, chapitre par chapitre et champ par champ, sont dans `docs/relecture-ia/ressources-manquantes.json`. Ce fichier sert de cahier des charges pour la production.

## 2. Ce que voit l'élève

- **Dans le Résumé** : la figure apparaît dans la section qu'elle illustre (ou en tête de la méthode quand c'est elle qui l'utilise), sur une carte blanche « papier », avec une légende courte et, pour une œuvre, le crédit (« Hyacinthe Rigaud, 1701, musée du Louvre »).
- **Toucher la figure** l'ouvre en plein écran, avec zoom au pincement et déplacement. Utile pour une carte ou un caryotype sur un téléphone de 375 px.
- **Mode « Me tester »** (déjà présent dans le Résumé) : sur un schéma légendé, les légendes sont floutées et se révèlent au toucher, comme les définitions aujourd'hui. C'est exactement l'exercice du contrôle (« légende le schéma »). Possible seulement pour les SVG qu'on dessine nous-mêmes, dont les légendes sont des éléments séparés.
- **Fiches publiques** (`www.revizapp.fr/fiches/...`) : la même figure, avec un texte alternatif soigné. Bonus SEO : Google Images est un vrai canal pour « schéma du cœur 5e » ou « croquis aires urbaines 3e ».
- Rien ne change pour les leçons scannées (voir § 8).

## 3. Données

**Dans le fichier du chapitre** (`public/programme/<classe>/<matière>/<id>.json`), un tableau optionnel à la racine :

```json
"illustrations": [
  {
    "id": "coeur-face",
    "src": "/programme/illustrations/5eme/svt/coeur-face.svg",
    "alt": "Cœur vu de face en coupe : oreillettes et ventricules droits à gauche du dessin…",
    "legende": "Le cœur vu de face : le cœur droit est à gauche du dessin.",
    "ancre": "resume.sections[1]",
    "credit": null,
    "legendesMasquables": true
  }
]
```

- `ancre` : `resume.sections[i]`, `resume.methode` ou `resume.intro`. Plus tard `quiz[i]` et `flashcards[i]` (§ 9, étape 4).
- `credit` obligatoire pour une œuvre ou une photo ; `null` pour nos dessins.
- `legendesMasquables` : le SVG porte ses légendes dans des éléments `<text class="legende">` que le mode « Me tester » peut flouter.
- `lessonSchema.parseLessonJson` accepte le champ, le filtre (entrées sans `src` ou sans `alt` écartées) et ne le rend jamais obligatoire : les 383 chapitres actuels restent valides, comme pour les rubriques ajoutées le 7 octobre.

**Fichiers** : `public/programme/illustrations/<classe>/<matière>/<id>.svg` (ou `.webp` pour une œuvre). Les ressources partagées (kit électricité, fonds de carte) vivent dans `public/programme/illustrations/communs/` et plusieurs chapitres y pointent.

**Formats** :
- Dessins : SVG écrit à la main, `viewBox` fixe, traits en encre `#2D2B57`, une couleur d'accent, police système pour les légendes, moins de 15 Ko. Pas de dépendance au thème : ils sont affichés sur fond blanc dans les deux thèmes (§ 10, décision 2).
- Œuvres : WebP, 1600 px de large, moins de 250 Ko, reproduction du domaine public (Wikimedia Commons, catégorie PD-Art, ou site du musée), crédit noté.
- Graphiques de données : SVG produit par un script à partir d'un fichier de données versionné (source citée dans la légende : « Source : ONU, World Population Prospects 2024 »).

**Les leçons déjà ouvertes.** Ouvrir un chapitre copie tout son contenu dans l'historique de l'élève (`saveLesson`, localStorage + Firestore `users/{uid}/lessons/prog-<id>`). Une illustration ajoutée après coup n'y serait donc pas. Deux changements :
1. `openChapter` enregistre aussi `classe` et `matiere` dans l'entrée (aujourd'hui seul `chapterId` y est, et un même id existe dans plusieurs classes : `proportionnalite` en 5e et en 4e).
2. Le Résumé d'une leçon `source: 'programme'` relit les illustrations dans le fichier du chapitre (déjà en cache via `programmeService`) au lieu de celles de la copie. Pour une ancienne entrée sans `classe`, on prend la classe du profil ; si le fichier ne répond pas, la leçon s'affiche sans figure, comme aujourd'hui.

## 4. Affichage

**App (reviz-web)**
- Nouveau composant `Illustration` (`src/components/Illustration.jsx` + CSS) : `<figure>` carte blanche, image en `loading="lazy"`, `figcaption` pour la légende et le crédit, bouton plein écran.
- Plein écran : feuille modale avec pincement et déplacement. La carte mentale sait déjà zoomer et se déplacer : réutiliser sa logique plutôt que d'ajouter une bibliothèque.
- Les SVG à légendes masquables sont insérés en ligne (contenu de confiance : ce sont nos fichiers) pour que le CSS du mode « Me tester » atteigne les `<text class="legende">`. Les autres passent par `<img>`.
- `Resume.jsx` : `SectionCard` et le bloc méthode affichent les illustrations dont l'`ancre` correspond.
- Ordinateur (`desktop.css`) : la figure peut passer à droite du texte de la section au-delà de 1024 px.
- iOS : `public/` est embarqué dans l'app (Capacitor, `webDir: dist`), comme les chapitres. Les figures marchent donc hors ligne, mais une nouvelle figure demande un nouveau build iOS, comme un nouveau chapitre aujourd'hui.

**Fiches publiques (reviz-landing)**
- `scripts/sync-programme.mjs` copie aussi `public/programme/illustrations/` vers `public/programme/illustrations/` de la landing (les JSON vont dans `content/`, les images doivent être servies depuis `public/`).
- La page chapitre (`src/app/fiches/[classe]/[matiere]/[chapitre]/page.tsx`) affiche la figure au même endroit que dans l'app, avec `next/image` pour les WebP et `<img>` pour les SVG.
- Sitemap d'images (`sitemap.ts` sait ajouter `images` par URL) pour Google Images.

## 5. Production des ressources

| Famille | Combien | Comment | Contrôle |
|---|---|---|---|
| Schémas et figures (SVT, physique, maths, techno, plans) | ~110 | SVG écrits par Claude d'après la fiche du chapitre et la description de l'audit, un fichier par ressource | rendu PNG à 2 tailles, relecture visuelle ; anatomie et symboles normalisés vérifiés contre un manuel libre (lelivrescolaire.fr, Sésamath) |
| Fonds de carte et croquis | ~35 | script `scripts/illustrations/cartes.mjs` : contours Natural Earth (domaine public) projetés en SVG, puis couches du croquis (aplats, flèches, points) écrites à la main | même rendu ; légende du croquis organisée comme au brevet |
| Graphiques de données | 16 | script qui trace la courbe à partir d'un JSON de données sourcé (ONU, INSEE, Banque mondiale, NOAA) | valeurs relues contre la source |
| Œuvres et documents anciens | 15 | téléchargement d'une reproduction du domaine public, recadrage, WebP | crédit et licence notés ; **chaque téléchargement validé par Johan** |
| Sous droits | 3 | remplacer : Nighthawks (Hopper) par un tableau libre ; photo de Benidorm et photo de mitose par un schéma ou une photo sous licence libre | — |

Garde-fous repris des relectures précédentes : un sous-agent ne touche qu'à ses fichiers d'illustration et au champ `illustrations` ; **interdiction explicite de lancer `scripts/programme/valider.mjs`** (il réécrit tous les chapitres) ; un outil dédié `scripts/programme/illustrations.mjs` (`etat`, `ajouter`, `verifier`) pose le champ et vérifie que chaque `src` existe, que l'`alt` est rempli, que l'`ancre` pointe vers un endroit réel et que le fichier reste léger.

## 6. Ordre de production

**Lot 1 — pilote, 3e brevet et les plus partagés (~25 ressources, ~30 chapitres)**
- Kit électricité : symboles normalisés, série, dérivation, ampèremètre, voltmètre → 7 chapitres de physique (5e à 3e) + va-et-vient en techno 4e.
- Fond de carte France et UE + 5 croquis corrigés de 3e (aires urbaines, espaces productifs, faible densité, UE).
- Œuvres d'histoire des méthodes réparées : Rigaud, Le Sacre de David, mosaïque de Justinien, stèle de Hammurabi.
- SVT 5e : cœur et double circulation, appareil digestif, appareil respiratoire.
- Maths 3e : Thalès (deux configurations + contre-exemple), trigonométrie, lecture graphique de fonctions.

On regarde le lot 1 dans l'app et sur les fiches avant de lancer la suite : taille, lisibilité sur téléphone, mode « Me tester ».

**Lot 2 — cartes d'histoire-géo restantes** (planisphères, Empire romain, route de la soie, commerce triangulaire, guerre froide, États-Unis, Afrique de l'Ouest, Méditerranée, routes maritimes), courbes de population et pyramides des âges.

**Lot 3 — le reste** : SVT 4e et 3e, physique (modèles particulaires, chronophotographies, Lune), maths 6e à 4e, français (Daumier, calligrammes, textes intégraux de Hugo, Rimbaud, Du Bellay, La Fontaine), anglais (îles Britanniques, plan de quartier, The Hay Wain).

**Technologie** : attendre sa réécriture au programme 2024, puis dessiner ses diagrammes (bête à cornes, FAST, Gantt, chaînes) directement avec les nouveaux chapitres.

## 7. Anglais : écouter la prononciation

Trois chapitres (alphabet, -s de la 3e personne, -ed du prétérit) ont besoin d'un son plutôt que d'une image. Pas de fichier audio à produire : la synthèse vocale du navigateur (`speechSynthesis`, voix `en-GB`) existe sur iOS, Android et ordinateur. Un petit bouton « Écouter » à côté des exemples marqués comme tels. Chantier séparé et court ; à faire en même temps que le lot 3, ou avant si on veut une démo rapide.

## 8. Hors périmètre

- **Leçons scannées** : leurs figures sont dans le cahier de l'élève, qu'il a sous les yeux. Garder la photo de la leçon et la montrer à côté du Résumé est une autre idée, à discuter à part (stockage, vie privée).
- **Génération d'images par IA** : non. Un schéma de SVT faux ou une carte approximative fait plus de mal que pas de schéma, et c'est invérifiable à l'échelle. Tout est dessiné, scripté à partir de données, ou reproduit d'une œuvre réelle.
- **Exercice « légende le schéma » interactif** (glisser les étiquettes) : idée pour après, une fois les SVG à légendes séparées en place.

## 9. Étapes

1. **Socle** (une session) : champ `illustrations` dans `lessonSchema` + tests ; composant `Illustration` + plein écran ; ancrage dans `Resume.jsx` ; `classe`/`matiere` dans `openChapter` et relecture des illustrations pour les leçons du programme ; sync et affichage sur les fiches ; outil `illustrations.mjs`. Vérification : e2e Résumé avec une fixture illustrée, captures 390 px et ordinateur, build iOS au simulateur.
2. **Lot 1** (une session) puis revue avec Johan.
3. **Lots 2 et 3** par sous-agents, une matière par agent, avec rendu PNG de chaque figure dans le rapport pour relecture.
4. **Ensuite** : figures dans le quiz et les flashcards (questions « que montre ce schéma ? », « quelle est la flèche B ? »), bouton « Écouter » en anglais, exercice de légende.

## 10. Décisions à prendre

1. **Figures dans le Résumé seulement au début, ou aussi dans le quiz ?** Reco : Résumé (sections et méthode) d'abord ; le quiz illustré à l'étape 4, quand on aura vu ce que donne le lot 1.
2. **Thème sombre** : figure sur une carte blanche « papier » dans les deux thèmes (reco : simple, lisible, comme un document de manuel) ou deux versions de chaque SVG.
3. **Accès** : figures pour tout le monde, gratuit compris (reco : oui, c'est la qualité du contenu ; Réviz+ reste sur le volume et les parcours).
4. **Œuvres** : d'accord pour télécharger des reproductions du domaine public sur Wikimedia Commons ou les sites des musées, avec crédit ? (Je demanderai fichier par fichier.)
5. **Ordre des lots** : celui du § 6 (brevet et ressources partagées d'abord) ou une matière entière d'abord pour la montrer aux profs ?
6. **Annonce** : la landing dit « Bientôt » sans date. Pousser maintenant, ou attendre que le lot 1 soit prêt ?
