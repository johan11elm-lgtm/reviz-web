// Lancement : Réviz+ offert à tout le monde (api/_lancement.js).
// Dépend de la date (avant le 26 octobre 2026 à minuit, heure de Paris) : après, la popup, le tarif
// fondateur et le libellé « Offert » changent, il faudra relire ce test.
import { test, expect } from '@playwright/test'
import { mockApiRoutes, compteRapide } from './helpers'

test.use({ viewport: { width: 390, height: 844 } })

test('Réviz+ offert : popup une seule fois, Réglages sans paiement', async ({ page }) => {
  await mockApiRoutes(page)
  const capture = nom => page.screenshot({ path: test.info().outputPath(`${nom}.png`), animations: 'disabled' })

  // Un compte neuf qui n'a encore vu aucune annonce, découverte passée.
  await compteRapide(page, { prenom: 'Léa', birthDate: '1990-05-01', annoncesVues: false })

  const annonce = page.getByRole('dialog', { name: /Réviz\+ offert jusqu’au 25 octobre/ })
  await expect(annonce).toBeVisible()
  await expect(annonce.getByText('Scans illimités')).toBeVisible()
  await expect(annonce.getByText('Réviz IA illimitée')).toBeVisible()
  await expect(annonce.getByText('Tous les thèmes')).toBeVisible()
  await page.waitForTimeout(600) // la feuille glisse depuis le bas avant la capture
  await capture('01-annonce')
  await annonce.getByRole('button', { name: 'Plus tard' }).click()

  // Revisite : plus de popup Réviz+, la Battle prend son tour.
  await page.goto('/')
  await expect(page.getByRole('dialog', { name: 'La Battle' })).toBeVisible()
  await expect(page.getByRole('dialog', { name: /Réviz\+ offert jusqu’au 25 octobre/ })).toHaveCount(0)
  await page.getByRole('dialog', { name: 'La Battle' }).getByRole('button', { name: 'Plus tard' }).click()

  // Encore une visite : plus aucune popup.
  await page.goto('/')
  await expect(page.locator('a[href^="/jeux"]').first()).toBeVisible() // l'accueil est bien rendu
  await expect(page.getByRole('dialog')).toHaveCount(0)

  await page.goto('/reglages')
  await expect(page.getByText('Offert', { exact: true })).toBeVisible()
  await expect(page.getByText('Réviz+ offert', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Passer à Réviz+' })).toHaveCount(0)
  await page.getByText('Offert', { exact: true }).scrollIntoViewIfNeeded()
  await capture('02-reglages')
})
