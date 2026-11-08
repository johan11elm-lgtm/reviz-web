// Rappel de 17 h (08/11) : proposé à la fin de la première séance (séance d'accueil), puis à
// l'ouverture tant que ce n'est pas fait, au plus 3 fois et pas plus d'une fois tous les 3 jours.
import { test, expect } from '@playwright/test'
import { mockApiRoutes, compteRapide, sansDebordement, estOrdinateur } from './helpers'
import { SEANCE_ACCUEIL } from '../src/utils/seanceAccueil.js'
import { jouer, SANS_VALIDER } from './exercices-aides'

test.use({ viewport: { width: 390, height: 844 } })

// Chromium sans écran répond « denied » d'office : on simule un navigateur qui n'a encore rien répondu.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    try { Object.defineProperty(Notification, 'permission', { get: () => 'default' }) } catch { /* rien */ }
  })
})

test('fin de la première séance : « Je te rappelle demain ? », puis rien à l’ouverture', async ({ page }) => {
  await mockApiRoutes(page)
  await compteRapide(page, { birthDate: '2009-03-01', rappelVu: false, aller: '/exercices?premiere=1' })
  const ordinateur = estOrdinateur(page)
  for (const [i, ex] of SEANCE_ACCUEIL.entries()) {
    await jouer(page, ex, { glisser: !ordinateur, ordinateur })
    if (!SANS_VALIDER.includes(ex.type)) await page.getByRole('button', { name: 'Valider' }).click()
    await page.locator('.qz-correction').getByRole('button', { name: i === 2 ? /Voir mon score/ : /Exercice suivant/ }).click()
  }
  const carte = page.getByRole('region', { name: 'Je te rappelle demain ?' })
  await expect(carte).toBeVisible()
  await expect(carte).toContainText('17 h')
  await carte.scrollIntoViewIfNeeded()
  await sansDebordement(page, 'carte rappel')
  await page.waitForTimeout(1500)
  await page.screenshot({ path: test.info().outputPath('01-fin-seance.png'), animations: 'disabled' })
  await carte.getByRole('button', { name: 'Pas maintenant' }).click()
  await expect(carte).toHaveCount(0)

  // Demandé il y a moins de 3 jours : pas de fenêtre à l'ouverture.
  await page.goto('/')
  await page.waitForTimeout(1500)
  await expect(page.getByRole('dialog', { name: 'Rappel de révision' })).toHaveCount(0)
})

test('à l’ouverture, 3 jours après : une fenêtre, une seule fois', async ({ page }) => {
  await mockApiRoutes(page)
  const { uid } = await compteRapide(page, { birthDate: '2009-03-01', rappelVu: false })
  await page.evaluate(uid => {
    const t = Date.now() - 4 * 864e5
    localStorage.setItem(`reviz-rappel-demande-${uid}`, JSON.stringify({ fois: 1, derniere: t }))
    localStorage.setItem(`reviz-revisions-${uid}`, JSON.stringify([{ id: String(Date.now() - 6e4), type: 'exercices', lessonId: null, source: 'decouverte', revisedAt: Date.now() - 6e4 }]))
  }, uid)
  await page.goto('/')
  const fenetre = page.getByRole('dialog', { name: 'Rappel de révision' })
  await expect(fenetre).toBeVisible()
  await expect(fenetre).toContainText('Un rappel à 17 h ?')
  await page.waitForTimeout(800)
  await page.screenshot({ path: test.info().outputPath('02-ouverture.png'), animations: 'disabled' })
  await fenetre.getByRole('button', { name: 'Pas maintenant' }).click()
  await expect(fenetre).toHaveCount(0)
  expect(await page.evaluate(uid => JSON.parse(localStorage.getItem(`reviz-rappel-demande-${uid}`)).fois, uid)).toBe(2)
  await page.reload()
  await page.waitForTimeout(1500)
  await expect(fenetre).toHaveCount(0)
})
