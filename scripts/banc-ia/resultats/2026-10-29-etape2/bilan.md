# Banc d'essai Réviz IA — relevé du 2026-10-29-etape2

Correcteur : claude-sonnet-5-5, à l'aveugle, grille `grille.md`. Notes sur 10 (moyennes).

| Catégorie | chatgpt-sans-compte | nomad-ia | reviz-actuelle | reviz-agent | reviz-haiku55-low |
|---|---|---|---|---|---|
| **Ensemble** | **6,6** (35 rép.) | **5,0** (1 rép.) | **7,0** (40 rép.) | **9,4** (40 rép.) | **9,1** (40 rép.) |
| Question de cours | 7,1 | – | 6,5 | 9,6 | 9,3 |
| Explique plus simple | 7,7 | 5,0 | 7,0 | 9,7 | 9,3 |
| Contrôle et plan de révision | 5,5 | – | 8,2 | 9,3 | 8,2 |
| Je fais quoi | 6,5 | – | 6,3 | 9,0 | 8,8 |
| Devoir à faire à sa place | 5,4 | – | 8,6 | 9,0 | 9,4 |
| Demande de schéma | – | – | 6,4 | 9,6 | 9,0 |

| Critère (sur 2) | chatgpt-sans-compte | nomad-ia | reviz-actuelle | reviz-agent | reviz-haiku55-low |
|---|---|---|---|---|---|
| juste | 1,5 | 2,0 | 1,2 | 1,8 | 1,7 |
| niveau | 1,9 | 1,0 | 1,8 | 1,9 | 1,9 |
| travail | 1,2 | 1,0 | 1,3 | 1,9 | 1,9 |
| utile | 1,4 | 1,0 | 1,1 | 1,8 | 1,5 |
| ton | 0,6 | 0,0 | 1,6 | 1,9 | 2,0 |

| Face à face (mêmes demandes) | Demandes | reviz-actuelle | autre | reviz-actuelle gagne | égalité | reviz-actuelle perd |
|---|---|---|---|---|---|---|
| chatgpt-sans-compte | 35 | 7,1 | 6,6 | 20 | 2 | 13 |
| nomad-ia | 1 | 8,0 | 5,0 | 1 | 0 | 0 |
| reviz-agent | 40 | 7,0 | 9,4 | 2 | 2 | 36 |
| reviz-haiku55-low | 40 | 7,0 | 9,1 | 2 | 3 | 35 |

Non notées : demande 36 (chatgpt-sans-compte) : connexion demandée deux fois (à une minute d'écart) : ChatGPT sans compte a tenté de générer une image et affiche « Connectez-vous pour créer ou modifier gratuitement des images. La création d’images est réservée aux utilisateurs connectés. » Aucun schéma en texte.

Coût de la correction : 155957 tokens lus, 47057 écrits, ≈ 0.78 $.

## Lecture du relevé (Claude, 29/10, étape 2)

- **Réviz IA en agent** (sans leçon, avec ses outils) : 9,4 sur 10, devant le coach de leçon sur Haiku 5.5 (9,1), la prod (7,0) et ChatGPT sans compte (6,6). Face à ChatGPT, sur 35 demandes communes : 34 gagnées, 1 perdue.
- **Ce qui compte** : sur les 12 demandes qui supposent de connaître l'élève (19 à 30), l'agent ne reçoit pas le contexte tapé. Il le retrouve avec ses outils (agenda, erreurs, révisions) et obtient 9,2, contre 8,5 pour le coach de leçon à qui l'élève a tout écrit, et 6,0 pour ChatGPT. Ses cartes visent juste : « Refaire mes erreurs » sur Pythagore à J-2, et le devoir commun de français noté au vendredi 13 novembre.
- **Premier passage (8,6)** : le banc était incohérent (une étape du plan marquée faite, et un correcteur qui ignorait que l'appli calcule un plan) et l'agent avait de vrais défauts (dates recomptées, flashcards au lieu des erreurs, schéma remplacé par un bouton, « pas au programme » affirmé à tort). Les deux ont été corrigés : élève fictif rendu cohérent, ce que fait l'appli expliqué au correcteur (`eleve.appli`), prompt de l'agent précisé.
- **Prudence** : le prompt a été corrigé après lecture des critiques du correcteur, qui est lui-même un modèle Claude. Les points restants (demandes 9 et 27) sont des imprécisions de contenu, pas des erreurs d'outil.
- **Coût** : environ 0,35 centime par demande en agent (plusieurs tours d'outils, prompt en cache), contre 0,08 centime pour le coach de leçon.
