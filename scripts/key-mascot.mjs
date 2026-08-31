// -------------------------------------------------------
// Réviz — Détourage d'UNE mascotte générée (fond magenta)
//
// Entrée  : PNG brut généré (fond magenta uni, ~#F404F0, toute taille)
// Sortie  : master 1024×1024 à alpha doux, prêt pour assets-src/mascot/
//
// L'algorithme vit dans scripts/lib/key.mjs (partagé avec import-mascots.mjs).
// Pour traiter toute une fournée de bruts d'un coup :
//   node scripts/import-mascots.mjs
//
// Usage : node scripts/key-mascot.mjs <brut.png> <sortie.png> [rrr,ggg,bbb]
//         (couleur de fond optionnelle, défaut 244,4,240)
// -------------------------------------------------------
import { writeFile } from 'node:fs/promises'
import { keyMascot, DEFAULT_BG } from './lib/key.mjs'

const [src, out, bgArg] = process.argv.slice(2)
if (!src || !out) {
  console.error('Usage : node scripts/key-mascot.mjs <brut.png> <sortie.png> [r,g,b]')
  process.exit(1)
}
const bg = bgArg ? bgArg.split(',').map(Number) : DEFAULT_BG

await writeFile(out, await keyMascot(src, bg))
console.log(`✔ ${out} (1024×1024, alpha doux)`)
