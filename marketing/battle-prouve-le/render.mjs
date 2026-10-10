import { chromium } from '@playwright/test';
import { mkdirSync } from 'fs';
const [,, html, outDir, mode] = process.argv;
const FPS = 30, DUR = 15.5;
mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
await page.goto('file://' + html);
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(300);
const times = mode === 'stills' ? [1.2, 2.5, 4.3, 6.8, 8.6, 11.3, 14.6] : Array.from({ length: Math.round(FPS * DUR) }, (_, i) => i / FPS);
for (let i = 0; i < times.length; i++) {
  await page.evaluate(t => render(t), times[i]);
  const name = mode === 'stills' ? `still-${times[i]}.png` : `f${String(i).padStart(4, '0')}.png`;
  await page.screenshot({ path: `${outDir}/${name}`, type: 'png' });
}
await browser.close();
console.log('ok', times.length);
