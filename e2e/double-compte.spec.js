// Double compte du 19/10 (iOS Safari) : l'élève de moins de 15 ans crée son
// compte, touche « Plus tard »… et rien ne se passe, la relecture Firestore
// (refreshGate) ne revient jamais. Il recharge la page : le tunnel repart de
// zéro alors qu'il est déjà connecté, et il crée un second compte.
// Ici, Firestore « gèle » juste après la création du compte (requêtes sans
// réponse, comme un flux WebChannel bloqué sur Safari).
import { test, expect } from '@playwright/test'
import { mockApiRoutes, remplirTunnelInscription, uniqueEmail } from './helpers'

async function creerCompteMineur(page) {
  await page.goto('/inscription')
  await remplirTunnelInscription(page, { birthDate: '2012-03-01', prenom: 'Pressé', classe: '3ème', email: uniqueEmail('double') })
  // Compte créé : l'écran parent attend l'e-mail d'un parent.
  await expect(page.getByLabel('E-mail de ton parent')).toBeVisible({ timeout: 15_000 })
}

// Firestore ne répond plus : chaque requête vers l'émulateur reste en suspens.
async function gelerFirestore(page) {
  await page.route(/127\.0\.0\.1:8080/, () => { /* jamais de réponse */ })
}

test.describe('Inscription : pas de second compte', () => {
  test('« Plus tard » mène à la suite même si Firestore ne répond plus', async ({ page }) => {
    await mockApiRoutes(page)
    await creerCompteMineur(page)
    await gelerFirestore(page)

    await page.getByRole('button', { name: /Plus tard/ }).click()
    await expect(page).toHaveURL(/onboarding/, { timeout: 8_000 })
  })

  test('recharger /inscription une fois le compte créé ne relance pas le tunnel', async ({ page }) => {
    await mockApiRoutes(page)
    await creerCompteMineur(page)

    await page.reload()
    await expect(page).toHaveURL(/onboarding/, { timeout: 15_000 })
    await expect(page.getByLabel('Ton prénom')).toHaveCount(0)
  })
})
