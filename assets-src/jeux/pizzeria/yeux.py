# Repère des accessoires de tête : les centres des deux pupilles (taches marron sombre) d'un Réviz
# généré sur fond détouré. Usage : python3 yeux.py <image-cle.png>
import sys, cv2, numpy as np

def yeux(chemin):
    a = cv2.imread(chemin, cv2.IMREAD_UNCHANGED)
    b, g, r, al = (a[..., k].astype(int) for k in range(4))
    # Marron très sombre et opaque : les pupilles (les sourcils sont plus fins, écartés par la surface).
    m = ((r < 95) & (g < 65) & (b < 55) & (r > g) & (al > 200)).astype(np.uint8)
    m = cv2.morphologyEx(m, cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))
    n, lab, st, cen = cv2.connectedComponentsWithStats(m)
    plus = sorted(range(1, n), key=lambda i: -st[i, 4])[:2]
    return sorted((tuple(cen[i]) for i in plus), key=lambda p: p[0])

if __name__ == '__main__':
    print(yeux(sys.argv[1]))
