// Chapitre d'arrivée (11/11, repris de Knowunity) : un élève lit la fiche publique de Thalès et clique
// vers l'app. L'entrée garde ce chapitre (sa classe est connue, pas d'écran de classe), l'annonce sur
// « C'est prêt », et juste après la création du compte, la séance s'ouvre sur Thalès.
import { test, expect } from '@playwright/test'
import { mockApiRoutes, mockProgramme, uniqueEmail, remplirNaissance, sansDebordement } from './helpers'

const CAPTURES = process.env.CAPTURES_DIR
const capture = (page, nom) => page.screenshot({ path: CAPTURES ? `${CAPTURES}/${nom}.png` : test.info().outputPath(`${nom}.png`), animations: 'disabled' })

test('venu d’une fiche, l’entrée reprend son chapitre après le compte', async ({ page }) => {
  test.setTimeout(90_000)
  await page.setViewportSize({ width: 390, height: 844 })
  await mockApiRoutes(page)
  await mockProgramme(page)
  await page.goto('/essai?classe=3ème&matiere=maths&chapitre=theoreme-de-thales&via=fiche')
  await expect(page).toHaveURL(/\/commencer\?/)
  await expect.poll(() => page.evaluate(() => localStorage.getItem('reviz-arrivee'))).toContain('theoreme-de-thales')

  await page.getByRole('button', { name: 'C’est parti' }).click()
  await page.getByLabel('Ton prénom').fill('Lina')
  await page.getByRole('button', { name: 'Continuer', exact: true }).click()
  // La classe vient de la fiche : on passe directement au contrôle.
  await page.getByRole('button', { name: 'Pas de contrôle prévu' }).click()
  await page.getByRole('radio', { name: 'Savoir quoi réviser' }).click()
  await page.getByRole('button', { name: 'Continuer', exact: true }).click()
  await page.getByRole('radio', { name: /Avoir la moyenne/ }).click()
  await page.getByRole('button', { name: 'Continuer', exact: true }).click()

  await expect(page.getByText(/Juste après, on reprend/)).toContainText('Thalès', { timeout: 10_000 })
  await sansDebordement(page, 'entrée : reprendre le chapitre')
  await capture(page, 'arrivee-fiche-390')

  await page.getByRole('button', { name: 'Créer mon compte' }).click()
  await remplirNaissance(page, '2010-04-01')
  await page.getByRole('button', { name: 'Continuer', exact: true }).click()
  await page.getByLabel('E-mail', { exact: true }).fill(uniqueEmail())
  await page.getByLabel('Mot de passe', { exact: true }).fill('motdepasse123')
  await page.getByRole('checkbox').check({ force: true })
  await page.getByRole('button', { name: 'Créer mon compte' }).click()

  await expect(page).toHaveURL(/\/exercices$/, { timeout: 20_000 })
  await expect(page.getByText(/Thalès/).first()).toBeVisible()
  await expect(page.getByText(/· 1 sur 10$/)).toBeVisible()
  expect(await page.evaluate(() => localStorage.getItem('reviz-arrivee'))).toBeNull()
})
