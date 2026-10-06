// Réviz sur ordinateur : à partir de 1024 px, barre latérale et colonne
// centrale ; en dessous, rien ne change (capsule du bas). Parcours en mode
// essai, catalogue et chapitre servis par les fixtures.
import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { mockApiRoutes } from './helpers'

const here = path.dirname(fileURLToPath(import.meta.url))
const fixture = name => readFileSync(path.join(here, 'fixtures/programme', name), 'utf8')

async function mockProgramme(page) {
  await page.route('**/programme/3eme/index.json', route =>
    route.fulfill({ status: 200, contentType: 'application/json', body: fixture('index.json') }))
  await page.route('**/programme/3eme/maths/theoreme-de-thales.json', route =>
    route.fulfill({ status: 200, contentType: 'application/json', body: fixture('thales.json') }))
}

async function entrerEnEssai(page) {
  await page.goto('/essai')
  await page.getByLabel('Ton prénom').fill('Léa')
  await page.getByRole('button', { name: '3ème', exact: true }).click()
  await page.getByRole('button', { name: /C'est parti/ }).click()
  await expect(page).toHaveURL(/\/programme$/)
}

test.describe('Ordinateur (1280 px)', () => {
  test.use({ viewport: { width: 1280, height: 800 } })

  test('barre latérale, colonne centrale, pas de capsule du bas', async ({ page }) => {
    await mockApiRoutes(page)
    await mockProgramme(page)
    await entrerEnEssai(page)

    const sideNav = page.locator('.side-nav')
    await expect(sideNav).toBeVisible()
    await expect(page.locator('.bottom-nav')).toBeHidden()
    await expect(sideNav.getByRole('link', { name: 'Mon programme' })).toBeVisible()
    await page.waitForTimeout(600)
    await page.screenshot({ path: test.info().outputPath('desktop-programme.png') })

    // La colonne de contenu reste lisible
    const box = await page.locator('.programme-content').boundingBox()
    expect(box.width).toBeLessThanOrEqual(1140)

    await page.getByRole('button', { name: /^Maths/ }).click()
    await expect(page).toHaveURL(/\/programme\/maths/)
    await page.waitForTimeout(500)
    await page.screenshot({ path: test.info().outputPath('desktop-programme-maths.png') })
    await page.getByRole('button', { name: /Le théorème de Thalès/ }).click()
    await page.waitForTimeout(300)
    await page.screenshot({ path: test.info().outputPath('desktop-chemin-fiche.png') })
    await page.getByRole('button', { name: /Le théorème de Thalès/ }).click()

    await page.getByRole('button', { name: /Le théorème de Thalès/ }).click()
    await page.getByRole('button', { name: /chapitre$/ }).click()
    await expect(page).toHaveURL(/\/analyse/)
    await page.waitForTimeout(700)
    await page.screenshot({ path: test.info().outputPath('desktop-analyse.png') })

    await page.getByRole('link', { name: /Quiz/ }).click()
    await expect(page.getByText('Que faut-il pour appliquer le théorème de Thalès ?')).toBeVisible()
    await page.waitForTimeout(500)
    await page.screenshot({ path: test.info().outputPath('desktop-quiz.png') })

    await page.goto('/resume')
    await expect(page.getByText('Sécantes').first()).toBeVisible()
    await page.waitForTimeout(500)
    await page.screenshot({ path: test.info().outputPath('desktop-resume.png') })

    await page.goto('/flashcards')
    await page.waitForTimeout(600)
    await page.screenshot({ path: test.info().outputPath('desktop-flashcards.png') })

    await page.goto('/')
    await expect(page.getByRole('link', { name: 'Réviser mon programme' })).toBeVisible()
    await page.waitForTimeout(500)
    await page.screenshot({ path: test.info().outputPath('desktop-home.png') })

    await page.goto('/cours')
    await expect(page.getByText('Le théorème de Thalès').first()).toBeVisible()
    await page.waitForTimeout(500)
    await page.screenshot({ path: test.info().outputPath('desktop-cours.png') })

    await page.goto('/progres')
    await page.waitForTimeout(1600)  // fin des animations d'entrée des cartes
    await page.screenshot({ path: test.info().outputPath('desktop-progres.png') })

    await page.goto('/profil')
    await page.waitForTimeout(500)
    await page.screenshot({ path: test.info().outputPath('desktop-profil.png') })
  })
})

test.describe('Mobile (390 px)', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('rien ne change : capsule du bas visible, pas de barre latérale', async ({ page }) => {
    await mockApiRoutes(page)
    await mockProgramme(page)
    await entrerEnEssai(page)
    await expect(page.locator('.side-nav')).toBeHidden()
    await expect(page.locator('.bottom-nav')).toBeVisible()
    await page.screenshot({ path: test.info().outputPath('mobile-programme.png') })
    await page.getByRole('button', { name: /^Maths/ }).click()
    await page.waitForTimeout(500)
    await page.screenshot({ path: test.info().outputPath('mobile-chemin.png') })
    await page.goto('/')
    await page.waitForTimeout(500)
    await page.screenshot({ path: test.info().outputPath('mobile-home.png') })
  })
})

test.describe('Ordinateur (1280 px) — avec un compte', () => {
  test.use({ viewport: { width: 1280, height: 800 } })

  test('accueil en tableau de bord, scanner en deux panneaux, cours avec rail', async ({ page }) => {
    const { signup, verifyEmailAndOnboard } = await import('./helpers')
    await mockApiRoutes(page)
    await mockProgramme(page)
    const email = await signup(page, { birthDate: '2004-03-15' })
    await verifyEmailAndOnboard(page, email)

    await expect(page.locator('.side-nav')).toBeVisible()
    await page.waitForTimeout(600)
    await page.screenshot({ path: test.info().outputPath('desktop-compte-home.png') })

    await page.goto('/scan')
    await expect(page.locator('.scan-panel--photo')).toBeVisible()
    await expect(page.locator('.scan-panel--texte')).toBeVisible()
    await expect(page.getByRole('tab', { name: /Texte/ })).toHaveCount(0)
    await page.waitForTimeout(800)
    await page.screenshot({ path: test.info().outputPath('desktop-compte-scan.png') })

    // Un chapitre ouvert, puis l'accueil et Mes cours composés avec la leçon
    await page.goto('/programme/maths')
    await page.getByRole('button', { name: /Le théorème de Thalès/ }).click()
    await page.getByRole('button', { name: /chapitre$/ }).click()
    await expect(page).toHaveURL(/\/analyse/)
    await page.goto('/')
    await page.waitForTimeout(600)
    await page.screenshot({ path: test.info().outputPath('desktop-compte-home-lecon.png') })
    await page.goto('/cours')
    await expect(page.getByText('Le théorème de Thalès').first()).toBeVisible()
    await page.waitForTimeout(1200)
    await page.screenshot({ path: test.info().outputPath('desktop-compte-cours.png') })
    await page.goto('/reglages')
    await page.waitForTimeout(500)
    await page.screenshot({ path: test.info().outputPath('desktop-compte-reglages.png') })
  })
})
