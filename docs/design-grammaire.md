# Grammaire du design Réviz

Le look ne change pas (crème, cartes blanches arrondies, halo chaud, Geist,
encre, mascottes : voir PRODUCT.md). Ce document fixe **comment on s'en sert**,
pour que toutes les pages parlent la même langue. Avant d'ajouter un élément à
une page, on prend une pièce d'ici ; si aucune ne convient, on l'ajoute ici
d'abord.

## 1. L'ordre d'un écran

De haut en bas, toujours dans cet ordre (on saute les étages vides) :

1. **Où je suis** : l'intro de page (`PageIntro`) : titre, sous-titre factuel, mascotte.
2. **Où j'en suis** : l'état de l'élève sur ce qu'il regarde (progression, cartes à revoir).
3. **Ce que je fais maintenant** : une seule action principale.
4. **Le reste** : les autres choix, en rangées ou en tuiles neutres.
5. **Le contenu de référence** : textes, objectifs, détails. Lisibles, mais discrets.

Le contenu de référence ne passe jamais avant l'action : un élève qui ouvre une
page vient faire quelque chose.

## 2. Texte : quatre niveaux et un surtitre

| Niveau | Usage | Style |
|---|---|---|
| Titre de page | `PageIntro`, une fois par page | Geist 800, 30 px (24 px si le titre est long : titres de leçon) |
| Titre de section | au-dessus d'un groupe de cartes, hors carte | `.rv-section-title` : Geist 800, 17 px, phrase normale |
| Titre d'élément | titre d'une carte ou d'une rangée | 15 px, 700, encre |
| Texte | phrases | 14 px, `--text-secondary`, interligne 1,5 |
| Méta | compteurs, matière, date | 12-13 px, `--text-muted` |

**Surtitre** (`.rv-eyebrow`) : 12 px, 700, majuscules, interlettrage 0,6 px,
`--text-muted` (blanc à 78 % sur une carte foncée). C'est le **seul** style en
majuscules. Il nomme une carte (« L'essentiel », « Ta prochaine étape »), il ne
porte jamais d'état ni de couleur. Pas plus d'un surtitre par carte.

Rien sous 12 px qui porte du sens.

## 3. États : une seule pastille

L'état d'une chose (chapitre, leçon, carte) s'écrit avec `.rv-pill`, et chaque
état a toujours le même ton :

| État | Texte | Ton |
|---|---|---|
| Pas commencé | « À découvrir » | neutre (`rv-pill`) |
| Commencé | « Commencé » | orange |
| À revoir | « 4 à revoir » | orange |
| Maîtrisé | « Maîtrisé » | vert |
| Pas encore prêt | « Bientôt » | neutre |

Exception assumée : l'autocollant « Commencer / Continuer » du chemin des
chapitres (élément de jeu, pas un état).

## 4. Surfaces : trois cartes

1. **La carte héros** (fond encre, texte blanc, `HeroCTA` ou `.rv-next`) : porte
   l'action principale. **Une par écran au maximum.** Le bandeau de trimestre du
   chemin est un en-tête, pas une carte héros : il ne porte pas d'action.
2. **La carte blanche** (`.rv-card`) : du contenu ou un groupe de rangées.
3. **La rangée** (`.rv-row`, cards.css) : avatar (mascotte dans un carré
   `--bg-subtle` de 44 px, rayon 14 px), titre d'élément, méta, chevron `›` en
   `--text-light`. En liste, les rangées partagent une carte blanche
   (`.rv-card.rv-rows`) et sont séparées d'un filet.

Pas de carte teintée (beige, rose…) pour se distinguer : la distinction vient
du contenu, de la mascotte ou de la position.

## 5. Couleur : chaque couleur a un sens

- **Encre** (`--accent-violet`) : ce qu'on touche. Bouton principal, onglet actif, lien.
- **Orange** : ce qui attend l'élève. Cartes à revoir, série, chapitre en cours.
- **Vert** : ce qui est acquis. Maîtrisé, bonne réponse, objectif atteint.
- **Couleurs des formats** (résumé vert, flashcards encre, carte mentale rose,
  quiz orange) : **uniquement sur l'icône du format**. Le reste de la tuile
  (chevron, compteur) reste neutre.
- Les couleurs de matière ne servent qu'à reconnaître une matière.

## 6. Actions

- **Un seul bouton plein par écran** (`rv-btn-cta`, ou le bouton blanc d'une
  carte héros). Les autres actions sont `rv-btn-cta--ghost`, des rangées ou des tuiles.
- **Une action, une entrée par écran** : pas deux chemins vers la même chose
  (« Reprendre » dans le héros et dans une carte, un bouton coach quand
  l'onglet Coach est là).
- Le libellé dit ce qui va se passer, avec un verbe : « Lire le résumé », pas « Go ».
- Une durée ou un nombre aide à se lancer : « 5 min », « 8 cartes ».

## 7. Listes à puces

Puces neutres (petit rond `--text-light`) ou coches vertes pour ce qui est
acquis. Pas d'étoiles : elles se lisent comme des favoris ou une note.

## Où on en est

| Page | État |
|---|---|
| Chapitre : fiche du chemin + page de la leçon | pilote |
| Coach | refait (conversation directe) |
| Accueil | fait : une action dans le héros, « Ta dernière leçon » reprend la leçon, Mon programme et Battle en rangées, défis en surtitre |
| Mes cours | fait : « À reprendre » d'abord, Mon programme en rangée, recherche au-dessus de la liste, une carte par matière avec ses leçons en rangées, « N à revoir » |
| Progrès, Profil, formats | à passer à la grammaire |
| Toast « Badge débloqué » | surtitre orange à neutraliser ou à classer en exception (célébration) |
