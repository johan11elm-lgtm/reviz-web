// Plan brevet (11/11, repris de Knowunity) : un élève de 3e ouvre son plan depuis l'accueil, voit
// les chapitres de la semaine, ajoute les écrits à son agenda, puis révise un chapitre.
import { test, expect } from '@playwright/test'
import { mockApiRoutes, compteRapide, sansDebordement } from './helpers'

const CAPTURES = process.env.CAPTURES_DIR
const capture = (page, nom, o = {}) => page.screenshot({ path: CAPTURES ? `${CAPTURES}/${nom}.png` : test.info().outputPath(`${nom}.png`), animations: 'disabled', ...o })

for (const [appareil, viewport] of [['390', { width: 390, height: 844 }], ['1280', { width: 1280, height: 860 }]]) {
  test(`le plan brevet de la 3e (${appareil})`, async ({ page }) => {
    test.setTimeout(90_000)
    await page.setViewportSize(viewport)
    await mockApiRoutes(page)
    // Le vrai programme de 3e (public/programme), pour un plan à sa taille réelle.
    await compteRapide(page, { prenom: 'Sami', birthDate: '2011-09-01' })

    // L'accueil : la ligne du plan, juste sous le bloc du jour (sur ordinateur, dans la colonne de droite).
    const ligne = page.locator('.lpb')
    await expect(ligne).toBeVisible({ timeout: 15_000 })
    await expect(ligne).toContainText(/Cette semaine\s:\s0\ssur\s\d\schapitres/)
    await expect(ligne.getByRole('button', { name: /^Réviser/ })).toBeVisible()
    if (appareil === '390') {
      const [bloc, l] = await Promise.all([page.locator('.nm-bloc').boundingBox(), ligne.boundingBox()])
      expect(l.y).toBeGreaterThan(bloc.y + bloc.height - 1)
      expect(l.y - (bloc.y + bloc.height)).toBeLessThan(40)
    } else {
      await expect(page.locator('.nm-rail .lpb')).toBeVisible()
    }
    await ligne.scrollIntoViewIfNeeded()
    await capture(page, `plan-brevet-accueil-${appareil}`)

    // Centrée avant le clic : en bas de l'écran, la barre d'onglets passe par-dessus.
    const lien = ligne.getByRole('link', { name: 'Ton plan brevet' })
    await lien.evaluate(el => el.scrollIntoView({ block: 'center' }))
    await lien.click()
    await expect(page).toHaveURL(/\/plan-brevet$/)
    await expect(page.getByRole('heading', { level: 1 })).toContainText('jusqu’au brevet')
    await expect(page.getByText(/^Brevet 2027 · J-\d+$/)).toBeVisible()
    const semaine = page.getByRole('region', { name: 'Cette semaine' })
    await expect(semaine.getByRole('button', { name: /^Réviser / }).first()).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText(/\/ \d{2} chapitres/)).toBeVisible()
    await sansDebordement(page, `plan brevet ${appareil}`)
    await capture(page, `plan-brevet-${appareil}`, { fullPage: true })

    // Les écrits dans l'agenda : une fois, avec le marqueur brevet.
    await page.getByRole('button', { name: 'Ajouter à mon agenda' }).click()
    await expect(page.getByText(/Dans ton agenda/)).toBeVisible()
    const controles = await page.evaluate(() => {
      const k = Object.keys(localStorage).find(x => x.startsWith('reviz-agenda-') && !x.includes('cours'))
      return JSON.parse(localStorage.getItem(k)).controles
    })
    expect(controles.filter(c => c.brevet).map(c => c.date)).toEqual(['2027-06-24', '2027-06-25', '2027-06-28', '2027-06-28'])
    await page.reload()
    await expect(page.getByText(/Dans ton agenda/)).toBeVisible({ timeout: 15_000 })

    // Réviser un chapitre ouvre la séance d'exercices.
    await semaine.getByRole('button', { name: /^Réviser / }).first().click()
    await expect(page).toHaveURL(/\/exercices$/, { timeout: 15_000 })
  })
}
