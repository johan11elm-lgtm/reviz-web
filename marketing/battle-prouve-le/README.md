# Pub Battle « Prouve-le »

Vidéo verticale de 15,5 s (1080×1920, 30 i/s, sans son : le son tendance s'ajoute dans TikTok).
Ton pote dit maîtriser Thalès, tu le défies avec un code, round 3 sur une vraie question du chapitre
(3e maths), +20 / −10 aura, 3–0 et le 6-7, puis la signature revizapp.fr.

- `battle.html` : l'animation. Tout est fonction du temps (`render(t)`), donc le rendu image par image est exact.
  Mascottes lues dans `assets-src/mascot/battle/`, police Geist dans `node_modules`.
- `render.mjs` : capture chaque image avec Playwright.

Refaire la vidéo (après `npm install`) :

```sh
cd marketing/battle-prouve-le
node render.mjs "$PWD/battle.html" "$PWD/frames"
ffmpeg -framerate 30 -i frames/f%04d.png -c:v libx264 -pix_fmt yuv420p -crf 18 -movflags +faststart reviz-battle-prouve-le.mp4
rm -r frames
```

Pour une variante (autre matière, autre réplique), changer les textes de `battle.html` : la question,
les choix et la réplique du pote sont en clair dans le HTML.
