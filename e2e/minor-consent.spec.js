// Tunnel mineur <15 ans : étape parent obligatoire, compte bloqué tant que le
// consentement n'est pas approuvé. Exerce pour de vrai les règles Firestore
// (création du doc parentalConsent 'pending' au signup) via l'émulateur.
import { test, expect } from '@playwright/test'
import { mockApiRoutes, signup } from './helpers'

test.describe('Tunnel consentement parental (<15 ans)', () => {
  test('un élève de 12 ans passe par l\'étape parent puis reste bloqué en attente', async ({ page }) => {
    await mockApiRoutes(page)

    // Inscription avec une date de naissance <15 ans → l'étape parent apparaît
    await signup(page, { birthDate: '2014-06-01', parentEmail: 'parent@famille.test' })

    // Redirection vers l'écran d'attente du consentement
    await expect(page).toHaveURL(/consent-pending/, { timeout: 15_000 })

    // Le gate tient : tenter d'accéder à l'app redirige vers l'attente
    await page.goto('/')
    await expect(page).toHaveURL(/consent-pending/)
    await page.goto('/scan')
    await expect(page).toHaveURL(/consent-pending/)
  })

  test('l\'email du parent ne peut pas être celui de l\'élève', async ({ page }) => {
    await mockApiRoutes(page)
    await page.goto('/inscription')

    await page.getByPlaceholder('Lucas').fill('Petit')
    await page.getByRole('button', { name: 'Continuer', exact: true }).click()
    await page.locator('input[type="date"]').fill('2014-06-01')
    await page.getByRole('button', { name: 'Continuer', exact: true }).click()
    await page.getByRole('button', { name: /Collège/ }).click()
    await page.getByRole('button', { name: '6ème', exact: true }).click()

    const email = `petit-${Date.now()}@e2e.reviz.test`
    await page.locator('#signup-email').fill(email)
    await page.locator('input[type="password"]').fill('motdepasse123')
    await page.locator('input[type="checkbox"]').check()
    await page.getByRole('button', { name: 'Créer mon compte' }).click()

    // Étape parent : saisir son propre email → refus immédiat côté client
    await expect(page.getByPlaceholder('parent@exemple.com')).toBeVisible({ timeout: 15_000 })
    await page.getByPlaceholder('parent@exemple.com').fill(email)
    await page.getByRole('button', { name: /Envoyer la demande/ }).click()
    await expect(page.getByText(/pas le tien/)).toBeVisible()
  })
})
