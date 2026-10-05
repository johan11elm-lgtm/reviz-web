// Leçon collée plus longue que la limite serveur (api/analyse.js : 15 000
// caractères). Le scan doit prévenir avant l'envoi et n'envoyer que le début,
// coupé proprement ; et si le serveur refuse quand même (TEXT_TOO_LONG), la
// page Analyse doit l'expliquer et ramener au texte pour le corriger.
import { test, expect } from '@playwright/test'
import { mockApiRoutes, signup, verifyEmailAndOnboard, MOCK_AI_RESPONSE } from './helpers'

const LIMITE = 15_000

test.describe('Leçon trop longue (mode texte)', () => {
  test('le scan prévient, coupe au début, et Analyse explique un refus serveur', async ({ page }) => {
    await mockApiRoutes(page)

    // /api/analyse : 1er appel refusé comme le ferait le serveur, puis IA mockée.
    // (La dernière route enregistrée l'emporte sur celle de mockApiRoutes.)
    const longueurs = []
    await page.route('**/api/analyse', route => {
      longueurs.push(route.request().postDataJSON().text.length)
      if (longueurs.length === 1) {
        return route.fulfill({ status: 400, contentType: 'text/plain; charset=utf-8', body: 'TEXT_TOO_LONG' })
      }
      return route.fulfill({ status: 200, contentType: 'text/plain; charset=utf-8', body: JSON.stringify(MOCK_AI_RESPONSE) })
    })

    const email = await signup(page, { birthDate: '2004-03-15' })
    await verifyEmailAndOnboard(page, email)

    // ── Scan : texte de ≈ 21 500 caractères ──
    await page.goto('/scan')
    // Sur ordinateur les deux panneaux sont visibles : l'onglet n'existe qu'en étroit.
    const ongletTexte = page.getByRole('tab', { name: /Texte/ })
    if (await ongletTexte.isVisible()) await ongletTexte.click()
    const texte = 'La photosynthèse transforme la lumière en matière organique. '.repeat(350)
    expect(texte.length).toBeGreaterThan(LIMITE)
    await page.locator('.scan-textarea').fill(texte)

    await expect(page.getByText(/caractères max/)).toBeVisible()
    await expect(page.getByText(/analysera les 15.000 premiers caractères/)).toBeVisible()
    const bouton = page.getByRole('button', { name: /Analyser les 15.000 premiers caractères/ })
    await expect(bouton).toBeVisible()
    await bouton.scrollIntoViewIfNeeded()
    await page.screenshot({ path: test.info().outputPath('scan-trop-long.png') })
    await bouton.click()

    // ── Analyse : le serveur a refusé → message dédié, pas « vérifie ta connexion » ──
    await expect(page).toHaveURL(/analyse/)
    await expect(page.getByText('Leçon trop longue')).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText(/15.000 caractères d’un coup|15.000 caractères d'un coup/)).toBeVisible()
    await page.screenshot({ path: test.info().outputPath('analyse-refus-serveur.png') })

    // Ce qui est parti au serveur : le début, coupé proprement sous la limite.
    expect(longueurs).toHaveLength(1)
    expect(longueurs[0]).toBeLessThanOrEqual(LIMITE)
    expect(longueurs[0]).toBeGreaterThan(LIMITE * 0.8)

    // ── Retour au texte : onglet Texte ouvert, texte coupé restauré ──
    await page.getByRole('button', { name: 'Modifier mon texte' }).click()
    await expect(page).toHaveURL(/scan\?mode=texte/)
    const onglet = page.getByRole('tab', { name: /Texte/ })
    if (await onglet.isVisible()) await expect(onglet).toHaveAttribute('aria-selected', 'true')
    const restaure = await page.locator('.scan-textarea').inputValue()
    expect(restaure.length).toBe(longueurs[0])
    expect(restaure.endsWith('organique.')).toBe(true)

    // ── Second essai : sous la limite, bouton normal, l'analyse aboutit ──
    await page.getByRole('button', { name: 'Analyser', exact: true }).click()
    await expect(page).toHaveURL(/analyse/)
    await expect(page.getByText(MOCK_AI_RESPONSE.metadata.excerpt)).toBeVisible({ timeout: 15_000 })
    expect(longueurs).toHaveLength(2)
    expect(longueurs[1]).toBe(longueurs[0])
  })
})
