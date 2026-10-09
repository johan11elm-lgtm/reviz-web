# Consigne — illustrations, lots 2 et 3 (session cloud)

_Rédigée le 2026-10-08 par la session locale qui a fait le lot 1, pour une session Claude Code dans le cloud. Johan a validé le style (règles v2) et a dit « go pour le reste dans le cloud »._

## Le but

Dessiner et accrocher les **128 ressources** listées dans `docs/illustrations-a-faire.json` (91 chapitres, toutes matières sauf technologie). Le lot 1 (40 figures environ : électricité, SVT 5e, maths 3e, cartes de 3e, œuvres d'histoire) est déjà fait et sert de référence.

## À lire avant tout, dans cet ordre

1. `docs/illustrations-style.md`, **en entier** — en particulier « Règles de hiérarchie (v2) » en tête : elles priment sur tout le reste.
2. `docs/plan-illustrations.md` — le contexte.
3. Des figures du lot 1, pour le niveau attendu (ouvre les SVG et rends-les en PNG) :
   - `public/programme/illustrations/5eme/svt/coeur-vu-de-face.svg` et `appareil-digestif.svg` (schémas légendés) ;
   - `public/programme/illustrations/3eme/maths/thales-deux-configurations.svg` (figure) ;
   - `public/programme/illustrations/4eme/physique-chimie/intensite-derivation-additivite.svg` (schéma normalisé) ;
   - `public/programme/illustrations/3eme/geographie/` et `scripts/illustrations/cartes/` (cartes générées par script).
4. `scripts/illustrations/carto.mjs` — fonds de carte Natural Earth (France par départements, Europe), déjà extraits dans `scripts/illustrations/donnees/`. **Toute carte passe par ce module** (jamais de contour dessiné à main levée). Si un fond manque (planisphère, Afrique de l'Ouest, États-Unis, Méditerranée…), vérifie d'abord que `donnees/europe-pays.json` ne suffit pas ; sinon, ajoute une fonction à `carto.mjs` et, si des données manquent, télécharge le GeoJSON Natural Earth correspondant depuis `raw.githubusercontent.com/nvkelso/natural-earth-vector` (domaine public) et étends `extraire-natural-earth.mjs`.

## Mise en route

```bash
cd reviz-web
npm ci
npx playwright install chromium   # pour la commande « rendu »
node scripts/programme/illustrations.mjs verifier   # doit répondre « aucun problème »
```

## Pour chaque ressource

1. Lis le chapitre `public/programme/<fichier>` en entier (résumé, méthode, vocabulaire, quiz) : mêmes valeurs, mêmes lettres, même vocabulaire. Une figure qui contredit le texte est pire que pas de figure.
2. Dessine le SVG (`public/programme/illustrations/<classe>/<matiere>/<nom>.svg`) selon le guide. Pour les cartes, un script `scripts/illustrations/cartes/<nom>.mjs`. Pour une figure à calculer (géométrie, courbe), calcule les coordonnées dans un script plutôt qu'à l'œil.
3. **Relis en image** : `node scripts/programme/illustrations.mjs rendu <svg> /tmp/<nom>-330.png 330`, puis `720`, puis `330 test`, et **regarde les PNG**. Corrige tant qu'un texte déborde, chevauche, est illisible à 330 px, ou que le dessin est faux.
4. Écris le JSON (`id`, `src`, `alt` détaillé, `type`, `titre` ≤ 50 caractères, `legende`, `credit`, `ancre`, `legendesMasquables`) et accroche avec `node scripts/programme/illustrations.mjs ajouter <classe>/<matiere>/<id> <fichier.json>`. Pour un chapitre qui a déjà une illustration, l'outil la garde (ids différents).
5. Quand plusieurs chapitres demandent la même chose (planisphère des repères, courbe de la population mondiale, îles Britanniques, chronophotographies, symétries…), fais **une** figure et accroche-la à chacun (même `src`, `ancre` propre à chaque chapitre). Tu peux la ranger dans `public/programme/illustrations/communs/`.

## Cas particuliers

- **Œuvres et photos** (`obtention: domaine_public`) : reproduction sur Wikimedia Commons. Vérifie la licence par l'API (`prop=imageinfo&iiprop=extmetadata`) **et** les métadonnées du fichier téléchargé. Acceptées : domaine public, CC0, CC BY, CC BY-SA. **Refusées : NC, ND, ou toute contradiction entre la page et le fichier.** Conversion en WebP (moins de 350 Ko, 1600 px au plus), `credit` complet (auteur, titre, date, lieu ; « Photo : X, Wikimedia Commons (licence) »), `type: "oeuvre"` ou `"photo"`.
- **`sous_droits`** : remplace par un schéma, ou par une œuvre ou photo libre équivalente (ex. Nighthawks de Hopper → un autre tableau du domaine public adapté à « décrire un tableau » ; si le chapitre cite nommément l'œuvre protégée, ne la remplace pas en silence : écris-le dans le rapport).
- **`donnees_publiques`** (courbes de population, températures, pyramides des âges…) : chiffres lus sur une source fiable (INSEE, ONU World Population Prospects, Banque mondiale, NASA/NOAA, Copernicus), cités dans la `legende` avec l'année, et dans un commentaire du script qui génère la courbe. Pas de chiffres de mémoire.
- Si une ressource n'a vraiment pas de sens en image, ou si le chapitre contient une erreur que la figure révèle : ne force pas, note-le dans le rapport.

## Ordre et rythme

Matière par matière, dans cet ordre : histoire, géographie, SVT et sciences 6e, maths, physique-chimie, anglais, français. **Après chaque matière** : `node scripts/programme/illustrations.mjs verifier`, puis un commit (`git add` de tes seuls chemins : SVG, WebP, scripts, chapitres touchés), message en français, et `git push`. Ne t'arrête pas en route : va jusqu'au bout des 128, sauf blocage réel.

## Interdits

- **Ne lance jamais `scripts/programme/valider.mjs`** : il réécrit les 383 chapitres.
- Ne modifie dans les chapitres que le champ `illustrations`, et seulement via l'outil `ajouter`.
- Ne pousse jamais sur `main` (Vercel met `main` en production) ; ne fusionne rien.
- Pas d'image générée par IA, pas de contour de carte dessiné à la main, pas d'emoji.
- Ne touche pas aux chapitres de technologie.

## À la fin

1. `node scripts/programme/illustrations.mjs verifier` sans problème, `npx vitest run` vert.
2. Une planche de contrôle : `docs/illustrations-planche.html`, une page statique qui affiche toutes les illustrations du dépôt (titre, chapitre, image), pour que Johan relise tout d'un coup d'œil.
3. Un rapport `docs/illustrations-rapport-lots-2-3.md` : ce qui a été fait par matière, les sources de données, les remplacements d'œuvres, les doutes de fond (une ligne par doute, avec le fichier), ce qui n'a pas été fait et pourquoi.
4. Ouvre une pull request de ta branche vers `main`, titre « Illustrations : lots 2 et 3 », sans la fusionner.
