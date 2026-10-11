# Prix de Réviz+ — validé le 2026-10-11

Suite de `docs/offre-revizplus.md` (ce qui est gratuit, ce qui est payant).
Ici : combien, sous quelles formules, pourquoi, et comment on passe du
gratuit au payant. **Validé par Johan le 2026-10-11**, plafond du coach
Réviz+ compris (60 messages par jour). Les prix vivent dans `api/_prix.js`.

## La grille

| Formule | Prix | Équivalent | Rôle |
|---|---|---|---|
| Mensuel | **6,99 €/mois** | — | L'ancre : sans engagement, rassure le parent |
| Annuel | **49 €/an** | 4,08 €/mois, soit 7 mois de mensuel | La formule mise en avant |
| Essai | **7 jours de Réviz+ complet, sans carte** | — | Déclenché au premier contrôle noté dans l'agenda |
| Membres fondateurs | **3,99 €/mois ou 29 €/an, bloqués tant que l'abonnement court** | −40 % | À la bascule payante, pour les comptes du lancement |

Pas de formule hebdomadaire, pas de formule à vie, pas de famille au départ
(voir « Plus tard »).

Argument parent : « l'année de Réviz+ pour le prix de deux heures de cours
particulier » (cours au collège : 20 à 22 €/h chez Superprof), et « deux fois
moins cher que Kartable ».

## Pourquoi ces chiffres

**Le marché français.** Les acteurs installés se calent tous vers 100 à 120 €/an
et 13 à 15 €/mois : Kartable 14,99 €/mois ou 99,90 € l'année scolaire,
Nomad+ 119,99 €/an, Maxicours 119,40 €/an, digiSchool Pass 95,88 €/an.
Le plancher est digiSchool Solo à 29,99 €/an. Réviz est neuf, sans marque, et
son contenu est gratuit : se placer à la moitié des leaders est crédible, en
dessous de 30 € on brade.

**Le marché mondial des apps d'étude.** Médiane Éducation (RevenueCat 2026) :
9,99 $/mois et 44,99 $/an. Quizlet Plus 7,99 $/mois et 35,99 $/an, Brainly
9,99 $ et 39,99 $. 49 € est donc dans la médiane mondiale, 6,99 € un peu
sous la médiane mensuelle.

**Mensuel ou annuel.** Les apps grand public vendent l'annuel à 4 à 5 mois de
mensuel ; les françaises à 6 à 8 mois. 7 mois (49 € contre 6,99 €) reste lisible
pour un parent français tout en poussant vers l'annuel, qui retient trois fois
mieux la première année (28 % contre 8 % en mensuel, RevenueCat 2026).
L'annuel neutralise aussi l'été : un abonné mensuel résilie en juin, l'annuel
paie déjà septembre.

**Deux formules seulement.** 41 à 60 % des paywalls en ont deux, et le nombre
de formules pèse plus dans les tests que le prix lui-même.

**Pas de prix cassé.** Les apps à prix haut gagnent 6 fois plus par payeur sans
convertir moins (RevenueCat). 4,99 € (prix actuellement affiché sur la landing)
laisse de l'argent sur la table : un parent compare à Kartable, pas à Spotify.

**Essai de 7 jours.** Les essais de 5 à 9 jours convertissent mieux que ceux de
3 jours (37 % contre 26 %), c'est la durée de la moitié des essais en Éducation,
et les abonnés passés par un essai valent 50 % de plus sur un an (Adapty).
Sans carte : l'utilisateur est mineur, le payeur est un parent qui ne connaît
pas encore Réviz ; un essai qui prélève tout seul le 8e jour coûte en confiance
et en litiges. On pourra tester l'essai avec carte plus tard.
L'essai se déclenche au bon moment : quand un contrôle est noté, le plan de
révision du premier contrôle est déjà offert (voir l'offre), l'essai prolonge
ce moment.

**Fondateurs.** Promis depuis le lancement (`FONDATEURS_JUSQU_AU` dans
`api/_lancement.js`) : la bascule n'est pas vécue comme un retrait, et les
premiers élèves deviennent les premiers payeurs.

## Qui paie : le parent, via l'élève

En France, c'est le parent qui paie (comptes parents chez Kartable, Les Bons
Profs, SchoolMouv ; CGV qui exigent un client majeur). Les apps mondiales
vendent à l'élève en achat intégré hebdomadaire : pas adapté à des 11-15 ans.

