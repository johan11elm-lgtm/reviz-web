// Banc d'essai du pantin : rend des états donnés (JSON) et capture.
const { createRequire } = require('module');
const req = createRequire(process.argv[2] + '/package.json');
const { chromium } = req('playwright');
const [,, , out, etatsJson, extraJs] = process.argv;
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1600, height: 500 }, deviceScaleFactor: 1 });
  await p.goto('http://localhost:5388/pantin/moteur/reviz-anim.js'); // même origine
  await p.setContent('<html><body style="margin:0;background:#F6A673;display:flex"></body></html>');
  const base = 'http://localhost:5388/pantin/';
  for (const s of ['reviz-d1-pieces.js','reviz-rig.js','reviz-rig3d.js']) await p.addScriptTag({ url: base + 'moteur/' + s });
  const etats = JSON.parse(etatsJson);
  await p.evaluate(async ({ etats, base, extraJs }) => {
    for (const e of etats) {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('viewBox', '-100 0 2700 2700'); svg.style.width = '400px'; svg.style.height = '400px'; svg.style.overflow = 'visible';
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g'); svg.appendChild(g); document.body.appendChild(svg);
      const rig = await window.RevizD1_3D.creer(g, { base, repereHD: true });
      Object.assign(rig.etat, e); rig.rendre();
      if (extraJs) new Function('rig', 'g', 'e', extraJs)(rig, g, e);
    }
    await new Promise(r => setTimeout(r, 1500));
  }, { etats, base, extraJs: extraJs || '' });
  await p.screenshot({ path: out });
  await b.close();
})().catch(e => { console.error(e); process.exit(1); });
