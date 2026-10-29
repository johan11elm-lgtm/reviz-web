// L'élève entre dans l'app dès l'inscription ; la confirmation de l'email
// devient une ligne des rappels de l'accueil (avec l'adresse), qui disparaît d'elle-même quand
// il revient de sa messagerie après avoir cliqué le lien. Là où l'e-mail bloque (Réviz IA,
// scan, Réviz+), la carte d'activation dit pourquoi, à quelle adresse, et permet de la corriger.
import { test, expect } from '@playwright/test'
import { mockApiRoutes, signup, compteRapide, passerDecouverte, verifyEmailViaEmulator, fermerAnnonces, uniqueEmail, cliquerLienNouvelleAdresse, remplirNaissance } from './helpers'

const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64')

test('inscription → accueil directement, rappel « Confirme ton e-mail » jusqu\'au clic sur le lien', async ({ page }) => {
  await mockApiRoutes(page)
  const email = await signup(page, { birthDate: '2009-05-01' })

  await expect(page).toHaveURL(/onboarding/, { timeout: 15_000 })
  await passerDecouverte(page)
  await fermerAnnonces(page)

  const rappel = page.getByText('Confirme ton e-mail')
  await expect(rappel).toBeVisible()
  // L'adresse écrite en entier : une faute de frappe se voit.
  await expect(page.locator('.email-banner')).toContainText(email)
  await expect(page.locator('.email-banner').getByRole('link', { name: 'Confirmer' })).toHaveAttribute('href', '/verify-email')

  // Il clique le lien dans sa boîte mail, puis revient sur l'onglet.
  await verifyEmailViaEmulator(page, email)
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')))
  await expect(rappel).toHaveCount(0, { timeout: 10_000 })
})

test('/verify-email : « Pas encore confirmé » tant que le lien n\'est pas cliqué, puis retour à l\'accueil', async ({ page }) => {
  await mockApiRoutes(page)
  const { email } = await compteRapide(page, { emailVerifie: false, aller: '/verify-email' })

  await expect(page.getByText(/^Vérifie ton e-mail\. Un clic/)).toBeAttached()
  await expect(page.getByText(email)).toBeVisible()

  // Rien n'a été cliqué : on le dit gentiment, on reste ici.
  await page.getByRole('button', { name: 'J’ai confirmé mon e-mail' }).click()
  await expect(page.getByText(/^Pas encore confirmé\./)).toBeVisible()
  await expect(page).toHaveURL(/verify-email/)

  await page.getByRole('button', { name: 'Renvoyer l’e-mail' }).click()
  await expect(page.getByRole('button', { name: 'E-mail renvoyé' })).toBeVisible()

  // Le lien cliqué dans la boîte mail : le bouton revient à la page d'avant (l'accueil, arrivée directe).
  await verifyEmailViaEmulator(page, email)
  await page.getByRole('button', { name: 'J’ai confirmé mon e-mail' }).click()
  await expect(page).toHaveURL(/\/$/, { timeout: 15_000 })
  await expect(page.getByText('Confirme ton e-mail')).toHaveCount(0)
})

