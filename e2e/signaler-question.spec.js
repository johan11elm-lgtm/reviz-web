// Signaler une question (11/11) : sous la correction d'un exercice, l'élève signale une question mal
// posée ; elle part entière avec son format (api/avis.js?op=signalement), et un merci la remplace.
import { test, expect } from '@playwright/test'
import { mockApiRoutes, compteRapide, sansDebordement } from './helpers'
import { SEANCE_ACCUEIL } from '../src/utils/seanceAccueil.js'
import { jouer, SANS_VALIDER } from './exercices-aides'

const CAPTURES = process.env.CAPTURES_DIR
async function capture(page, nom) {
  await page.waitForTimeout(CAPTURES ? 1500 : 200)
  await page.screenshot({ path: CAPTURES ? `${CAPTURES}/${nom}.png` : test.info().outputPath(`${nom}.png`), animations: 'disabled' })
}

test('téléphone : une question d’exercice se signale depuis sa correction', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await mockApiRoutes(page)
  const envois = []
  await page.route('**/api/avis?op=signalement', route => {
    envois.push(route.request().postDataJSON())
    return route.fulfill({ status: 204, body: '' })
  })
  await compteRapide(page, { birthDate: '2011-05-01', aller: '/exercices?premiere=1' })
  const [ex] = SEANCE_ACCUEIL
  await jouer(page, ex, { glisser: true, ordinateur: false })
  if (!SANS_VALIDER.includes(ex.type)) await page.getByRole('button', { name: 'Valider' }).click()

  const correction = page.locator('.qz-correction')
  await correction.getByRole('button', { name: /Signaler/ }).click()
  const feuille = page.getByRole('dialog', { name: 'Signaler cette question' })
  await expect(feuille).toBeVisible()
  await feuille.getByRole('radio', { name: 'La question n’est pas claire' }).click()
  await sansDebordement(page, 'feuille de signalement')
  await capture(page, '01-feuille-signaler-390')
  await feuille.getByRole('button', { name: 'Envoyer' }).click()
  await expect(correction.getByText('Merci, on relit cette question.')).toBeVisible()
  await capture(page, '02-merci-390')

  expect(envois).toHaveLength(1)
  expect(envois[0]).toMatchObject({ type: 'exercice', format: ex.type, raison: 'confuse', question: ex.consigne })
  expect(JSON.parse(envois[0].reponse).id).toBe(ex.id)
  // L'exercice suivant peut se signaler à son tour.
  await correction.getByRole('button', { name: /Exercice suivant/ }).click()
})
