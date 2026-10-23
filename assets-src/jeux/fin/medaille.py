# La médaille de Réviz (fin de partie), calée sur son corps. Brut : refonte-2026-11/games-mondes/fin/calques/
# medaille-u1.png (ruban en U sur fond magenta). Le ruban et la médaille sont séparés (bleu / or)
# pour régler leurs tailles. Le ruban est coupé sur le contour du corps (corps.webp, même repère de 2508 px que
# les accessoires du pantin), assombri près du bord : ses brins passent derrière Réviz. Une ombre douce tombe sur
# le corps. Sortie : public/pantin/accessoires/medaille.webp et son cadre (à reporter dans Pantin.jsx).
# Usage : python3 medaille.py <bruts> <public>
import sys, cv2, numpy as np
from PIL import Image
src, pub = sys.argv[1:3]

# Réglages, en px du pantin (2508) : étendue du ruban, haut de ses brins, creux du U (échelle verticale),
# épaisseur du ruban, diamètre de la médaille, part de la médaille sous le ruban.
RX0, RX1, RY0, CREUX, EPAIS, MEDAILLE, ACCROCHE, CENTRE = 230, 2290, 1250, 1.0, 120, 390, 0.28, 1257

# Détourage par couleur sur le brut (fond magenta) : le bleu du ruban, l'or de la médaille.
im = np.array(Image.open(f'{src}/medaille-u1.png').convert('RGB')).astype(np.float32)
r, g, b = (im[..., k] for k in range(3))
fond = (r > 200) & (b > 200) & (g < 90)
a = np.where(fond, 0, 255).astype(np.float32)
im = np.dstack([im, a])
# Les grandes taches seulement (la médaille coupe le ruban en deux : on garde les deux brins).
def grandes(m):
    n, lab, st, _ = cv2.connectedComponentsWithStats(m.astype(np.uint8))
    return np.isin(lab, [i for i in range(1, n) if st[i, 4] > 0.2 * st[1:, 4].max()]).astype(np.uint8)
bleu = grandes((b > r + 30) & (b > g + 20) & ~fond)
bleu = cv2.morphologyEx(bleu, cv2.MORPH_CLOSE, np.ones((7, 7), np.uint8))
med = grandes((r > 140) & (g > 90) & (b < 140) & ~fond)
med = cv2.morphologyEx(med, cv2.MORPH_CLOSE, np.ones((9, 9), np.uint8))
def piece(masque, doux=1.0):
    p = im.copy()
    p[..., 3] = a * cv2.GaussianBlur(masque.astype(np.float32), (0, 0), doux)
    ys, xs = np.nonzero(masque)
    return p[ys.min():ys.max() + 1, xs.min():xs.max() + 1]

# Le contour de la médaille, pris au seuil de couleur, est grignoté là où l'or se fond dans le bleu : il est
# lissé (et un peu arrondi), puis les pixels gagnés sont repeints avec l'or voisin.
or_ = med.copy()
med = ((cv2.GaussianBlur(cv2.morphologyEx(med, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (17, 17))).astype(np.float32), (0, 0), 3) > 0.5) | (med > 0)).astype(np.uint8)
gagne = ((med > 0) & (cv2.erode(or_, np.ones((3, 3), np.uint8)) == 0)).astype(np.uint8)
im[..., :3] = np.where(gagne[..., None] > 0, cv2.inpaint(np.clip(im[..., :3], 0, 255).astype(np.uint8), gagne, 7, cv2.INPAINT_TELEA), im[..., :3])
medaille = piece(med)  # avant le repeint : ses pixels restent ceux du brut

# Derrière la médaille, le ruban manque : dans les colonnes du trou, ses bords haut et bas sont interpolés
# entre les dernières colonnes bleues à gauche et à droite, et chaque ligne est fondue de l'une à l'autre.
cols = np.nonzero(bleu.any(0))[0]
pleines = [x for x in range(cols.min(), cols.max() + 1) if bleu[:, x].sum() > 0.6 * bleu.sum(0).max() * 0.5]
pleines = np.array(pleines)
for x in range(cols.min(), cols.max() + 1):
    if x in set(pleines.tolist()): continue
    g_, d_ = pleines[pleines < x], pleines[pleines > x]
    if not len(g_) or not len(d_): continue
    xg, xd = g_.max(), d_.min()
    t = (x - xg) / (xd - xg)
    hg, bg_ = np.nonzero(bleu[:, xg])[0][[0, -1]]
    hd, bd = np.nonzero(bleu[:, xd])[0][[0, -1]]
    h0, h1 = round(hg + (hd - hg) * t), round(bg_ + (bd - bg_) * t)
    for y in range(h0, h1 + 1):
        u = (y - h0) / max(1, h1 - h0)
        yg, yd = round(hg + (bg_ - hg) * u), round(hd + (bd - hd) * u)
        im[y, x, :3] = im[yg, xg, :3] * (1 - t) + im[yd, xd, :3] * t
        im[y, x, 3] = 255
    bleu[h0:h1 + 1, x] = 1
bleu[:, :] = cv2.morphologyEx(bleu, cv2.MORPH_CLOSE, np.ones((3, 3), np.uint8))
a = np.maximum(a, bleu * 255)

ruban = piece(bleu)

