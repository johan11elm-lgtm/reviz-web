// Réviz+ mis en avant : badge de l'en-tête, fiche « Ton Réviz+ », quota du
// scan, carte du profil (membre fondateur), sélecteur de thèmes.
import { test, expect } from '@playwright/test'
import { mockApiRoutes, signup, verifyEmailAndOnboard } from './helpers'

const fermerPopups = async page => {
  for (const nom of ['Réviz+ est offert', 'La Battle']) {
    await page.getByRole('dialog', { name: nom }).getByRole('button', { name: 'Plus tard' }).click({ timeout: 1500 }).catch(() => {})
  }
}

for (const [appareil, viewport] of [['telephone', { width: 390, height: 844 }], ['ordinateur', { width: 1280, height: 860 }]]) {
  test(`Réviz+ mis en avant (${appareil})`, async ({ page }) => {
    await page.setViewportSize(viewport)
    await mockApiRoutes(page)
    const capture = (nom, opts = {}) => page.screenshot({ path: test.info().outputPath(`${appareil}-${nom}.png`), animations: 'disabled', ...opts })

    const email = await signup(page, { birthDate: '1990-05-01', prenom: 'Léa' })
    await verifyEmailAndOnboard(page, email, { garderAnnonce: 'revizplus' })
    await fermerPopups(page)
    await page.goto('/'); await fermerPopups(page)

    // Accueil : badge doré, étiquette du coach, carte d'essai de thème
    const badge = page.getByRole('button', { name: 'Voir mon Réviz+' })
    await expect(badge).toBeVisible()
    await expect(page.getByRole('button', { name: 'Demander au coach (Réviz+)' })).toBeVisible()
    await expect(page.getByText('Essaie un thème Réviz+')).toBeVisible()
    await page.waitForTimeout(400)
    await capture('01-accueil')

    // Fiche « Ton Réviz+ »
    await badge.click()
    const fiche = page.getByRole('dialog', { name: 'Ton Réviz+' })
    await expect(fiche).toBeVisible()
    await expect(fiche.getByText('Membre fondateur')).toBeVisible()
    await expect(fiche.getByText('30 restantes')).toBeVisible()
    await page.waitForTimeout(400)
    await capture('02-fiche')
    await fiche.getByRole('button', { name: 'Choisir mon thème' }).click()
    await expect(page).toHaveURL(/\/reglages#themes$/)
    await page.waitForTimeout(800)
    await capture('03-themes')

    // Choisir Prune, puis voir l'accueil dans ce thème
    await page.getByRole('radio', { name: /Thème Prune/ }).click()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'prune')
    await page.waitForTimeout(300)
    await capture('04-themes-prune')
    for (const t of ['prune', 'abricot', 'sauge', 'nuit-encre']) {
      await page.evaluate(id => localStorage.setItem('reviz-theme', id), t)
      await page.goto('/'); await fermerPopups(page)
      await expect(page.locator('html')).toHaveAttribute('data-theme', t)
      await page.waitForTimeout(500)
      await capture(`05-accueil-${t}`)
    }
    await page.evaluate(() => localStorage.setItem('reviz-theme', 'light'))

    // Scan : quota de la semaine
    await page.goto('/scan')
    await expect(page.getByText('30 leçons sur 30 cette semaine')).toBeVisible()
    await page.waitForTimeout(400)
    await capture('06-scan')

    // Profil : carte Réviz+ avec le sceau fondateur
    await page.goto('/profil')
    const carte = page.locator('.rp-card')
    await expect(carte).toBeVisible()
    await expect(carte.getByText('Membre fondateur')).toBeVisible()
    await carte.scrollIntoViewIfNeeded()
    await page.waitForTimeout(400)
    await capture('07-profil')

    // Réglages : la carte Réviz+ remplace l'ancien encart d'abonnement
    await page.goto('/reglages')
    await expect(page.getByRole('button', { name: 'Passer à Réviz+' })).toHaveCount(0)
    await page.locator('.rp-card').scrollIntoViewIfNeeded()
    await page.waitForTimeout(400)
    await capture('08-reglages-abonnement')
  })
}
