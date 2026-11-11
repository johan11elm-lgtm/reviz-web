// Le prochain contrôle dès le premier jour (11/11) : à la fin de la première séance, « Ton prochain
// contrôle, c'est en quoi ? ». L'élève touche sa matière, la feuille de l'agenda s'ouvre déjà
// remplie, et son plan commence tout de suite. Une demande à la fois : le rappel de 17 h ne vient
// que si l'élève n'a pas de contrôle prévu. Sur l'accueil, la tâche du jour du contrôle passe devant.
import { test, expect } from '@playwright/test'
import { mockApiRoutes, compteRapide, sansDebordement, lireProfilEmulateur } from './helpers'
import { SEANCE_ACCUEIL } from '../src/utils/seanceAccueil.js'
import { jouerSeance } from './exercices-aides'

const CAPTURES = process.env.CAPTURES_DIR
const QUESTION = 'Ton prochain contrôle, c’est en quoi\u00a0?' // espace insécable avant « ? »

async function capture(page, nom, options = {}) {
  await page.waitForTimeout(CAPTURES ? 2500 : 300)
  await page.screenshot({ path: CAPTURES ? `${CAPTURES}/${nom}.png` : test.info().outputPath(`${nom}.png`), animations: 'disabled', ...options })
}

// Chromium sans écran répond « denied » d'office : on simule un navigateur qui n'a encore rien répondu.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    try { Object.defineProperty(Notification, 'permission', { get: () => 'default' }) } catch { /* rien */ }
  })
})

