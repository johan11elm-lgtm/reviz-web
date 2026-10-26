# Réviz se trompe ? : calques du plateau télé (bruts : refonte-2026-11/games-mondes/buzzer/).
# Chaque buzzer est coupé en deux : le socle doré (le creux du dôme peint en sombre) et le dôme seul
# (enveloppe convexe des pixels verts ou rouges), dans le même cadre : le dôme s'écrase sur sa base
# quand on appuie et laisse voir le creux.
# Bruts retenus (23/10) : games-mondes/buzzer/mat/dessus/ (buzzers et pupitre vus d'en haut). Le bord arrière de l'anneau, caché par le dôme, est
# retrouvé en prolongeant l'ellipse du haut de l'anneau (visible sur les côtés) : sous le dôme, on
# peint le rebord (couleur de l'anneau) puis le creux ; au-dessus de l'anneau, le dôme dépassait,
# le socle y est transparent (on voit le décor quand le dôme descend). Usage : python3 decouper.py <dossier des bruts> <public/jeux/buzzer>
import os, sys, cv2, numpy as np
from PIL import Image
src, out = sys.argv[1:3]

def recadre(im, marge=6):
    x0, y0, x1, y1 = im.getbbox()
    return im.crop((max(0, x0 - marge), max(0, y0 - marge), min(im.width, x1 + marge), min(im.height, y1 + marge)))

def webp(im, nom, largeur, q=84):
    im = im.resize((largeur, round(im.height * largeur / im.width)), Image.LANCZOS)
    im.save(f'{out}/{nom}.webp', quality=q, method=6)
    return im

# Le rouge est le vert repeint (teinte tournée, seulement sur les pixels à dominante verte :
# l'or n'en a pas) : même forme, la paire est symétrique, et le dôme reste dans son anneau (celui du
# buzzer rouge généré dépassait au-dessus, le creux se voyait hors de l'anneau).
vert = recadre(Image.open(f'{src}/buzzer-vert-cle.png').convert('RGBA'))
vert = vert.resize((480, round(vert.height * 480 / vert.width)), Image.LANCZOS)
def repeindre(im):
    a = np.array(im); hsv = cv2.cvtColor(a[..., :3], cv2.COLOR_RGB2HSV).astype(np.int32)
    r, g, b = (a[..., k].astype(np.int32) for k in range(3))
    zone = (g > r + 12) & (g > b)
    # 114° (OpenCV compte de 0 à 180) : un rouge franc, pas framboise ; plus vif et plus lumineux, le rouge
    # paraît plus sombre que le vert à valeur égale.
    hsv[..., 0] = np.where(zone, (hsv[..., 0] - 57) % 180, hsv[..., 0])
    hsv[..., 1] = np.where(zone, np.minimum(255, hsv[..., 1] * 1.15), hsv[..., 1])
    hsv[..., 2] = np.where(zone, np.minimum(255, hsv[..., 2] * 1.12), hsv[..., 2])
    a[..., :3] = cv2.cvtColor(hsv.astype(np.uint8), cv2.COLOR_HSV2RGB)
    return Image.fromarray(a)

