// Première révision guidée : la découverte finit sur la séance d'accueil (3 exercices
// faciles écrits à la main, sans chapitre, depuis le 04/11), puis le programme.
// La révision est notée dès la première réponse.
import { test, expect } from '@playwright/test'
import { mockApiRoutes, compteRapide, sansDebordement, fermerAnnonceRevizPlus, fermerAnnonceJeux, estOrdinateur } from './helpers'
import { SEANCE_ACCUEIL } from '../src/utils/seanceAccueil.js'
import { jouer, NOMS, SANS_VALIDER } from './exercices-aides'

const CAPTURES = process.env.CAPTURES_DIR

test.describe('Première révision après la découverte', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('découverte → séance d’accueil de 3 exercices → programme', async ({ page }) => {
    await mockApiRoutes(page)
    const { uid } = await compteRapide(page, { classe: '6ème', birthDate: '2014-03-01', onboarde: false, aller: '/onboarding' })
    expect(uid).toBeTruthy()

    await page.getByRole('button', { name: 'Suivant' }).click()
    await page.getByRole('button', { name: 'Suivant' }).click()
    await expect(page.getByText(/3\squestions faciles/)).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText(/Pas besoin d’avoir révisé\./)).toBeVisible()
    await sansDebordement(page, 'dernier écran de la découverte')
    if (CAPTURES) await page.waitForTimeout(2500)
    if (CAPTURES) await page.screenshot({ path: `${CAPTURES}/1-decouverte-390.png` })

    await page.getByRole('button', { name: 'C’est parti' }).click()
    await expect(page).toHaveURL(/\/exercices\?premiere=1/, { timeout: 10_000 })
    await expect(page.getByText(/Exercices · Découverte/)).toBeVisible()
    await expect(page.getByText(/· 1 sur 3$/)).toBeVisible()
    await sansDebordement(page, 'séance d’accueil')
    if (CAPTURES) await page.waitForTimeout(2500)
    if (CAPTURES) await page.screenshot({ path: `${CAPTURES}/2-seance-390.png` })

    // Dès la première réponse, la révision est notée (sans leçon, source « decouverte »).
    const revisions = () => page.evaluate(u => JSON.parse(localStorage.getItem(`reviz-revisions-${u}`) || '[]'), uid)
    const ordinateur = estOrdinateur(page)
    for (const [i, ex] of SEANCE_ACCUEIL.entries()) {
      await expect(page.getByText(`${NOMS[ex.type]} · ${i + 1} sur 3`)).toBeVisible()
      await jouer(page, ex, { glisser: !ordinateur, ordinateur })
      if (!SANS_VALIDER.includes(ex.type)) await page.getByRole('button', { name: 'Valider' }).click()
      if (i === 0) {
        await expect.poll(async () => (await revisions()).length).toBe(1)
        expect((await revisions())[0]).toMatchObject({ type: 'exercices', lessonId: null, source: 'decouverte' })
        expect((await revisions())[0].termineAt).toBeUndefined()
      }
      await page.locator('.qz-correction').getByRole('button', { name: i === 2 ? /Voir mon score/ : /Exercice suivant/ }).click()
    }
    await expect(page.getByText('Séance terminée')).toBeVisible()
    // Fin de séance : la même entrée reçoit le score, pas une deuxième révision.
    const [fin] = await revisions()
    expect(await revisions()).toHaveLength(1)
    expect(fin).toMatchObject({ score: 3, total: 3 })
    await expect(page.getByText(/^Ta première révision est faite\./)).toBeVisible()
    await sansDebordement(page, 'fin de la séance courte')
    if (CAPTURES) await page.waitForTimeout(6000)
    if (CAPTURES) await page.screenshot({ path: `${CAPTURES}/3-fin-390.png`, fullPage: true })

    await page.getByRole('button', { name: 'Choisir ma matière' }).click()
    await expect(page).toHaveURL(/\/programme/, { timeout: 10_000 })
    await page.goto('/')
    // La découverte ne revient pas.
    await fermerAnnonceRevizPlus(page)
    await fermerAnnonceJeux(page)
    await page.goto('/onboarding')
    await expect(page).toHaveURL(/\/$/, { timeout: 10_000 })
  })
})
