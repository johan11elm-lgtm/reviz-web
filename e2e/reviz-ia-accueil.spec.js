// Réviz IA depuis l'accueil (docs/plan-reviz-ia-agent.md, étapes 3 et 4), sur téléphone :
// la recherche trouve les chapitres et envoie une question à Réviz IA ; des questions ratées
// hier font parler Réviz IA la première et deviennent « Bats ton toi d'hier » (3 questions,
// puis hier contre aujourd'hui), sur l'accueil comme dans Réviz IA.
import { test, expect } from '@playwright/test'
import { mockApiRoutes, mockProgramme, compteRapide, ouvrirChapitreDuProgramme, chapitreThales } from './helpers'
import { nbsp } from '../src/utils/typography.js'

test.describe('Réviz IA depuis l’accueil — téléphone (390 px)', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true })

  test('la recherche trouve le chapitre, et « Demander à Réviz IA » envoie la question', async ({ page }) => {
    await mockApiRoutes(page)
    await mockProgramme(page)
    let corps = null
    await page.route('**/api/chat', route => {
      corps = route.request().postDataJSON()
      return route.fulfill({
        status: 200,
        contentType: 'text/event-stream',
        body: [{ meta: { remaining: 9, limit: 10 } }, { outil: 'Je cherche dans ton programme…' }, { text: 'Thalès sert à calculer des longueurs.' }].map(e => `data: ${JSON.stringify(e)}\n\n`).join('') + 'data: [DONE]\n\n',
      })
    })
    await compteRapide(page, { prenom: 'Léa' })
    await page.goto('/')
    const champ = page.getByLabel('Chercher un chapitre ou demander à Réviz IA')
    await champ.tap()
    await champ.fill('thalès')
    await expect(page.getByRole('button', { name: /Demander à Réviz IA « thalès »/ })).toBeVisible()
    await expect(page.getByRole('button', { name: /Le théorème de Thalès/ })).toBeVisible()
    await page.screenshot({ path: test.info().outputPath('accueil-recherche.png') })

    // Un chapitre trouvé s'ouvre sur sa fiche.
    await page.getByRole('button', { name: /Le théorème de Thalès/ }).tap()
    await expect(page).toHaveURL(/\/analyse/)

    // Une question : Entrée l'envoie à Réviz IA, qui répond aussitôt.
    await page.goto('/')
    await page.getByLabel('Chercher un chapitre ou demander à Réviz IA').fill('thalès ça sert à quoi')
    await page.getByLabel('Chercher un chapitre ou demander à Réviz IA').press('Enter')
    await expect(page).toHaveURL(/\/coach$/)
    await expect(page.getByText('Thalès sert à calculer des longueurs.')).toBeVisible({ timeout: 10_000 })
    expect(corps.lessonId).toBeUndefined()
    expect(corps.messages.at(-1)).toEqual({ role: 'user', content: 'thalès ça sert à quoi' })
  })

  test('des erreurs d’hier : Réviz IA en parle la première, et le défi se joue en 3 questions', async ({ page }) => {
    await mockApiRoutes(page)
    await mockProgramme(page)
    const { uid } = await compteRapide(page, { prenom: 'Léa' })
    await page.goto('/programme?matiere=maths')
    await ouvrirChapitreDuProgramme(page)
    const quiz = chapitreThales().quiz
    await page.evaluate(({ uid, enonces }) => {
      localStorage.setItem(`reviz-erreurs-${uid}`, JSON.stringify({ 'prog-theoreme-de-thales': { questions: enonces, at: Date.now() - 86_400_000 } }))
    }, { uid, enonces: quiz.slice(0, 4).map(q => q.question) })

    // L'accueil propose le défi à la place de « Fais un quiz ».
    await page.goto('/')
    await expect(page.getByRole('button', { name: /Bats ton toi d’hier.*4 questions ratées hier/ })).toBeVisible()

    // Réviz IA, sans leçon, parle la première.
    await page.goto('/coach')
    await expect(page.getByText(/Hier, tu as raté 4 questions sur/)).toBeVisible()
    await page.screenshot({ path: test.info().outputPath('coach-ouverture.png') })
    await page.getByRole('button', { name: /^Commencer : Bats ton toi d’hier/ }).tap()

    await expect(page).toHaveURL(/\/quiz\?erreurs=1&defi=1/)
    for (const [i, q] of quiz.slice(0, 3).entries()) {
      await expect(page.getByText(`Question ${i + 1} sur 3`)).toBeVisible()
      await expect(page.getByRole('heading', { name: nbsp(q.question) })).toBeVisible()
      await page.getByRole('button', { name: new RegExp(`^[A-D] : ${q.choices[q.correct].replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`) }).tap()
      await page.getByRole('button', { name: /Question suivante|Voir mon score/ }).tap()
    }
    await expect(page.getByText('Bats ton toi d’hier')).toBeVisible()
    await expect(page.getByLabel('Hier : 0 sur 3. Aujourd’hui : 3 sur 3.')).toBeVisible()
    await page.screenshot({ path: test.info().outputPath('defi-fin.png') })

    // Réussies, ces trois-là sortent des erreurs ; la quatrième reste à refaire.
    const reste = await page.evaluate(u => JSON.parse(localStorage.getItem(`reviz-erreurs-${u}`)), uid)
    expect(reste['prog-theoreme-de-thales'].questions).toEqual([quiz[3].question])
  })
})
