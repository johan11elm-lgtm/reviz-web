// -------------------------------------------------------
// Réviz — Écran de lancement iOS + icône App Store
//
// Source : assets-src/icon-source.png (master 1024, coins arrondis cuits
// sur fond BLANC) et public/icon-512-maskable.png (même icône, plein cadre).
//
// 1) AppIcon 1024 : Apple exige un carré plein, sans transparence ni coins
//    arrondis (iOS applique son propre masque). Les coins blancs du master
//    sont remplacés par le dégradé de la version plein cadre.
// 2) Splash 2732 : fond crème (--bg-app) + icône arrondie centrée, avec des
//    coins réellement transparents (le splash précédent laissait un carré
//    blanc autour de l'icône).
//
// Usage : node scripts/make-splash.mjs
// -------------------------------------------------------
import sharp from 'sharp'
import { writeFile } from 'node:fs/promises'

const SRC      = 'assets-src/icon-source.png'
const MASKABLE = 'public/icon-512-maskable.png'
const APPICON  = 'ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png'
const SPLASH_DIR = 'ios/App/App/Assets.xcassets/Splash.imageset'
const SPLASH_FILES = ['splash-2732x2732.png', 'splash-2732x2732-1.png', 'splash-2732x2732-2.png']

const CREAM = { r: 248, g: 239, b: 231 }  // #F8EFE7, identique à ios.backgroundColor
const SPLASH = 2732
const ICON = 512       // taille de l'icône sur le splash (~19 % de la largeur)
const INSET = 8        // bande claire sur tout le pourtour du master : on la retire (px à 1024)
const MARGIN = 12      // et on coupe un peu à l'intérieur de l'arrondi cuit (liseré anti-aliasé blanc)

// Rayon des coins cuits du master : premier pixel non blanc de la 3e ligne.
async function bakedRadius() {
  const { data, info } = await sharp(SRC).raw().toBuffer({ resolveWithObject: true })
  const y = 2
  for (let x = 0; x < info.width; x++) {
    const i = (y * info.width + x) * info.channels
    if (data[i] < 240 || data[i + 1] < 240 || data[i + 2] < 240) return x
  }
  return Math.round(info.width * 0.2237)
}

const roundedMask = (size, radius) => Buffer.from(
  `<svg width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="${radius}" ry="${radius}" fill="#fff"/></svg>`
)

const radius = await bakedRadius()
console.log(`rayon des coins cuits : ${radius}px`)

// Icône arrondie à coins transparents (à la taille demandée), sans la bande
// claire du pourtour : on recadre de INSET px avant d'arrondir.
async function roundedIcon(size) {
  const inner = 1024 - 2 * INSET
  const r = Math.round((radius - INSET + MARGIN) * size / inner)
  return sharp(SRC).extract({ left: INSET, top: INSET, width: inner, height: inner })
    .resize(size, size, { kernel: 'lanczos3' }).ensureAlpha()
    .composite([{ input: roundedMask(size, r), blend: 'dest-in' }])
    .png().toBuffer()
}

// 1) AppIcon : plein cadre 1024, RGB.
const corners = await sharp(MASKABLE).resize(1024, 1024, { kernel: 'lanczos3' }).toBuffer()
await sharp(corners).composite([{ input: await roundedIcon(1024 - 2 * INSET), gravity: 'centre' }])
  .removeAlpha().png({ compressionLevel: 9 }).toFile(APPICON)
console.log(`écrit ${APPICON}`)

// 2) Splash : crème + icône centrée.
const splash = await sharp({ create: { width: SPLASH, height: SPLASH, channels: 3, background: CREAM } })
  .composite([{ input: await roundedIcon(ICON), gravity: 'centre' }])
  .png({ compressionLevel: 9 }).toBuffer()
for (const f of SPLASH_FILES) await writeFile(`${SPLASH_DIR}/${f}`, splash)
console.log(`écrit ${SPLASH_FILES.length} splash (${Math.round(splash.length / 1024)} Ko chacun)`)
