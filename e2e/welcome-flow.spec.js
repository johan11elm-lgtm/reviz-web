// Parcours d'entrée refait le 22/10 (EntreeEcran) : bienvenue → inscription / connexion / essai.
// L'écran change de composition : héros à gauche et carte à droite sur ordinateur, héros en haut sur téléphone.
import { test, expect } from '@playwright/test'

for (const [appareil, viewport] of [['téléphone', { width: 390, height: 844 }], ['ordinateur', { width: 1280, height: 800 }]]) {
  test.describe(`Welcome → Inscription flow (${appareil})`, () => {
    test.use({ viewport })

    test('user lands on welcome, sees CTA, and reaches the signup page', async ({ page }) => {
      await page.goto('/welcome')

      // La phrase de Réviz est dans sa bulle (texte pour lecteur d'écran, tapée lettre par lettre à l'écran).
      await expect(page.getByText('Révise mieux. Retiens plus.')).toBeAttached()
      await expect(page.getByText('Gratuit pour commencer, sans carte bancaire.')).toBeVisible()

      const cta = page.getByRole('link', { name: /Commencer gratuitement/i })
      await expect(cta).toBeVisible()

      await cta.click()
      // Depuis le 11/11 : l'entrée, où Réviz pose ses questions avant le compte.
      await expect(page).toHaveURL(/\/commencer/)
      await expect(page.getByRole('button', { name: 'C’est parti' })).toBeVisible()
    })

    test('user can navigate to the login page from welcome', async ({ page }) => {
      await page.goto('/welcome')

      await page.getByRole('link', { name: /J’ai déjà un compte/i }).click()

      await expect(page).toHaveURL(/\/connexion/)
      await expect(page.getByLabel('E-mail', { exact: true })).toBeVisible()
      await expect(page.getByRole('button', { name: 'Se connecter' })).toBeVisible()
    })

    test('« Commencer gratuitement » ouvre l’entrée (Réviz pose ses questions), et l’on revient', async ({ page }) => {
      await page.goto('/welcome')
      // Plus d'essai sans compte depuis le 11/11.
      await expect(page.getByRole('link', { name: /sans compte/i })).toHaveCount(0)

      await page.getByRole('link', { name: /Commencer gratuitement/i }).click()
      await expect(page).toHaveURL(/\/commencer/)
      await expect(page.getByRole('heading', { level: 1 })).toContainText('moi c’est Réviz')

      // Le retour de l'écran ramène à la bienvenue.
      await page.getByRole('button', { name: 'Retour' }).click()
      await expect(page).toHaveURL(/\/welcome/)
    })
  })
}
