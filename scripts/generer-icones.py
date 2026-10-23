#!/usr/bin/env python3
"""
Réviz — Icône de l'app, déclinée dans toutes les tailles.

Cerveau en 3D sur fond orange (assets-src/icone/source-cerveau.png, image
pleine page carrée), choisi par Johan le 23 octobre 2026. Une seule image,
quatre usages :
  - pleine page opaque, sans coins : iPhone (apple-touch-icon) et app iOS
    native (AppIcon 1024, sans transparence comme l'exige Apple) — c'est
    l'appareil qui arrondit ;
  - coins arrondis transparents : icônes « any » du manifest (Chrome, Edge
    sur ordinateur) et favicons ;
  - écran de lancement iOS : l'icône arrondie au centre d'un fond crème ;
  - « maskable » : la même pleine page, le visage tient déjà dans la zone
    sûre (cercle de 80 %) des masques ronds ou en goutte d'Android.

Usage : python3 scripts/generer-icones.py  (depuis reviz-web/)
Écrit aussi les icônes de reviz-landing si le dossier voisin existe.
"""
import os
from PIL import Image, ImageDraw

ICI = os.path.dirname(os.path.abspath(__file__))
WEB = os.path.dirname(ICI)
LANDING = os.path.join(os.path.dirname(WEB), 'reviz-landing')
S = 1024


def dessin():
    """L'image source, carrée et opaque, à 1024 px."""
    im = Image.open(os.path.join(WEB, 'assets-src/icone/source-cerveau.png')).convert('RGB')
    c = min(im.size)
    x, y = (im.width - c) // 2, (im.height - c) // 2
    return im.crop((x, y, x + c, y + c)).resize((S, S), Image.LANCZOS)


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


def splash(rond):
    """Écran de lancement iOS : icône arrondie de 512 px au centre, fond crème."""
    fond = Image.new('RGBA', (2732, 2732), (0xF8, 0xEF, 0xE7, 255))  # = ios.backgroundColor
    icone = rond.resize((512, 512), Image.LANCZOS)
    fond.alpha_composite(icone, ((2732 - 512) // 2, (2732 - 512) // 2))
    return fond.convert('RGB')


def main():
    plein = dessin()
    rond = arrondi(plein)
    maskable = plein

    pub = os.path.join(WEB, 'public')
    print('reviz-web')
    ecrire(plein, os.path.join(WEB, 'assets-src/icone/icone-1024.png'), 1024)
    ecrire(plein, os.path.join(WEB, 'ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png'), 1024)
    lancement = splash(rond)
    for nom in ('splash-2732x2732.png', 'splash-2732x2732-1.png', 'splash-2732x2732-2.png'):
        ecrire(lancement, os.path.join(WEB, 'ios/App/App/Assets.xcassets/Splash.imageset', nom), 2732)
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
