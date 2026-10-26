// Première révision guidée : la découverte finit sur un quiz de 5 questions
// (chapitre du moment de sa classe), puis l'accueil. Contenus réels de public/.
import { test, expect } from '@playwright/test'
import { mockApiRoutes, compteRapide, sansDebordement, fermerAnnonceRevizPlus, fermerAnnonceJeux } from './helpers'

const CAPTURES = process.env.CAPTURES_DIR

test.describe('Première révision après la découverte', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('découverte → quiz de 5 questions → accueil', async ({ page }) => {
    await mockApiRoutes(page)
    const { uid } = await compteRapide(page, { classe: '6ème', birthDate: '2014-03-01', onboarde: false, aller: '/onboarding' })
    expect(uid).toBeTruthy()

    await page.getByRole('button', { name: 'Suivant' }).click()
    await page.getByRole('button', { name: 'Suivant' }).click()
    await expect(page.getByText('Ta première révision')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText(/en maths\. 5\squestions, une\sminute\./)).toBeVisible()
    await sansDebordement(page, 'dernier écran de la découverte')
    if (CAPTURES) await page.waitForTimeout(2500)
    if (CAPTURES) await page.screenshot({ path: `${CAPTURES}/1-decouverte-390.png` })

    await page.getByRole('button', { name: 'C’est parti' }).click()
    await expect(page).toHaveURL(/\/quiz\?premiere=1/, { timeout: 10_000 })
    await expect(page.getByText('Question 1 sur 5')).toBeVisible()
    await sansDebordement(page, 'quiz court')
    if (CAPTURES) await page.screenshot({ path: `${CAPTURES}/2-quiz-390.png` })

    for (let i = 0; i < 5; i++) {
      await page.getByRole('button', { name: /^A : / }).click()
      await page.getByRole('button', { name: /Question suivante|Voir mon score/ }).click()
    }
    await expect(page.getByText('Quiz terminé')).toBeVisible()
    await expect(page.getByText('Ta première révision est faite.', { exact: true })).toBeVisible()
    await sansDebordement(page, 'fin du quiz court')
    if (CAPTURES) await page.waitForTimeout(6000)
    if (CAPTURES) await page.screenshot({ path: `${CAPTURES}/3-fin-390.png`, fullPage: true })

    await page.getByRole('button', { name: 'Continuer' }).click()
    await expect(page).toHaveURL(/\/$/, { timeout: 10_000 })
    // La découverte ne revient pas.
    await fermerAnnonceRevizPlus(page)
    await fermerAnnonceJeux(page)
    await page.goto('/onboarding')
    await expect(page).toHaveURL(/\/$/, { timeout: 10_000 })
  })
})
