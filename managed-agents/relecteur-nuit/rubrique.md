Grille de départ, à ajuster :

- Le fichier docs/relecture-nuit/suivi.json compte entre 1 et 12 chapitres de plus qu'au début de la session, ou la relecture est signalée terminée. Aucun chapitre de technologie (dossier technologie) n'y figure.
- Chaque chapitre traité a son propre commit, poussé sur origin/relecture-nuit. Aucun commit n'est poussé sur main.
- Chaque fichier de chapitre modifié passe parseLessonJson et garde le même nombre de flashcards, de questions de quiz et de branches de carte mentale qu'avant.
- Les modifications ne touchent que des textes : rien dans programme, emoji, couleurs ou positions ; un index correct n'est changé que si le rapport justifie que la réponse était fausse.
- Le rapport docs/relecture-nuit/AAAA-MM-JJ.md existe, liste chaque correction au format « chemin / champ : avant → après (raison) », et ses chiffres correspondent aux commits de la nuit.
- Chaque correction de donnée datée (pays membres, lois, chiffres récents) cite une source consultée en ligne.
- Aucune correction n'est purement stylistique : chacune corrige une erreur de fond, de logique, d'ambiguïté ou de langue.
- Une pull request de relecture-nuit vers main est ouverte, et sa description ou un nouveau commentaire résume la nuit.
