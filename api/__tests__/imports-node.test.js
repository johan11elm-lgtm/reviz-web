import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

// Sur Vercel, les fonctions de api/ tournent dans Node sans Vite : un import
// relatif sans extension (« from './agenda' ») passe les tests et le build, puis
// fait planter la fonction entière en production (ERR_MODULE_NOT_FOUND, vu le
// 28/10 sur /api/track et /api/send-parental-consent). On suit donc tous les
// fichiers atteints depuis api/, src/ compris.
const RACINE = path.resolve(__dirname, '../..')
const IMPORT = /(?:import|export)\s[^;]*?from\s+['"](\.{1,2}\/[^'"]+)['"]|import\(\s*['"](\.{1,2}\/[^'"]+)['"]\s*\)/g

function importsSansExtension() {
  const vus = new Set()
  const fautes = []
  const suivre = fichier => {
    if (vus.has(fichier) || !fs.existsSync(fichier)) return
    vus.add(fichier)
    for (const m of fs.readFileSync(fichier, 'utf8').matchAll(IMPORT)) {
      const cible = m[1] ?? m[2]
      if (!/\.(m?js|json)$/.test(cible)) fautes.push(`${path.relative(RACINE, fichier)} → ${cible}`)
      suivre(path.resolve(path.dirname(fichier), cible))
    }
  }
  for (const f of fs.readdirSync(path.join(RACINE, 'api'))) {
    if (f.endsWith('.js')) suivre(path.join(RACINE, 'api', f))
  }
  return fautes
}

describe('fonctions serveur (api/)', () => {
  it('n’importent aucun fichier relatif sans extension, même par src/', () => {
    expect(importsSansExtension()).toEqual([])
  })
})
