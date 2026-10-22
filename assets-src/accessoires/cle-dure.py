# Détourage net pour les objets violets/roses (key-mascot les ronge : despill sur une teinte proche
# du magenta). Masque dur sur le canal vert (le magenta n'en a presque pas), petites taches
# écartées, bord adouci de 0,9 px puis couleur du bord démélangée du magenta.
# Usage : python3 cle-dure.py <brut.png> <sortie.png>
import sys, cv2, numpy as np
from PIL import Image
src, out = sys.argv[1:3]
bgr = cv2.imread(src).astype(np.float32); b, g, r = bgr[..., 0], bgr[..., 1], bgr[..., 2]
dur = ((g > 28) | (r < 190) | (b < 190)).astype(np.uint8)
dur = cv2.morphologyEx(dur, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
n, lab, st, _ = cv2.connectedComponentsWithStats(dur)
dur = np.isin(lab, [i for i in range(1, n) if st[i, 4] > 2000]).astype(np.float32)
a = cv2.GaussianBlur(dur, (0, 0), 0.9)
M = np.array([251, 3, 252], np.float32)
F = (bgr - (1 - a[..., None]) * M) / np.maximum(a[..., None], 1e-3)
F = np.where(a[..., None] > 0.98, bgr, np.clip(F, 0, 255))
rgba = np.dstack([F[..., 2], F[..., 1], F[..., 0], a * 255]).astype(np.uint8)
Image.fromarray(rgba).resize((1024, 1024), Image.LANCZOS).save(out)
