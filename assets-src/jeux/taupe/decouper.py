# Tape-taupe ! : calques du potager et accessoires du pantin (bruts : refonte-2026-11/games-mondes/taupe/,
# détourés par scripts/key-mascot.mjs en <nom>-cle.png).
# - fond, fond-paysage : le potager (sans trous), réduit ;
# - trou : coupé en deux, trou.webp (tout le trou, derrière la taupe) et trou-avant.webp (le bourrelet de
#   devant, sous le bord bas de l'ouverture : il passe devant la taupe) ; imprime l'ouverture en fractions ;
# - taupe, taupe-sonnee, taupe-moqueuse : recadrées sur un même cadre (la taupe ne saute pas d'une pose à
#   l'autre) ; imprime la pancarte (rectangle crème) en fractions de ce cadre ;
# - pancarte (la règle), etoile : recadrées ;
# - paille (chapeau) et salopette : découpées sur Réviz généré en jardinier, calées sur le pantin par les
#   pupilles (même repère que le bandeau de Réviz lance, voir yeux.py) ; le maillet tenu en main.
# Usage : python3 decouper.py <dossier des bruts> <racine public/>
import os, sys, json, cv2, numpy as np
from PIL import Image
sys.path.insert(0, os.path.dirname(__file__))
from yeux import yeux

src, pub = sys.argv[1:3]
out = f'{pub}/jeux/taupe'
os.makedirs(out, exist_ok=True)
infos = {}

def recadre(im, marge=4):
    x0, y0, x1, y1 = im.getbbox()
    return im.crop((max(0, x0 - marge), max(0, y0 - marge), min(im.width, x1 + marge), min(im.height, y1 + marge)))

def webp(im, chemin, largeur, q=84):
    im = im.resize((largeur, round(im.height * largeur / im.width)), Image.LANCZOS)
    im.save(chemin, quality=q, method=6)
    print(os.path.basename(chemin), im.size)
    return im

cle = lambda nom: Image.open(f'{src}/{nom}-cle.png').convert('RGBA')
fr = lambda v, n: round(float(v) / n, 4)

webp(Image.open(f'{src}/fond.png').convert('RGB'), f'{out}/fond.webp', 1024, 80)
webp(Image.open(f'{src}/fond-paysage.png').convert('RGB'), f'{out}/fond-paysage.webp', 1536, 80)
# La pancarte de la règle : la planche seule (les ficelles du haut retirées : on écrit dessus).
pc = recadre(cle('pancarte'))
lignes = (np.array(pc)[..., 3] > 128).sum(axis=1)
planche = np.nonzero(lignes > 0.6 * lignes.max())[0]
pc = pc.crop((0, max(0, planche[0] - 6), pc.width, pc.height))
webp(pc, f'{out}/pancarte.webp', 720)
webp(recadre(cle('etoile')), f'{out}/etoile.webp', 120)

# ── Le trou ── L'ouverture : la plus grande tache très sombre. Pour chaque colonne, son bord bas ;
# le bourrelet de devant, c'est la terre sous ce bord (et, à côté de l'ouverture, sous son milieu).
trou = recadre(cle('trou'), 2)
T = np.array(trou)
al = T[..., 3]
V = cv2.cvtColor(T[..., :3], cv2.COLOR_RGB2HSV)[..., 2]
sombre = ((V < 55) & (al > 200)).astype(np.uint8)
sombre = cv2.morphologyEx(sombre, cv2.MORPH_CLOSE, np.ones((9, 9), np.uint8))
n, lab, st, _ = cv2.connectedComponentsWithStats(sombre)
k = max(range(1, n), key=lambda i: st[i, 4])
ouv = lab == k
ys, xs = np.nonzero(ouv)
ox0, ox1, oy0, oy1 = xs.min(), xs.max(), ys.min(), ys.max()
milieu = (oy0 + oy1) / 2
H, W = al.shape
bas = np.full(W, milieu)
for x in range(ox0, ox1 + 1):
    col = np.nonzero(ouv[:, x])[0]
    if len(col): bas[x] = max(col.max(), milieu)
bas = np.convolve(np.pad(bas, 6, mode='edge'), np.ones(13) / 13, mode='valid')
yy = np.arange(H)[:, None]
avant = (yy > bas[None, :] - 2).astype(np.float32)
avant = cv2.GaussianBlur(avant, (0, 0), 1.2)
A = T.copy()
A[..., 3] = (al * avant).astype(np.uint8)
webp(trou, f'{out}/trou.webp', 420)
webp(Image.fromarray(A), f'{out}/trou-avant.webp', 420)
infos['trou'] = {'ratio': fr(H, W), 'ouverture': {'x0': fr(ox0, W), 'x1': fr(ox1, W), 'y0': fr(oy0, H), 'y1': fr(oy1, H)}}

