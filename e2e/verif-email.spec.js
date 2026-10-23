// L'élève entre dans l'app dès l'inscription ; la confirmation de l'email
// devient une ligne des rappels de l'accueil, qui disparaît d'elle-même quand
// il revient de sa messagerie après avoir cliqué le lien. L'écran
// /verify-email (demandé avant un scan ou Réviz+) fait la même vérification à la main.
import { test, expect } from '@playwright/test'
import { mockApiRoutes, signup, compteRapide, passerDecouverte, verifyEmailViaEmulator, fermerAnnonces } from './helpers'

test('inscription → accueil directement, rappel « Confirme ton e-mail » jusqu\'au clic sur le lien', async ({ page }) => {
  await mockApiRoutes(page)
  const email = await signup(page, { birthDate: '2009-05-01' })

  await expect(page).toHaveURL(/onboarding/, { timeout: 15_000 })
  await passerDecouverte(page)
  await fermerAnnonces(page)

  const rappel = page.getByText('Confirme ton e-mail')
  await expect(rappel).toBeVisible()
  await page.getByRole('button', { name: 'Renvoyer' }).click()
  await expect(page.getByText('Renvoyé')).toBeVisible()

  // Il clique le lien dans sa boîte mail, puis revient sur l'onglet.
  await verifyEmailViaEmulator(page, email)
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')))
  await expect(rappel).toHaveCount(0, { timeout: 10_000 })
})

test('/verify-email : « Pas encore confirmé » tant que le lien n\'est pas cliqué, puis retour à l\'accueil', async ({ page }) => {
  await mockApiRoutes(page)
  const { email } = await compteRapide(page, { emailVerifie: false, aller: '/verify-email' })

  await expect(page.getByText(/^Vérifie ton e-mail\. Un clic/)).toBeAttached()
  await expect(page.getByText(email)).toBeVisible()

  // Rien n'a été cliqué : on le dit gentiment, on reste ici.
  await page.getByRole('button', { name: 'J’ai confirmé mon e-mail' }).click()
  await expect(page.getByText('Pas encore confirmé.')).toBeVisible()
  await expect(page).toHaveURL(/verify-email/)

  await page.getByRole('button', { name: 'Renvoyer l’e-mail' }).click()
  await expect(page.getByText('E-mail renvoyé')).toBeVisible()

  // Le lien cliqué dans la boîte mail : le bouton revient à la page d'avant (l'accueil, arrivée directe).
  await verifyEmailViaEmulator(page, email)
  await page.getByRole('button', { name: 'J’ai confirmé mon e-mail' }).click()
  await expect(page).toHaveURL(/\/$/, { timeout: 15_000 })
  await expect(page.getByText('Confirme ton e-mail')).toHaveCount(0)
})
