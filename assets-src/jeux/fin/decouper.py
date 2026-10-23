# Fin de partie de Réviz Games : calques de la scène et du récap (bruts : refonte-2026-11/games-mondes/fin/calques/,
# détourés par scripts/key-mascot.mjs en <nom>-cle.png). Fonds (scène, bureau ; téléphone 2:3 et ordinateur
# 3:2), podium, étoile, carte en carton, et les accessoires du pantin (médaille, coupe).
# Usage : python3 decouper.py <bruts> <public>
import os, sys
from PIL import Image
src, pub = sys.argv[1:3]
out = f'{pub}/jeux/fin'
os.makedirs(out, exist_ok=True)

def recadre(im, marge=4):
    x0, y0, x1, y1 = im.getbbox()
    return im.crop((max(0, x0 - marge), max(0, y0 - marge), min(im.width, x1 + marge), min(im.height, y1 + marge)))

def webp(im, chemin, largeur, q=84):
    im = im.resize((largeur, round(im.height * largeur / im.width)), Image.LANCZOS)
    im.save(chemin, quality=q, method=6)
    print(chemin, im.size)

for nom in ('scene', 'bureau'):
    webp(Image.open(f'{src}/{nom}.png').convert('RGB'), f'{out}/{nom}.webp', 900, q=80)
    webp(Image.open(f'{src}/{nom}-paysage.png').convert('RGB'), f'{out}/{nom}-paysage.webp', 1600, q=78)

cle = lambda nom: recadre(Image.open(f'{src}/{nom}-cle.png').convert('RGBA'))
webp(cle('podium'), f'{out}/podium.webp', 640)
webp(cle('etoile'), f'{out}/etoile.webp', 200)
webp(cle('carte'), f'{out}/carte.webp', 640, q=86)
acc = f'{pub}/pantin/accessoires'
# La médaille (ruban calé sur le corps) : medaille.py.
webp(cle('coupe'), f'{acc}/coupe.webp', 420)

# La carte du récap se tend en 9 morceaux (border-image) à la taille de chaque erreur : le trombone,
# au milieu du bord du haut, serait étiré. On le repeint avec le bord voisin (même hauteur, à
# gauche) et on le garde à part, détouré par différence avec la carte nettoyée.
import numpy as np
carte = Image.open(f'{out}/carte.webp').convert('RGBA')
a = np.array(carte)
x0, x1, h = 268, 372, 118
propre = a.copy()
propre[:h, x0:x1] = a[:h, x0 - 150:x1 - 150]
Image.fromarray(propre).save(f'{out}/carte.webp', quality=86, method=6)
ecart = np.abs(a[:h, x0:x1, :3].astype(int) - propre[:h, x0:x1, :3].astype(int)).max(2)
clip = a[:h, x0:x1].copy()
# Seule la plus grande tache compte (le trombone) : les petits écarts du bord repeint sont écartés.
import cv2
hsv = cv2.cvtColor(a[:h, x0:x1, :3], cv2.COLOR_RGB2HSV)
masque = ((ecart > 38) & (hsv[..., 1] > 120)).astype(np.uint8)  # l'or du trombone, pas le carton crème
n, lab, st, _ = cv2.connectedComponentsWithStats(masque)
masque = cv2.morphologyEx((lab == 1 + np.argmax(st[1:, 4])).astype(np.uint8), cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8))
doux = cv2.GaussianBlur(masque.astype(np.float32), (0, 0), 0.8)
clip[..., 3] = (doux * a[:h, x0:x1, 3]).astype(np.uint8)
recadre(Image.fromarray(clip)).save(f'{out}/trombone.webp', quality=90, method=6)
print('carte sans trombone, trombone', recadre(Image.fromarray(clip)).size)
