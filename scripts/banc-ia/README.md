# Banc d'essai Réviz IA

Étape 0 de `docs/plan-reviz-ia-agent.md` : 40 vraies demandes de collégiens, posées à Réviz IA et à ChatGPT, notées sur 10 à l'aveugle.

- `questions.json` : l'élève fictif (4e, contrôles, erreurs) et les 40 demandes. Ne pas modifier une demande déjà passée.
- `grille.md` : les 5 critères notés de 0 à 2.
- `commun.mjs` : le message envoyé à chaque IA. `node scripts/banc-ia/commun.mjs > scripts/banc-ia/messages.json` les liste pour le relevé dans le navigateur.
- `lancer-reviz.mjs` : Réviz IA telle qu'en prod (code lu sur origin/main).
- `noter.mjs` : la correction (Claude Sonnet 5.5), puis `bilan.md` et `relire.md` (10 réponses que Johan relit pour vérifier le correcteur).
- `resultats/AAAA-MM-JJ/` : un dossier par relevé.

Un relevé :

1. `node --env-file=.env.local scripts/banc-ia/lancer-reviz.mjs AAAA-MM-JJ` (la prod). Pour une version pas encore en ligne : `--ref <branche>` ou `--arbre <dossier>`, avec `--nom <système>` et, au besoin, `--effort low|medium|high`.
2. ChatGPT sans compte, dans le navigateur intégré : `https://chatgpt.com/?q=<message>`, une ligne par réponse dans `resultats/AAAA-MM-JJ/chatgpt.jsonl` ({ id, systeme: "chatgpt-sans-compte", reponse, image }).
3. `node --env-file=.env.local scripts/banc-ia/noter.mjs AAAA-MM-JJ`

Pour un relevé incomplet, `BANC_IDS=13,24` recorrige seulement ces demandes, et `BANC_BILAN=1` refait le bilan sans rien recorriger.

Coût : Réviz IA 0,17 $ les 40 réponses sur Haiku 4.5, 0,03 $ sur Haiku 5.5 ; la correction environ 0,6 $ pour 2 systèmes et 1 $ pour 5.
