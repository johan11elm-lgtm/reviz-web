// Réviz+ mis en avant pendant le lancement (offert jusqu'au 25 octobre) : pastille du coach, carte
// d'essai de thème de l'accueil, thèmes des Réglages, quota du scan, carte « Ton Réviz+ » du profil,
// carte Réviz+ des Réglages. Dépend de la date (avant le 26 octobre 2026) comme lancement.spec.js.
import { test, expect } from '@playwright/test'
import { mockApiRoutes, compteRapide } from './helpers'

for (const [appareil, viewport] of [['telephone', { width: 390, height: 844 }], ['ordinateur', { width: 1280, height: 860 }]]) {
  test(`Réviz+ mis en avant (${appareil})`, async ({ page }) => {
    await page.setViewportSize(viewport)
    await mockApiRoutes(page)
    const capture = (nom, opts = {}) => page.screenshot({ path: test.info().outputPath(`${appareil}-${nom}.png`), animations: 'disabled', ...opts })

    // Compte neuf, popups déjà vues, mais la carte « Essaie un thème Réviz+ » pas encore.
    await compteRapide(page, { prenom: 'Léa', birthDate: '1990-05-01', stockage: { 'reviz-essai-theme-vu': null } })

    // Accueil : Réviz IA marqué « + » (téléphone : pastille de l'onglet ; ordinateur : bouton rond du menu du haut)
    // et carte d'essai de thème.
    if (appareil === 'telephone') await expect(page.locator('.bottom-nav').getByRole('link', { name: 'Réviz IA' }).locator('.rp-coach-tag')).toBeVisible()
    else await expect(page.locator('.nav-haut').getByRole('link', { name: 'Réviz IA' })).toBeVisible()
    const essai = page.getByRole('link', { name: /Essaie un thème Réviz\+/ })
    await expect(essai).toBeVisible()
    await capture('01-accueil')

    // La carte mène aux thèmes des Réglages, et disparaît pour de bon.
    await essai.click()
    await expect(page).toHaveURL(/\/reglages#themes/)
    await expect(page.getByRole('radiogroup', { name: 'Thèmes Réviz+' })).toBeVisible()
    await expect(page.getByText('4 thèmes débloqués')).toBeVisible()
    await capture('02-themes')

    // Choisir Prune : appliqué tout de suite, et gardé après rechargement.
    await page.getByRole('radio', { name: /Thème Prune/ }).click()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'prune')
    await page.reload()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'prune')
    await expect(page.getByRole('radio', { name: /Thème Prune/ })).toHaveAttribute('aria-checked', 'true')
    await capture('03-themes-prune')

    // Accueil dans chaque thème Réviz+ (le thème tient, pas de repli sur Crème pendant l'offre).
    for (const t of ['prune', 'abricot', 'sauge', 'nuit-encre']) {
      await page.evaluate(id => localStorage.setItem('reviz-theme', id), t)
      await page.goto('/')
      await expect(page.locator('html')).toHaveAttribute('data-theme', t)
      await capture(`04-accueil-${t}`)
    }
    // Retour à Crème : la carte d'essai, déjà ouverte une fois, ne revient pas.
    await page.evaluate(() => localStorage.setItem('reviz-theme', 'light'))
    await page.goto('/')
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
    await expect(page.locator('a[href^="/jeux"]').first()).toBeVisible() // l'accueil est bien rendu
    await expect(page.getByRole('link', { name: /Essaie un thème Réviz\+/ })).toHaveCount(0)

    // Scan : quota illimité
    await page.goto('/scan')
    await expect(page.getByText('Scans illimités')).toBeVisible()
    await capture('05-scan')

    // Profil : « Ton Réviz+ » dit jusqu'à quand c'est offert, et mène aux Réglages
    await page.goto('/profil')
    const carte = page.getByRole('button', { name: /Ton Réviz\+/ })
    await expect(carte).toBeVisible()
    await expect(carte).toContainText('Offert jusqu’au 25')
    await carte.evaluate(el => el.scrollIntoView({ block: 'center' }))
    await capture('06-profil')
    await carte.click()
    await expect(page).toHaveURL(/\/reglages/)

    // Réglages : la carte Réviz+ propose de réserver le prix fondateur, sans « Passer à Réviz+ »
    await expect(page.getByRole('button', { name: 'Passer à Réviz+' })).toHaveCount(0)
    await expect(page.getByText('Réviz+ offert', { exact: true })).toBeVisible()
    const reserver = page.getByRole('button', { name: /Réserver à/ })
    await reserver.evaluate(el => el.scrollIntoView({ block: 'center' }))
    await expect(reserver).toBeVisible()
    await capture('07-reglages-abonnement')
  })
}
