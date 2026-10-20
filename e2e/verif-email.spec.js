// L'élève entre dans l'app dès l'inscription ; la confirmation de l'email
// devient une ligne des rappels de l'accueil, qui disparaît d'elle-même quand
// il revient de sa messagerie après avoir cliqué le lien.
import { test, expect } from '@playwright/test'
import { mockApiRoutes, signup, verifyEmailViaEmulator, fermerAnnonceRevizPlus, fermerAnnonceBattle } from './helpers'

test('inscription → accueil directement, rappel « Confirme ton email » jusqu\'au clic sur le lien', async ({ page }) => {
  await mockApiRoutes(page)
  const email = await signup(page, { birthDate: '2009-05-01' })

  await expect(page).toHaveURL(/onboarding/, { timeout: 15_000 })
  await page.getByRole('button', { name: 'Passer' }).click()
  await expect(page).toHaveURL(/\/$/, { timeout: 10_000 })
  await fermerAnnonceRevizPlus(page)
  await fermerAnnonceBattle(page)

  const rappel = page.getByText('Confirme ton email')
  await expect(rappel).toBeVisible()
  await page.getByRole('button', { name: 'Renvoyer' }).click()
  await expect(page.getByText('Renvoyé')).toBeVisible()

  // Il clique le lien dans sa boîte mail, puis revient sur l'onglet.
  await verifyEmailViaEmulator(page, email)
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')))
  await expect(rappel).toHaveCount(0, { timeout: 10_000 })
})