# Le canevas : le repère du pantin entier, rogné à la fin.
H = W = 2508
toile = np.zeros((H, W, 4), np.float32)
def coller(p, x, y, w, h):
    # Réduction en alpha prémultiplié : la couleur des pixels transparents (bleu, magenta) ne bave pas dans les bords.
    pm = p.copy(); pm[..., :3] *= p[..., 3:4] / 255
    p = cv2.resize(pm, (w, h), interpolation=cv2.INTER_AREA)
    p[..., :3] /= np.maximum(p[..., 3:4] / 255, 1e-3)
    zone = toile[y:y + h, x:x + w]
    al = p[..., 3:4] / 255
    zone[..., :3] = p[..., :3] * al + zone[..., :3] * (1 - al)
    zone[..., 3:4] = 255 * (al + zone[..., 3:4] / 255 * (1 - al))

rw = RX1 - RX0
rh = round(ruban.shape[0] * rw / ruban.shape[1] * CREUX)
couche_ruban = np.zeros_like(toile)
toile, couche_ruban = couche_ruban, toile
coller(ruban, RX0, RY0, rw, rh)
toile, couche_ruban = couche_ruban, toile
# Ruban affiné à épaisseur constante : dans chaque colonne, la bande [haut, bas] est ramenée à [haut, haut + EPAIS].
al = couche_ruban[..., 3]
for x in range(RX0, RX1):
    lignes = np.nonzero(al[:, x] > 128)[0]
    if len(lignes) < 4: continue
    h0, h1 = lignes.min(), lignes.max() + 1
    col = couche_ruban[h0 - 2:h1 + 2, x].copy()
    neuf = cv2.resize(col.reshape(-1, 1, 4), (1, EPAIS + 4), interpolation=cv2.INTER_AREA).reshape(-1, 4)
    couche_ruban[:, x] = 0  # toute la colonne : les bords doux de l'ancienne bande ne doivent pas rester
    couche_ruban[h0 - 2:h0 + EPAIS + 2, x] = neuf

# Les colonnes rééchantillonnées une à une font des rayures et un bord en pointillés : lissage horizontal
# (couleur prémultipliée) et bord adouci.
pm = couche_ruban.copy(); pm[..., :3] *= pm[..., 3:4] / 255
pm = cv2.GaussianBlur(pm, (0, 0), sigmaX=3, sigmaY=0.8)
pm[..., :3] /= np.maximum(pm[..., 3:4] / 255, 1e-3)
couche_ruban = pm

# Le corps : alpha de corps.webp (1254 px, affiché en 2508), rentré de 16 px et adouci.
corps = np.array(Image.open(f'{pub}/pantin/corps.webp').convert('RGBA'))[..., 3]
corps = cv2.resize(corps, (W, H), interpolation=cv2.INTER_LINEAR).astype(np.float32) / 255
dedans = cv2.erode((corps > 0.5).astype(np.uint8), np.ones((33, 33), np.uint8))
coupe = cv2.GaussianBlur(dedans.astype(np.float32), (0, 0), 7)
# Près du bord, le ruban tourne : il s'assombrit sur 110 px.
dist = cv2.distanceTransform(dedans, cv2.DIST_L2, 5)
tourne = 0.42 + 0.58 * np.clip(dist / 170, 0, 1) ** 0.7
couche_ruban[..., :3] *= tourne[..., None]
couche_ruban[..., 3] *= coupe

# La médaille, centrée sous le creux du U (son anneau mord le ruban).
cols = couche_ruban[..., 3][:, CENTRE + 90:CENTRE + 130].mean(1)  # à côté de l'anneau (trou repeint)
bas_ruban = int(np.nonzero(cols > 128)[0].max())
mh = round(medaille.shape[0] * MEDAILLE / medaille.shape[1])
couche_med = np.zeros_like(toile)
toile, couche_med = couche_med, toile
coller(medaille, CENTRE - MEDAILLE // 2, bas_ruban - round(mh * ACCROCHE), MEDAILLE, mh)
toile, couche_med = couche_med, toile

# L'ombre portée sur le corps (ruban et médaille), sous les deux, coupée au corps.
silh = np.maximum(couche_ruban[..., 3], couche_med[..., 3]) / 255
ombre = cv2.GaussianBlur(np.roll(silh, 22, axis=0), (0, 0), 14) * corps * 0.32
out = np.zeros_like(toile)
out[..., :3] = np.array([90, 45, 25], np.float32)
out[..., 3] = ombre * 255
for c in (couche_ruban, couche_med):
    al = c[..., 3:4] / 255
    out[..., :3] = c[..., :3] * al + out[..., :3] * (1 - al)
    out[..., 3:4] = 255 * (al + out[..., 3:4] / 255 * (1 - al))

ys, xs = np.nonzero(out[..., 3] > 2)
x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
Image.fromarray(np.clip(out[y0:y1, x0:x1], 0, 255).astype(np.uint8)).resize(((x1 - x0) // 2, (y1 - y0) // 2), Image.LANCZOS) \
    .save(f'{pub}/pantin/accessoires/medaille.webp', quality=88, method=6)
print(f"medaille: {{ x: {x0}, y: {y0}, w: {x1 - x0}, h: {y1 - y0}, enfile: true }}")
