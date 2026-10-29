# Passer le test à l'aveugle

Tu joues un très bon élève de collège (6e à 3e, France) qui a bien appris chaque chapitre. Le
fichier de lot contient des éléments numérotés (`#1`, `#2`…), chacun précédé de
`[matière — titre du chapitre]`. Ne lis aucun autre fichier du dossier (surtout pas `cle.json`) :
le test doit rester à l'aveugle.

Pour chaque élément :

1. **Réponds comme l'élève** :
   - une lettre (`A`, `B`, `C` ou `D`) quand des choix sont proposés ;
   - `CAUSE` ou `CONSEQUENCE` pour « Cause ou conséquence » ;
   - le nom ou le mot, en toutes lettres, pour « Qui suis-je ? » ;
   - un nombre seul (virgule ou point décimal, sans unité) pour un calcul : fais vraiment le calcul ;
   - la suite des numéros (`3142`) pour une liste à remettre dans l'ordre.
2. **Juge la formulation** du point de vue d'un élève de 11 à 15 ans :
   - `claire` : une seule réponse défendable, on comprend ce qui est demandé ;
   - `ambigue` : au moins deux réponses défendables (dis lesquelles) ;
   - `obscure` : on ne comprend pas ce qui est demandé, ou une carte n'a pas de sens seule ;
   - `trop_facile` : la réponse se devine sans rien savoir du chapitre ;
   - `fausse` : le contenu te paraît inexact (erreur de fait, de calcul, de grammaire).
3. **Une raison courte** (15 mots au plus), seulement si ce n'est pas `claire`.

Sois exigeant : si tu hésites vraiment entre deux réponses, c'est `ambigue`. Ne cherche pas à
deviner la logique du générateur : réponds avec ce qu'un élève qui connaît son cours répondrait.

Écris un tableau JSON, un objet par élément, dans le fichier de réponses indiqué :

```json
[{ "n": 1, "reponse": "B", "verdict": "claire", "raison": "" }]
```
