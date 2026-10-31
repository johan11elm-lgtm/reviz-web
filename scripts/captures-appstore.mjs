// -------------------------------------------------------
// Réviz — Captures brutes pour la fiche App Store (outil de dev)
//
// Prérequis : émulateurs Firebase (scripts/e2e-emulators.sh) + vite en mode
// émulateur sur 5199 (VITE_FIREBASE_EMULATOR=1 npx vite --port 5199).
// iPhone 6,9 pouces : 440 x 956 points @3x = 1320 x 2868, le format exigé.
//
// Usage : node scripts/captures-appstore.mjs <dossier-de-sortie> [route:nom ...]
// -------------------------------------------------------
import { chromium } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import { compteRapide, MOCK_AI_RESPONSE } from '../e2e/helpers.js'

const out = process.argv[2]
if (!out) {
  console.error('Usage : node scripts/captures-appstore.mjs <dossier-de-sortie> [route:nom ...]')
  process.exit(1)
}
mkdirSync(out, { recursive: true })

const browser = await chromium.launch()
const context = await browser.newContext({
  baseURL: 'http://localhost:5199',
  viewport: { width: 440, height: 956 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
  locale: 'fr-FR',
})
const page = await context.newPage()

// Douze jours de révisions sur le programme de 3e : une série, de l'XP, des matières entamées.
const FIRESTORE = 'http://127.0.0.1:8080/v1/projects/demo-reviz/databases/(default)/documents'
const CHAPITRES = [
  ['arithmetique-nombres-premiers', 'Maths'], ['puissances-et-racines-carrees', 'Maths'], ['calcul-litteral', 'Maths'],
  ['information-genetique', 'SVT'], ['premiere-guerre-mondiale', 'Histoire'], ['accord-du-participe-passe', 'Français'],
  ['phrase-complexe', 'Français'], ['mitose-division-cellulaire', 'SVT'],
]
const champ = v => typeof v === 'number' ? { integerValue: String(v) } : { stringValue: String(v) }
async function semerRevisions(uid) {
  const J = 24 * 3600e3
  let n = 0
  for (let jour = 11; jour >= 0; jour--) {
    for (let k = 0; k < 2; k++) {
      const [chapterId, matiere] = CHAPITRES[(jour * 2 + k) % CHAPITRES.length]
      const revisedAt = Date.now() - jour * J - (k + 1) * 3600e3
      const type = k ? 'flashcards' : 'exercices'
      const r = { id: String(revisedAt), type, chapterId, lessonId: `prog-${chapterId}`, classe: '3ème', matiere, source: 'programme', revisedAt, xp: k ? 45 : 110, ...(k ? {} : { score: 8, total: 10 }) }
      await fetch(`${FIRESTORE}/users/${uid}/revisions?documentId=${r.id}`, {
        method: 'POST', headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: Object.fromEntries(Object.entries(r).map(([c, v]) => [c, champ(v)])) }),
      })
      n++
    }
  }
  return n
}

const compte = await compteRapide(page, {
  prenom: 'Léa', classe: '3ème', birthDate: '2011-03-12',
  consentement: { status: 'approved', parentEmail: 'parent@famille.test', createdAt: Date.now(), approvedAt: Date.now() },
})
console.log('révisions semées :', await semerRevisions(compte.uid))
await page.reload()
await page.waitForTimeout(3000)
await page.evaluate((data) => {
  localStorage.setItem('reviz-current-lesson-id', 'pub-photosynthese')
  localStorage.setItem('reviz-ai-data', JSON.stringify(data))
}, MOCK_AI_RESPONSE)

const demandes = process.argv.slice(3).map(a => a.split(':'))
const ecrans = demandes.length ? demandes : [
  ['/', 'accueil'], ['/programme', 'programme'], ['/cours', 'cours'], ['/coach', 'reviz-ia'],
  ['/jeux', 'jeux'], ['/progres', 'progres'], ['/simulateur-brevet', 'simulateur'], ['/agenda', 'agenda'],
  ['/battle', 'battle'], ['/scan', 'scan'], ['/resume', 'fiche'], ['/quiz', 'quiz'], ['/flashcards', 'flashcards'],
]
for (const [route, nom] of ecrans) {
  await page.goto(route)
  await page.waitForTimeout(2500)
  await page.screenshot({ path: `${out}/${nom}.png` })
  console.log('✔', nom, page.url())
}
await browser.close()
