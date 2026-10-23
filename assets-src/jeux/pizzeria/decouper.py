# La pizzeria ! : calques du décor et accessoires du pantin (bruts : refonte-2026-11/games-mondes/pizzeria/calques/,
# détourés par scripts/key-mascot.mjs en <nom>-cle.png).
# - fond, fond-paysage : le décor (sans comptoir), réduit ;
# - comptoir, planche, assiette, ticket, mains du client : recadrés au plus près ;
# - pizza : vue de dessus, recadrée en carré sur son cercle ; pizza-bord : sa silhouette couleur croûte
#   cuite (l'épaisseur de la pâte, glissée sous chaque part) ;
# - toque et tablier : découpés sur Réviz généré en pizzaïolo, calés sur le pantin par les pupilles
#   (même repère que le bandeau de Réviz lance, voir yeux.py) ; la part tenue en main.
# Usage : python3 decouper.py <dossier des bruts> <racine public/>
import os, sys, json, cv2, numpy as np
from PIL import Image
sys.path.insert(0, os.path.dirname(__file__))
from yeux import yeux

src, pub = sys.argv[1:3]
out = f'{pub}/jeux/pizzeria'
os.makedirs(out, exist_ok=True)

def recadre(im, marge=4):
    x0, y0, x1, y1 = im.getbbox()
    return im.crop((max(0, x0 - marge), max(0, y0 - marge), min(im.width, x1 + marge), min(im.height, y1 + marge)))

def webp(im, chemin, largeur, q=84):
    im = im.resize((largeur, round(im.height * largeur / im.width)), Image.LANCZOS)
    im.save(chemin, quality=q, method=6)
    print(os.path.basename(chemin), im.size)
    return im

cle = lambda nom: Image.open(f'{src}/{nom}-cle.png').convert('RGBA')

webp(Image.open(f'{src}/fond.png').convert('RGB'), f'{out}/fond.webp', 1024, 80)
webp(Image.open(f'{src}/fond-paysage.png').convert('RGB'), f'{out}/fond-paysage.webp', 1536, 80)
webp(recadre(cle('comptoir'), 0), f'{out}/comptoir.webp', 1024)
webp(recadre(cle('assiette')), f'{out}/assiette.webp', 480)
webp(recadre(cle('ticket')), f'{out}/ticket.webp', 320)
for m in ('attrape', 'pointe', 'tapote'):
    webp(recadre(cle(f'main-{m}')), f'{out}/main-{m}.webp', 420)
if os.path.exists(f'{src}/planche-bois-cle.png'):
    webp(recadre(cle('planche-bois')), f'{out}/planche.webp', 640)

# La pizza : carré centré sur le cercle (le plus grand disque opaque), pour que les parts tournent
# autour de son centre exact.
pz = cle('pizza')
a = np.array(pz)[..., 3] > 128
ys, xs = np.nonzero(a)
cx, cy, r = (xs.min() + xs.max()) / 2, (ys.min() + ys.max()) / 2, max(xs.max() - xs.min(), ys.max() - ys.min()) / 2 + 3
pz = pz.crop((round(cx - r), round(cy - r), round(cx + r), round(cy + r)))
pz = webp(pz, f'{out}/pizza.webp', 640)
al = np.array(pz)[..., 3].astype(np.float32) / 255
# Croûte cuite : brun doré au bord, plus sombre en bas (l'ombre sous la pâte).
h = al.shape[0]
grad = np.linspace(1.0, 0.72, h)[:, None]
bord = np.dstack([np.full_like(al, 176) * grad, np.full_like(al, 108) * grad, np.full_like(al, 52) * grad, al * 255]).astype(np.uint8)
Image.fromarray(bord).save(f'{out}/pizza-bord.webp', quality=84, method=6)

# ── Accessoires du pantin ──
# Repère : pupilles du Réviz du bandeau (Réviz lance) -> pantin (1258, 1019), écart 622,4 px.
pizzaiolo = cle('reviz-pizzaiolo')
(xg, yg), (xd, yd) = yeux(f'{src}/reviz-pizzaiolo-cle.png')
k = 622.4 / (xd - xg)
ox, oy = (xg + xd) / 2, (yg + yd) / 2
vers_pantin = lambda x, y: (1258 + (x - ox) * k, 1019 + (y - oy) * k)
A = np.array(pizzaiolo).astype(np.int32)
r, g, b, al = (A[..., i] for i in range(4))
H, W = al.shape

