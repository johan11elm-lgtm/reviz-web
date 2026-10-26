// Réglages (refonte du 22/10) : héros court, cartes Compte / Rappels / Objectif du jour / Apparence /
// Réviz+ / Informations, puis déconnexion et suppression du compte. Ce qu'on change doit rester
// après un rechargement (localStorage, profil Firestore, session Firebase), et la déconnexion
// doit ramener à l'écran d'entrée. Deux compositions : une colonne sur téléphone, deux sur ordinateur.
import { test, expect } from '@playwright/test'
import { mockApiRoutes, compteRapide, lireProfilEmulateur, bulleReviz, uniqueEmail } from './helpers'

const APPAREILS = [
  ['téléphone', { width: 390, height: 844 }],
  ['ordinateur', { width: 1280, height: 800 }],
]

// Le clic sous la barre d'onglets du bas ferait défiler .app de 46 px : on centre d'abord.
async function cliquerAuCentre(locator) {
  await locator.evaluate(el => el.scrollIntoView({ block: 'center' }))
  await locator.click()
}

async function ouvrirReglages(page, options) {
  const compte = await compteRapide(page, { prenom: 'Camille', classe: '5ème', ...options })
  await page.goto('/reglages')
  await expect(page.getByRole('heading', { level: 1, name: 'Réglages' })).toBeVisible()
  return compte
}

