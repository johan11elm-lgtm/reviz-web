// Scan « Et ensuite ? » (11/11) : avant d'analyser, l'élève choisit ce qu'il veut faire de sa leçon ;
// une fois la fiche prête, Réviz enchaîne (le test tout de suite, ou Réviz IA qui explique).
import { test, expect } from '@playwright/test'
import { mockApiRoutes, compteRapide, ouvrirSaisieTexte, sansDebordement } from './helpers'

const CAPTURES = process.env.CAPTURES_DIR
const TEXTE = 'La photosynthèse est le processus par lequel les plantes vertes fabriquent leur matière organique à partir de la lumière du soleil, de l’eau et du dioxyde de carbone. Elle a lieu dans les chloroplastes des feuilles et rejette du dioxygène dans l’air. '.repeat(2)

test.describe('Scan : et ensuite ?', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('« Me tester tout de suite » : la fiche prête, le test commence', async ({ page }) => {
    await mockApiRoutes(page)
    await compteRapide(page, { birthDate: '2011-05-01', aller: '/scan' })
    const champ = await ouvrirSaisieTexte(page)
    await champ.fill(TEXTE)
    const choix = page.getByRole('radiogroup', { name: 'Et ensuite ?' })
    await expect(choix.getByRole('radio', { name: 'Voir la fiche' })).toHaveAttribute('aria-checked', 'true')
    await choix.getByRole('radio', { name: 'Me tester tout de suite' }).click()
    await sansDebordement(page, 'scan et ensuite')
    if (CAPTURES) { await page.waitForTimeout(800); await page.screenshot({ path: `${CAPTURES}/18-scan-ensuite-390.png`, animations: 'disabled' }) }
    await page.getByRole('button', { name: /Analyser ce texte/ }).click()
    await expect(page).toHaveURL(/\/(exercices|quiz)/, { timeout: 20_000 })
    // Un retour arrière ramène à la fiche, sans relancer le test.
    await page.goBack()
    await expect(page).toHaveURL(/\/analyse/)
    await page.waitForTimeout(800)
    await expect(page).toHaveURL(/\/analyse/)
  })

  test('« Que Réviz IA m’explique » : la question part toute seule', async ({ page }) => {
    await mockApiRoutes(page)
    const demandes = []
    await page.route('**/api/chat', route => {
      demandes.push(route.request().postDataJSON())
      return route.fulfill({ status: 200, contentType: 'text/event-stream', body: `data: ${JSON.stringify({ meta: { remaining: 9, limit: 10 } })}\n\ndata: ${JSON.stringify({ text: 'Les idées clés : la lumière, l’eau, le CO₂.' })}\n\ndata: [DONE]\n\n` })
    })
    await compteRapide(page, { birthDate: '2011-05-01', aller: '/scan' })
    const champ = await ouvrirSaisieTexte(page)
    await champ.fill(TEXTE)
    await page.getByRole('radiogroup', { name: 'Et ensuite ?' }).getByRole('radio', { name: 'Que Réviz IA m’explique' }).click()
    await page.getByRole('button', { name: /Analyser ce texte/ }).click()
    await expect(page).toHaveURL(/\/coach/, { timeout: 20_000 })
    await expect(page.getByText(/Les idées clés/)).toBeVisible({ timeout: 15_000 })
    expect(JSON.stringify(demandes[0])).toContain('Explique-moi cette leçon simplement')
  })
})