def poser(masque, nom, largeur):
    m = cv2.GaussianBlur(masque.astype(np.float32), (0, 0), 0.8)
    rgba = np.array(pizzaiolo).copy()
    rgba[..., 3] = (rgba[..., 3] * m).astype(np.uint8)
    im = Image.fromarray(rgba)
    x0, y0, x1, y1 = im.getbbox()
    im = im.crop((x0, y0, x1, y1))
    (px, py), (qx, qy) = vers_pantin(x0, y0), vers_pantin(x1, y1)
    webp(im, f'{pub}/pantin/accessoires/{nom}.webp', largeur)
    return {'x': round(px), 'y': round(py), 'w': round(qx - px), 'h': round(qy - py)}

# Toque : même crème que la tête, on la coupe par la forme. Colonne par colonne, depuis le haut :
# sur les bords (les côtés du bonnet), la première tache opaque ; sous le bandeau, le bas du bandeau,
# là où la lumière chute (l'ombre portée sur les lobes), lissé.
V = cv2.GaussianBlur(cv2.cvtColor(A[..., :3].astype(np.uint8), cv2.COLOR_RGB2HSV)[..., 2].astype(np.float32), (0, 0), 2)
opaque = al > 128
haut = np.argmax(opaque, axis=0)
fin_tache = np.array([h0 + np.argmin(opaque[h0:, x]) - 1 if opaque[:, x].any() else -1 for x, h0 in enumerate(haut)])
dans_toque = haut < 290  # colonnes qui commencent par la toque (la tête commence plus bas)
xs_bandeau = np.nonzero(dans_toque & (fin_tache > haut + 400))[0]  # elles descendent dans la tête
bas = fin_tache.copy()
if len(xs_bandeau):
    chute = np.array([haut[x] + 120 + int(np.argmin(np.diff(V[haut[x] + 120:haut[x] + 260, x]))) for x in xs_bandeau])
    chute = np.array([np.median(chute[max(0, i - 3):i + 4]) for i in range(len(chute))])
    bas[xs_bandeau] = np.round(np.convolve(np.pad(chute, 4, mode='edge'), np.ones(9) / 9, mode='valid')).astype(int)
masque_toque = np.zeros((H, W), bool)
for x in np.nonzero(dans_toque)[0]:
    masque_toque[:bas[x] + 1, x] = True
masque_toque &= al > 10
# Tablier : la feutrine rouge (pas le corail des vaisseaux), trous des boutons bouchés.
rouge = ((r > 140) & (g < 75) & (b < 85) & (al > 128)).astype(np.uint8)
rouge = cv2.morphologyEx(rouge, cv2.MORPH_CLOSE, np.ones((7, 7), np.uint8))
# Les vaisseaux corail qui touchent les bretelles sont fins : une ouverture les retire.
rouge = cv2.morphologyEx(rouge, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (15, 15)))
cs, _ = cv2.findContours(rouge, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
cs = [c for c in cs if cv2.contourArea(c) > 400]
plein = np.zeros((H, W), np.uint8)
cv2.drawContours(plein, cs, -1, 1, -1)
cadres = {'toque': poser(masque_toque, 'toque', 720), 'tablier': poser(plein.astype(bool) & (al > 10), 'tablier', 640)}

part = recadre(cle('part'))
webp(part, f'{pub}/pantin/accessoires/part.webp', 360)
cadres['part'] = {'w': part.width, 'h': part.height}
print(json.dumps(cadres))

# Comptoir panoramique (ordinateur, 3:2) : il traverse tout l'écran. Fond magenta retiré par un masque
# dur sur le vert (le bois n'a pas de magenta), bord adouci ; recadré sous le haut de la cagette.
# Imprime la hauteur du bord arrière du dessus (fraction de l'image), pour caler le plan des pizzas.
if os.path.exists(f'{src}/comptoir-long-a.png'):
    bgr = cv2.imread(f'{src}/comptoir-long-a.png').astype(np.float32)
    b_, g_, r_ = bgr[..., 0], bgr[..., 1], bgr[..., 2]
    dur = ((g_ > 40) | (r_ < 180) | (b_ < 180)).astype(np.uint8)
    dur = cv2.morphologyEx(dur, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
    a_ = cv2.GaussianBlur(dur.astype(np.float32), (0, 0), 0.9)
    M_ = np.array([253, 2, 253], np.float32)
    F_ = np.clip((bgr - (1 - a_[..., None]) * M_) / np.maximum(a_[..., None], 1e-3), 0, 255)
    long_ = Image.fromarray(np.dstack([F_[..., 2], F_[..., 1], F_[..., 0], a_ * 255]).astype(np.uint8))
    x0, y0, x1, y1 = long_.getbbox()
    long_ = long_.crop((0, y0, long_.width, long_.height))
    # Bord arrière du dessus : au milieu de l'image, la première ligne opaque.
    col = np.array(long_)[:, long_.width // 2, 3]
    print('comptoir-long : dessus à', round(int(np.argmax(col > 128)) / long_.height, 4), 'de la hauteur')
    webp(long_, f'{out}/comptoir-long.webp', 1536, 82)
