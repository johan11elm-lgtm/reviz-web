// -------------------------------------------------------
// Réviz — Capture d'écran d'une route du dev server (outil de dev)
//
// Prérequis : émulateurs Firebase (scripts/e2e-emulators.sh) + vite dev
// en mode émulateur sur 5199, et le compte seedé eleve.test@reviz.dev.
//
// Usage : node scripts/dev-shot.mjs <route> <sortie.png> [options]
//   --dark            thème sombre
//   --lesson          restaure la leçon seedée avant la capture (pour
//                     /analyse, /flashcards, /quiz, /resume, /mindmap)
//   --click "texte"   clique l'élément contenant ce texte avant capture
//   --scroll N        scrolle de N pixels avant capture
//   --wait N          attente supplémentaire en ms (défaut 2200)
// Exemple : node scripts/dev-shot.mjs /cours /tmp/cours.png --dark
// -------------------------------------------------------
import { chromium } from '@playwright/test'

const args = process.argv.slice(2)
const route = args[0]
const out = args[1]
if (!route || !out) {
  console.error('Usage : node scripts/dev-shot.mjs <route> <sortie.png> [--dark] [--lesson] [--click "texte"] [--scroll N] [--wait N]')
  process.exit(1)
}
const opt = (name) => {
  const i = args.indexOf(name)
  return i === -1 ? null : (args[i + 1] ?? true)
}
const dark = args.includes('--dark')
const lesson = args.includes('--lesson')
const clickText = opt('--click')
const scroll = parseInt(opt('--scroll') ?? '0', 10)
const extraWait = parseInt(opt('--wait') ?? '2200', 10)

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 402, height: 874 }, deviceScaleFactor: 2 })

await page.goto('http://127.0.0.1:5199/connexion')
await page.fill('input[type="email"]', 'eleve.test@reviz.dev')
await page.fill('input[type="password"]', 'Test1234!')
await page.click('button[type="submit"]')
await page.waitForURL(u => !String(u).includes('connexion'), { timeout: 15000 })
await page.waitForTimeout(2000)
const skip = page.locator('text=Passer')
if (await skip.count()) { await skip.first().click(); await page.waitForTimeout(1200) }

await page.evaluate(([dark, lesson]) => {
  localStorage.setItem('reviz-theme', dark ? 'dark' : 'light')
  if (lesson) {
    const uid = Object.keys(localStorage).find(k => k.startsWith('reviz-lessons-'))?.slice('reviz-lessons-'.length)
    const lessons = JSON.parse(localStorage.getItem('reviz-lessons-' + uid) || '[]')
    if (lessons[0]) {
      localStorage.setItem('reviz-current-lesson-id', lessons[0].id)
      localStorage.setItem('reviz-ai-data', JSON.stringify(lessons[0].aiData))
    }
  }
}, [dark, lesson])

await page.goto('http://127.0.0.1:5199' + route)
await page.waitForTimeout(extraWait)
if (clickText) {
  const el = page.locator(`text=${clickText}`).first()
  if (await el.count()) { await el.click(); await page.waitForTimeout(1200) }
}
if (scroll) { await page.mouse.wheel(0, scroll); await page.waitForTimeout(800) }
await page.screenshot({ path: out })
await browser.close()
console.log('✔', out)
