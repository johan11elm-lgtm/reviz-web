// -------------------------------------------------------
// Suivi Codex — voir sur le Mac les sessions Codex lancées par Claude
//
// Lit ~/.codex/sessions (y compris les `codex exec` de gen-image.mjs) et sert
// une page locale qui se rafraîchit toute seule : demande, étapes, réponse,
// images générées.
//
// Usage : node scripts/suivi-codex.mjs [port]   → http://localhost:4730
// -------------------------------------------------------
import http from 'node:http'
import { readdir, readFile, stat } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const PORT = Number(process.argv[2]) || 4730
const CODEX = process.env.CODEX_HOME || path.join(os.homedir(), '.codex')
const SESSIONS = path.join(CODEX, 'sessions')
const IMAGES = path.join(CODEX, 'generated_images')
const JOURS = 3
const ACTIVE_MS = 5 * 60_000

async function fichiersRecents() {
  const out = []
  for (let j = 0; j < JOURS; j++) {
    const d = new Date(Date.now() - j * 86_400_000)
    const dir = path.join(SESSIONS, String(d.getFullYear()),
      String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0'))
    if (!existsSync(dir)) continue
    for (const f of await readdir(dir)) if (f.endsWith('.jsonl')) out.push(path.join(dir, f))
  }
  return out
}

// Retire les blocs techniques que Codex ajoute au message de l'utilisateur.
const nettoyer = (t) => t.replace(/<(environment_context|image)[\s\S]*?(<\/\1>|>)/g, '').trim()
const court = (p) => (p || '').replace(/^file:\/\//, '').replace(os.homedir(), '~')

async function lireSession(fichier) {
  const brut = await readFile(fichier, 'utf8')
  const s = { id: '', debut: '', cwd: '', origine: '', demande: '', jointes: [],
    etapes: [], reponse: '', images: [], fini: false, maj: (await stat(fichier)).mtimeMs }
  for (const ligne of brut.split('\n')) {
    if (!ligne) continue
    let d
    try { d = JSON.parse(ligne) } catch { continue }
    const p = d.payload || {}
    const h = d.timestamp ? new Date(d.timestamp).toLocaleTimeString('fr-FR') : ''
    if (d.type === 'session_meta') {
      s.id = p.id; s.debut = p.timestamp; s.cwd = court(p.cwd); s.origine = p.originator || p.source || ''
    } else if (p.type === 'task_complete') {
      s.fini = true
    } else if (p.type === 'item_completed' && p.item) {
      const it = p.item
      if (it.type === 'UserMessage') {
        for (const c of it.content || []) {
          if (c.type === 'text' && !s.demande) s.demande = nettoyer(c.text)
          if (c.type === 'local_image') s.jointes.push(c.path)
        }
      } else if (it.type === 'AgentMessage') {
        const t = (it.content || []).map((c) => c.text || '').join('').trim()
        if (it.phase === 'final_answer') s.reponse = t
        else if (t) s.etapes.push({ h, genre: 'message', texte: t })
      } else if (it.type === 'CommandExecution') {
        s.etapes.push({ h, genre: 'commande', texte: (it.command || []).slice(-1)[0] || '' })
      } else if (it.type === 'Extension' && it.kind === 'image_gen.generation') {
        const img = path.join(IMAGES, s.id, `${it.id}.png`)
        s.etapes.push({ h, genre: 'image', texte: 'Image générée' })
        if (existsSync(img)) s.images.push(img)
      } else if (it.type === 'ImageView') {
        s.etapes.push({ h, genre: 'regard', texte: 'Regarde ' + path.basename(decodeURIComponent(court(it.path))) })
      }
    }
  }
  // Titre lisible : la scène plutôt que la consigne répétée de gen-image.mjs.
  const m = s.demande.match(/Nouvelle scène\s*:\s*([\s\S]*?)\.\s*Fond uni/) || s.demande.match(/Prompt\s*:\s*([\s\S]*)/)
  s.titre = (m ? m[1] : s.demande).trim()
  s.etat = s.fini ? 'terminée' : Date.now() - s.maj < ACTIVE_MS ? 'en cours' : 'interrompue'
  return s
}

async function sessions() {
  const liste = await Promise.all((await fichiersRecents()).map((f) => lireSession(f).catch(() => null)))
  return liste.filter((s) => s && s.id).sort((a, b) => b.debut.localeCompare(a.debut))
}

// Seules les images générées par Codex ou jointes à une session sont servies.
async function imageAutorisee(p) {
  if (p.startsWith(IMAGES + path.sep)) return true
  return (await sessions()).some((s) => s.jointes.includes(p))
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost')
  if (url.pathname === '/api/sessions') {
    res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' })
    return res.end(JSON.stringify(await sessions()))
  }
  if (url.pathname === '/img') {
    const p = path.resolve(url.searchParams.get('p') || '')
    if (!/\.(png|jpe?g|webp)$/i.test(p) || !existsSync(p) || !(await imageAutorisee(p))) {
      res.writeHead(404); return res.end()
    }
    res.writeHead(200, { 'content-type': 'image/' + (p.endsWith('png') ? 'png' : 'jpeg'), 'cache-control': 'max-age=3600' })
    return res.end(await readFile(p))
  }
  res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
  res.end(PAGE)
})
server.listen(PORT, '127.0.0.1', () => console.log(`Suivi Codex : http://localhost:${PORT}`))

const PAGE = `<!doctype html><html lang="fr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>Suivi Codex</title>
<style>
:root{--fond:#F8EFE7;--carte:#FFFDFA;--encre:#2D2B57;--doux:#6E6A86;--trait:#E8DDD2;--ok:#2F7D5B;--cours:#C26A1B}
*{box-sizing:border-box}body{margin:0;font:15px/1.5 -apple-system,"SF Pro Text",Inter,sans-serif;background:var(--fond);color:var(--encre)}
header{display:flex;align-items:baseline;gap:12px;padding:20px 24px 8px}h1{font-size:22px;margin:0}
header span{color:var(--doux);font-size:13px}
main{display:grid;grid-template-columns:340px 1fr;gap:16px;padding:8px 24px 24px;height:calc(100vh - 64px)}
#liste{overflow:auto;display:flex;flex-direction:column;gap:8px}
.item{background:var(--carte);border:1px solid var(--trait);border-radius:12px;padding:12px 14px;cursor:pointer}
.item.actif{border-color:var(--encre);box-shadow:0 0 0 1px var(--encre)}
.item .l1{display:flex;justify-content:space-between;font-size:12px;color:var(--doux)}
.item .l2{margin-top:4px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.item .mini{width:56px;height:56px;border-radius:8px;margin-top:8px;object-fit:cover;border:1px solid var(--trait)}
.etat{font-weight:600}.etat.terminée{color:var(--ok)}.etat.en.cours,.etat.en{color:var(--cours)}
.pastille{display:inline-block;width:8px;height:8px;border-radius:50%;background:var(--cours);margin-right:6px;animation:p 1.2s infinite}
@keyframes p{50%{opacity:.3}}
#detail{overflow:auto;background:var(--carte);border:1px solid var(--trait);border-radius:16px;padding:20px 24px}
#detail h2{font-size:13px;text-transform:uppercase;letter-spacing:.06em;color:var(--doux);margin:20px 0 8px}
#detail h2:first-child{margin-top:0}
.demande{white-space:pre-wrap;background:var(--fond);border-radius:10px;padding:12px 14px}
.etape{display:grid;grid-template-columns:64px 90px 1fr;gap:8px;padding:6px 0;border-bottom:1px solid var(--trait);font-size:14px}
.etape .h{color:var(--doux);font-variant-numeric:tabular-nums}.etape .g{color:var(--doux)}
.etape code{font:13px ui-monospace,Menlo,monospace;word-break:break-all}
.images{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px}
.images img{width:100%;border-radius:12px;border:1px solid var(--trait);background:#fff}
.reponse{white-space:pre-wrap;font-size:16px}.vide{color:var(--doux)}
@media(max-width:800px){main{grid-template-columns:1fr;height:auto}#liste{max-height:40vh}}
</style></head><body>
<header><h1>Suivi Codex</h1><span id="maj"></span></header>
<main><div id="liste"></div><div id="detail"><p class="vide">Aucune session pour l'instant.</p></div></main>
<script>
let choix=null,donnees=[],dernierListe='',dernierDetail=''
const esc=s=>String(s||'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))
const img=p=>'<a href="/img?p='+encodeURIComponent(p)+'" target="_blank"><img loading="lazy" src="/img?p='+encodeURIComponent(p)+'"></a>'
const heure=t=>new Date(t).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})
const jour=t=>new Date(t).toLocaleDateString('fr-FR',{weekday:'short',day:'numeric',month:'short'})
function rendre(){
  const L=document.getElementById('liste')
  const liste=donnees.map(s=>'<div class="item'+(s.id===choix?' actif':'')+'" data-id="'+s.id+'"><div class="l1"><span>'+jour(s.debut)+' · '+heure(s.debut)+'</span><span class="etat '+s.etat+'">'+(s.etat==='en cours'?'<span class="pastille"></span>':'')+s.etat+'</span></div><div class="l2">'+esc(s.titre||'(sans texte)')+'</div>'+(s.images.length?'<img class="mini" src="/img?p='+encodeURIComponent(s.images[s.images.length-1])+'">':'')+'</div>').join('')||'<p class="vide">Aucune session ces trois derniers jours.</p>'
  // Ne redessiner que ce qui change : sinon le défilement repart en haut toutes les 3 s.
  if(liste!==dernierListe){L.innerHTML=dernierListe=liste}
  L.querySelectorAll('.item').forEach(e=>e.onclick=()=>{choix=e.dataset.id;rendre()})
  const s=donnees.find(x=>x.id===choix)||donnees[0]; if(!s)return; choix=s.id
  const detail=
    '<h2>Demande</h2><div class="demande">'+esc(s.demande)+'</div>'+
    (s.jointes.length?'<h2>Images jointes</h2><div class="images">'+s.jointes.map(img).join('')+'</div>':'')+
    (s.images.length?'<h2>Images générées</h2><div class="images">'+s.images.map(img).join('')+'</div>':'')+
    '<h2>Réponse</h2>'+(s.reponse?'<div class="reponse">'+esc(s.reponse)+'</div>':'<p class="vide">'+(s.etat==='en cours'?'Codex travaille…':'Pas de réponse finale.')+'</p>')+
    '<h2>Étapes</h2>'+(s.etapes.map(e=>'<div class="etape"><span class="h">'+e.h+'</span><span class="g">'+e.genre+'</span><span>'+(e.genre==='commande'?'<code>'+esc(e.texte)+'</code>':esc(e.texte))+'</span></div>').join('')||'<p class="vide">Aucune étape.</p>')+
    '<h2>Infos</h2><p class="vide">'+esc(s.origine)+' · '+esc(s.cwd)+'</p>'
  if(detail!==dernierDetail){document.getElementById('detail').innerHTML=dernierDetail=detail}
}
async function charger(){
  try{donnees=await (await fetch('/api/sessions')).json();rendre()
  document.getElementById('maj').textContent='Mis à jour à '+new Date().toLocaleTimeString('fr-FR')}catch(e){}
}
charger();setInterval(charger,3000)
</script></body></html>`
