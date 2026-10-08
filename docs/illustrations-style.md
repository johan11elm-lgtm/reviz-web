# Illustrations — guide de style et marche à suivre

_Référence : le cœur de 5e SVT, `public/programme/illustrations/5eme/svt/coeur-vu-de-face.svg`. Le lire avant de dessiner. Plan d'ensemble : `docs/plan-illustrations.md`._

## Règles de hiérarchie (v2, 8 octobre, validées par Johan) — elles priment sur le reste

Le premier jet faisait « brouillon » : trop de styles de texte, des phrases dans le dessin, des informations répétées. Désormais :

1. **Le dessin ne contient que des étiquettes**, jamais de phrase ni de titre. Le titre de la figure va dans le champ `titre` du JSON, l'explication dans `legende` ; l'app les affiche autour du dessin (surtitre « Schéma », « Figure », « Carte »… puis titre, puis dessin, puis légende).
2. **Trois styles de texte au plus** dans un dessin : étiquettes (11,5 à 12,5, gras ou semi-gras, encre), noms de points en maths (12,5, gras, encre), mentions secondaires (11, semi-gras, `#8A8273`, en minuscules : « En papillon », « Cœur droit »). **Plus de capitales espacées**, plus de texte coloré (sauf l'accent sur un seul élément si c'est indispensable).
3. **Une seule couleur d'accent** (`#B34400`) pour ce qu'il faut regarder, et **un seul aplat clair** pour l'élément important (`#FBE9DD` avec l'accent, ou les aplats bleu/rouge en SVT quand la convention l'impose). Le reste : encre et blanc.
4. **Rien de redondant** : pas de « (MN) // (BC) » si les parallèles sont déjà marquées, pas de mesures qui ne servent pas, pas deux fois la même information.
5. **De l'air** : marges d'au moins 12, éléments alignés, traits 1,75 (encre) et 2,25 (accent), points r = 2,2. Mieux vaut un dessin plus petit et net qu'un dessin rempli jusqu'aux bords.

Exemple de référence pour les figures : la maquette Thalès v2 (deux configurations côte à côte, titres de colonnes en mention secondaire, triangle AMN en aplat clair, parallèles en accent, égalité des rapports en encre sous les figures).

## Le rendu attendu

Un schéma de manuel de collège, propre et sobre : traits nets, aplats doux, peu de couleurs, des légendes reliées par des traits de rappel. Il s'affiche sur une feuille blanche, dans une colonne de 330 px sur téléphone (jusqu'à 560 px sur ordinateur), et s'ouvre en plein écran avec zoom.

## Le fichier SVG

- Écrit à la main, **commence directement par `<svg`** (pas de prologue XML), avec `xmlns` et un `viewBox`. Largeur de travail : **360** (hauteur libre, 220 à 340 en général). Pas de `width`/`height`.
- `font-family="system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"` sur la racine.
- **Interdits** (le SVG est inséré tel quel dans la page) : `<style>`, `<script>`, attributs `on…`, `id=` (deux copies sur la page entreraient en conflit, donc pas de `<marker>` ni de `<defs>` référencés : dessiner les pointes de flèche en `path`), `<image>`, liens externes, classes autres que `ill-legende` et `ill-fond`.
- Moins de 40 Ko (le cœur en fait 6). Coordonnées arrondies au dixième au plus.
- Un commentaire en tête : ce que montre le dessin, classe et chapitre.

## Couleurs