Réviz a un levier que les autres n'ont pas : **l'email du parent est déjà
connu** pour les moins de 15 ans (consentement parental). Bouton « Demander à
mes parents » sur le paywall → email au parent avec le contrôle de l'enfant,
ce que Réviz+ fait, et un lien de paiement Stripe. Le message parle du
contrôle, pas de l'abonnement.

## Ce que ça rapporte, ce que ça coûte

Mix supposé : 60 % d'annuels, 40 % de mensuels → **environ 5,25 € brut par
payeur et par mois**.

| Payeurs | MRR brut | Actifs nécessaires (2 à 3 % paient) |
|---|---|---|
| 100 | ≈ 525 € | 3 300 à 5 000 |
| 500 | ≈ 2 600 € | 17 000 à 25 000 |
| 1 000 | ≈ 5 250 € | 33 000 à 50 000 |

Repère : Duolingo, le meilleur du marché, fait payer environ 9 % de ses actifs ;
une app sans marque, plutôt 1 à 3 %.

Coûts par payeur et par mois :
- **Stripe** (carte européenne 1,5 % + 0,25 €, plus Billing 0,7 %) :
  ≈ 0,40 € sur un mensuel, ≈ 1,35 € par an sur l'annuel.
- **IA** (Claude Haiku 4.5, estimation) : ≈ 0,5 centime par message au coach,
  ≈ 2 centimes par scan. Un élève régulier (15 messages par jour d'école,
  20 scans par mois) coûte ≈ 2 €/mois. **Attention au plafond de 200 messages
  par jour prévu dans l'offre** : un élève qui le touche tous les jours coûte
  ≈ 30 €/mois. Décidé : 60 messages par jour en Réviz+ (≈ 9 €/mois au pire,
  jamais atteint en pratique). Reste à activer le cache du prompt du coach.
- **Cotisations micro-entreprise** : environ 21 à 25 % du chiffre d'affaires
  selon la catégorie retenue à l'immatriculation.
- **TVA** : aucune tant que la micro est en franchise de TVA. Au-delà du seuil,
  les prix affichés deviennent TTC et la marge baisse d'un sixième (seuil à
  vérifier le moment venu).
- **Apple** : l'app iOS n'est pas sur l'App Store. Le jour où elle y sera, un
  achat intégré prend 15 % (programme petites entreprises) ; garder le même
  prix et privilégier le paiement web.

## Plus tard (pas au lancement payant)

- **Formule famille** : la norme en France (Kartable, Nomad, Maxicours) autour
  de +50 % du prix solo. Proposition le jour où un parent la demande :
  69 €/an jusqu'à 4 enfants. Il faut d'abord un lien entre comptes.
- **Pack Brevet** (3e, de mars au brevet, paiement unique sans
  renouvellement) : 19 €. Les Bons Profs vend « Mission Brevet » 33,99 €.
- **Promo de rentrée** : tout le secteur remise fort fin août-septembre ; prévoir
  l'annuel à 39 € du 20 août au 30 septembre.
- **Prolonger l'essai plutôt que remiser** quand quelqu'un résilie (Coconote a
  retenu environ un quart des résiliants comme ça).

## Passer du gratuit au payant

### Les conditions, toutes ensemble

1. **Le droit d'encaisser** : autorisation de cumul accordée (le silence vaut
   refus), puis micro-entreprise immatriculée (SIRET). Sans les deux, aucun
   paiement réel, même d'un seul abonné.
2. **Un Réviz+ qui vaut le prix** : au minimum le plan de révision de l'agenda
   et les limites quotidiennes des quiz et flashcards (sinon le gratuit fait
   déjà tout). Voir l'ordre de construction dans `offre-revizplus.md`.
