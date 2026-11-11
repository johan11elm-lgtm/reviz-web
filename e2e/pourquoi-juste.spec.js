// « Pourquoi c'est juste ? » (11/11, repris de Knowunity) : après une bonne réponse, la porte vers
// Réviz IA reste là, en retrait derrière « Exercice suivant ». Elle ouvre Réviz IA pré-rempli.
import { test, expect } from '@playwright/test'
import { mockApiRoutes, mockProgramme, compteRapide, ouvrirChapitreDuProgramme, chapitreThales, sansDebordement, estOrdinateur } from './helpers'
import { construireSeance } from '../src/utils/exercicesChapitre.js'
import { SANS_VALIDER, jouer } from './exercices-aides'

const CAPTURES = process.env.CAPTURES_DIR
const capture = (page, nom) => page.screenshot({ path: CAPTURES ? `${CAPTURES}/${nom}.png` : test.info().outputPath(`${nom}.png`), animations: 'disabled' })

for (const [appareil, viewport] of [['390', { width: 390, height: 844 }], ['1280', { width: 1280, height: 800 }]]) {
  test(`une bonne réponse propose « Pourquoi c’est juste ? » (${appareil})`, async ({ page }) => {
    await page.setViewportSize(viewport)
    await mockApiRoutes(page)
    await mockProgramme(page)
    await compteRapide(page, { birthDate: '2012-03-01', aller: '/programme' })
    await ouvrirChapitreDuProgramme(page)
    await page.goto('/exercices?graine=42')
    const [ex] = construireSeance(chapitreThales(), { graine: 42 })
    await expect(page.getByText(/· 1 sur 10$/)).toBeVisible({ timeout: 15_000 })
    await jouer(page, ex, { juste: true, glisser: !estOrdinateur(page), ordinateur: estOrdinateur(page) })
    if (!SANS_VALIDER.includes(ex.type)) await page.getByRole('button', { name: 'Valider' }).click()
    const correction = page.locator('.qz-correction')
    await expect(correction).toHaveClass(/is-juste/)
    const bouton = correction.getByRole('button', { name: 'Pourquoi c’est juste ?' })
    await expect(bouton).toBeVisible()
    await expect(correction.getByRole('button', { name: /Exercice suivant/ })).toBeInViewport()
    await sansDebordement(page, `correction juste ${appareil}`)
    await capture(page, `pourquoi-juste-${appareil}`)
    await bouton.click()
    const coach = page.getByRole('dialog', { name: /Coach Réviz/ })
    await expect(coach.getByRole('textbox', { name: 'Ta question sur la leçon' })).toHaveValue(/pourquoi c'est juste \?$/, { timeout: 10_000 })
  })
}
