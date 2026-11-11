// « Explique à voix haute » (11/11) : depuis la fiche d'un chapitre, l'élève raconte ce qu'il a
// retenu (ici à l'écrit : Chrome sans écran n'a pas de micro), puis Réviz IA corrige.
import { test, expect } from '@playwright/test'
import { mockApiRoutes, mockProgramme, compteRapide, ouvrirChapitreDuProgramme, sansDebordement } from './helpers'

const CAPTURES = process.env.CAPTURES_DIR

test('téléphone : explique le chapitre, Réviz IA répond', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await mockApiRoutes(page)
  await mockProgramme(page)
  const demandes = []
  await page.route('**/api/chat', route => {
    demandes.push(route.request().postDataJSON())
    return route.fulfill({
      status: 200, contentType: 'text/event-stream',
      body: [{ meta: { remaining: 9, limit: 10 } }, { text: 'Bien vu pour les droites parallèles. Il manque la condition sur les points alignés.' }]
        .map(e => `data: ${JSON.stringify(e)}\n\n`).join('') + 'data: [DONE]\n\n',
    })
  })
  await compteRapide(page, { prenom: 'Léa', birthDate: '2011-05-01' })
  await page.goto('/programme?matiere=maths')
  await ouvrirChapitreDuProgramme(page)

  await page.getByRole('button', { name: /Explique-le à voix haute/ }).click()
  const feuille = page.getByRole('dialog', { name: 'Explique à voix haute' })
  await expect(feuille).toContainText('Le théorème de Thalès')
  if (await feuille.getByRole('button', { name: 'Je préfère l’écrire' }).count()) await feuille.getByRole('button', { name: 'Je préfère l’écrire' }).click()
  await feuille.getByLabel('Ce que tu as retenu').fill('Si deux droites sont parallèles, les rapports des longueurs sont égaux.')
  await sansDebordement(page, 'explique à voix haute')
  if (CAPTURES) { await page.waitForTimeout(1200); await page.screenshot({ path: `${CAPTURES}/08-explique-390.png`, animations: 'disabled' }) }
  await feuille.getByRole('button', { name: 'Demander à Réviz IA' }).click()

  await expect(page).toHaveURL(/\/coach/, { timeout: 10_000 })
  await expect(page.getByText(/Il manque la condition sur les points alignés/)).toBeVisible({ timeout: 15_000 })
  expect(JSON.stringify(demandes[0])).toContain('les rapports des longueurs sont égaux')
  if (CAPTURES) { await page.waitForTimeout(1200); await page.screenshot({ path: `${CAPTURES}/09-explique-reponse-390.png`, animations: 'disabled' }) }
})
