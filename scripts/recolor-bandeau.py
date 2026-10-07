# Recolore le bandeau bleu encre d'un brut mascotte (fond magenta) vers une autre teinte,
# en gardant ombres et texture. Usage : recolor.py <entrée> <sortie> <hex cible>
import sys, numpy as np
from PIL import Image
src, out, hexc = sys.argv[1], sys.argv[2], sys.argv[3].lstrip('#')
im = np.asarray(Image.open(src).convert('RGB')).astype(np.float32) / 255
r, g, b = im[..., 0], im[..., 1], im[..., 2]
mx, mn = im.max(-1), im.min(-1); d = mx - mn + 1e-6
h = np.where(mx == r, ((g - b) / d) % 6, np.where(mx == g, (b - r) / d + 2, (r - g) / d + 4)) * 60
s = np.where(mx > 0, d / (mx + 1e-6), 0); v = mx
def ramp(x, a, b_): return np.clip((x - a) / (b_ - a), 0, 1)
# masque doux : teinte autour de 250°, saturée, sombre (exclut fond magenta clair, goutte cyan claire)
w = (1 - ramp(np.abs(h - 250), 22, 38)) * ramp(s, 0.12, 0.25) * (1 - ramp(v, 0.70, 0.85))
tr, tg, tb = [int(hexc[i:i+2], 16) / 255 for i in (0, 2, 4)]
tmx = max(tr, tg, tb)
ref_v = np.median(v[w > 0.9]) if (w > 0.9).any() else 0.4
scale = np.clip(v / ref_v, 0, 1.6)[..., None]          # ombres/texture du tissu conservées
new = np.clip(np.stack([tr, tg, tb]) * scale, 0, 1)
res = im * (1 - w[..., None]) + new * w[..., None]
Image.fromarray((res * 255).round().astype(np.uint8)).save(out)
print(out.split('/')[-1], 'pixels bandeau:', int((w > 0.5).sum()), 'v_ref', round(float(ref_v), 2))
