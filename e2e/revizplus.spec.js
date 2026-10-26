// Réviz+ mis en avant pendant le lancement (offert jusqu'au 25 octobre) : pastille du coach, carte
// d'essai de thème de l'accueil, thèmes des Réglages, quota du scan, carte « Ton Réviz+ » du profil,
// carte Réviz+ des Réglages. Puis ce que voit un élève à la rentrée du 2/11, quand l'offre est finie.
// L'offre dépend de la date (bascule le 26/10/2026 à minuit, heure de Paris) : l'heure du navigateur
// est figée (page.clock.setFixedTime) sur chaque moment, pour que les tests tiennent après le 26/10.
import { test, expect } from '@playwright/test'
import { mockApiRoutes, compteRapide, figerHeure, sansDebordement, MOMENTS } from './helpers'

const APPAREILS = [['telephone', { width: 390, height: 844 }], ['ordinateur', { width: 1280, height: 860 }]]

for (const [appareil, viewport] of APPAREILS) {
  test(`Réviz+ mis en avant, avant le 26/10 (${appareil})`, async ({ page }) => {
    await page.setViewportSize(viewport)
    await figerHeure(page, MOMENTS.lancement)
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
    await sansDebordement(page, `accueil ${appareil}`)
    await capture('01-accueil')

    // La carte mène aux thèmes des Réglages, et disparaît pour de bon.
    await essai.click()
    await expect(page).toHaveURL(/\/reglages#themes/)
    await expect(page.getByRole('radiogroup', { name: 'Thèmes Réviz+' })).toBeVisible()
    await expect(page.getByText('3 thèmes débloqués')).toBeVisible()
    await capture('02-themes')

    // Choisir Prune : appliqué tout de suite, et gardé après rechargement.
    await page.getByRole('radio', { name: /Thème Prune/ }).click()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'prune')
    await page.reload()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'prune')
    await expect(page.getByRole('radio', { name: /Thème Prune/ })).toHaveAttribute('aria-checked', 'true')
    await capture('03-themes-prune')

    // Accueil dans chaque thème Réviz+ (le thème tient, pas de repli sur Crème pendant l'offre).
    for (const t of ['prune', 'abricot', 'sauge']) {
      await page.evaluate(id => localStorage.setItem('reviz-theme', id), t)
      await page.goto('/')
      await expect(page.locator('html')).toHaveAttribute('data-theme', t)
      await capture(`04-accueil-${t}`)
    }
    // Nuit d'encre (ancien thème sombre) n'est plus proposé : avec le mode Clair déjà mémorisé, il s'affiche en Crème.
    await page.evaluate(() => localStorage.setItem('reviz-theme', 'nuit-encre'))
    await page.goto('/')
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
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

  // La rentrée du lundi 2/11 : l'offre est finie, un élève gratuit voit Réviz+ comme une option.
  test(`Réviz+ à la rentrée du 2/11 : plus rien d'offert, thèmes verrouillés, scans comptés (${appareil})`, async ({ page }) => {
    await page.setViewportSize(viewport)
    await figerHeure(page, MOMENTS.rentree)
    await mockApiRoutes(page)
    const capture = (nom, opts = {}) => page.screenshot({ path: test.info().outputPath(`${appareil}-rentree-${nom}.png`), animations: 'disabled', ...opts })

    await compteRapide(page, { prenom: 'Léa', birthDate: '1990-05-01', stockage: { 'reviz-essai-theme-vu': null } })

    // Accueil : Réviz IA n'est plus marqué « + », et la carte d'essai de thème n'est plus proposée.
    if (appareil === 'telephone') {
      await expect(page.locator('.bottom-nav').getByRole('link', { name: 'Réviz IA' })).toBeVisible()
      await expect(page.locator('.rp-coach-tag')).toHaveCount(0)
    } else {
      await expect(page.locator('.nav-haut').getByRole('link', { name: 'Réviz IA' })).toBeVisible()
    }
    await expect(page.locator('a[href^="/jeux"]').first()).toBeVisible() // l'accueil est bien rendu
    await expect(page.getByRole('link', { name: /Essaie un thème Réviz\+/ })).toHaveCount(0)
    await sansDebordement(page, `accueil ${appareil}`)
    await capture('01-accueil')

    // Thèmes : les thèmes Réviz+ sont verrouillés ; en toucher un explique, sans l'appliquer.
    await page.goto('/reglages#themes')
    await expect(page.getByRole('radiogroup', { name: 'Thèmes Réviz+' })).toBeVisible()
    await expect(page.getByText('Avec Réviz+', { exact: true })).toBeVisible()
    await expect(page.getByText('3 thèmes débloqués')).toHaveCount(0)
    const prune = page.getByRole('radio', { name: /Thème Prune \(Réviz\+\), verrouillé/ })
    await prune.evaluate(el => el.scrollIntoView({ block: 'center' }))
    await prune.click()
    await expect(page.getByText('Prune fait partie de Réviz+.')).toBeVisible()
    await expect(page.locator('html')).not.toHaveAttribute('data-theme', 'prune')
    await expect(page.getByRole('button', { name: 'Voir Réviz+' })).toBeVisible()
    await capture('02-themes-verrouilles')

    // Scan : 5 par semaine, avec la porte vers Réviz+
    await page.goto('/scan')
    await expect(page.getByText('Scans illimités')).toHaveCount(0)
    await expect(page.getByText('5 scans restants cette semaine')).toBeVisible()
    await expect(page.getByRole('button', { name: /Illimité avec Réviz\+/ })).toBeVisible()
    await capture('03-scan')

    // Profil : pas de carte « Ton Réviz+ »
    await page.goto('/profil')
    await expect(page.getByRole('heading', { name: 'Léa', level: 1 })).toBeVisible()
    await expect(page.getByRole('button', { name: /Ton Réviz\+/ })).toHaveCount(0)

    // Réglages : « Découvrir Réviz+ » au tarif normal
    await page.goto('/reglages')
    await expect(page.getByText('Réviz+ offert', { exact: true })).toHaveCount(0)
    await expect(page.getByRole('button', { name: /Réserver à/ })).toHaveCount(0)
    const decouvrir = page.getByRole('button', { name: 'Découvrir Réviz+' })
    await decouvrir.evaluate(el => el.scrollIntoView({ block: 'center' }))
    await capture('04-reglages-abonnement')
    await decouvrir.click()
    const feuille = page.getByRole('dialog', { name: 'Réviz+' })
    await expect(feuille.getByRole('radio', { name: /À l’année.*49.€/ })).toBeVisible()
    await expect(feuille.getByText('Membre fondateur')).toHaveCount(0)
  })
}
