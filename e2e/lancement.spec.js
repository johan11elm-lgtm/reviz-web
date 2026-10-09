// Lancement : Réviz+ offert à tout le monde (api/_lancement.js).
import { test, expect } from '@playwright/test'
import { mockApiRoutes, signup, verifyEmailAndOnboard } from './helpers'

test.use({ viewport: { width: 390, height: 844 } })

test('Réviz+ offert : popup une seule fois, Réglages sans paiement', async ({ page }) => {
  await mockApiRoutes(page)
  const capture = nom => page.screenshot({ path: test.info().outputPath(`${nom}.png`), animations: 'disabled' })

  const email = await signup(page, { birthDate: '1990-05-01', prenom: 'Léa' })
  await verifyEmailAndOnboard(page, email, { garderAnnonce: 'revizplus' })

  const annonce = page.getByRole('dialog', { name: 'Réviz+ est offert' })
  await expect(annonce).toBeVisible()
  await expect(annonce.getByText('30 leçons analysées par semaine', { exact: false })).toBeVisible()
  await page.waitForTimeout(600)
  await capture('01-annonce')
  await annonce.getByRole('button', { name: 'Plus tard' }).click()

  // Revisite : plus de popup Réviz+, la Battle prend son tour.
  await page.goto('/')
  await expect(page.getByRole('dialog', { name: 'La Battle' })).toBeVisible()
  await expect(page.getByRole('dialog', { name: 'Réviz+ est offert' })).toHaveCount(0)
  await page.getByRole('dialog', { name: 'La Battle' }).getByRole('button', { name: 'Plus tard' }).click()

  await page.goto('/reglages')
  await expect(page.getByText('Réviz+ offert', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Passer à Réviz+' })).toHaveCount(0)
  await page.getByText('Réviz+ offert', { exact: true }).scrollIntoViewIfNeeded()
  await capture('02-reglages')
})
