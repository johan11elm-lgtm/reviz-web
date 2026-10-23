# Le ninja des fautes : calques du dojo (bruts : refonte-2026-11/games-mondes/ninja/, détourés par
# scripts/key-mascot.mjs en <nom>-cle.png). Fruits entiers, moitiés (le fruit tranché généré d'un
# bloc, coupé en deux par ses deux taches), étiquette, jus (repeint à la couleur de chaque fruit),
# sabre (accessoire du pantin) et les fonds. Usage : python3 decouper.py <bruts> <public>
import os, sys, cv2, numpy as np
from PIL import Image
src, pub = sys.argv[1:3]
out = f'{pub}/jeux/ninja'
os.makedirs(out, exist_ok=True)

def recadre(im, marge=4):
    x0, y0, x1, y1 = im.getbbox()
    return im.crop((max(0, x0 - marge), max(0, y0 - marge), min(im.width, x1 + marge), min(im.height, y1 + marge)))

def webp(im, chemin, largeur=None, hauteur=None, q=84):
    if largeur: im = im.resize((largeur, round(im.height * largeur / im.width)), Image.LANCZOS)
    elif hauteur: im = im.resize((round(im.width * hauteur / im.height), hauteur), Image.LANCZOS)
    im.save(chemin, quality=q, method=6)
    return im

cle = lambda nom: Image.open(f'{src}/{nom}-cle.png').convert('RGBA')

# Les fonds : le téléphone (2:3) et l'ordinateur (3:2), s'il est là.
webp(Image.open(f'{src}/fond.png').convert('RGB'), f'{out}/fond.webp', largeur=900, q=80)
if os.path.exists(f'{src}/fond-paysage.png'):
    webp(Image.open(f'{src}/fond-paysage.png').convert('RGB'), f'{out}/fond-paysage.webp', largeur=1600, q=78)

# Les fruits entiers : carrés (le fruit centré), 320 px. La taille du fruit dans son carré est notée
# pour caler les moitiés dessus.
TAILLE = 320
tailles = {}
for f in ('pasteque', 'orange', 'pomme', 'citron'):
    im = recadre(cle(f))
    c = max(im.size)
    carre = Image.new('RGBA', (c, c)); carre.alpha_composite(im, ((c - im.width) // 2, (c - im.height) // 2))
    webp(carre, f'{out}/{f}.webp', largeur=TAILLE)
    tailles[f] = im.size

# Les moitiés : les deux plus grandes taches du fruit tranché, chacune recadrée dans un carré de la
# taille du fruit entier, collée au bord du milieu (la coupe) : en jeu, les deux carrés partent du
# même endroit que le fruit entier et s'écartent.
for f in ('pasteque', 'orange', 'pomme', 'citron'):
    chemin = f'{src}/{f}-moities-cle.png'
    if not os.path.exists(chemin): continue
    a = np.array(Image.open(chemin).convert('RGBA'))
    m = (a[..., 3] > 40).astype(np.uint8)
    n, lab, st, _ = cv2.connectedComponentsWithStats(m)
    deux = sorted(np.argsort(-st[1:, 4])[:2] + 1, key=lambda i: st[i, 0])
    entier = tailles[f]
    hauteurs = [st[i, 3] for i in deux]
    k = entier[1] / max(hauteurs) # la plus haute moitié (avec sa feuille) : la hauteur du fruit entier
    c = max(entier)
    for cote, i in zip(('g', 'd'), deux):
        x, y, w, h = st[i, :4]
        piece = a.copy(); piece[..., 3] = np.where(lab == i, piece[..., 3], 0)
        im = Image.fromarray(piece).crop((x, y, x + w, y + h))
        im = im.resize((max(1, round(w * k)), max(1, round(h * k))), Image.LANCZOS)
        carre = Image.new('RGBA', (c, c))
        px = c // 2 - im.width if cote == 'g' else c // 2
        # Posée sur le même bas que le fruit entier (la feuille d'une moitié dépasse en haut).
        carre.alpha_composite(im, (max(0, min(c - im.width, px)), max(0, (c + entier[1]) // 2 - im.height)))
        webp(carre, f'{out}/{f}-{cote}.webp', largeur=TAILLE)

# L'étiquette crème (le mot s'écrit dessus en HTML).
webp(recadre(cle('etiquette')), f'{out}/etiquette.webp', largeur=360)

# Le jus : l'éclaboussure rouge, repeinte pour chaque fruit (teinte tournée, comme les buzzers).
jus = recadre(cle('jus'))
JUS = {'pasteque': (0, 1, 1), 'pomme': (176, 0.9, 1.05), 'orange': (12, 1, 1.08), 'citron': (24, 0.95, 1.2)}
for f, (dt, ks, kv) in JUS.items():
    a = np.array(jus)
    hsv = cv2.cvtColor(a[..., :3], cv2.COLOR_RGB2HSV).astype(np.float32)
    hsv[..., 0] = (hsv[..., 0] + dt) % 180
    hsv[..., 1] = np.minimum(255, hsv[..., 1] * ks)
    hsv[..., 2] = np.minimum(255, hsv[..., 2] * kv)
    a[..., :3] = cv2.cvtColor(hsv.astype(np.uint8), cv2.COLOR_HSV2RGB)
    webp(Image.fromarray(a), f'{out}/jus-{f}.webp', largeur=320)

# Le sabre en carton : accessoire du pantin (tenu dans la main), pointe en haut.
webp(recadre(cle('sabre')), f'{pub}/pantin/accessoires/sabre.webp', hauteur=640, q=88)
print('ok')
