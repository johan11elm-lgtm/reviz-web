#!/usr/bin/env node
// -------------------------------------------------------
// Réviz — Planche de contrôle des illustrations : une page statique qui
// affiche toutes les illustrations accrochées aux chapitres (type, titre,
// chapitre, ancre, image, légende, crédit), pour tout relire d'un coup d'œil.
//
//   node scripts/illustrations/planche.mjs      → docs/illustrations-planche.html
//
// La page s'ouvre depuis le dépôt (les images sont lues dans ../public/).
// -------------------------------------------------------
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const PROGRAMME = path.join(ROOT, 'public/programme')
const ORDRE_CLASSES = ['6eme', '5eme', '4eme', '3eme']
const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const lignes = []
for (const classe of ORDRE_CLASSES) {
  const dc = path.join(PROGRAMME, classe)
  if (!statSync(dc, { throwIfNoEntry: false })?.isDirectory()) continue
  for (const matiere of readdirSync(dc).sort()) {
    const dm = path.join(dc, matiere)
    if (!statSync(dm).isDirectory()) continue
    for (const f of readdirSync(dm).sort()) {
      if (!f.endsWith('.json') || f === 'index.json') continue
      const lecon = JSON.parse(readFileSync(path.join(dm, f), 'utf8'))
      for (const ill of lecon.illustrations ?? []) {
        lignes.push({ classe, matiere, chapitre: lecon.metadata?.title ?? f.slice(0, -5), fichier: `${classe}/${matiere}/${f}`, ill })
      }
    }
  }
}

const groupes = new Map()
for (const l of lignes) {
  const k = `${l.classe} · ${l.matiere}`
  if (!groupes.has(k)) groupes.set(k, [])
  groupes.get(k).push(l)
}

const cartes = [...groupes].map(([k, ls]) => `
<h2>${esc(k)} <span>${ls.length}</span></h2>
<div class="grille">
${ls.map(({ chapitre, fichier, ill }) => `<figure>
  <p class="type">${esc(ill.type)}</p>
  <h3>${esc(ill.titre ?? ill.id)}</h3>
  <a href="../public${esc(ill.src)}" target="_blank"><img src="../public${esc(ill.src)}" alt="${esc(ill.alt)}" loading="lazy"></a>
  <figcaption>${esc(ill.legende ?? '')}${ill.credit ? `<small>${esc(ill.credit)}</small>` : ''}</figcaption>
  <p class="ref">${esc(chapitre)}<br><code>${esc(fichier)}</code> · <code>${esc(ill.ancre)}</code></p>
</figure>`).join('\n')}
</div>`).join('\n')

const html = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Planche des illustrations</title>
<style>
:root{--encre:#2D2B57;--gris:#8A8273;--fond:#F6F4EF;--carte:#fff;--accent:#B34400}
body{margin:0;padding:24px 16px;background:var(--fond);color:var(--encre);font:14px/1.45 system-ui,-apple-system,'Segoe UI',Roboto,sans-serif}
h1{margin:0 0 4px;font-size:22px}
.intro{margin:0 0 24px;color:var(--gris)}
h2{margin:32px 0 12px;font-size:17px;border-bottom:1px solid #DDD8CC;padding-bottom:4px}
h2 span{color:var(--gris);font-weight:500;font-size:14px}
.grille{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:16px}
figure{margin:0;background:var(--carte);border:1px solid #E4E0D6;border-radius:10px;padding:12px;display:flex;flex-direction:column;gap:6px}
.type{margin:0;font-size:11px;font-weight:600;color:var(--gris);text-transform:uppercase;letter-spacing:.06em}
h3{margin:0;font-size:15px}
img{width:100%;height:auto;display:block;background:#fff}
figcaption{font-size:13px}
figcaption small{display:block;margin-top:4px;color:var(--gris)}
.ref{margin:auto 0 0;font-size:12px;color:var(--gris)}
code{font-size:11px;word-break:break-all}
</style>
</head>
<body>
<h1>Planche des illustrations</h1>
<p class="intro">${lignes.length} illustrations accrochées aux chapitres du programme, par classe et matière. Générée par <code>node scripts/illustrations/planche.mjs</code> ; à ouvrir depuis le dépôt (images lues dans <code>public/</code>).</p>
${cartes}
</body>
</html>
`
writeFileSync(path.join(ROOT, 'docs/illustrations-planche.html'), html)
console.log(`docs/illustrations-planche.html : ${lignes.length} illustrations`)
