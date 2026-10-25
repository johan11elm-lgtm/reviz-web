// Tunnel mineur <15 ans : l'élève entre dans l'app dès l'inscription, avec
// 15 jours pour donner l'email d'un parent (« Plus tard »), puis pendant que le
// parent décide. Un refus ou un délai écoulé suspend l'accès. Exerce pour de
// vrai les règles Firestore (doc parentalConsent 'pending' au signup).
import { test, expect } from '@playwright/test'
import { mockApiRoutes, signup, ecrireConsentementEmulateur, remplirTunnelInscription, bulleReviz, passerDecouverte, fermerAnnonces, uniqueEmail, compteRapide } from './helpers'

// uid de l'élève connecté, lu dans le jeton Firebase de la page (ou dans le cache de session de l'app,
// écrit une fois le profil lu : on patiente plutôt que d'écrire dans users/undefined).
async function uidCourant(page) {
  let uid
  await expect.poll(async () => {
    uid = await page.evaluate(() => {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i)
        if (k.startsWith('firebase:authUser:')) return JSON.parse(localStorage.getItem(k)).uid
      }
      return JSON.parse(localStorage.getItem('reviz-session') ?? '{}').uid
    })
    return uid
  }, { timeout: 10_000 }).toBeTruthy()
  return uid
}

test.describe('Consentement parental (<15 ans)', () => {
  test('un élève de 12 ans entre dans l\'app pendant que son parent décide, puis est suspendu s\'il refuse', async ({ page }) => {
    await mockApiRoutes(page)

    await signup(page, { birthDate: '2014-06-01', parentEmail: 'parent@famille.test' })

    // Pas de mur : même suite que pour un grand, droit dans l'app.
    await expect(page).toHaveURL(/onboarding/, { timeout: 15_000 })
    await page.goto('/')
    await expect(page).toHaveURL(/onboarding/, { timeout: 15_000 })
    await passerDecouverte(page)
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
    await expect(bulleReviz(page, 'Ton parent n’a pas donné son accord')).toBeAttached()
    await page.goto('/scan')
    await expect(page).toHaveURL(/consent-pending/)
  })

  test('petit Android : l’étape parent n’ouvre pas le clavier, et « Plus tard » se voit sans défiler', async ({ page }) => {
    // Un élève sur cinq s'arrêtait sur cet écran (25/10) : le clavier ouvert tout seul cachait « Plus tard ».
    await page.setViewportSize({ width: 360, height: 640 })
    await mockApiRoutes(page)
    await page.goto('/inscription')
    await remplirTunnelInscription(page, { birthDate: '2013-04-10', email: uniqueEmail('android') })
    await expect(page.getByLabel('E-mail de ton parent')).toBeVisible()
    await expect(page.getByLabel('E-mail de ton parent')).not.toBeFocused()
    await expect(page.getByRole('button', { name: /Plus tard, je révise d’abord/ })).toBeInViewport()
    await page.getByRole('button', { name: /Plus tard, je révise d’abord/ }).click()
    await expect(page).not.toHaveURL(/\/inscription/)
  })

  test('l\'email du parent ne peut pas être celui de l\'élève', async ({ page }) => {
    await mockApiRoutes(page)
    await page.goto('/inscription')
    const email = uniqueEmail('petit')
    await remplirTunnelInscription(page, { birthDate: '2014-06-01', prenom: 'Petit', classe: '6ème', email })

    // Étape parent : saisir son propre email → refus immédiat côté client
    await page.getByLabel('E-mail de ton parent').fill(email)
    await page.getByRole('button', { name: /Envoyer et commencer/ }).click()
    await expect(page.getByText(/pas le tien/)).toBeVisible()
  })

  test('tunnel abandonné avant l\'étape parent → l\'élève entre quand même, puis le compte se met en pause au bout de 15 jours', async ({ page }) => {
    await mockApiRoutes(page)
    await page.goto('/inscription')
    await remplirTunnelInscription(page, { birthDate: '2014-06-01', prenom: 'Pressé', classe: '6ème', email: uniqueEmail('presse') })

    // L'élève quitte l'étape parent sans donner d'email : depuis le « Plus tard »
    // (16/10), il entre quand même et a 15 jours pour le donner (statut a-fournir).
    await page.goto('/')
    await expect(page).toHaveURL(/onboarding/, { timeout: 15_000 })
    await passerDecouverte(page)
    await expect(page.getByText('E-mail d’un parent')).toBeVisible({ timeout: 15_000 })

    // Le lien du bandeau mène à l'écran parent, encore facultatif à ce stade.
    await fermerAnnonces(page)
    await page.getByRole('link', { name: 'Le donner' }).click()
    await expect(page).toHaveURL(/consent-pending/)
    await expect(bulleReviz(page, 'Ton compte est prêt.')).toBeAttached()
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
    await expect(bulleReviz(page, 'Ton compte est en pause.')).toBeAttached()
    await page.goto('/scan')
    await expect(page).toHaveURL(/consent-pending/)

    // Il donne enfin l'email : l'accès reprend le temps que le parent réponde.
    await page.getByLabel('E-mail de ton parent').fill('parent@famille.test')
    await page.getByRole('button', { name: 'Envoyer la demande' }).click()
    await page.getByRole('button', { name: 'Commencer à réviser' }).click()
    await expect(page).not.toHaveURL(/consent-pending/, { timeout: 15_000 })
    await expect(page.getByText('Accord parental en attente')).toBeVisible({ timeout: 15_000 })
  })

  test('compte rapide de 12 ans, parent prévenu : l\'app est ouverte, accord en attente à l\'accueil', async ({ page }) => {
    await mockApiRoutes(page)
    // Valeur par défaut de compteRapide pour un mineur : parent déjà prévenu, il décide.
    await compteRapide(page, { prenom: 'Petit', birthDate: '2014-06-01', classe: '6ème' })
    await expect(page.getByText('Accord parental en attente')).toBeVisible({ timeout: 15_000 })
  })

  test('compte rapide de 12 ans, parent qui a refusé : accès suspendu dès la connexion', async ({ page }) => {
    await mockApiRoutes(page)
    await compteRapide(page, {
      prenom: 'Refusé', birthDate: '2014-06-01', classe: '6ème',
      consentement: { status: 'refused', parentEmail: 'parent@famille.test', createdAt: Date.now(), firstRequestedAt: Date.now() },
    })
    await expect(page).toHaveURL(/consent-pending/, { timeout: 15_000 })
    await expect(bulleReviz(page, 'Ton parent n’a pas donné son accord')).toBeAttached()
    await page.goto('/scan')
    await expect(page).toHaveURL(/consent-pending/)
  })
})
