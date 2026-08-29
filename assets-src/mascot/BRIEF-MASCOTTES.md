# Brief mascottes Réviz — déclinaisons par matière & situation

> Généré le 2026-08-29. Outil : ChatGPT (GPT Images) avec image de référence
> `pose-9-hello.png` jointe à CHAQUE génération (cohérence du personnage).
> Intégration : PNG 1024+ → détourage (fond magenta) → master transparent dans
> `assets-src/mascot/` → `node scripts/process-mascots.mjs`.

## Prompt maître (à préfixer à chaque scène)

> Reprends EXACTEMENT le personnage de l'image jointe : mascotte 3D d'un
> cerveau kawaii crème/beige, gros yeux marron brillants avec reflets blancs,
> sourcils marron expressifs, petit sourire doux, fins vaisseaux corail sur
> les lobes, petits bras fins couleur peau, rendu 3D doux façon Pixar/Blender,
> éclairage studio chaleureux. MÊME personnage, mêmes proportions, même
> matière, même palette. Nouvelle scène : **[SCÈNE]**.
> Fond uni magenta pur (#FF00FF) sans dégradé ni ombre portée sur le fond.
> Aucun texte, aucun watermark, aucun logo. Image carrée 1024×1024 minimum,
> personnage centré (~70 % du cadre), accessoires 3D dans le même style.

## Scènes « matières » (héros de la page Cours / analyse)

| Fichier cible | Scène |
|---|---|
| pose-m1-maths | il tient un compas doré et une règle, triangle et symbole π 3D flottant autour de lui |
| pose-m2-francais | plongé dans un gros roman rouge ouvert, petites lunettes rondes posées sur les lobes |
| pose-m3-svt | loupe à la main, petite plante en pot devant lui, double hélice d'ADN flottante |
| pose-m4-physique | lunettes de protection, erlenmeyer en verre au liquide vert pétillant, atome en orbite |
| pose-m5-histgeo | globe terrestre 3D sous le bras, carte au trésor enroulée, chapeau d'explorateur beige |
| pose-m6-langues | casque audio sur les lobes, bulle de dialogue 3D vide, petit drapeau britannique |
| pose-m7-technonsi | laptop ouvert devant lui, symboles « < > » 3D flottants, air concentré |
| pose-m8-philo | assis en penseur de Rodin sur une pile de livres, point d'interrogation doré flottant |
| pose-m9-arts | palette de peintre et pinceau, une touche de peinture violette sur un lobe |

## Scènes « situations » (gamification, coach, moments de vie)

| Fichier cible | Scène |
|---|---|
| pose-s1-quiz | il écrase joyeusement un gros buzzer rouge, petites étoiles d'excitation |
| pose-s2-coach | casque-micro d'animateur radio, clin d'œil complice, pouce levé |
| pose-s3-levelup | il décolle comme une fusée, traînée d'étoiles violettes et orange |
| pose-s4-retour | bras grands ouverts accueillants, quelques confettis discrets |
| pose-s5-soir | bonnet de nuit rayé, lampe de chevet allumée à côté, air paisible et concentré, croissant de lune |
| pose-s6-examen | il brandit fièrement une copie avec une grande étoile dorée dessus |
| pose-s7-scan | il photographie un cahier ouvert avec un smartphone violet |
| pose-s8-muscu | il soulève deux petits haltères violets, air déterminé, gouttelette d'effort |

## Anti-drift (leçon du 2026-08-29)

Dans une longue conversation ChatGPT, le personnage **dérive** (teinte plus
orange, texture grossière, jambes apparues) : le contexte récent pèse plus que
la référence initiale. Parade validée : **re-joindre `pose-9-hello.png` à
CHAQUE prompt** et repartir sur une conversation neuve dès qu'un écart se voit.
Préciser dans le prompt : « teinte creme pale, texture lisse, vaisseaux corail
fins, PAS de jambes, petits bras fins ».

## Règles d'intégration

1. Vérifier : pas de watermark ✦, pas de texte, fond magenta uni, style cohérent.
2. Détourage : `node scripts/key-mascot.mjs <brut.png> assets-src/mascot/<pose>.png`
   (clé douce + despill + anti-aliasing ; ne PAS utiliser `--erode` de
   process-mascots, réservé aux anciens masters).
3. Nommage : `pose-<id>.png` en 1024×1024 dans `assets-src/mascot/`.
4. `node scripts/process-mascots.mjs` pour générer les @256/@512 PNG+WebP.
5. Les anciennes poses (1 à 16) restent servies telles quelles tant que leurs
   remplaçantes ne sont pas validées.
