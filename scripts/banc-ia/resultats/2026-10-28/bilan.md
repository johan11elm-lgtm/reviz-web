# Banc d'essai Réviz IA — relevé du 2026-10-28

Correcteur : claude-sonnet-5-5, à l'aveugle, grille `grille.md`. Notes sur 10 (moyennes).

| Catégorie | chatgpt-sans-compte | nomad-ia | reviz-actuelle |
|---|---|---|---|
| **Ensemble** | **7,4** (35 rép.) | **6,0** (1 rép.) | **7,8** (40 rép.) |
| Question de cours | 8,3 | – | 7,6 |
| Explique plus simple | 8,3 | 6,0 | 7,3 |
| Contrôle et plan de révision | 6,2 | – | 8,3 |
| Je fais quoi | 7,7 | – | 7,3 |
| Devoir à faire à sa place | 5,6 | – | 9,0 |
| Demande de schéma | – | – | 7,8 |

| Critère (sur 2) | chatgpt-sans-compte | nomad-ia | reviz-actuelle |
|---|---|---|---|
| juste | 1,6 | 2,0 | 1,4 |
| niveau | 1,9 | 1,0 | 1,9 |
| travail | 1,4 | 1,0 | 1,4 |
| utile | 1,7 | 1,0 | 1,2 |
| ton | 0,9 | 1,0 | 1,9 |

| Face à face (mêmes demandes) | Demandes | reviz-actuelle | autre | reviz-actuelle gagne | égalité | reviz-actuelle perd |
|---|---|---|---|---|---|---|
| chatgpt-sans-compte | 35 | 7,8 | 7,4 | 14 | 8 | 13 |
| nomad-ia | 1 | 8,0 | 6,0 | 1 | 0 | 0 |

Non notées : demande 36 (chatgpt-sans-compte) : connexion demandée deux fois (à une minute d'écart) : ChatGPT sans compte a tenté de générer une image et affiche « Connectez-vous pour créer ou modifier gratuitement des images. La création d’images est réservée aux utilisateurs connectés. » Aucun schéma en texte.

## Lecture du relevé (Claude, 28/10)

- **Presque à égalité avec ChatGPT sur les mêmes demandes** : 7,8 contre 7,4 sur 35 demandes (14 gagnées, 8 nulles, 13 perdues). Réviz IA n'est pas encore « la meilleure », elle est au niveau.
- **Là où on gagne déjà** : les devoirs (9,0 contre 5,6). ChatGPT a fait les 5 devoirs à la place de l'élève : rédaction entière, solution de l'équation, traduction, 10 lignes d'histoire, et il promet de donner les réponses du manuel. On gagne aussi sur les plans de contrôle (8,3 contre 6,2) et sur le ton (1,9 contre 0,9 sur 2) : ChatGPT écrit long, en LaTeX brut, avec beaucoup d'émojis.
- **Là où on perd** : la justesse (1,4 contre 1,6) et « Utile tout de suite » (1,2 contre 1,7). Réviz IA commet une vraie erreur de physique (demande 15, énergie cinétique), plusieurs erreurs de date (la 23 annonce « mercredi » alors qu'on est mardi, la 28 dit « demain » pour un contrôle dans deux jours, la 24 cale le plan sur des jours déjà passés) et des fautes de français. Elle finit souvent par une question au lieu de donner une action.
- **Schémas** : Réviz IA fait des schémas en texte (7,8). ChatGPT sans compte demande de se connecter pour dessiner (demande 36), et les demandes 37 à 40 n'ont pas été relevées.
- **Nomad'IA** (1 demande) : un cours correct mais scolaire, qui ne simplifie pas alors que l'élève le demandait, et qui vise la 3e (6,0).
- **Stabilité du correcteur** : deux passages complets diffèrent de 0,5 point en moyenne par réponse. Un écart de moins d'un point entre deux IA n'est donc pas significatif.