for (const [appareil, viewport] of APPAREILS) {
  test.describe(`Réglages (${appareil})`, () => {
    test.use({ viewport })

    test.beforeEach(async ({ page }) => { await mockApiRoutes(page) })

    test('l\'écran montre le compte, les rappels, l\'objectif, l\'apparence et Réviz+', async ({ page }) => {
      const { email } = await ouvrirReglages(page)

      await expect(bulleReviz(page, 'Tout se règle ici.')).toBeAttached()
      for (const titre of ['Compte', 'Rappels', 'Objectif du jour', 'Apparence', 'Réviz+', 'Informations']) {
        await expect(page.getByRole('heading', { level: 2, name: titre, exact: true })).toBeVisible()
      }
      // Le compte dit qui l'on est.
      await expect(page.getByRole('button', { name: /Prénom et classe/ })).toContainText('Camille · 5e')
      await expect(page.getByRole('button', { name: /Adresse e-mail/ })).toContainText(email)
      // Sur navigateur, pas de rappel quotidien : une note le dit.
      await expect(page.getByText('Les rappels sont disponibles dans l’app mobile Réviz.')).toBeVisible()
      await page.screenshot({ path: test.info().outputPath(`${appareil}-reglages.png`), animations: 'disabled' })
    })

    test('thème, affichage et objectif du jour sont retrouvés après un rechargement', async ({ page }) => {
      // Abonné : depuis la fin du lancement offert (26/10), Sauge est verrouillé sans Réviz+.
      await ouvrirReglages(page, { profil: { plan: 'premium' } })
      await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
      // Le sombre est un mode (Clair par défaut), pas un thème : pas de tuile « Sombre ».
      await expect(page.getByRole('radio', { name: 'Clair', exact: true })).toHaveAttribute('aria-checked', 'true')
      await expect(page.getByRole('radio', { name: /Thème Sombre/ })).toHaveCount(0)

      const sauge = page.getByRole('radio', { name: /Thème Sauge/ })
      await cliquerAuCentre(sauge)
      await expect(page.locator('html')).toHaveAttribute('data-theme', 'sauge')

      const objectif5 = page.getByRole('radio', { name: '5 révisions par jour' })
      await cliquerAuCentre(objectif5)
      await expect(objectif5).toHaveAttribute('aria-checked', 'true')

      await page.reload()
      await expect(page.getByRole('heading', { level: 1, name: 'Réglages' })).toBeVisible()
      await expect(page.locator('html')).toHaveAttribute('data-theme', 'sauge')
      await expect(page.getByRole('radio', { name: /Thème Sauge/ })).toHaveAttribute('aria-checked', 'true')
      await expect(page.getByRole('radio', { name: '5 révisions par jour' })).toHaveAttribute('aria-checked', 'true')
      await expect(page.getByRole('radio', { name: '3 révisions par jour' })).toHaveAttribute('aria-checked', 'false')

      // Mode Sombre : l'app passe en sombre, le thème Sauge reste choisi pour le clair ; gardé après rechargement.
      await cliquerAuCentre(page.getByRole('radio', { name: 'Sombre', exact: true }))
      await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
      await expect(page.getByText('Les thèmes ci-dessous habillent le mode clair.')).toBeVisible()
      await page.reload()
      await expect(page.getByRole('heading', { level: 1, name: 'Réglages' })).toBeVisible()
      await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
      await expect(page.getByRole('radio', { name: 'Sombre', exact: true })).toHaveAttribute('aria-checked', 'true')
      await expect(page.getByRole('radio', { name: /Thème Sauge/ })).toHaveAttribute('aria-checked', 'true')
      await page.screenshot({ path: test.info().outputPath(`${appareil}-reglages-sombre.png`), animations: 'disabled' })

      // Auto suit l'appareil.
      await cliquerAuCentre(page.getByRole('radio', { name: 'Auto', exact: true }))
      await page.emulateMedia({ colorScheme: 'light' })
      await expect(page.locator('html')).toHaveAttribute('data-theme', 'sauge')
      await page.emulateMedia({ colorScheme: 'dark' })
      await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
      await page.emulateMedia({ colorScheme: 'light' })
      // L'app réécrit son choix dans le stockage en suivant l'appareil : on attend qu'elle ait fini.
      await expect(page.locator('html')).toHaveAttribute('data-theme', 'sauge')

      // Un thème sombre mémorisé avant le mode (sans reviz-mode) devient le mode Sombre.
      await page.evaluate(() => { localStorage.removeItem('reviz-mode'); localStorage.setItem('reviz-theme', 'dark') })
      await page.reload()
      await expect(page.getByRole('heading', { level: 1, name: 'Réglages' })).toBeVisible()
      await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
      await expect(page.getByRole('radio', { name: 'Sombre', exact: true })).toHaveAttribute('aria-checked', 'true')

      // Et on revient en Clair et en Crème comme on est venu.
      await cliquerAuCentre(page.getByRole('radio', { name: 'Clair', exact: true }))
      await cliquerAuCentre(page.getByRole('radio', { name: /Thème Crème/ }))
      await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
    })

    test('changer le prénom et la classe : gardé après rechargement, et dans le profil Firestore', async ({ page }) => {
      const { uid } = await ouvrirReglages(page)

      await cliquerAuCentre(page.getByRole('button', { name: /Prénom et classe/ }))
      const feuille = page.getByRole('dialog', { name: 'Prénom et classe' })
      await expect(feuille).toBeVisible()
      await feuille.getByLabel('Prénom').fill('Zoé')
      await feuille.getByRole('button', { name: '4e', exact: true }).click()
      await feuille.getByRole('button', { name: 'Enregistrer' }).click()
      await expect(feuille.getByText('C’est enregistré.')).toBeVisible()
      await feuille.getByRole('button', { name: 'Fermer' }).click()
      await expect(feuille).toHaveCount(0)
      await expect(page.getByRole('button', { name: /Prénom et classe/ })).toContainText('Zoé · 4e')

      await page.reload()
      await expect(page.getByRole('button', { name: /Prénom et classe/ })).toContainText('Zoé · 4e')

      // La classe suit aussi sur le profil (autre appareil) ; l'écriture part sans attendre, donc on patiente.
      await expect.poll(async () => (await lireProfilEmulateur(uid))?.level?.classe, { timeout: 10_000 }).toBe('4ème')
    })

    test('changer le mot de passe : l\'ancien ne marche plus à la reconnexion, le nouveau oui', async ({ page }) => {
      const { email, motDePasse } = await ouvrirReglages(page)

      await cliquerAuCentre(page.getByRole('button', { name: /Mot de passe/ }))
      const feuille = page.getByRole('dialog', { name: 'Mot de passe' })
      await feuille.getByLabel('Mot de passe actuel').fill('pas-le-bon')
      await feuille.getByLabel('Nouveau mot de passe').fill('nouveaumdp456')
      await feuille.getByRole('button', { name: 'Enregistrer' }).click()
      await expect(feuille.getByText('Mot de passe actuel incorrect. Réessaie.')).toBeVisible()

      await feuille.getByLabel('Mot de passe actuel').fill(motDePasse)
      await feuille.getByRole('button', { name: 'Enregistrer' }).click()
      await expect(feuille.getByText('C’est enregistré.')).toBeVisible()
      await feuille.getByRole('button', { name: 'Fermer' }).click()

      await cliquerAuCentre(page.getByRole('button', { name: 'Se déconnecter' }))
      await expect(page).toHaveURL(/\/welcome/)

      await page.goto('/connexion')
      await page.getByLabel('E-mail', { exact: true }).fill(email)
      await page.getByLabel('Mot de passe', { exact: true }).fill(motDePasse)
      await page.getByRole('button', { name: 'Se connecter' }).click()
      await expect(page.getByText('E-mail ou mot de passe incorrect.')).toBeVisible()

      await page.getByLabel('Mot de passe', { exact: true }).fill('nouveaumdp456')
      await page.getByRole('button', { name: 'Se connecter' }).click()
      await expect(page).not.toHaveURL(/connexion/, { timeout: 15_000 })
    })

    test('se déconnecter ramène à l\'écran d\'entrée, et l\'app reste fermée jusqu\'à la reconnexion', async ({ page }) => {
      const { email, motDePasse } = await ouvrirReglages(page)

      await cliquerAuCentre(page.getByRole('button', { name: 'Se déconnecter' }))
      await expect(page).toHaveURL(/\/welcome/)
      await expect(page.getByRole('link', { name: /Commencer gratuitement/i })).toBeVisible()

      // Plus de session : ni l'accueil ni les réglages ne s'ouvrent, même après rechargement.
      await page.goto('/reglages')
      await expect(page).toHaveURL(/\/welcome/)
      await page.reload()
      await expect(page).toHaveURL(/\/welcome/)
      await page.goto('/')
      await expect(page).toHaveURL(/\/welcome/)

      // Se reconnecter rouvre l'accueil, avec la classe retrouvée.
      await page.goto('/connexion')
      await page.getByLabel('E-mail', { exact: true }).fill(email)
      await page.getByLabel('Mot de passe', { exact: true }).fill(motDePasse)
      await page.getByRole('button', { name: 'Se connecter' }).click()
      await expect(page).toHaveURL(/\/$/, { timeout: 15_000 })
      await page.goto('/reglages')
      await expect(page.getByRole('button', { name: /Prénom et classe/ })).toContainText('Camille · 5e')
    })
  })
}

