# Adresses courtes des vidéos (revizapp.fr/vf6)

Une adresse lisible à l'écran par vidéo, parce que la bio TikTok n'est pas
cliquable sous 1 000 abonnés. Elle ouvre l'essai sans compte sur le chapitre
de la vidéo et permet de compter, vidéo par vidéo, combien d'élèves arrivent,
lancent l'essai, finissent le quiz et créent un compte.

## Le trajet

```
revizapp.fr/vf6                         (tapé par l'élève)
  → www.revizapp.fr/vf6                 (reviz-landing, redirection de domaine)
  → app.revizapp.fr/v/vf6               (reviz-landing, next.config.ts : toute adresse « 1-3 lettres + 1-3 chiffres »)
  → /essai?via=tiktok&v=vf6&classe=…&matiere=…&chapitre=…   (reviz-web, src/pages/CodeVideo.jsx)
```

`via` et `v` accompagnent ensuite `essai_demarre`, `chapitre_ouvert`,
`quiz_termine` et `compte_cree` : compteurs `stats/{jour}` dans Firestore
(`v.vf6`, `via.tiktok`) et évènements PostHog du même nom. Ils restent en
mémoire le temps de la visite : rien n'est écrit sur l'appareil.

## Ajouter une vidéo

1. Choisir un code : 1 à 3 lettres puis 1 à 3 chiffres, en minuscules (`vf6`,
   `b12`, `cer3`). Jamais réutilisé.
2. Ajouter une ligne dans `CODES_VIDEO`, dans `src/utils/codesVideo.js` :
   ```js
   vf6: { via: 'tiktok', classe: '4ème', matiere: 'svt', chapitre: 'seismes', titre: 'Vrai ou faux séismes', date: '2026-10-20' },
   ```
   `via` : `tiktok`, `instagram`, ou `reseaux` si la même vidéo part sur les
   deux. `chapitre` : l'`id` du chapitre dans `public/programme/<classe>/index.json`
   (il doit être `pret`). Sans chapitre, l'essai ouvre la matière.
3. `npm test` : le test refuse un code mal formé, une matière ou un chapitre
   absent du programme, ou un chapitre pas prêt.
4. Déployer l'app **avant** la publication de la vidéo. Rien à faire sur le site.

Un code tapé mais absent du tableau ouvre quand même l'essai (sans
pré-remplissage, provenance `reseaux`) : jamais de page d'erreur.

Pour essayer : `revizapp.fr/x0` (code de test, séismes en 4e).

## Lire l'entonnoir

- Visites : PostHog, pages vues dont l'adresse contient `v=vf6` (ou `/v/vf6`).
- Essais, chapitres, quiz terminés, comptes : `stats/{jour}.<évènement>.v.vf6`
  dans Firestore, ou les évènements PostHog filtrés sur la propriété `v`.
- Retour à J+2 : pas encore mesuré. PostHog change d'identifiant chaque jour
  (sans cookie) et les compteurs sont anonymes : il faudrait garder le code sur
  l'appareil, ce qui demande une décision (voir PR).
