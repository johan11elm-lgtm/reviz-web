// Leçon collée plus longue que la limite serveur (api/analyse.js : 15 000
// caractères). Le scan doit prévenir avant l'envoi et n'envoyer que le début,
// coupé proprement ; et si le serveur refuse quand même (TEXT_TOO_LONG), la
// page Analyse doit l'expliquer et ramener au texte pour le corriger.
// À 1280 px (deux panneaux) et à 390 px (« Coller le texte » en écran dédié).
import { test, expect } from '@playwright/test'
import { mockApiRoutes, compteRapide, ouvrirSaisieTexte, sansDebordement, estOrdinateur, MOCK_AI_RESPONSE } from './helpers'

const LIMITE = 15_000
const APPAREILS = [
  ['ordinateur', { width: 1280, height: 800 }],
  ['téléphone', { width: 390, height: 844 }],
]

test.describe('Leçon trop longue (mode texte)', () => {
  for (const [appareil, viewport] of APPAREILS) {
    test(`le scan prévient, coupe au début, et Analyse explique un refus serveur (${appareil})`, async ({ page }) => {
      await page.setViewportSize(viewport)
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

      await compteRapide(page, { aller: '/scan' })

      // ── Scan : texte de ≈ 21 500 caractères ──
      const champ = await ouvrirSaisieTexte(page)
      const texte = 'La photosynthèse transforme la lumière en matière organique. '.repeat(350)
      expect(texte.length).toBeGreaterThan(LIMITE)
      await champ.fill(texte)

      await expect(page.getByText('Analyse du début')).toBeVisible()
      await expect(page.getByText(/j’analyse les 15.000 premiers caractères/)).toBeVisible()
      const bouton = page.getByRole('button', { name: /Analyser les 15.000 premiers caractères/ })
      await expect(bouton).toBeVisible()
      await sansDebordement(page, `scan trop long ${appareil}`)
      await bouton.evaluate(el => el.scrollIntoView({ block: 'center' }))
      await page.screenshot({ path: test.info().outputPath('scan-trop-long.png') })
      await bouton.click()

      // ── Analyse : le serveur a refusé → message dédié, pas « vérifie ta connexion » ──
      await expect(page).toHaveURL(/analyse/)
      await expect(page.getByRole('heading', { name: 'Leçon trop longue' })).toBeVisible({ timeout: 15_000 })
      await expect(page.getByText(/15.000 caractères d'un coup|15.000 caractères d’un coup/)).toBeVisible()
      await sansDebordement(page, `refus serveur ${appareil}`)
      await page.screenshot({ path: test.info().outputPath('analyse-refus-serveur.png') })

      // Ce qui est parti au serveur : le début, coupé proprement sous la limite.
      expect(longueurs).toHaveLength(1)
      expect(longueurs[0]).toBeLessThanOrEqual(LIMITE)
      expect(longueurs[0]).toBeGreaterThan(LIMITE * 0.8)

      // ── Retour au texte : texte coupé restauré (téléphone : l'écran « Coller le texte » s'ouvre tout seul) ──
      await page.getByRole('button', { name: 'Modifier mon texte' }).click()
      await expect(page).toHaveURL(/scan\?mode=texte/)
      if (!estOrdinateur(page)) await expect(page.getByRole('heading', { name: 'Coller le texte' })).toBeVisible()
      const restaure = await page.getByLabel('Texte de ta leçon').inputValue()
      expect(restaure.length).toBe(longueurs[0])
      expect(restaure.endsWith('organique.')).toBe(true)

      // ── Second essai : sous la limite, bouton normal, l'analyse aboutit ──
      await page.getByRole('button', { name: 'Analyser ce texte' }).click()
      await expect(page).toHaveURL(/analyse/)
      await expect(page.getByText(MOCK_AI_RESPONSE.resume.keyPoints[0], { exact: true })).toBeVisible({ timeout: 15_000 })
      expect(longueurs).toHaveLength(2)
      expect(longueurs[1]).toBe(longueurs[0])
    })
  }
})
