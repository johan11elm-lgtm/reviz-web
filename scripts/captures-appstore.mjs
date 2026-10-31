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

// Réviz IA : une vraie conversation (réponse posée par Playwright, rien ne part chez Anthropic).
const REPONSE_IA = [
  'Le **théorème de Thalès** sert à calculer une longueur quand deux droites sont parallèles.',
  '',
  'Si (MN) // (BC), alors : **AM/AB = AN/AC = MN/BC**',
  '',
  'Exemple : AM = 3 cm, AB = 6 cm et BC = 8 cm. Le rapport vaut 3/6 = 1/2, donc **MN = 8 × 1/2 = 4 cm**.',
  '',
  'On s’entraîne sur un exercice du brevet ?',
].join('\n')
await page.route('**/api/chat', route => route.fulfill({
  status: 200, contentType: 'text/event-stream',
  body: [{ meta: { remaining: 9, limit: 10 } }, { text: REPONSE_IA }].map(e => `data: ${JSON.stringify(e)}\n\n`).join('') + 'data: [DONE]\n\n',
}))

// Scènes jouées (pas seulement une page ouverte).
const SCENES = {
  async 'ia-conversation'() {
    await page.goto('/coach')
    await page.waitForTimeout(2000)
    const champ = page.getByPlaceholder('Demande à Réviz IA')
    await champ.fill('Le théorème de Thalès, ça sert à quoi ?')
    await champ.press('Enter')
    await page.waitForTimeout(3000)
  },
  async formats() {
    for (let essai = 0; essai < 12; essai++) {
      await page.goto('/exercices')
      await page.waitForTimeout(2200)
      const t = await page.locator('body').innerText()
      const fmt = (t.match(/(\S+) · 1 sur/) || [])[1] || 'x'
      await page.screenshot({ path: `${out}/format-${essai}-${fmt}.png` })
    }
  },
  // Mémory en pleine partie : deux paires trouvées, une carte retournée.
  async memory() {
    const PAIRES = [/chloroplaste|organite/i, /autotrophe|propre matière/i, /chlorophylle|pigment/i]
    for (let essai = 0; essai < 25; essai++) {
      await page.goto('/exercices')
      await page.waitForTimeout(2200)
      if (!/Mémory · 1 sur/.test(await page.locator('body').innerText())) continue
      const cartes = page.locator('.ex-memo')
      const textes = []
      for (let i = 0; i < 6; i += 2) {
        await cartes.nth(i).click(); await cartes.nth(i + 1).click()
        textes[i] = await cartes.nth(i).getAttribute('aria-label')
        textes[i + 1] = await cartes.nth(i + 1).getAttribute('aria-label')
        await page.waitForTimeout(1300)
      }
      const paire = t => PAIRES.findIndex(r => r.test(t))
      const idx = k => textes.map((t, i) => paire(t) === k ? i : -1).filter(i => i >= 0)
      for (const k of [0, 2]) {
        const [a, b] = idx(k)
        if (await cartes.nth(a).isEnabled()) { await cartes.nth(a).click(); await cartes.nth(b).click(); await page.waitForTimeout(500) }
      }
      const [c] = idx(1)
      if (await cartes.nth(c).isEnabled()) await cartes.nth(c).click()
      // Les essais pour lire les cartes comptent comme des erreurs : on ne montre que les paires.
      await page.evaluate(() => { const a = document.querySelector('.ex-aide'); if (a) a.textContent = a.textContent.replace(/ · .*/, '') })
      await page.waitForTimeout(400)
      return
    }
  },
  async 'exercice-juste'() {
    for (let essai = 0; essai < 8; essai++) {
      await page.goto('/exercices')
      await page.waitForTimeout(2500)
      const bonne = page.getByRole('button', { name: /glucose|chlorophylle/i }).first()
      if (await bonne.count()) {
        await bonne.click()
        await page.getByRole('button', { name: 'Valider' }).click()
        await page.waitForTimeout(1500)
        return
      }
    }
  },
}

const demandes = process.argv.slice(3).map(a => a.split(':'))
const ecrans = demandes.length ? demandes : [
  ['/', 'accueil'], ['/programme', 'programme'], ['/cours', 'cours'], ['/coach', 'reviz-ia'],
  ['/jeux', 'jeux'], ['/progres', 'progres'], ['/simulateur-brevet', 'simulateur'], ['/agenda', 'agenda'],
  ['/battle', 'battle'], ['/scan', 'scan'], ['/resume', 'fiche'], ['/quiz', 'quiz'], ['/flashcards', 'flashcards'],
]
for (const [route, nom] of ecrans) {
  if (SCENES[route]) await SCENES[route]()
  else {
    await page.goto(route)
    await page.waitForTimeout(4000)
  }
  await page.screenshot({ path: `${out}/${nom}.png` })
  console.log('✔', nom, page.url())
}
await browser.close()
