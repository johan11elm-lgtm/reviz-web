#!/usr/bin/env python3
"""
Réviz — Icône de l'app, déclinée dans toutes les tailles.

Mascotte actuelle (pose « hello », assets-src/mascot/pose-9-hello.png) sur
un fond orange en dégradé avec un halo crème, choisi par Johan le 8 octobre
2026. Un seul dessin, quatre usages :
  - pleine page opaque, sans coins : iPhone (apple-touch-icon) et app iOS
    native (AppIcon 1024, sans transparence comme l'exige Apple) — c'est
    l'appareil qui arrondit ;
  - coins arrondis transparents : icônes « any » du manifest (Chrome, Edge
    sur ordinateur) et favicons ;
  - « maskable » : pleine page, mascotte réduite dans la zone sûre (cercle
    de 80 %) pour les masques ronds ou en goutte d'Android.

Usage : python3 scripts/generer-icones.py  (depuis reviz-web/)
Écrit aussi les icônes de reviz-landing si le dossier voisin existe.
"""
import math
import os
from PIL import Image, ImageDraw, ImageFilter

ICI = os.path.dirname(os.path.abspath(__file__))
WEB = os.path.dirname(ICI)
LANDING = os.path.join(os.path.dirname(WEB), 'reviz-landing')
S = 1024

ORANGE_CLAIR = (0xFF, 0x8A, 0x4C)
ORANGE = (0xF4, 0x5A, 0x1C)
HALO = (255, 236, 214, 110)


def fond():
    """Dégradé radial, plus clair au-dessus du centre."""
    petit = 256
    im = Image.new('RGB', (petit, petit))
    px = im.load()
    for y in range(petit):
        for x in range(petit):
            t = min(1.0, math.hypot(x / petit - 0.5, y / petit - 0.45) / 0.75)
            px[x, y] = tuple(round(ORANGE_CLAIR[i] * (1 - t) + ORANGE[i] * t) for i in range(3))
    return im.resize((S, S), Image.BICUBIC).convert('RGBA')


def dessin(echelle):
    """Fond + halo + ombre douce + mascotte, mascotte à `echelle` de la largeur."""
    im = fond()
    m = Image.open(os.path.join(WEB, 'assets-src/mascot/pose-9-hello.png')).convert('RGBA')
    m = m.crop(m.getbbox())
    w = int(S * echelle)
    h = int(m.height * w / m.width)
    m = m.resize((w, h), Image.LANCZOS)
    dy = int(S * 0.03 * echelle / 0.80)
    x, y = (S - w) // 2, (S - h) // 2 + dy

    halo = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    r = int(S * 0.36 * echelle / 0.80)
    cx, cy = S // 2, S // 2 + dy
    ImageDraw.Draw(halo).ellipse((cx - r, cy - r, cx + r, cy + r), fill=HALO)
    im.alpha_composite(halo.filter(ImageFilter.GaussianBlur(S * 0.08)))

    ombre = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    ombre.paste((0, 0, 0, 70), (x, y + int(S * 0.02)), m.split()[3])
    im.alpha_composite(ombre.filter(ImageFilter.GaussianBlur(S * 0.02)))

    im.alpha_composite(m, (x, y))
    return im.convert('RGB')


def arrondi(im):
    """Coins arrondis transparents (rayon des icônes iOS, 22,37 %)."""
    grand = S * 4
    masque = Image.new('L', (grand, grand), 0)
    ImageDraw.Draw(masque).rounded_rectangle((0, 0, grand - 1, grand - 1), radius=int(grand * 0.2237), fill=255)
    out = im.convert('RGBA')
    out.putalpha(masque.resize((S, S), Image.LANCZOS))
    return out


def ecrire(im, chemin, taille):
    os.makedirs(os.path.dirname(chemin), exist_ok=True)
    im.resize((taille, taille), Image.LANCZOS).save(chemin, optimize=True)
    print(f'  {os.path.relpath(chemin, os.path.dirname(WEB))} ({taille} px)')


def main():
    plein = dessin(0.80)
    rond = arrondi(plein)
    maskable = dessin(0.62)

    pub = os.path.join(WEB, 'public')
    print('reviz-web')
    ecrire(plein, os.path.join(WEB, 'assets-src/icone/icone-1024.png'), 1024)
    ecrire(plein, os.path.join(WEB, 'ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png'), 1024)
    ecrire(plein, os.path.join(pub, 'apple-touch-icon.png'), 180)
    ecrire(rond, os.path.join(pub, 'icon-512.png'), 512)
    ecrire(rond, os.path.join(pub, 'icon-192.png'), 192)
    ecrire(maskable, os.path.join(pub, 'icon-512-maskable.png'), 512)
    ecrire(rond, os.path.join(pub, 'favicon-64.png'), 64)
    ecrire(rond, os.path.join(pub, 'favicon-32.png'), 32)

    if os.path.isdir(LANDING):
        print('reviz-landing')
        lpub = os.path.join(LANDING, 'public')
        ecrire(plein, os.path.join(lpub, 'apple-touch-icon.png'), 180)
        ecrire(rond, os.path.join(lpub, 'favicon-64.png'), 64)
        ecrire(rond, os.path.join(lpub, 'favicon-32.png'), 32)
        ico = os.path.join(LANDING, 'src/app/favicon.ico')
        rond.save(ico, sizes=[(16, 16), (32, 32), (48, 48)])
        print(f'  {os.path.relpath(ico, os.path.dirname(WEB))} (16, 32, 48 px)')


if __name__ == '__main__':
    main()
