# Offre Réviz+ — ce qui est gratuit, ce qui est payant

Décidé avec Johan le 2026-10-11. Référence unique pour le code, la landing
(`reviz-landing/src/lib/data.ts`) et les CGV (paragraphe « Ce que comprend
Réviz+ », branche `stripe-live`).

## Les deux règles

1. **Le contenu est gratuit, on paie l'entraînement.** Les fiches sont publiques
   sur www.revizapp.fr/fiches : jamais de paywall dessus.
2. **Le gratuit installe une habitude, Réviz+ fait gagner du travail.** On ne
   bride pas l'outil lui-même : on fait payer ce que Réviz fait à la place de
   l'élève.

## Le découpage

| Fonction | Gratuit | Réviz+ |
|---|---|---|
| Programme, cours, résumés, cartes mentales | Tout | — |
| Quiz | 3 par jour | Illimité, et révision ciblée sur ce que l'élève rate |
| Flashcards | 3 séances par jour | Illimité |
| Mode contrôle (sujet type chronométré + corrigé) | — | Inclus |
| Battle | Tout | Badge « Membre fondateur » / Réviz+ |
| Agenda : contrôles, compte à rebours, rappel la veille | Tout | — |
| Agenda : emploi du temps Pronote | Tout | — |
| Agenda : **plan de révision automatique** | Offert pour le premier contrôle | Inclus pour tous les contrôles |
| Coach | 10 messages par semaine (depuis le 29/10, avant 10 par jour) | 50 par jour (décision de Johan du 29/10, avant « illimité » avec un garde-fou à 200) |
| Coach : mode « Interroge-moi » | — | Inclus |
| Coach qui connaît ses contrôles et ses erreurs | — | Inclus |
| Scan de leçons | 5 par semaine | Illimité (garde-fou anti-abus pendant l'offre de lancement : 100 par semaine) |
| Thèmes | Crème, Sombre | Nuit d'encre, Abricot, Sauge, Prune |
| Progrès | Vue d'ensemble | Bilan détaillé par chapitre |

Les chiffres (3 quiz, 3 séances, 10 messages, 5 scans) sont des points de
départ, à ajuster avec les données PostHog.

## Agenda et coach : comment ça se relie

L'agenda sait **quand** réviser, le coach sait **quoi** réviser, et Réviz+ relie
les deux.

- **Plan de révision.** Dès qu'un contrôle est noté, Réviz découpe les jours qui
  restent : flashcards (J-5), quiz sur les points ratés (J-3), contrôle blanc
  (J-1). Un rappel chaque jour et un indicateur « prêt / pas prêt ».
  Accroche : le plan du premier contrôle est offert en entier. Ensuite le plan
  s'affiche en entier, mais seul le premier jour est ouvert, avec le bouton
  « Débloque ton plan avec Réviz+ ».
- **Coach « Interroge-moi ».** Le coach pose les questions à l'élève, à l'oral,
  comme un prof la veille du contrôle.
- **Coach qui connaît l'élève.** Il voit le prochain contrôle et les questions
  ratées en quiz, et commence par là.
- **Messages de limite en contexte.** Toujours parler du contrôle de l'élève,
  pas de l'abonnement : « Ton contrôle de maths est jeudi. Avec Réviz+, je
  t'interroge jusqu'à jeudi. »

## État au 2026-10-11

- Lancement : tout est offert (`LANCEMENT_OFFERT` dans `api/_lancement.js`).
  Le paywall ne revient qu'avec un Réviz+ complet et le SIREN.
- Déjà dans le code : les quotas du coach et du scan, et les thèmes.
- À construire, par ordre de priorité :
  1. le plan de révision de l'agenda ;
  2. le mode contrôle ;
  3. les limites quotidiennes des quiz et des flashcards ;
  4. le coach « Interroge-moi » et le coach relié à l'agenda et aux erreurs ;
  5. le bilan de progrès par chapitre.
- Une fois l'offre construite : mettre à jour la landing (tarifs, FAQ,
  comparatif), le paragraphe des CGV, l'annonce `RevizPlusAnnonce` et la fiche
  `RevizPlus`.
- Prix validé le 2026-10-11 : 6,99 €/mois, 49 €/an, fondateurs 3,99 €/mois
  ou 29 €/an (`docs/prix-revizplus.md`, `api/_prix.js`). La transition du
  gratuit au payant est décrite dans `docs/prix-revizplus.md`.
