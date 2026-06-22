import { test, expect } from '@playwright/test'

test.describe('Welcome → Inscription flow', () => {
  test('user lands on welcome, sees CTA, and reaches the signup page', async ({ page }) => {
    await page.goto('/welcome')

    await expect(page.getByRole('heading', { name: /Révise mieux/i })).toBeVisible()

    const cta = page.getByRole('link', { name: /Commencer gratuitement/i })
    await expect(cta).toBeVisible()

    await cta.click()
    await expect(page).toHaveURL(/\/inscription/)
  })

  test('user can navigate to the login page from welcome', async ({ page }) => {
    await page.goto('/welcome')

    const loginLink = page.getByRole('link', { name: /Se connecter/i }).first()
    await loginLink.click()

    await expect(page).toHaveURL(/\/connexion/)
  })
})
