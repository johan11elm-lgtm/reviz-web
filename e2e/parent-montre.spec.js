// « Montre ça à tes parents » : un moins de 15 ans qui n'a pas donné l'adresse
// d'un parent (« Plus tard ») réussit son premier quiz ; la fin du quiz lui
// propose d'envoyer son score à un parent, et ce mail porte aussi l'accord.
import { test, expect } from '@playwright/test'
import { mockApiRoutes, compteRapide, sansDebordement } from './helpers'

const CAPTURES = process.env.CAPTURES_DIR
const plat = s => String(s).replace(/[\s  ]+/g, ' ').trim()

test.describe('Montre ça à tes parents', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('fin du premier quiz réussi → score envoyé au parent avec la demande d’accord', async ({ page }) => {
    await mockApiRoutes(page)
    // Le corps de la requête, avant que le faux serveur de mockApiRoutes y réponde.
    const envois = []
    await page.route('**/api/send-parental-consent', route => { envois.push(route.request().postDataJSON()); return route.fallback() })

    await compteRapide(page, {
      classe: '6ème', birthDate: '2014-03-01', onboarde: false, aller: '/onboarding',
      // « Plus tard » : pas encore d'adresse de parent.
      consentement: { status: 'pending', createdAt: Date.now() },
    })
    await page.getByRole('button', { name: 'Suivant' }).click()
    await page.getByRole('button', { name: 'Suivant' }).click()
    await page.getByRole('button', { name: 'C’est parti' }).click()
    await expect(page).toHaveURL(/\/quiz\?premiere=1/, { timeout: 10_000 })

    // Bonnes réponses, lues dans le chapitre chargé.
    const quiz = await page.evaluate(() => JSON.parse(localStorage.getItem('reviz-ai-data')).quiz)
    for (let i = 0; i < 5; i++) {
      const texte = plat(await page.locator('.qz-question').first().innerText())
      const q = quiz.find(x => plat(x.question) === texte)
      expect(q, `question introuvable : ${texte}`).toBeTruthy()
      await page.getByRole('button', { name: new RegExp(`^${'ABCD'[q.correct]} : `) }).click()
      await page.getByRole('button', { name: /Question suivante|Voir mon score/ }).click()
    }
    await expect(page.getByText('Quiz terminé')).toBeVisible()

    const carte = page.locator('.qz-parent')
    await expect(carte.getByText('Montre ça à tes parents')).toBeVisible()
    await expect(carte.getByText(/Envoie ton 5\/5 à un parent/)).toBeVisible()
    await sansDebordement(page, 'fin du quiz avec la carte parent')
    if (CAPTURES) await page.waitForTimeout(5000)
    if (CAPTURES) await carte.scrollIntoViewIfNeeded()
    if (CAPTURES) await page.screenshot({ path: `${CAPTURES}/parent-1-carte-390.png` })

    await carte.getByLabel('Adresse e-mail d\'un parent').fill('maman@famille.test')
    await carte.getByRole('button', { name: 'Envoyer' }).click()
    await expect(carte.getByText('C\'est parti')).toBeVisible({ timeout: 10_000 })
    await expect(carte.getByText(/m•••@famille\.test/)).toBeVisible()
    if (CAPTURES) await page.screenshot({ path: `${CAPTURES}/parent-2-envoye-390.png` })

    expect(envois).toHaveLength(1)
    expect(envois[0]).toMatchObject({ parentEmail: 'maman@famille.test', resultat: { score: 5, total: 5 } })
    expect(envois[0].resultat.chapitre).toMatchObject({ classe: '6ème' })

    // L'accueil ne réclame plus l'adresse : la demande est partie.
    await page.getByRole('button', { name: 'Continuer' }).click()
    await expect(page).toHaveURL(/\/$/, { timeout: 10_000 })
    await expect(page.getByText('Montre tes révisions à un parent')).toHaveCount(0)
  })
})