for couleur in ('vert', 'rouge'):
    im = vert
    a = np.array(im).astype(np.int32); r, g, b, al = a[..., 0], a[..., 1], a[..., 2], a[..., 3]
    teinte = (g - r > 60) & (g - b > 40)
    teinte = (teinte & (al > 200)).astype(np.uint8)
    n, lab, st, _ = cv2.connectedComponentsWithStats(teinte)
    plus = 1 + np.argmax(st[1:, 4])
    pts = np.argwhere(lab == plus)[:, ::-1].astype(np.int32)
    coque = np.zeros(teinte.shape, np.uint8)
    cv2.fillConvexPoly(coque, cv2.convexHull(pts), 1)
    coque = cv2.dilate(coque, np.ones((3, 3), np.uint8))
    doux = cv2.GaussianBlur(coque.astype(np.float32), (0, 0), 0.8)
    dome = a.copy(); dome[..., 3] = (al * doux).astype(np.int32)
    # Le haut de l'anneau : y = yc - b * sqrt(1 - ((x - xc) / ra)^2), ajusté sur les colonnes où il
    # se voit (le premier pixel opaque n'est pas dans le dôme), loin des flancs (presque verticaux).
    opaque = al > 128
    cols = np.nonzero(opaque.any(0))[0]; xc, ra = (cols[0] + cols[-1]) / 2, (cols[-1] - cols[0]) / 2
    X, Y = [], []
    for x in cols:
        y = np.argmax(opaque[:, x])
        if not coque[y, x] and 0.5 < abs(x - xc) / ra < 0.88: X.append(x); Y.append(y)
    sq = np.sqrt(np.clip(1 - ((np.array(X) - xc) / ra) ** 2, 0, 1))
    yc, mb = np.linalg.lstsq(np.stack([np.ones_like(sq), -sq], 1), np.array(Y, float), rcond=None)[0]
    xx = np.arange(a.shape[1]); yy = np.arange(a.shape[0])[:, None]
    haut = yc - mb * np.sqrt(np.clip(1 - ((xx - xc) / ra) ** 2, 0, 1))  # haut de l'anneau
    bord = haut + a.shape[0] * 0.045  # son bord intérieur (l'épaisseur du rebord)
    flou = lambda m: cv2.GaussianBlur(m.astype(np.float32), (0, 0), 0.8)
    dedans, sur_anneau = flou(yy >= bord[None, :]), flou(yy >= haut[None, :])
    # Couleur du rebord : celle de l'anneau juste à côté du dôme, en haut.
    pres = (cv2.dilate(coque, np.ones((15, 15), np.uint8)) > 0) & (coque == 0) & opaque & (yy < yc)
    rebord = np.median(a[..., :3][pres], 0) * 0.9
    # Le creux : brun doré très sombre, plus clair vers le bas (la lumière vient d'en haut).
    ys, xs = np.nonzero(coque); y0, y1 = ys.min(), ys.max()
    t = np.clip((np.arange(a.shape[0]) - y0) / max(1, y1 - y0), 0, 1)[:, None]
    creux = np.stack([40 + 50 * t, 26 + 34 * t, 10 + 12 * t], -1) * np.ones((1, a.shape[1], 1))
    socle = a.copy().astype(np.float32)
    fond = creux * dedans[..., None] + rebord * (1 - dedans[..., None])
    socle[..., :3] = socle[..., :3] * (1 - doux[..., None]) + fond * doux[..., None]
    socle[..., 3] *= 1 - doux * (1 - sur_anneau)
    # Le liseré du dôme (bord adouci, hors de l'enveloppe) au-dessus de l'anneau : effacé aussi.
    autour = cv2.dilate(coque, np.ones((7, 7), np.uint8)) > 0
    socle[..., 3] *= np.where(autour & (yy < haut[None, :]), 0, 1)
    peindre = repeindre if couleur == 'rouge' else (lambda x: x)
    peindre(Image.fromarray(socle.clip(0, 255).astype(np.uint8))).save(f'{out}/buzzer-{couleur}-socle.webp', quality=84, method=6)
    peindre(Image.fromarray(dome.clip(0, 255).astype(np.uint8))).save(f'{out}/buzzer-{couleur}-dome.webp', quality=84, method=6)
    print(couleur, im.size, 'anneau : haut', round((yc - mb) / im.height * 100, 1), '%', 'dôme : haut', round(y0 / im.height * 100, 1), '% bas', round(y1 / im.height * 100, 1),
          '% gauche', round(xs.min() / im.width * 100, 1), '% droite', round(xs.max() / im.width * 100, 1), '%')

def cle(nom):
    # key-mascot rend un carré de 1024 recadré au centre : un brut en 3:2 (le pupitre long) est
    # d'abord complété en carré de magenta (<nom>-carre.png), sinon ses deux bouts sont coupés.
    return recadre(Image.open(f'{src}/{nom}-cle.png').convert('RGBA'))

pupitre = webp(cle('pupitre'), 'pupitre', 1000)
print('pupitre', pupitre.size)
Image.open(f'{src}/fond.png').convert('RGB').save(f'{out}/fond.webp', quality=80, method=6)
# Ordinateur (plein écran) : le décor en paysage et le pupitre long, s'ils sont fournis
# (bruts : games-mondes/buzzer/mat/paysage/, copiés ici sous fond-paysage.png et pupitre-long.png).
if os.path.exists(f'{src}/pupitre-long-cle.png'):
    print('pupitre long', webp(cle('pupitre-long'), 'pupitre-long', 1200).size)
if os.path.exists(f'{src}/fond-paysage.png'):
    Image.open(f'{src}/fond-paysage.png').convert('RGB').save(f'{out}/fond-paysage.webp', quality=80, method=6)
