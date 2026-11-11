// Retour après une absence (11/11) : un élève revient après 5 jours sans réviser. L'accueil lui
// demande ce qui l'a éloigné, répond, puis la reprise de 5 minutes lance ses exercices.
import { test, expect } from '@playwright/test'
import { mockApiRoutes, compteRapide, sansDebordement } from './helpers'

const CAPTURES = process.env.CAPTURES_DIR
async function capture(page, nom) {
  await page.waitForTimeout(CAPTURES ? 1500 : 200)
  await page.screenshot({ path: CAPTURES ? `${CAPTURES}/${nom}.png` : test.info().outputPath(`${nom}.png`), animations: 'disabled' })
}

test('téléphone : 5 jours sans réviser → « Content de te revoir » → reprise', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await mockApiRoutes(page)
  const il5jours = Date.now() - 5 * 86_400_000 // en millisecondes, comme revisionService
  const revision = { id: 'r1', type: 'exercices', lessonId: null, source: 'decouverte', revisedAt: il5jours, termineAt: il5jours, score: 3, total: 3 }
  // La révision est posée avant la connexion, comme si l'élève avait révisé sur cet appareil.
  await compteRapide(page, { prenom: 'Léa', birthDate: '2011-05-01', aller: null })
  const uid = await page.evaluate(() => Object.keys(localStorage).find(k => k.startsWith('reviz-level-'))?.slice('reviz-level-'.length))
  await page.evaluate(({ uid, revision }) => localStorage.setItem(`reviz-revisions-${uid}`, JSON.stringify([revision])), { uid, revision })
  await page.goto('/')

  const fenetre = page.getByRole('dialog', { name: 'Content de te revoir' })
  await expect(fenetre).toBeVisible({ timeout: 15_000 })
  await expect(fenetre).toContainText('Content de te revoir, Léa.')
  await expect(fenetre).toContainText(/Ça fait 5\sjours/)
  await sansDebordement(page, 'accueil du retour')
  await capture(page, '03-retour-question-390')
  await fenetre.getByRole('button', { name: 'Je ne savais pas quoi réviser' }).click()
  await expect(fenetre).toContainText('Note ton prochain contrôle')
  await capture(page, '04-retour-reponse-390')
  await fenetre.getByRole('button', { name: 'Reprendre en 5 minutes' }).click()
  await expect(fenetre).toHaveCount(0)
  await expect(page).not.toHaveURL(/\/$/, { timeout: 10_000 })

  // Une seule fois pour cette absence.
  await page.goto('/')
  await expect(page.getByRole('dialog', { name: 'Content de te revoir' })).toHaveCount(0)
})