| Rôle | Valeur |
|---|---|
| Encre (traits, texte) | `#2D2B57` |
| Texte secondaire (mentions, « CŒUR DROIT ») | `#6E675B` |
| Accent (le segment ou l'élément à repérer) | `#B34400` |
| Bleu (sang pauvre en O₂, eau, froid) | trait `#3461C9`, aplat `#DCE6FA` |
| Rouge (sang riche en O₂, chaud) | trait `#C8364F`, aplat `#F9DCE1` |
| Vert (végétal, agriculture) | trait `#2E8B57`, aplat `#DDF2E3` |
| Ocre (muscle, sol, aplats neutres) | aplat `#F5E3DF` ou `#F4EBDD` |
| Violet clair (zones, cadres) | aplat `#EAE8F2` |

Respecter les conventions de la matière avant tout : symboles normalisés en électricité (pile : grand trait = borne +), bleu/rouge pour le sang, légende de croquis organisée par thèmes. Pas plus de 4 ou 5 couleurs par dessin.

## Texte et légendes

- Légendes : `font-size="11.5"`, `font-weight="600"`, encre. Interligne 13. Deux lignes au plus par légende (« Oreillette » / « droite »).
- Mentions secondaires : 11, semi-gras, `#8A8273`, en minuscules (voir les règles v2).
- **Chaque légende masquable** est un groupe :
  ```svg
  <g class="ill-legende">
    <rect class="ill-fond" x="3" y="66" width="66" height="28" rx="4" fill="#FFFFFF"/>
    <text x="6" y="77">Oreillette<tspan x="6" dy="13">droite</tspan></text>
  </g>
  ```
  Le rectangle couvre tout le texte (2 à 4 px de marge) : en mode « Me tester », il devient une case vide que l'élève touche pour révéler. Largeur estimée : 6,3 par caractère à 11,5.
- Traits de rappel : `stroke="#2D2B57" stroke-width="1" opacity="0.6"`, avec un point (r = 1,8) au bout, côté dessin. Ils partent du bord de la case, jamais du milieu du texte. Ils ne se croisent pas.
- Les légendes vont dans les marges (gauche et droite) ; le dessin au centre. Ne rien poser à moins de 3 unités du bord.
- Ce qui n'est pas à apprendre (titres de zones, échelle, orientation) n'est pas dans un `ill-legende`.
- Vocabulaire : exactement celui du chapitre (relire `resume` et `keyTerms`).

## Figures de maths

Traits encre 2, points nommés en capitales (gras 11), l'élément clé (droites parallèles, angle, segment cherché) en accent `#B34400`, codages (angle droit, longueurs égales, parallèles) dessinés comme dans un cahier. Une figure = une configuration ; deux configurations côte à côte si le cours les oppose. Repère : quadrillage `#EAE8F2`, axes encre avec flèches et graduations.

## Cartes et croquis

Fonds dans `public/programme/illustrations/communs/` (France, Europe), tirés de Natural Earth (domaine public) : réutiliser le fond tel quel et ajouter les couches du croquis par-dessus. Légende du croquis dans le dessin, organisée en 2 ou 3 parties titrées, comme au brevet. Les noms de lieux (villes, régions) dans le croquis restent visibles en mode test ; seuls les éléments de la légende à connaître peuvent être masquables.

## Œuvres

WebP, 1600 px de large au plus, moins de 350 Ko, reproduction du domaine public ; `credit` obligatoire : « Auteur, titre, date, lieu de conservation. Reproduction : source (licence) ».

## Accrocher la figure au chapitre

1. Dessiner `public/programme/illustrations/<classe>/<matiere>/<nom>.svg` (minuscules, chiffres, tirets).
2. Relire en image : `node scripts/programme/illustrations.mjs rendu <svg> <png> 330` (taille téléphone), puis `720`, puis `330 test` (légendes masquées). Corriger tant qu'un texte déborde, chevauche ou devient illisible.
3. Écrire un JSON :
   ```json
   {
     "id": "coeur-vu-de-face",
     "src": "/programme/illustrations/5eme/svt/coeur-vu-de-face.svg",
     "alt": "Description complète de ce que montre la figure, pour qui ne la voit pas.",
     "type": "schema",
     "titre": "Le cœur vu de face",
     "legende": "Une phrase utile sous la figure : ce qu'il faut y voir.",
     "credit": null,
     "ancre": "resume.sections[0]",
     "legendesMasquables": true
   }
   ```
   `type` : schema, figure, carte, croquis, graphique, oeuvre, photo ou document (surtitre affiché). `titre` : court (50 caractères au plus), sans point final. `legende` : une ou deux phrases, ce qu'il faut y voir.
   `ancre` : la section dont le texte décrit ce que montre la figure (`resume.sections[i]`, index à partir de 0), ou `resume.methode` si c'est la méthode qui l'utilise, ou `resume.intro`.
4. `node scripts/programme/illustrations.mjs ajouter <classe>/<matiere>/<id> fichier.json` (ne touche que le champ `illustrations`), puis `node scripts/programme/illustrations.mjs verifier`.

**Ne jamais lancer `scripts/programme/valider.mjs`** : il réécrit tous les chapitres.
