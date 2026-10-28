# Banc d'essai Réviz IA — relevé du 2026-10-28-etape1

Correcteur : claude-sonnet-5-5, à l'aveugle, grille `grille.md`. Notes sur 10 (moyennes).

| Catégorie | chatgpt-sans-compte | nomad-ia | reviz-actuelle | reviz-haiku55-low | reviz-haiku55-medium |
|---|---|---|---|---|---|
| **Ensemble** | **7,0** (35 rép.) | **5,0** (1 rép.) | **7,2** (40 rép.) | **9,4** (40 rép.) | **9,5** (40 rép.) |
| Question de cours | 7,4 | – | 6,6 | 9,7 | 9,8 |
| Explique plus simple | 7,5 | 5,0 | 6,7 | 9,5 | 9,3 |
| Contrôle et plan de révision | 6,7 | – | 8,0 | 9,0 | 9,2 |
| Je fais quoi | 7,2 | – | 6,5 | 9,2 | 9,3 |
| Devoir à faire à sa place | 5,8 | – | 8,6 | 9,8 | 9,6 |
| Demande de schéma | – | – | 7,8 | 9,4 | 9,6 |

| Critère (sur 2) | chatgpt-sans-compte | nomad-ia | reviz-actuelle | reviz-haiku55-low | reviz-haiku55-medium |
|---|---|---|---|---|---|
| juste | 1,5 | 2,0 | 1,3 | 1,9 | 1,8 |
| niveau | 1,9 | 1,0 | 1,9 | 2,0 | 2,0 |
| travail | 1,3 | 1,0 | 1,2 | 1,9 | 2,0 |
| utile | 1,5 | 1,0 | 1,1 | 1,6 | 1,8 |
| ton | 0,7 | 0,0 | 1,8 | 1,9 | 2,0 |

| Face à face (mêmes demandes) | Demandes | reviz-actuelle | autre | reviz-actuelle gagne | égalité | reviz-actuelle perd |
|---|---|---|---|---|---|---|
| chatgpt-sans-compte | 35 | 7,1 | 7,0 | 14 | 8 | 13 |
| nomad-ia | 1 | 7,0 | 5,0 | 1 | 0 | 0 |
| reviz-haiku55-low | 40 | 7,2 | 9,4 | 0 | 2 | 38 |
| reviz-haiku55-medium | 40 | 7,2 | 9,5 | 1 | 1 | 38 |

Non notées : demande 36 (chatgpt-sans-compte) : connexion demandée deux fois (à une minute d'écart) : ChatGPT sans compte a tenté de générer une image et affiche « Connectez-vous pour créer ou modifier gratuitement des images. La création d’images est réservée aux utilisateurs connectés. » Aucun schéma en texte.

Coût de la correction : 145730 tokens lus, 66791 écrits, ≈ 0.96 $.

## Lecture du relevé (Claude, 28/10, étape 1)

- **Haiku 5.5 avec le nouveau prompt** : 9,4 en effort bas (9,5 en effort moyen) contre 7,2 pour la prod (Haiku 4.5) et 7,0 pour ChatGPT sans compte. Face à ChatGPT sur les 35 demandes communes : 32 gagnées, 3 nulles, 0 perdue.
- **Ce qui a changé** : la justesse passe de 1,3 à 1,9 sur 2 (l'erreur de physique de la demande 15 a disparu, les dates sont justes grâce au calendrier calculé par l'app) et « Utile tout de suite » de 1,1 à 1,6 (chaque réponse se termine par une question d'entraînement ou une étape à faire).
- **Effort retenu : bas.** Le moyen ne gagne que 0,1 point, dans le bruit du correcteur (0,5 point), pour un temps médian de 4,8 s au lieu de 3,9 s et plus de tokens.
- **Coût** : 0,03 $ les 40 réponses (contre 0,17 $ avec Haiku 4.5), mise en cache du prompt comprise.
- **Ce qui reste** : le coach est attaché à une leçon, il refuse donc d'aider sur les autres matières (demandes 24 et 25). C'est l'étape 2 (mode agent sans leçon). Il invente parfois un détail de « la leçon » (la voiture de la demande 15, une méthode en 5 étapes à la 25).
- **Prudence** : le correcteur est un modèle Claude et le prompt a été réécrit après avoir lu ses critiques. Les 10 réponses à relire par Johan (relire.md) servent à vérifier qu'il est d'accord.
