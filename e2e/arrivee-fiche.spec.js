// Chapitre d'arrivée (11/11, repris de Knowunity) : un élève lit la fiche publique de Thalès, clique
// vers l'app, mais crée un vrai compte plutôt que l'essai. À la fin de la découverte, Réviz propose
// de reprendre ce chapitre (au lieu des 3 questions faciles), et la séance s'ouvre sur Thalès.
import { test, expect } from '@playwright/test'
import { mockApiRoutes, mockProgramme, signup, sansDebordement } from './helpers'

const CAPTURES = process.env.CAPTURES_DIR
const capture = (page, nom) => page.screenshot({ path: CAPTURES ? `${CAPTURES}/${nom}.png` : test.info().outputPath(`${nom}.png`), animations: 'disabled' })

test('venu d’une fiche, la découverte reprend son chapitre', async ({ page }) => {
  test.setTimeout(90_000)
  await page.setViewportSize({ width: 390, height: 844 })
  await mockApiRoutes(page)
  await mockProgramme(page)
  await page.goto('/essai?classe=3ème&matiere=maths&chapitre=theoreme-de-thales&via=fiche')
  await expect(page.getByText('Teste-toi sur ce chapitre.', { exact: true })).toBeVisible({ timeout: 15_000 })
  await expect.poll(() => page.evaluate(() => localStorage.getItem('reviz-arrivee'))).toContain('theoreme-de-thales')

  await signup(page, { prenom: 'Lina', birthDate: '2011-04-01' })
  await expect(page).toHaveURL(/onboarding/, { timeout: 15_000 })
  await page.getByRole('button', { name: 'C’est parti' }).click()
  await page.getByRole('button', { name: 'Pas de contrôle prévu' }).click()
  await page.getByRole('radio', { name: 'Savoir quoi réviser' }).click()
  await page.getByRole('button', { name: 'Continuer' }).click()
  await page.getByRole('radio', { name: /Avoir la moyenne/ }).click()
  await page.getByRole('button', { name: 'Continuer' }).click()

  const reprendre = page.getByRole('button', { name: 'Reprendre ce chapitre' })
  await expect(reprendre).toBeVisible({ timeout: 15_000 })
  await expect(page.getByText(/On reprend là où tu étais/)).toContainText('Thalès')
  await expect(page.getByRole('button', { name: /questions faciles pour commencer/ })).toBeVisible()
  await sansDebordement(page, 'découverte : reprendre le chapitre')
  await capture(page, 'arrivee-fiche-390')
  await reprendre.click()
  await expect(page).toHaveURL(/\/exercices$/, { timeout: 15_000 })
  await expect(page.getByText(/Thalès/).first()).toBeVisible()
  await expect(page.getByText(/· 1 sur 10$/)).toBeVisible()
  expect(await page.evaluate(() => localStorage.getItem('reviz-arrivee'))).toBeNull()
})
