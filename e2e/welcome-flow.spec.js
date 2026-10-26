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
      await expect(page).toHaveURL(/\/inscription/)
      // Premier écran du tunnel : le prénom.
      await expect(page.getByLabel('Ton prénom')).toBeVisible()
    })

    test('user can navigate to the login page from welcome', async ({ page }) => {
      await page.goto('/welcome')

      await page.getByRole('link', { name: /J’ai déjà un compte/i }).click()

      await expect(page).toHaveURL(/\/connexion/)
      await expect(page.getByLabel('E-mail', { exact: true })).toBeVisible()
      await expect(page.getByRole('button', { name: 'Se connecter' })).toBeVisible()
    })

    test('user can try the app without an account, and come back', async ({ page }) => {
      await page.goto('/welcome')

      await page.getByRole('link', { name: /Essayer sans compte/i }).click()
      await expect(page).toHaveURL(/\/essai/)
      await expect(page.getByLabel('Ton prénom')).toBeVisible()

      // Le retour de l'écran ramène à la bienvenue.
      await page.getByRole('button', { name: 'Retour' }).click()
      await expect(page).toHaveURL(/\/welcome/)
    })
  })
}
