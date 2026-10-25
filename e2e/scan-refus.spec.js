// Scan refusé par l'IA : une photo de leçon trop difficile à lire (ILLISIBLE) n'est pas « pas une
// leçon » (NON_SCOLAIRE). L'élève voit le conseil qui correspond à ce qui cloche (ici : floue), et peut
// reprendre la photo. Le serveur est simulé : il renvoie le refus tel que le modèle le formule.
import { test, expect } from '@playwright/test'
import { mockApiRoutes, compteRapide } from './helpers'

// Une image PNG de 1 × 1 pixel : seul le refus renvoyé compte.
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64')

async function scannerUnePhoto(page, refus) {
  await page.route('**/api/analyse-image', route =>
    route.fulfill({ status: 200, contentType: 'text/plain; charset=utf-8', body: JSON.stringify(refus) }))
  await page.goto('/scan')
  await page.locator('input[type="file"]').first().setInputFiles({ name: 'lecon.png', mimeType: 'image/png', buffer: PNG })
  await page.getByRole('button', { name: 'C’est bon, analyse' }).click()
  await expect(page).toHaveURL(/\/analyse/)
}

test.describe('Scan refusé (390 px)', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('photo floue : le conseil de la mise au point, et on reprend la photo', async ({ page }) => {
    await mockApiRoutes(page)
    await compteRapide(page, { aller: null })
    await scannerUnePhoto(page, { error: 'ILLISIBLE', raison: 'floue' })
    await expect(page.getByText('On recommence la photo ?')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText(/Touche le texte sur l’écran pour faire la mise au point/)).toBeVisible()
    await expect(page.getByText("Ça n'a pas l'air d'une leçon")).toHaveCount(0)
    await page.screenshot({ path: test.info().outputPath('floue.png'), animations: 'disabled' })
    await page.getByRole('button', { name: 'Reprendre la photo' }).click()
    await expect(page).toHaveURL(/\/scan/)
  })

  test('pas une leçon : le message invite à recadrer si c’est bien un cours', async ({ page }) => {
    await mockApiRoutes(page)
    await compteRapide(page, { aller: null })
    await scannerUnePhoto(page, { error: 'NON_SCOLAIRE', raison: 'photo_sans_texte' })
    await expect(page.getByText("Ça n'a pas l'air d'une leçon").first()).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText(/Si c'est bien ta leçon, reprends la photo/)).toBeVisible()
    // L'élève peut réviser le même chapitre depuis le programme au lieu de repartir.
    await page.getByRole('button', { name: 'Trouver mon chapitre' }).click()
    await expect(page).toHaveURL(/\/programme/)
  })
})