test.describe('Le prochain contrôle dès le premier jour', () => {
  test('téléphone : fin de la première séance → contrôle noté → premier pas du plan → tâche du jour sur l’accueil', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await mockApiRoutes(page)
    const { uid } = await compteRapide(page, { birthDate: '2009-03-01', rappelVu: false, controleVu: false, aller: '/exercices?premiere=1' })
    await jouerSeance(page, SEANCE_ACCUEIL)

    const carte = page.getByRole('region', { name: QUESTION })
    await expect(carte).toBeVisible()
    await expect(carte.getByRole('button')).toHaveCount(10) // 8 matières, « Autre matière », « Pas de contrôle prévu »
    // Une demande à la fois : le rappel de 17 h attend la réponse.
    await expect(page.getByRole('region', { name: 'Je te rappelle demain ?' })).toHaveCount(0)
    await carte.scrollIntoViewIfNeeded()
    await sansDebordement(page, 'carte du prochain contrôle')
    await capture(page, '01-fin-accueil-390', { fullPage: true })

    await carte.getByRole('button', { name: 'Maths' }).click()
    const feuille = page.getByRole('dialog', { name: 'Ajouter un contrôle' })
    await expect(feuille.getByRole('button', { name: 'Maths', pressed: true })).toBeVisible()
    const chapitre = feuille.getByRole('checkbox').first()
    await expect(chapitre).toBeVisible({ timeout: 10_000 })
    const titre = (await chapitre.locator('.ag-chapitre-nom').innerText()).trim()
    await chapitre.click()
    await feuille.locator('.ag-date-tuile').first().click()
    await capture(page, '02-feuille-390')
    await feuille.getByRole('button', { name: 'Ajouter', exact: true }).click()

    const fait = page.getByRole('region', { name: 'C’est noté' })
    await expect(fait).toBeVisible()
    await expect(fait).toContainText('Contrôle de maths')
    await expect(fait).toContainText(/Premier pas\s: 5 minutes sur «\s/)
    await expect(fait).toContainText(titre.slice(0, 20))
    await expect(carte).toHaveCount(0)
    // Contrôle noté : un seul bouton, commencer. Le rappel de 17 h attendra l'ouverture de l'accueil.
    await expect(page.getByRole('region', { name: 'Je te rappelle demain ?' })).toHaveCount(0)
    await fait.scrollIntoViewIfNeeded()
    await sansDebordement(page, 'contrôle noté')
    await capture(page, '03-note-390', { fullPage: true })

    // Le contrôle est dans l'agenda de l'élève, sur l'appareil et en ligne.
    const local = await page.evaluate(u => JSON.parse(localStorage.getItem(`reviz-agenda-${u}`)), uid)
    expect(local.controles).toHaveLength(1)
    expect(local.controles[0]).toMatchObject({ matiere: 'maths', titre })
    expect(local.planOffert).toBe(local.controles[0].id)
    await expect.poll(async () => (await lireProfilEmulateur(uid))?.agenda?.controles?.length).toBe(1)

    // « Commencer maintenant » : la fiche du chapitre coché.
    await fait.getByRole('button', { name: 'Commencer maintenant' }).click()
    await expect(page).toHaveURL(/\/analyse/, { timeout: 15_000 })
    await expect(page.getByRole('heading', { name: titre }).first()).toBeVisible({ timeout: 15_000 })

    // Sur l'accueil, la tâche du jour du contrôle est le premier raccourci.
    await page.goto('/')
    const premier = page.getByRole('group', { name: 'Démarre en un clic' }).getByRole('button').first()
    await expect(premier).toContainText('Ton contrôle de maths')
    await expect(premier).toContainText(/Demain|Dans \d+ jours/)
    await premier.scrollIntoViewIfNeeded()
    await sansDebordement(page, 'accueil avec contrôle')
    await capture(page, '04-accueil-390')

    // Un contrôle à venir : la question ne revient pas à la séance suivante.
    await page.goto('/exercices?premiere=1')
    await jouerSeance(page, SEANCE_ACCUEIL)
    await expect(page.getByRole('region', { name: QUESTION })).toHaveCount(0)
  })

  test('ordinateur : la carte, la fenêtre d’ajout, puis « Pas de contrôle prévu » laisse la place au rappel', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await mockApiRoutes(page)
    const { uid } = await compteRapide(page, { birthDate: '2009-03-01', rappelVu: false, controleVu: false, aller: '/exercices?premiere=1' })
    await jouerSeance(page, SEANCE_ACCUEIL)

    const carte = page.getByRole('region', { name: QUESTION })
    await expect(carte).toBeVisible()
    await carte.scrollIntoViewIfNeeded()
    await sansDebordement(page, 'carte du prochain contrôle (ordinateur)')
    await capture(page, '05-fin-accueil-1280')

    await carte.getByRole('button', { name: 'Histoire' }).click()
    const feuille = page.getByRole('dialog', { name: 'Ajouter un contrôle' })
    await expect(feuille.getByRole('button', { name: 'Histoire', pressed: true })).toBeVisible()
    await expect(feuille.getByRole('checkbox').first()).toBeVisible({ timeout: 10_000 })
    await capture(page, '06-fenetre-1280')
    await feuille.getByRole('button', { name: 'Annuler' }).click()
    await expect(feuille).toHaveCount(0)
    await expect(carte).toBeVisible()

    await carte.getByRole('button', { name: 'Pas de contrôle prévu' }).click()
    await expect(carte).toHaveCount(0)
    await expect(page.getByRole('region', { name: 'Je te rappelle demain ?' })).toBeVisible()
    expect(await page.evaluate(u => JSON.parse(localStorage.getItem(`reviz-controle-demande-${u}`)).fois, uid)).toBe(1)
    expect(await page.evaluate(u => JSON.parse(localStorage.getItem(`reviz-agenda-${u}`) || '{"controles":[]}').controles.length, uid)).toBe(0)

    // Demandé il y a moins de 3 jours : pas de nouvelle question à la séance suivante.
    await page.goto('/exercices?premiere=1')
    await jouerSeance(page, SEANCE_ACCUEIL)
    await expect(page.getByRole('region', { name: QUESTION })).toHaveCount(0)
  })

})
