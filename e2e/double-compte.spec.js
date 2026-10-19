// Double compte du 19/10 (iOS Safari) : l'élève de moins de 15 ans crée son
// compte, touche « Plus tard »… et rien ne se passe, la relecture Firestore
// (refreshGate) ne revient jamais. Il recharge la page : le tunnel repart de
// zéro alors qu'il est déjà connecté, et il crée un second compte.
// Ici, Firestore « gèle » juste après la création du compte (requêtes sans
// réponse, comme un flux WebChannel bloqué sur Safari).
import { test, expect } from '@playwright/test'
import { mockApiRoutes, remplirNaissance } from './helpers'

async function creerCompteMineur(page) {
  await page.goto('/inscription')
  await page.getByPlaceholder('Lucas').fill('Pressé')
  await page.getByRole('button', { name: 'Continuer', exact: true }).click()
  await remplirNaissance(page, '2012-03-01')
  await page.getByRole('button', { name: 'Continuer', exact: true }).click()
  await page.getByRole('button', { name: /Collège/ }).click()
  await page.getByRole('button', { name: '3ème', exact: true }).click()
  await page.locator('#signup-email').fill(`double-${Date.now()}@e2e.reviz.test`)
  await page.locator('input[type="password"]').fill('motdepasse123')
  await page.locator('input[type="checkbox"]').check()
  await page.getByRole('button', { name: 'Créer mon compte' }).click()
  await expect(page.getByPlaceholder('parent@exemple.com')).toBeVisible({ timeout: 15_000 })
}

// Firestore ne répond plus : chaque requête vers l'émulateur reste en suspens.
async function gelerFirestore(page) {
  await page.route(/127\.0\.0\.1:8080/, () => { /* jamais de réponse */ })
}

test.describe('Inscription : pas de second compte', () => {
  test('« Plus tard » mène à la suite même si Firestore ne répond plus', async ({ page }) => {
    await mockApiRoutes(page)
    await creerCompteMineur(page)
    await gelerFirestore(page)

    await page.getByRole('button', { name: /Plus tard/ }).click()
    await expect(page).toHaveURL(/verify-email/, { timeout: 8_000 })
  })

  test('recharger /inscription une fois le compte créé ne relance pas le tunnel', async ({ page }) => {
    await mockApiRoutes(page)
    await creerCompteMineur(page)

    await page.reload()
    await expect(page).toHaveURL(/verify-email/, { timeout: 15_000 })
    await expect(page.getByPlaceholder('Lucas')).toHaveCount(0)
  })
})
