// « Montre ça à tes parents » : un moins de 15 ans qui n'a pas donné l'adresse
// d'un parent (« Plus tard ») réussit sa première séance d'exercices (le quiz jusqu'au 29/10) ; la fin lui
// propose d'envoyer son score à un parent, et ce mail porte aussi l'accord.
import { test, expect } from '@playwright/test'
import { mockApiRoutes, compteRapide, sansDebordement } from './helpers'
import { SEANCE_ACCUEIL } from '../src/utils/seanceAccueil.js'
import { jouerSeance } from './exercices-aides'

const CAPTURES = process.env.CAPTURES_DIR
const plat = s => String(s).replace(/[\s  ]+/g, ' ').trim()

test.describe('Montre ça à tes parents', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('fin de la première séance réussie → score envoyé au parent avec la demande d’accord', async ({ page }) => {
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
    await expect(page).toHaveURL(/\/exercices\?premiere=1/, { timeout: 10_000 })
    // Tout juste, sur la séance d'accueil (3 exercices écrits à la main).
    await jouerSeance(page, SEANCE_ACCUEIL)

    const carte = page.locator('.qz-parent')
    await expect(carte.getByText('Montre ça à tes parents')).toBeVisible()
    await expect(carte.getByText(/Envoie ton 3\/3 à un parent/)).toBeVisible()
    await sansDebordement(page, 'fin de séance avec la carte parent')
    if (CAPTURES) await page.waitForTimeout(5000)
    if (CAPTURES) await carte.scrollIntoViewIfNeeded()
    if (CAPTURES) await page.screenshot({ path: `${CAPTURES}/parent-1-carte-390.png` })

    await carte.getByLabel('Adresse e-mail d\'un parent').fill('maman@famille.test')
    await carte.getByRole('button', { name: 'Envoyer' }).click()
    await expect(carte.getByText('C\'est parti')).toBeVisible({ timeout: 10_000 })
    await expect(carte.getByText(/m•••@famille\.test/)).toBeVisible()
    if (CAPTURES) await page.screenshot({ path: `${CAPTURES}/parent-2-envoye-390.png` })

    expect(envois).toHaveLength(1)
    // La séance d'accueil n'a pas de chapitre : le mail donne le score seul.
    expect(envois[0]).toMatchObject({ parentEmail: 'maman@famille.test', resultat: { score: 3, total: 3 } })
    expect(envois[0].resultat.chapitre).toBeUndefined()

    // L'accueil ne réclame plus l'adresse : la demande est partie.
    await page.getByRole('button', { name: 'Choisir ma matière' }).click()
    await expect(page).toHaveURL(/\/programme/, { timeout: 10_000 })
    await page.goto('/')
    await expect(page.getByText('Montre tes révisions à un parent')).toHaveCount(0)
  })
})
