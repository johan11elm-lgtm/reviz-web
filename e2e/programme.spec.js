// « Mon programme » : réviser sans scan, en mode essai (prénom + classe) et
// avec un compte. Le catalogue et le chapitre viennent de fixtures servies par
// Playwright : le parcours ne dépend pas des contenus générés dans public/.
import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { mockApiRoutes, signup, verifyEmailAndOnboard, fermerAnnonceBattle } from './helpers'

const here = path.dirname(fileURLToPath(import.meta.url))
const fixture = name => readFileSync(path.join(here, 'fixtures/programme', name), 'utf8')

async function mockProgramme(page) {
  await page.route('**/programme/3eme/index.json', route =>
    route.fulfill({ status: 200, contentType: 'application/json', body: fixture('index.json') }))
  await page.route('**/programme/3eme/maths/theoreme-de-thales.json', route =>
    route.fulfill({ status: 200, contentType: 'application/json', body: fixture('thales.json') }))
}

test.describe('Mon programme', () => {
  test('mode essai : prénom + classe, puis un chapitre de 3e révisé sans compte', async ({ page }) => {
    await mockApiRoutes(page)
    await mockProgramme(page)

    // ── Welcome → essai ──
    await page.goto('/welcome')
    await page.getByRole('link', { name: 'Essayer sans compte' }).first().click()
    await expect(page).toHaveURL(/\/essai/)
    await page.getByLabel('Ton prénom').fill('Léa')
    await page.getByRole('button', { name: '3ème', exact: true }).click()
    await page.getByRole('button', { name: /C'est parti/ }).click()

    // ── Mon programme : matières, bandeau du mode essai ──
    await expect(page).toHaveURL(/\/programme$/)
    // Sur ordinateur (1280 px), le mode essai est rappelé dans la barre latérale.
    await expect(page.locator('.guest-banner:visible, .side-nav-note:visible').getByText('Mode essai')).toBeVisible()
    await expect(page.getByRole('button', { name: /^Maths/ })).toBeVisible()
    await page.screenshot({ path: test.info().outputPath('programme.png') })

    // ── Chapitres de maths : un prêt, un « Bientôt » ──
    await page.getByRole('button', { name: /^Maths/ }).click()
    await expect(page).toHaveURL(/\/programme\/maths/)
    await expect(page.getByText('Trigonométrie')).toBeVisible()
    await expect(page.getByRole('button', { name: /Trigonométrie — Bientôt/ })).toBeDisabled()
    await page.screenshot({ path: test.info().outputPath('programme-maths.png') })

    // ── Ouvrir un chapitre = la page des formats, sans coach en mode essai ──
    await page.getByRole('button', { name: /Le théorème de Thalès/ }).click()
    await page.getByRole('button', { name: /chapitre$/ }).click()
    await expect(page).toHaveURL(/\/analyse/)
    await expect(page.getByText("L'essentiel du chapitre")).toBeVisible()
    await expect(page.getByRole('link', { name: /Quiz/ })).toBeVisible()
    await expect(page.locator('.analyse-page a[href^="/coach"]')).toHaveCount(0)
    await page.waitForTimeout(700)  // fin du fondu d'entrée, pour la capture seulement
    await page.screenshot({ path: test.info().outputPath('analyse-chapitre.png') })

    // ── Le quiz tourne sur le contenu du chapitre ──
    await page.getByRole('link', { name: /Quiz/ }).click()
    await expect(page).toHaveURL(/\/quiz/)
    await expect(page.getByText('Que faut-il pour appliquer le théorème de Thalès ?')).toBeVisible()

    // ── Accueil : héros vers le programme, bandeau, et le chapitre devient « commencé » ──
    await page.goto('/')
    await expect(page.getByRole('link', { name: 'Réviser mon programme' })).toBeVisible()
    await expect(page.locator('.guest-banner:visible, .side-nav-note:visible').getByText('Mode essai')).toBeVisible()
    await page.goto('/programme/maths')
    await expect(page.getByRole('button', { name: /Le théorème de Thalès — Commencé/ })).toBeVisible()

    // ── Le scan demande un compte ──
    await page.goto('/scan')
    await expect(page.getByText('Crée ton compte pour scanner tes leçons')).toBeVisible()
    await page.screenshot({ path: test.info().outputPath('scan-mode-essai.png') })

    // ── L'inscription repart avec le prénom et la classe de l'essai ──
    await page.getByRole('link', { name: /Créer mon compte gratuit/ }).click()
    await expect(page).toHaveURL(/\/inscription/)
    await expect(page.getByPlaceholder('Lucas')).toHaveValue('Léa')
  })

  test('avec un compte : entrée depuis l’accueil, le chapitre rejoint Mes cours', async ({ page }) => {
    await mockApiRoutes(page)
    await mockProgramme(page)

    const email = await signup(page, { birthDate: '2004-03-15' })  // le tunnel choisit la 3ème
    await verifyEmailAndOnboard(page, email)

    // Accueil sur ordinateur : la section « Mon programme » mène au programme.
    await page.locator('.home-desk-more', { hasText: 'chapitres' }).click()
    await expect(page).toHaveURL(/\/programme$/)
    await expect(page.locator('.guest-banner, .side-nav-note')).toHaveCount(0)

    await page.getByRole('button', { name: /^Maths/ }).click()
    await page.getByRole('button', { name: /Le théorème de Thalès/ }).click()
    await page.getByRole('button', { name: /chapitre$/ }).click()
    await expect(page).toHaveURL(/\/analyse/)
    await expect(page.getByText('Le théorème de Thalès').first()).toBeVisible()

    await page.goto('/cours')
    await expect(page.getByText('Le théorème de Thalès').first()).toBeVisible()
    // La synchro Firestore ne doit pas écraser le chapitre qui vient d'être ouvert
    await page.waitForTimeout(1200)
    await expect(page.getByText('Allez, on scanne ?')).toHaveCount(0)
    await expect(page.getByText('Le théorème de Thalès').first()).toBeVisible()
    await expect(page.getByRole('button', { name: /Mon programme · révise/ })).toBeVisible()
    await page.screenshot({ path: test.info().outputPath('cours-avec-chapitre.png') })
  })
})

// La flèche retour de Mon programme n'existe que sur téléphone (sur ordinateur,
// la page s'ouvre depuis la barre latérale).
test.describe('Téléphone (390 px)', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('le retour depuis une matière remonte jusqu’à l’accueil sans boucler', async ({ page }) => {
    await mockApiRoutes(page)
    await mockProgramme(page)
    await page.goto('/essai')
    await page.getByLabel('Ton prénom').fill('Léa')
    await page.getByRole('button', { name: '3ème', exact: true }).click()
    await page.getByRole('button', { name: /C'est parti/ }).click()
    await expect(page).toHaveURL(/\/programme$/)
    await page.goto('/')
    await fermerAnnonceBattle(page)
    await page.getByRole('link', { name: 'Réviser mon programme' }).first().click()
    await expect(page).toHaveURL(/\/programme$/)
    await page.getByRole('button', { name: /^Maths/ }).click()
    await expect(page).toHaveURL(/\/programme\/maths/)
    await page.getByRole('button', { name: 'Retour' }).first().click()
    await expect(page).toHaveURL(/\/programme$/)
    await page.getByRole('button', { name: 'Retour' }).first().click()
    await expect(page).toHaveURL(/\/$/)
  })

  test('la fiche d’un chapitre reste dans l’écran, de chaque côté du zigzag', async ({ page }) => {
    await mockApiRoutes(page)
    // Huit chapitres prêts : toutes les positions du zigzag (décalages 0, ±1, ±1,6).
    const index = JSON.parse(fixture('index.json'))
    const maths = index.matieres.find(m => m.slug === 'maths')
    maths.chapitres = Array.from({ length: 8 }, (_, i) => ({
      ...maths.chapitres[0], id: `chapitre-${i + 1}`, titre: `Chapitre de test numéro ${i + 1}`, ordre: i + 1,
    }))
    await page.route('**/programme/3eme/index.json', route =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(index) }))
    await page.goto('/essai')
    await page.getByLabel('Ton prénom').fill('Léa')
    await page.getByRole('button', { name: '3ème', exact: true }).click()
    await page.getByRole('button', { name: /C'est parti/ }).click()
    await page.getByRole('button', { name: /^Maths/ }).click()
    await expect(page).toHaveURL(/\/programme\/maths/)

    const content = page.locator('.programme-content')
    for (let i = 1; i <= 8; i++) {
      const step = page.getByRole('button', { name: new RegExp(`^${i}\\. `) })
      // Rond centré à l'écran : caché sous la barre d'onglets, Playwright le
      // recentrerait aussi à l'horizontale (le halo rend .app défilable) et
      // décalerait toute la page, ce qui fausserait la mesure.
      await step.evaluate(el => el.scrollIntoView({ block: 'center' }))
      await step.click()
      const card = page.getByRole('dialog', { name: `Chapitre de test numéro ${i}` })
      await card.evaluate(el => Promise.all(el.getAnimations().map(a => a.finished)))
      const box = await card.boundingBox()
      expect(box.x, `chapitre ${i}, bord gauche`).toBeGreaterThanOrEqual(16)
      expect(box.x + box.width, `chapitre ${i}, bord droit`).toBeLessThanOrEqual(390 - 16)
      // L'étape décalée ne doit pas non plus faire défiler la page de côté.
      expect(await content.evaluate(el => el.scrollWidth - el.clientWidth), `chapitre ${i}`).toBe(0)
    }
  })
})