test.describe('Réglages : suppression et mode essai', () => {
  test.use({ viewport: { width: 390, height: 844 } })
  test.beforeEach(async ({ page }) => { await mockApiRoutes(page) })

  test('changer l\'adresse e-mail : on se connecte ensuite avec la nouvelle', async ({ page }) => {
    const { motDePasse } = await ouvrirReglages(page)
    const nouvelle = uniqueEmail('nouvelle')

    await cliquerAuCentre(page.getByRole('button', { name: /Adresse e-mail/ }))
    const feuille = page.getByRole('dialog', { name: 'Adresse e-mail' })
    await feuille.getByLabel('Nouvel e-mail').fill(nouvelle)
    await feuille.getByLabel('Mot de passe actuel').fill(motDePasse)
    await feuille.getByRole('button', { name: 'Enregistrer' }).click()
    await expect(feuille.getByText('C’est enregistré.')).toBeVisible()
    await feuille.getByRole('button', { name: 'Fermer' }).click()
    await expect(page.getByRole('button', { name: /Adresse e-mail/ })).toContainText(nouvelle)

    await cliquerAuCentre(page.getByRole('button', { name: 'Se déconnecter' }))
    await expect(page).toHaveURL(/\/welcome/)
    await page.goto('/connexion')
    await page.getByLabel('E-mail', { exact: true }).fill(nouvelle)
    await page.getByLabel('Mot de passe', { exact: true }).fill(motDePasse)
    await page.getByRole('button', { name: 'Se connecter' }).click()
    await expect(page).not.toHaveURL(/connexion/, { timeout: 15_000 })
  })

  test('supprimer le compte : deux étapes, puis plus de compte', async ({ page }) => {
    const { email, motDePasse } = await ouvrirReglages(page)

    await cliquerAuCentre(page.getByRole('button', { name: 'Supprimer mon compte' }))
    let feuille = page.getByRole('dialog', { name: 'Supprimer mon compte' })
    await expect(feuille.getByText('Étape 1 sur 2')).toBeVisible()
    // Annuler laisse tout en place.
    await feuille.getByRole('button', { name: 'Annuler' }).click()
    await expect(feuille).toHaveCount(0)
    await expect(page).toHaveURL(/\/reglages/)

    await cliquerAuCentre(page.getByRole('button', { name: 'Supprimer mon compte' }))
    feuille = page.getByRole('dialog', { name: 'Supprimer mon compte' })
    await feuille.getByRole('button', { name: 'Continuer' }).click()
    await expect(feuille.getByText('Étape 2 sur 2')).toBeVisible()
    // Mauvais mot de passe : on reste, avec un message.
    await feuille.getByLabel('Mot de passe').fill('pas-le-bon')
    await feuille.getByRole('button', { name: 'Supprimer définitivement' }).click()
    await expect(feuille.getByText('Mot de passe incorrect. Réessaie.')).toBeVisible()
    await feuille.getByLabel('Mot de passe').fill(motDePasse)
    await feuille.getByRole('button', { name: 'Supprimer définitivement' }).click()
    await expect(page).toHaveURL(/\/welcome/, { timeout: 15_000 })

    await page.goto('/connexion')
    await page.getByLabel('E-mail', { exact: true }).fill(email)
    await page.getByLabel('Mot de passe', { exact: true }).fill(motDePasse)
    await page.getByRole('button', { name: 'Se connecter' }).click()
    await expect(page.getByText('E-mail ou mot de passe incorrect.')).toBeVisible()
  })

  test('mode essai : pas de compte à régler, « Quitter le mode essai » ramène à la bienvenue', async ({ page }) => {
    await page.goto('/essai')
    await page.getByLabel('Ton prénom').fill('Invité')
    await page.getByRole('radio', { name: '6e', exact: true }).click()
    await page.getByRole('button', { name: 'C\'est parti' }).click()
    await expect(page).toHaveURL(/\/programme/, { timeout: 15_000 })

    await page.goto('/reglages')
    await expect(page.getByText('Mode essai', { exact: true })).toBeVisible()
    await expect(page.getByRole('heading', { level: 2, name: 'Compte', exact: true })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Supprimer mon compte' })).toHaveCount(0)

    await cliquerAuCentre(page.getByRole('button', { name: 'Quitter le mode essai' }))
    await expect(page).toHaveURL(/\/welcome/)
    await page.goto('/reglages')
    await expect(page).toHaveURL(/\/welcome/)
  })
})