test.describe('Carte d’activation, là où l’e-mail bloque (390 px)', () => {
  test.use({ viewport: { width: 390, height: 844 } })
  test.beforeEach(async ({ page }) => { await mockApiRoutes(page) })

  test('Réviz IA : la carte à la place du champ, avant toute question, puis le champ revient', async ({ page }) => {
    const { email } = await compteRapide(page, { emailVerifie: false, aller: '/coach' })
    const carte = page.getByRole('region', { name: 'Confirmer ton e-mail' })
    await expect(carte).toContainText('Confirme ton e-mail pour parler à Réviz IA')
    await expect(carte).toContainText(email)
    await expect(page.getByLabel('Ta question à Réviz IA')).toHaveCount(0)
    await page.screenshot({ path: test.info().outputPath('reviz-ia.png'), animations: 'disabled' })

    await carte.getByRole('button', { name: 'Renvoyer l’e-mail' }).click()
    await expect(carte.getByRole('button', { name: 'E-mail renvoyé' })).toBeVisible()
    await verifyEmailViaEmulator(page, email)
    await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')))
    await expect(carte).toHaveCount(0, { timeout: 10_000 })
    await expect(page.getByLabel('Ta question à Réviz IA')).toBeVisible()
  })

  test('scan refusé : la carte dans l’écran de refus, puis « Analyser ma leçon »', async ({ page }) => {
    const { email } = await compteRapide(page, { emailVerifie: false, aller: null })
    await page.route('**/api/analyse-image', route => route.fulfill({ status: 403, contentType: 'text/plain', body: 'EMAIL_NOT_VERIFIED' }))
    await page.goto('/scan')
    await page.locator('input[type="file"]').first().setInputFiles({ name: 'lecon.png', mimeType: 'image/png', buffer: PNG })
    await page.getByRole('button', { name: 'C’est bon, analyse' }).click()
    await expect(page.getByRole('heading', { name: 'Confirme ton e-mail pour scanner la suite' })).toBeVisible({ timeout: 15_000 })
    await expect(page.locator('.an-etat-carte')).toContainText(email)
    await page.screenshot({ path: test.info().outputPath('scan.png'), animations: 'disabled', fullPage: true })

    await page.getByRole('button', { name: 'Renvoyer l’e-mail' }).click()
    await expect(page.getByRole('button', { name: 'E-mail renvoyé' })).toBeVisible()
    await verifyEmailViaEmulator(page, email)
    await page.getByRole('button', { name: 'J’ai confirmé mon e-mail' }).click()
    await expect(page.getByRole('heading', { name: 'E-mail confirmé' })).toBeVisible({ timeout: 10_000 })
    await expect(page.getByRole('button', { name: 'Analyser ma leçon' })).toBeVisible()
  })

  test('adresse mal tapée : on la corrige depuis la carte, le lien part à la bonne, un clic la confirme', async ({ page }) => {
    const faute = `lea-${Date.now()}@gmial.com`
    await compteRapide(page, { emailVerifie: false, email: faute, aller: '/verify-email' })
    await expect(page.getByText(faute)).toBeVisible()

    await page.getByRole('button', { name: 'Pas la bonne adresse ? Corriger' }).click()
    await page.getByLabel('Ta bonne adresse').fill(faute)
    // La faute de frappe est repérée : un toucher prend l'adresse proposée.
    await page.getByRole('button', { name: faute.replace('gmial', 'gmail') }).click()
    await expect(page.getByLabel('Ta bonne adresse')).toHaveValue(faute.replace('gmial', 'gmail'))
    const nouvelle = uniqueEmail('corrigee')
    await page.getByLabel('Ta bonne adresse').fill(nouvelle)
    await page.screenshot({ path: test.info().outputPath('corriger.png'), animations: 'disabled' })
    await page.getByRole('button', { name: 'Envoyer le lien à cette adresse' }).click()
    await expect(page.getByText('Nouveau lien envoyé à')).toBeVisible()
    await expect(page.getByText(nouvelle)).toBeVisible()
    await page.screenshot({ path: test.info().outputPath('corrigee.png'), animations: 'disabled' })

    await cliquerLienNouvelleAdresse(page, nouvelle)
    await page.getByRole('button', { name: 'J’ai confirmé mon e-mail' }).click()
    // Selon Firebase, la session reste ouverte (retour à l'accueil, adresse confirmée) ou se ferme
    // (connexion avec la nouvelle adresse déjà remplie).
    await expect(page).not.toHaveURL(/verify-email/, { timeout: 15_000 })
    if (/connexion/.test(page.url())) {
      await expect(page.getByLabel('E-mail', { exact: true })).toHaveValue(nouvelle)
      await expect(page.getByText('Ton adresse est changée et confirmée.', { exact: false })).toBeVisible()
      await page.getByLabel('Mot de passe', { exact: true }).fill('motdepasse123')
      await page.getByRole('button', { name: 'Se connecter' }).click()
      await expect(page).not.toHaveURL(/connexion/, { timeout: 15_000 })
    }
    console.log('session après changement :', page.url())
    await expect(page.getByText('Confirme ton e-mail')).toHaveCount(0)
  })
})

