// Première révision guidée : la découverte finit sur une séance de 5 exercices
// (chapitre du moment de sa classe), puis l'accueil. Contenus réels de public/.
// Depuis le 29/10, la séance remplace le quiz de 5 questions.
import { test, expect } from '@playwright/test'
import { mockApiRoutes, compteRapide, sansDebordement, fermerAnnonceRevizPlus, fermerAnnonceJeux } from './helpers'
import { construireSeance } from '../src/utils/exercicesChapitre.js'
import { NB_QUESTIONS_PREMIERE } from '../src/utils/premiereRevision.js'
import { jouerSeance } from './exercices-aides'

const CAPTURES = process.env.CAPTURES_DIR

test.describe('Première révision après la découverte', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('découverte → séance de 5 exercices → accueil', async ({ page }) => {
    await mockApiRoutes(page)
    const { uid } = await compteRapide(page, { classe: '6ème', birthDate: '2014-03-01', onboarde: false, aller: '/onboarding' })
    expect(uid).toBeTruthy()

    await page.getByRole('button', { name: 'Suivant' }).click()
    await page.getByRole('button', { name: 'Suivant' }).click()
    await expect(page.getByText('Ta première révision')).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText(/en maths\. 5\sexercices, deux\sminutes\./)).toBeVisible()
    await sansDebordement(page, 'dernier écran de la découverte')
    if (CAPTURES) await page.waitForTimeout(2500)
    if (CAPTURES) await page.screenshot({ path: `${CAPTURES}/1-decouverte-390.png` })

    await page.getByRole('button', { name: 'C’est parti' }).click()
    await expect(page).toHaveURL(/\/exercices\?premiere=1/, { timeout: 10_000 })
    await expect(page.getByText(/· 1 sur 5$/)).toBeVisible()
    await sansDebordement(page, 'séance courte')
    if (CAPTURES) await page.screenshot({ path: `${CAPTURES}/2-seance-390.png` })

    // La même séance, tirée avec une graine fixe pour que le test en connaisse les réponses.
    await page.goto('/exercices?premiere=1&graine=42')
    const ai = await page.evaluate(() => JSON.parse(localStorage.getItem('reviz-ai-data')))
    const seance = construireSeance(ai, { graine: 42, nombre: NB_QUESTIONS_PREMIERE })
    expect(seance).toHaveLength(5)
    await jouerSeance(page, seance)
    await expect(page.getByText(/^Ta première révision est faite\./)).toBeVisible()
    await sansDebordement(page, 'fin de la séance courte')
    if (CAPTURES) await page.waitForTimeout(6000)
    if (CAPTURES) await page.screenshot({ path: `${CAPTURES}/3-fin-390.png`, fullPage: true })

    await page.getByRole('button', { name: 'Continuer' }).click()
    await expect(page).toHaveURL(/\/$/, { timeout: 10_000 })
    // La découverte ne revient pas.
    await fermerAnnonceRevizPlus(page)
    await fermerAnnonceJeux(page)
    await page.goto('/onboarding')
    await expect(page).toHaveURL(/\/$/, { timeout: 10_000 })
  })
})
