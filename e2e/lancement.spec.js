// Lancement : Réviz+ offert à tout le monde (api/_lancement.js), puis payant.
// L'offre dépend de la date (jusqu'au 25 octobre 2026 inclus, heure de Paris) : on fige donc l'heure
// du navigateur (page.clock.setFixedTime) sur chacun des trois moments que verra un élève — le
// lancement, les 3 derniers jours, et la rentrée du 2/11 où Réviz+ est payant — pour que les tests
// ne cassent pas quand le calendrier avance (gel de la refonte le 31/10).
import { test, expect } from '@playwright/test'
import { mockApiRoutes, compteRapide, figerHeure, MOMENTS } from './helpers'

test.use({ viewport: { width: 390, height: 844 } })

const annonceOffert = page => page.getByRole('dialog', { name: /Réviz\+ offert jusqu’au 25 octobre/ })
const annonceJeux = page => page.getByRole('dialog', { name: 'Réviz Games' })

async function parcoursOffert(page, moment, { bulle }) {
  await figerHeure(page, moment)
  await mockApiRoutes(page)
  const capture = nom => page.screenshot({ path: test.info().outputPath(`${nom}.png`), animations: 'disabled' })

  // Un compte neuf qui n'a encore vu aucune annonce, découverte passée.
  await compteRapide(page, { prenom: 'Léa', birthDate: '1990-05-01', annoncesVues: false })

  const annonce = annonceOffert(page)
  await expect(annonce).toBeVisible()
  await expect(annonce.locator('.rv-bulle-sr').filter({ hasText: bulle })).toBeAttached() // ce que dit Réviz
  await expect(annonce.getByText('Scans illimités')).toBeVisible()
  await expect(annonce.getByText('Réviz IA chaque jour')).toBeVisible()
  await expect(annonce.getByText('Tous les thèmes')).toBeVisible()
  // Le tarif fondateur se réserve jusqu'au 25 : le bouton le dit, et rien n'est prélevé avant le 26.
  await expect(annonce.getByText(/Rien n’est prélevé avant le 26.octobre/)).toBeVisible()
  await expect(annonce.getByRole('button', { name: /Réserver à 29.€\/an/ })).toBeVisible()
  await annonce.evaluate(el => Promise.all(el.getAnimations().map(a => a.finished))) // la feuille glisse depuis le bas
  await capture('01-annonce')
  await annonce.getByRole('button', { name: 'Plus tard' }).click()

  // Revisite : plus de popup Réviz+, Réviz Games prend son tour.
  await page.goto('/')
  await expect(annonceJeux(page)).toBeVisible()
  await expect(annonceOffert(page)).toHaveCount(0)
  await annonceJeux(page).getByRole('button', { name: 'Plus tard' }).click()

  // Encore une visite : plus aucune popup.
  await page.goto('/')
  await expect(page.locator('a[href^="/jeux"]').first()).toBeVisible() // l'accueil est bien rendu
  await expect(page.getByRole('dialog')).toHaveCount(0)

  await page.goto('/reglages')
  await expect(page.getByText('Offert', { exact: true })).toBeVisible()
  await expect(page.getByText('Réviz+ offert', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Passer à Réviz+' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Découvrir Réviz+' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: /Réserver à 29.€ par an/ })).toBeVisible()
}

test.describe('Lancement : Réviz+ offert, puis payant', () => {
  test(`avant le 26/10 (${MOMENTS.lancement.libelle}) : popup une seule fois, Réglages sans paiement`, async ({ page }) => {
    await parcoursOffert(page, MOMENTS.lancement, { bulle: /Cadeau de lancement/ })
    await expect(page.getByText('Offert jusqu’au 25 octobre. Rien à payer, rien à activer.')).toBeVisible()
    await page.getByText('Offert', { exact: true }).evaluate(el => el.scrollIntoView({ block: 'center' }))
    await page.screenshot({ path: test.info().outputPath('02-reglages.png'), animations: 'disabled' })
  })

  test(`les 3 derniers jours (${MOMENTS.derniersJours.libelle}) : même offre, les Réglages comptent les jours`, async ({ page }) => {
    await parcoursOffert(page, MOMENTS.derniersJours, { bulle: /Encore quelques jours/ })
    await expect(page.getByText('Offert jusqu’au 25 octobre : plus que 2 jours.')).toBeVisible()
    await page.getByText('Offert', { exact: true }).evaluate(el => el.scrollIntoView({ block: 'center' }))
    await page.screenshot({ path: test.info().outputPath('02-reglages.png'), animations: 'disabled' })
  })

  test(`à la rentrée du 2/11 (${MOMENTS.rentree.libelle}) : plus d'offre, Réviz+ se découvre et se paie au tarif normal`, async ({ page }) => {
    await figerHeure(page, MOMENTS.rentree)
    await mockApiRoutes(page)
    const capture = nom => page.screenshot({ path: test.info().outputPath(`${nom}.png`), animations: 'disabled' })

    // Un élève qui entre à la rentrée sans avoir rien vu : plus de popup Réviz+ (rien n'est offert),
    // Réviz Games s'annonce tout seul.
    await compteRapide(page, { prenom: 'Léa', birthDate: '1990-05-01', annoncesVues: false })
    await expect(annonceJeux(page)).toBeVisible()
    await expect(page.getByRole('dialog', { name: /Réviz\+ offert|Réviz\+ est offert/ })).toHaveCount(0)
    await annonceJeux(page).getByRole('button', { name: 'Plus tard' }).click()
    await expect(page.getByRole('dialog')).toHaveCount(0)

    // Réglages : Réviz+ n'est plus offert, on propose de le découvrir (jamais « Passer à Réviz+ » d'emblée)
    await page.goto('/reglages')
    await expect(page.getByText('Offert', { exact: true })).toHaveCount(0)
    await expect(page.getByText('Réviz+ offert', { exact: true })).toHaveCount(0)
    await expect(page.getByRole('button', { name: /Réserver à/ })).toHaveCount(0)
    await expect(page.getByText('Pour aller plus loin, quand tu veux.')).toBeVisible()
    const decouvrir = page.getByRole('button', { name: 'Découvrir Réviz+' })
    await decouvrir.evaluate(el => el.scrollIntoView({ block: 'center' }))
    await capture('03-reglages-payant')

    // La feuille « Découvrir Réviz+ » : tarif normal (49 € par an, 6,99 € par mois), plus de membre fondateur
    await decouvrir.click()
    const feuille = page.getByRole('dialog', { name: 'Réviz+' })
    await expect(feuille).toBeVisible()
    await expect(feuille.getByText('5 par semaine')).toBeVisible()
    await expect(feuille.getByRole('radio', { name: /À l’année.*49.€/ })).toBeVisible()
    await expect(feuille.getByRole('radio', { name: /Au mois.*6,99.€/ })).toBeVisible()
    await expect(feuille.getByText('Membre fondateur')).toHaveCount(0)
    await expect(feuille.getByText(/Ton prix fondateur/)).toHaveCount(0)
    await expect(feuille.getByRole('button', { name: 'Passer à Réviz+' })).toBeVisible()
    await feuille.evaluate(el => Promise.all(el.getAnimations().map(a => a.finished)))
    await capture('04-decouvrir-payant')
  })
})
