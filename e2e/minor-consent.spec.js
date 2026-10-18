// Tunnel mineur <15 ans : l'élève entre dans l'app dès l'inscription, avec
// 15 jours pour donner l'email d'un parent (« Plus tard »), puis pendant que le
// parent décide. Un refus ou un délai écoulé suspend l'accès. Exerce pour de
// vrai les règles Firestore (doc parentalConsent 'pending' au signup).
import { test, expect } from '@playwright/test'
import { mockApiRoutes, signup, ecrireConsentementEmulateur, remplirNaissance } from './helpers'

// uid de l'élève connecté, lu dans le jeton Firebase de la page.
async function uidCourant(page) {
  return page.evaluate(() => {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k.startsWith('firebase:authUser:')) return JSON.parse(localStorage.getItem(k)).uid
    }
    return JSON.parse(localStorage.getItem('reviz-session') ?? '{}').uid
  })
}

// Les annonces d'accueil (Réviz+ offert, Battle) passent devant le bandeau :
// on les referme comme un élève pressé.
async function fermerAnnonces(page) {
  for (let i = 0; i < 2; i++) {
    const bouton = page.getByRole('dialog').getByRole('button', { name: 'Plus tard' })
    if (!(await bouton.isVisible().catch(() => false))) return
    await bouton.click()
  }
}

test.describe('Consentement parental (<15 ans)', () => {
  test('un élève de 12 ans entre dans l\'app pendant que son parent décide, puis est suspendu s\'il refuse', async ({ page }) => {
    await mockApiRoutes(page)

    await signup(page, { birthDate: '2014-06-01', parentEmail: 'parent@famille.test' })

    // Pas de mur : même suite que pour un grand (vérification d'email), puis l'app.
    await expect(page).toHaveURL(/verify-email/, { timeout: 15_000 })
    await page.goto('/')
    await expect(page).toHaveURL(/onboarding/, { timeout: 15_000 })
    await page.getByRole('button', { name: 'Passer' }).click()
    await expect(page).not.toHaveURL(/consent-pending|onboarding/, { timeout: 15_000 })
    await expect(page.getByText('Accord parental en attente')).toBeVisible({ timeout: 15_000 })

    // Le parent refuse (ce qu'écrit /api/approve-consent) → accès suspendu.
    const uid = await uidCourant(page)
    await ecrireConsentementEmulateur(uid, {
      status: { stringValue: 'refused' },
      parentEmail: { stringValue: 'parent@famille.test' },
      createdAt: { integerValue: String(Date.now()) },
      firstRequestedAt: { integerValue: String(Date.now()) },
    })
    await page.reload()
    await expect(page).toHaveURL(/consent-pending/, { timeout: 15_000 })
    await expect(page.getByText('Ton parent n\'a pas donné son accord')).toBeVisible()
    await page.goto('/scan')
    await expect(page).toHaveURL(/consent-pending/)
  })

  test('l\'email du parent ne peut pas être celui de l\'élève', async ({ page }) => {
    await mockApiRoutes(page)
    await page.goto('/inscription')

    await page.getByPlaceholder('Lucas').fill('Petit')
    await page.getByRole('button', { name: 'Continuer', exact: true }).click()
    await remplirNaissance(page, '2014-06-01')
    await page.getByRole('button', { name: 'Continuer', exact: true }).click()
    await page.getByRole('button', { name: /Collège/ }).click()
    await page.getByRole('button', { name: '6ème', exact: true }).click()

    const email = `petit-${Date.now()}@e2e.reviz.test`
    await page.locator('#signup-email').fill(email)
    await page.locator('input[type="password"]').fill('motdepasse123')
    await page.locator('input[type="checkbox"]').check()
    await page.getByRole('button', { name: 'Créer mon compte' }).click()

    // Étape parent : saisir son propre email → refus immédiat côté client
    await expect(page.getByPlaceholder('parent@exemple.com')).toBeVisible({ timeout: 15_000 })
    await page.getByPlaceholder('parent@exemple.com').fill(email)
    await page.getByRole('button', { name: /Envoyer et commencer/ }).click()
    await expect(page.getByText(/pas le tien/)).toBeVisible()
  })

  test('tunnel abandonné avant l\'étape parent → l\'élève entre quand même, puis le compte se met en pause au bout de 15 jours', async ({ page }) => {
    await mockApiRoutes(page)
    await page.goto('/inscription')
    await page.getByPlaceholder('Lucas').fill('Pressé')
    await page.getByRole('button', { name: 'Continuer', exact: true }).click()
    await remplirNaissance(page, '2014-06-01')
    await page.getByRole('button', { name: 'Continuer', exact: true }).click()
    await page.getByRole('button', { name: /Collège/ }).click()
    await page.getByRole('button', { name: '6ème', exact: true }).click()
    await page.locator('#signup-email').fill(`presse-${Date.now()}@e2e.reviz.test`)
    await page.locator('input[type="password"]').fill('motdepasse123')
    await page.locator('input[type="checkbox"]').check()
    await page.getByRole('button', { name: 'Créer mon compte' }).click()
    await expect(page.getByPlaceholder('parent@exemple.com')).toBeVisible({ timeout: 15_000 })

    // L'élève quitte l'étape parent sans donner d'email : depuis le « Plus tard »
    // (16/10), il entre quand même et a 15 jours pour le donner (statut a-fournir).
    await page.goto('/')
    await expect(page).toHaveURL(/onboarding/, { timeout: 15_000 })
    await page.getByRole('button', { name: 'Passer' }).click()
    await expect(page).not.toHaveURL(/consent-pending|onboarding/, { timeout: 15_000 })
    await expect(page.getByText("Email d'un parent")).toBeVisible({ timeout: 15_000 })

    // Le lien du bandeau mène à l'écran parent, encore facultatif à ce stade.
    await fermerAnnonces(page)
    await page.getByRole('link', { name: 'Le donner' }).click()
    await expect(page).toHaveURL(/consent-pending/)
    await expect(page.getByText('Une dernière chose')).toBeVisible()
    await page.getByRole('button', { name: /Plus tard/ }).click()
    await expect(page).not.toHaveURL(/consent-pending/, { timeout: 15_000 })

    // 15 jours passés sans email (on vieillit le doc pending) → compte en pause,
    // l'écran parent devient obligatoire.
    const uid = await uidCourant(page)
    const ilYA16Jours = Date.now() - 16 * 24 * 60 * 60 * 1000
    await ecrireConsentementEmulateur(uid, {
      status: { stringValue: 'pending' },
      createdAt: { integerValue: String(ilYA16Jours) },
    })
    await page.reload()
    await expect(page).toHaveURL(/consent-pending/, { timeout: 15_000 })
    await expect(page.getByText('Ton compte est en pause')).toBeVisible()
    await page.goto('/scan')
    await expect(page).toHaveURL(/consent-pending/)

    // Il donne enfin l'email : l'accès reprend le temps que le parent réponde.
    await page.getByPlaceholder('parent@exemple.com').fill('parent@famille.test')
    await page.getByRole('button', { name: 'Envoyer et reprendre' }).click()
    await expect(page).not.toHaveURL(/consent-pending/, { timeout: 15_000 })
    await expect(page.getByText('Accord parental en attente')).toBeVisible({ timeout: 15_000 })
  })
})
