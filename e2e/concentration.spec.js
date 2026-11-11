// Mode concentration (11/11) : lancé depuis l'accueil, le minuteur suit l'élève dans l'app (pause,
// reprise) ; à la fin, le bilan de ce qu'il a fait pendant la séance.
import { test, expect } from '@playwright/test'
import { mockApiRoutes, compteRapide, sansDebordement } from './helpers'

const CAPTURES = process.env.CAPTURES_DIR

test('téléphone : 15 minutes de concentration, pause, puis le bilan', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await mockApiRoutes(page)
  const lea = await compteRapide(page, { prenom: 'Léa', birthDate: '2011-05-01' })
  await page.getByRole('group', { name: 'Démarre en un clic' }).getByRole('button', { name: /Mode concentration/ }).click()
  const fenetre = page.getByRole('dialog', { name: 'Mode concentration' })
  await fenetre.getByRole('radio', { name: /15/ }).click()
  await fenetre.getByRole('button', { name: 'C’est parti' }).click()

  const minuteur = page.getByRole('timer')
  await expect(minuteur).toContainText(/1[45]:\d\d/)
  // Il suit l'élève sur une autre page.
  await page.goto('/programme')
  await expect(minuteur).toBeVisible()
  await minuteur.getByRole('button', { name: 'Pause' }).click()
  await expect(minuteur).toHaveAttribute('aria-label', /en pause/)
  await sansDebordement(page, 'minuteur')
  if (CAPTURES) { await page.waitForTimeout(800); await page.screenshot({ path: `${CAPTURES}/14-concentration-390.png`, animations: 'disabled' }) }
  await minuteur.getByRole('button', { name: 'Reprendre' }).click()

  // Fin de séance (on avance l'horloge de la séance) avec une séance d'exercices faite pendant.
  await page.evaluate(uid => {
    const c = JSON.parse(localStorage.getItem(`reviz-concentration-${uid}`))
    c.debut -= 16 * 60_000
    localStorage.setItem(`reviz-concentration-${uid}`, JSON.stringify(c))
    const t = Date.now() - 5 * 60_000
    localStorage.setItem(`reviz-revisions-${uid}`, JSON.stringify([{ id: String(t), type: 'exercices', lessonId: null, revisedAt: t, termineAt: t, score: 8, total: 10, xp: 90 }]))
  }, lea.uid)
  await page.reload()
  const bilan = page.getByRole('dialog', { name: 'Séance de concentration terminée' })
  await expect(bilan).toBeVisible({ timeout: 10_000 })
  await expect(bilan).toContainText('15 minutes de concentration')
  await expect(bilan).toContainText('1 séance d’exercices')
  await expect(bilan).toContainText('+90 XP')
  if (CAPTURES) { await page.waitForTimeout(1200); await page.screenshot({ path: `${CAPTURES}/15-concentration-bilan-390.png`, animations: 'disabled' }) }
  await bilan.getByRole('button', { name: 'Terminer' }).click()
  await expect(page.getByRole('timer')).toHaveCount(0)
})
