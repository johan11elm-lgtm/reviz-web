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

  test('découverte (contrôle, blocage, note visée) → séance d’accueil de 3 exercices → programme', async ({ page }) => {
    // Cinq écrans de découverte, la feuille de l'agenda, puis la séance : plus long que les 30 s par défaut.
    test.setTimeout(90_000)
    await mockApiRoutes(page)
    const { uid } = await compteRapide(page, { classe: '6ème', birthDate: '2014-03-01', onboarde: false, aller: '/onboarding' })
    expect(uid).toBeTruthy()

    // Découverte du 11/11 : bonjour, le prochain contrôle, ce qui bloque, la note visée, « C'est prêt ».
    const titre = () => page.getByRole('heading', { level: 1 })
    const capture = async nom => {
      if (!CAPTURES) return
      await page.waitForTimeout(1500)
      await page.screenshot({ path: `${CAPTURES}/${nom}-390.png` })
    }
    await expect(titre()).toContainText('Trois petites questions d’abord.')
    await expect(page.getByLabel(/Étape \d sur/)).toHaveCount(0)
    await capture('0a-bonjour')
    await page.getByRole('button', { name: 'C’est parti' }).click()

    // Le contrôle : la matière ouvre la feuille de l'agenda, déjà remplie.
    await expect(titre()).toContainText('Ton prochain contrôle, c’est en quoi')
    await sansDebordement(page, 'question du contrôle')
    await capture('0b-controle')
    await page.getByRole('group', { name: 'Matière du contrôle' }).getByRole('button', { name: 'Maths' }).click()
    const feuille = page.getByRole('dialog', { name: 'Ajouter un contrôle' })
    const chapitre = feuille.getByRole('checkbox').first()
    await expect(chapitre).toBeVisible({ timeout: 10_000 })
    await chapitre.click()
    await feuille.locator('.ag-date-tuile').first().click()
    await capture('0c-feuille')
    await feuille.getByRole('button', { name: 'Ajouter', exact: true }).click()
    await expect(titre()).toContainText(/Noté\s: contrôle de maths/)
    await capture('0d-controle-note')
    // Il est bien dans l'agenda de l'élève.
    const agenda = await page.evaluate(u => JSON.parse(localStorage.getItem(`reviz-agenda-${u}`)), uid)
    expect(agenda.controles).toHaveLength(1)
    expect(agenda.controles[0].matiere).toBe('maths')
    await page.getByRole('button', { name: 'Continuer' }).click()

    // Ce qui bloque : Réviz répond au choix.
    await expect(titre()).toContainText('Qu’est-ce qui te bloque le plus')
    await capture('0e-blocage')
    await page.getByRole('radio', { name: 'Retenir mes leçons' }).click()
    await expect(titre()).toContainText('On mise sur les flashcards et les exercices.')
    await capture('0f-blocage-reponse')
    await page.getByRole('button', { name: 'Continuer' }).click()

    // La note visée, en maths.
    await expect(titre()).toContainText('Tu vises quelle note en maths')
    await page.getByRole('radio', { name: /Gagner 2 ou 3 points/ }).click()
    await expect(titre()).toContainText('Objectif faisable.')
    await sansDebordement(page, 'note visée')
    await capture('0g-objectif')
    await page.getByRole('button', { name: 'Continuer' }).click()

    // « C'est prêt » : le plan de départ.
    await expect(titre()).toContainText('C’est prêt, Testeur.')
    const plan = page.getByRole('list', { name: 'Ton plan de départ' })
    await expect(plan).toContainText('Contrôle de maths')
    await expect(plan).toContainText('Retenir mes leçons')
    await expect(plan).toContainText('Gagner 2 ou 3 points')
    await expect(page.getByText(/3\squestions faciles/)).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText(/Pas besoin d’avoir révisé\./)).toBeVisible()
    await sansDebordement(page, 'dernier écran de la découverte')
    await capture('1-decouverte')

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
  // Les essais sans compte (séance d'accueil en essai) n'existent plus depuis le 11/11 :
  // l'entrée pose ses questions et le compte vient avant la séance (entree-sans-compte.spec.js).
})