# ── Les taupes ── Un même cadre pour les trois poses : la boîte qui les contient toutes, recalées
# sur le bas (la coupe du corps) et le centre.
poses = ['taupe', 'taupe-sonnee', 'taupe-moqueuse']
ims = {p: cle(p) for p in poses if os.path.exists(f'{src}/{p}-cle.png')}
boites = {p: im.getbbox() for p, im in ims.items()}
L = max(b[2] - b[0] for b in boites.values())
Hh = max(b[3] - b[1] for b in boites.values())
infos['taupes'] = {}
for p, im in ims.items():
    x0, y0, x1, y1 = boites[p]
    cx = (x0 + x1) / 2
    cadre = Image.new('RGBA', (L + 8, Hh + 4))
    cadre.paste(im.crop((x0, y0, x1, y1)), (round(4 + (L - (x1 - x0)) / 2), 4 + Hh - (y1 - y0)))
    tp = webp(cadre, f'{out}/{p}.webp', 360)
    # La pancarte : la plus grande tache crème claire.
    a = np.array(cadre).astype(int)
    creme = ((a[..., 0] > 215) & (a[..., 1] > 185) & (a[..., 2] > 130) & (a[..., 0] - a[..., 2] < 100) & (a[..., 3] > 200)).astype(np.uint8)
    creme = cv2.morphologyEx(creme, cv2.MORPH_OPEN, np.ones((7, 7), np.uint8))
    n, lab, st, _ = cv2.connectedComponentsWithStats(creme)
    k = max(range(1, n), key=lambda i: st[i, 4])
    x, y, w, h = st[k, :4]
    infos['taupes'][p] = {'ratio': fr(cadre.height, cadre.width), 'pancarte': {'x': fr(x + w / 2, cadre.width), 'y': fr(y + h / 2, cadre.height), 'w': fr(w, cadre.width), 'h': fr(h, cadre.height)}}

# ── Accessoires du pantin ──
# Repère : pupilles du Réviz du bandeau (Réviz lance) -> pantin (1258, 1019), écart 622,4 px.
jardinier = cle('reviz-jardinier')
(xg, yg), (xd, yd) = yeux(f'{src}/reviz-jardinier-cle.png')
k = 622.4 / (xd - xg)
ox, oy = (xg + xd) / 2, (yg + yd) / 2
vers_pantin = lambda x, y: (1258 + (x - ox) * k, 1019 + (y - oy) * k)
J = np.array(jardinier)
hsv = cv2.cvtColor(J[..., :3], cv2.COLOR_RGB2HSV).astype(int)
Hu, S, al = hsv[..., 0], hsv[..., 1], J[..., 3]

def poser(masque, nom, largeur):
    m = cv2.GaussianBlur(masque.astype(np.float32), (0, 0), 0.8)
    rgba = J.copy()
    rgba[..., 3] = (rgba[..., 3] * m).astype(np.uint8)
    im = Image.fromarray(rgba)
    x0, y0, x1, y1 = im.getbbox()
    im = im.crop((x0, y0, x1, y1))
    (px, py), (qx, qy) = vers_pantin(x0, y0), vers_pantin(x1, y1)
    webp(im, f'{pub}/pantin/accessoires/{nom}.webp', largeur)
    return {'x': round(px), 'y': round(py), 'w': round(qx - px), 'h': round(qy - py)}

def plein(m, ouvre=1):
    m = m.astype(np.uint8)
    if ouvre > 1: m = cv2.morphologyEx(m, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (ouvre, ouvre)))
    m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, np.ones((9, 9), np.uint8))
    n, lab, st, _ = cv2.connectedComponentsWithStats(m)
    k = max(range(1, n), key=lambda i: st[i, 4])
    cs, _ = cv2.findContours((lab == k).astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    r = np.zeros_like(m)
    cv2.drawContours(r, cs, -1, 1, -1)
    return r.astype(bool)

# Chapeau : tout ce qui est opaque, sauf la tête sous le bord. Le bord du chapeau sur le front a la
# teinte de la tête (ombre chaude) et les plis des lobes ont du grain : ni la couleur ni la texture ne
# le séparent proprement. Le contour de la tête sous le bord est donc relevé à la main sur
# reviz-jardinier-cle.png (px de l'image 1024), puis fermé vers le bas.
TETE = [(230, 1024), (230, 385), (242, 330), (270, 300), (320, 281), (355, 279), (400, 263), (450, 253), (500, 259),
        (520, 263), (545, 255), (600, 259), (650, 271), (690, 283), (730, 296), (765, 316), (790, 346), (797, 385), (797, 1024)]
tete = np.zeros_like(al, np.uint8)
cv2.fillPoly(tete, [np.array(TETE, np.int32)], 1)
yy_ = np.arange(al.shape[0])[:, None]
# Sur les côtés, sous les pointes du bord, ce sont les joues (crème pâle, peu saturée) : on les retire.
chapeau = (al > 10) & (tete == 0) & (yy_ < 520) & ~((yy_ > 380) & (S < 115) & (al > 128))
chapeau = plein(chapeau, 5) & (al > 10)
# Salopette : le jean bleu, boutons dorés compris (trous bouchés).
jean = (Hu >= 95) & (Hu <= 130) & (S > 80) & (al > 128)
salopette = plein(jean, 5) & (al > 10)
cadres = {'paille': poser(chapeau, 'paille', 720), 'salopette': poser(salopette, 'salopette', 640)}
maillet = recadre(cle('maillet'))
webp(maillet, f'{pub}/pantin/accessoires/maillet.webp', 360)
cadres['maillet'] = {'w': maillet.width, 'h': maillet.height}
infos['accessoires'] = cadres
print(json.dumps(infos, indent=1))
