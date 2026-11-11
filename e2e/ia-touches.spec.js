// Petites touches de Réviz IA (11/11) : le clavier de maths, et « Expliquer » sur un mot surligné.
import { test, expect } from '@playwright/test'
import { mockApiRoutes, mockProgramme, compteRapide, ouvrirChapitreDuProgramme, sansDebordement } from './helpers'

const CAPTURES = process.env.CAPTURES_DIR

test('téléphone : un symbole de maths, puis « Expliquer » sur un mot de la réponse', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await mockApiRoutes(page)
  await mockProgramme(page)
  const demandes = []
  await page.route('**/api/chat', route => {
    demandes.push(route.request().postDataJSON())
    return route.fulfill({
      status: 200, contentType: 'text/event-stream',
      body: [{ meta: { remaining: 9, limit: 10 } }, { text: 'Avec Thalès, les longueurs sont **proportionnelles**.' }].map(e => `data: ${JSON.stringify(e)}\n\n`).join('') + 'data: [DONE]\n\n',
    })
  })
  await compteRapide(page, { prenom: 'Léa', birthDate: '2011-05-01' })
  await page.goto('/programme?matiere=maths')
  await ouvrirChapitreDuProgramme(page)
  await page.getByRole('link', { name: /Poser une question à Réviz IA/ }).click()

  const champ = page.getByLabel(/Ta question/)
  await champ.fill('AB = 3 et AC = 5, combien vaut AB')
  await page.getByRole('button', { name: 'Clavier de maths' }).click()
  await page.getByRole('button', { name: 'Insérer ²' }).click()
  await expect(champ).toHaveValue('AB = 3 et AC = 5, combien vaut AB²')
  await sansDebordement(page, 'clavier de maths')
  if (CAPTURES) { await page.waitForTimeout(800); await page.screenshot({ path: `${CAPTURES}/16-clavier-maths-390.png`, animations: 'disabled' }) }
  await page.getByRole('button', { name: 'Envoyer la question' }).click()
  await expect(page.locator('.ia-reponse-txt strong')).toHaveText('proportionnelles', { timeout: 15_000 })

  // Surligner « proportionnelles » dans la réponse : le bouton « Expliquer » apparaît au-dessus.
  await page.locator('.ia-reponse-txt strong').evaluate(el => {
    const r = document.createRange(); r.selectNodeContents(el)
    const s = window.getSelection(); s.removeAllRanges(); s.addRange(r)
  })
  const expliquer = page.getByRole('button', { name: 'Expliquer « proportionnelles »' })
  await expect(expliquer).toBeVisible()
  if (CAPTURES) { await page.waitForTimeout(600); await page.screenshot({ path: `${CAPTURES}/17-expliquer-390.png`, animations: 'disabled' }) }
  await expliquer.click()
  await expect.poll(() => demandes.length).toBe(2)
  expect(JSON.stringify(demandes[1])).toContain('Explique-moi « proportionnelles » plus simplement, avec un exemple.')
})