3. **Le papier** : CGV et mentions légales avec SIRET et adresse (branche
   `stripe-live`), Vercel Pro (le plan Hobby interdit l'usage commercial).

### Le calendrier (décidé le 2026-10-11 : ventes ouvertes tout de suite, payant le 26 octobre)

Réglages dans `api/_lancement.js` (app et API) et `reviz-landing/src/lib/data.ts`
(landing) : `VENTES_OUVERTES` (interrupteur, à passer à true quand Stripe est
en réel) et `FIN_LANCEMENT` (26 octobre 0 h, heure de Paris).

| Quand | Quoi |
|---|---|
| Dès l'ouverture des ventes | Réviz+ offert à tous jusqu'au 25 octobre. On peut **réserver le tarif fondateur** : carte enregistrée, 0 € à la souscription, premier prélèvement le 26 octobre (Stripe `billing_cycle_anchor` + `proration_behavior: none`), annulable avant sans rien payer. Fondateur = **abonnement pris avant le 26 octobre**. |
| 23 → 25 octobre | La popup revient une fois (« Plus que 3 jours »), la carte affiche le compte à rebours. |
| 26 octobre, 0 h | Automatique : la gratuité s'arrête (l'API recalcule à chaque requête, l'app au rechargement), les réservations sont prélevées, le tarif fondateur n'est plus proposé. **Pas de délai de grâce.** Si les ventes ne sont pas ouvertes à cette date, la gratuité continue (phase « prolonge »). |
| Après | Nouveaux abonnements au prix public, prélevés à la souscription. |

### Ce que vit un élève qui ne s'abonne pas

Il ne perd rien de son travail : progression, cartes, leçons déjà scannées,
contrôles et emploi du temps restent. Les limites du gratuit s'appliquent
(quiz, flashcards, coach, scans), un thème Réviz+ revient au thème Crème, le
plan de révision ne s'ouvre plus qu'au premier jour. Les messages de limite
parlent de son contrôle, pas de l'abonnement.

### Le prix fondateur

Accordé par le serveur à tout abonnement créé avant le 26 octobre 0 h
(`tarifFondateurOuvert`, `api/_checkout.js`), jamais d'après ce qu'envoie
l'app. Il est attaché à l'abonnement Stripe : tant qu'il court, le prix reste ;
après une résiliation, un nouvel abonnement se fait au prix en vigueur (CGV).

## Déjà en place (2026-10-11)

- `api/_prix.js` : les prix, lus par l'API et par l'app.
- `api/_checkout.js` : formule annuelle ou mensuelle, tarif fondateur décidé
  côté serveur, prix retrouvé par `lookup_key`, codes promo acceptés.
- App : choix de la formule (`ChoixFormule`) dans les Réglages, la limite de
  scans et la limite du coach ; page de confirmation au bon prix ; coach
  Réviz+ à 60 messages par jour. Invisible tant que `LANCEMENT_OFFERT` vaut
  true, sauf la phrase sur le prix fondateur dans la fiche et la popup Réviz+.
- Stripe **test** : les quatre prix existent (lookup_keys `revizplus_annuel`,
  `revizplus_mensuel`, `revizplus_fondateur_annuel`,
  `revizplus_fondateur_mensuel`), sessions Checkout vérifiées.
- Stripe **réel** : pas encore créés (le connecteur n'a que la lecture) ; le
  script ci-dessus s'en charge le jour D.
- Bascule datée (2026-10-11) : `FIN_LANCEMENT`, `FONDATEURS_JUSQU_AU`, `FIN_GRACE_FONDATEURS` dans `api/_lancement.js` ; règle « offert » commune à l'app (`revizPlusOffertPour`) et à l'API (`api/_offert.js`) ; carte et popup Réviz+ par période (`phaseRevizPlus`).
- Landing : prix d'après et prix fondateur affichés (tarifs, FAQ, parents,
  comparatif, llms.txt).

## Reste à faire avant le 26 octobre

- Essai de sept jours au premier contrôle (côté serveur, champ non modifiable
  par l'élève).
- Bouton « Demander à mes parents » (email au parent avec lien de paiement).
- Emails d'annonce aux élèves et aux parents (les popups de l'app sont faites).
- Fusionner la branche `stripe-live` (CGV) : elle modifie encore
  `api/create-checkout.js`, devenu `api/_checkout.js`.

## Sources

Relevé du 2026-10-11 par recherche web. Prix lus sur les sites officiels et
l'App Store France : kartable.fr/premium, nomadeducation.fr/premium,
maxicours.com/se/abonnements, lesbonsprofs.com/nos-offres,
offres.schoolmouv.fr/plans, apps.apple.com (digiSchool, Knowunity, Photomath).
Repères : revenuecat.com/state-of-subscription-apps (2026, et la page
Éducation), adapty.io/blog/mobile-app-monetization-2026,
superwall.com/case-studies/cal-ai, khanmigo.ai/parents. Les revenus des
entreprises non cotées (Quizlet, Brainly, Knowunity, Calm…) sont des
estimations d'agrégateurs, non fiables.