test('adresse corrigée, session fermée par Firebase au changement : connexion avec la nouvelle adresse déjà remplie', async ({ page }) => {
  await mockApiRoutes(page)
  const { uid, motDePasse } = await compteRapide(page, { emailVerifie: false, email: `lea-${Date.now()}@hormail.fr`, aller: '/verify-email' })
  await page.getByRole('button', { name: 'Pas la bonne adresse ? Corriger' }).click()
  const nouvelle = uniqueEmail('corrigee')
  await page.getByLabel('Ta bonne adresse').fill(nouvelle)
  await page.getByRole('button', { name: 'Envoyer le lien à cette adresse' }).click()
  await expect(page.getByText(nouvelle)).toBeVisible()

  await cliquerLienNouvelleAdresse(page, nouvelle)
  // Comme Firebase en production après un changement d'adresse : les sessions ouvertes sont révoquées.
  await page.request.post('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/projects/demo-reviz/accounts:update', {
    headers: { Authorization: 'Bearer owner' },
    data: { localId: uid, validSince: String(Math.floor(Date.now() / 1000) + 1) },
  })
  await page.waitForTimeout(1500)
  await page.getByRole('button', { name: 'J’ai confirmé mon e-mail' }).click()
  await expect(page).toHaveURL(/connexion\?adresse=corrigee/, { timeout: 15_000 })
  await expect(page.getByLabel('E-mail', { exact: true })).toHaveValue(nouvelle)
  await expect(page.getByText('Ton adresse est changée et confirmée.', { exact: false })).toBeVisible()
  await page.screenshot({ path: test.info().outputPath('connexion-corrigee.png'), animations: 'disabled' })
  await page.getByLabel('Mot de passe', { exact: true }).fill(motDePasse)
  await page.getByRole('button', { name: 'Se connecter' }).click()
  await expect(page).not.toHaveURL(/connexion/, { timeout: 15_000 })
  await expect(page.getByText('Confirme ton e-mail')).toHaveCount(0)
})

test.describe('Inscription (390 px)', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('l’adresse d’exemple est refusée, la faute de frappe proposée en un toucher', async ({ page }) => {
    await page.goto('/inscription')
    await page.getByLabel('Ton prénom').fill('Lucas')
    await page.getByRole('button', { name: 'Continuer', exact: true }).click()
    await remplirNaissance(page, '2009-05-01')
    await page.getByRole('button', { name: 'Continuer', exact: true }).click()
    await page.getByRole('radio', { name: '4e', exact: true }).click()
    await page.getByRole('button', { name: 'Continuer', exact: true }).click()

    const email = page.getByLabel('E-mail', { exact: true })
    await expect(email).toHaveAttribute('placeholder', 'ton adresse e-mail')
    await email.fill('lucas@exmenple.com')
    await page.getByLabel('Mot de passe', { exact: true }).fill('motdepasse123')
    await page.getByRole('checkbox').check({ force: true })
    await page.getByRole('button', { name: 'Créer mon compte' }).click()
    await expect(page.getByText('C’est une adresse d’exemple')).toBeVisible()

    const faute = `lucas-${Date.now()}@gmial.com`
    await email.fill(faute)
    await page.getByRole('button', { name: faute.replace('gmial', 'gmail') }).click()
    await expect(email).toHaveValue(faute.replace('gmial', 'gmail'))
    await expect(page.getByText('Tu voulais dire')).toHaveCount(0)
  })
})
