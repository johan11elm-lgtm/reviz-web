// Parcours cœur : inscription → onboarding → scan (IA mockée) → 4 formats →
// quiz complet → feedback élève. Tourne contre l'Emulator Suite Firebase.
import { test, expect } from '@playwright/test'
import { mockApiRoutes, signup, verifyEmailAndOnboard, MOCK_AI_RESPONSE } from './helpers'

test.describe('Parcours cœur : inscription → scan → révision', () => {
  test('un élève s\'inscrit, vérifie son email, scanne une leçon et révise sur les 4 formats', async ({ page }) => {
    await mockApiRoutes(page)

    // ── Inscription (majeur : pas de tunnel parental) + vraie vérif d'email ──
    const email = await signup(page, { birthDate: '2004-03-15' })
    await verifyEmailAndOnboard(page, email)

    // ── Home : accueil personnalisé ──
    await expect(page.getByText(/Salut Testeur|Testeur/).first()).toBeVisible()

    // ── Scan en mode texte ──
    await page.goto('/scan')
    await page.getByRole('tab', { name: /Texte/ }).click()
    await page.locator('.scan-textarea').fill(
      'La photosynthèse est le processus par lequel les végétaux chlorophylliens '
      + 'fabriquent leur matière organique à partir de CO2, d\'eau et de lumière. '
      + 'Elle se déroule dans les chloroplastes et rejette du dioxygène.'
    )
    await page.getByRole('button', { name: /Analyser/ }).click()

    // ── Analyse : la leçon générée s'affiche (IA mockée) ──
    // On attend l'EXCERPT généré (et pas le titre : le texte brut de la leçon
    // est visible dès l'écran de chargement et matcherait trop tôt).
    await expect(page).toHaveURL(/analyse/)
    await expect(page.getByText(MOCK_AI_RESPONSE.metadata.excerpt)).toBeVisible({ timeout: 15_000 })

    // ── Résumé ──
    await page.goto('/resume')
    await expect(page.getByText('Chloroplaste').first()).toBeVisible()

    // ── Flashcards : le recto de la 1ère carte est celui de la leçon ──
    await page.goto('/flashcards')
    await expect(page.getByText(MOCK_AI_RESPONSE.flashcards[0].front)).toBeVisible()

    // ── Carte mentale : les 4 branches générées sont là ──
    await page.goto('/mindmap')
    for (const branch of MOCK_AI_RESPONSE.mindmap.branches) {
      await expect(page.getByRole('button', { name: new RegExp(branch.label) })).toBeVisible()
    }

    // ── Quiz complet (3 questions mockées) ──
    await page.goto('/quiz')
    for (const q of MOCK_AI_RESPONSE.quiz) {
      await expect(page.getByText(q.question)).toBeVisible()
      await page.getByRole('button', { name: new RegExp(q.choices[q.correct]) }).click()
      await page.getByRole('button', { name: /Question suivante|Voir mon résultat/ }).click()
    }

    // ── Écran de fin : score parfait + feedback élève ──
    await expect(page.getByText(/3\s*\/\s*3|Excellent/).first()).toBeVisible()
    await page.getByRole('button', { name: 'Oui, utile' }).click()
    await expect(page.getByText(/Merci pour ton retour/)).toBeVisible()
  })
})
