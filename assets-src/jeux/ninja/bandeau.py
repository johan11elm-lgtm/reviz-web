# Le ninja des fautes : le bandeau noir découpé sur Réviz généré coiffé (ninja/reviz-ninja-cle.png), et
# sa place sur le pantin (px des calques). Calage par les yeux sur Réviz lance, dont le bandeau de sport
# est déjà calé : même méthode, mêmes repères (lance/reviz-bandeau-cle.png, ACCESSOIRES.bandeau).
# Usage : python3 bandeau.py <games-mondes> <public/pantin/accessoires>
import sys, cv2, numpy as np
from PIL import Image
src, out = sys.argv[1:3]
arr = lambda p: np.array(Image.open(p).convert('RGBA'))
L, B, N = arr(f'{src}/lance/reviz-bandeau-cle.png'), arr(f'{src}/lance/bandeau-cle.png'), arr(f'{src}/ninja/reviz-ninja-cle.png')

def yeux(A):
    r, g, b, a = (A[..., k].astype(int) for k in range(4))
    m = ((r > 50) & (r < 150) & (g > 20) & (g < 90) & (b < 60) & (r - b > 30) & (a > 200)).astype(np.uint8)
    n, lab, st, c = cv2.connectedComponentsWithStats(m)
    return np.array(sorted(tuple(c[i]) for i in np.argsort(-st[1:, 4])[:2] + 1))

# Le bandeau de Réviz lance : sa place dans l'image coiffée, et sur le pantin (ACCESSOIRES.bandeau).
res = cv2.matchTemplate(cv2.cvtColor(L[..., :3], cv2.COLOR_RGB2GRAY), cv2.cvtColor(B[..., :3], cv2.COLOR_RGB2GRAY),
                        cv2.TM_SQDIFF_NORMED, mask=(B[..., 3] > 200).astype(np.uint8) * 255)
bx, by = cv2.minMaxLoc(res)[2]
RIG = dict(x=451, y=480, w=1621)
k = RIG['w'] / B.shape[1]
yL, yN = yeux(L), yeux(N)
s = np.linalg.norm(yL[1] - yL[0]) / np.linalg.norm(yN[1] - yN[0])
versRig = lambda p: (RIG['x'] + ((yL.mean(0) + (np.array(p) - yN.mean(0)) * s)[0] - bx) * k,
                     RIG['y'] + ((yL.mean(0) + (np.array(p) - yN.mean(0)) * s)[1] - by) * k)

# Le tissu noir : sombre et peu saturé, la plus grande tache (les pupilles, marron, n'y sont pas).
r, g, b, a = (N[..., i].astype(int) for i in range(4))
noir = ((np.maximum(np.maximum(r, g), b) < 95) & (np.abs(r - b) < 30) & (a > 60)).astype(np.uint8)
n, lab, st, _ = cv2.connectedComponentsWithStats(noir)
m = (lab == 1 + np.argmax(st[1:, 4])).astype(np.uint8)
m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8))
m = cv2.dilate(m, np.ones((3, 3), np.uint8))
doux = cv2.GaussianBlur(m.astype(np.float32), (0, 0), 1.0)
img = N.copy(); img[..., 3] = (a * doux).clip(0, 255).astype(np.uint8)
ys, xs = np.nonzero(img[..., 3] > 8)
x0, y0, x1, y1 = xs.min() - 2, ys.min() - 2, xs.max() + 3, ys.max() + 3
crop = Image.fromarray(img[y0:y1, x0:x1])
(rx0, ry0), (rx1, ry1) = versRig((x0, y0)), versRig((x1, y1))
w, h = round(rx1 - rx0), round(ry1 - ry0)
crop.resize((round((x1 - x0) * 1.2), round((y1 - y0) * 1.2)), Image.LANCZOS).save(f'{out}/ninja.webp', quality=88, method=6)
print(f"  ninja: {{ x: {round(rx0)}, y: {round(ry0)}, w: {w}, h: {h} }},")
