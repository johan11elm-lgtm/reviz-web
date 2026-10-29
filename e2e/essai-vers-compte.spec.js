// Essai devenu compte : du 26 au 29/10, la fiche users/{uid} était déjà créée par le lien vers
// l'essai (lierEssai) quand l'inscription écrivait le profil ; les règles refusaient alors cette
// mise à jour (plan: 'free' = champ de facturation) et prénom, classe et naissance étaient
// perdus, sans erreur visible. Rejoue le parcours avec les vraies règles (émulateur).
import { test, expect } from '@playwright/test'
import { compteRapide, entrerEnEssai, lireProfilEmulateur, mockApiRoutes, remplirNaissance, uniqueEmail } from './helpers'

// uid d'un compte de l'émulateur Auth, retrouvé par son e-mail (accès admin « owner »).
async function uidDe(email) {
  const res = await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/projects/demo-reviz/accounts:lookup', {
    method: 'POST',
    headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: [email] }),
  })
  const { users = [] } = await res.json()
  return users[0]?.localId ?? null
}

test.describe('Essai → compte', () => {
  test.beforeEach(async ({ page }) => {
    await mockApiRoutes(page)
  })

  test('le profil complet arrive dans Firestore, avec le lien vers l’essai', async ({ page }) => {
    await entrerEnEssai(page, { prenom: 'Léa', classe: '4ème', aller: null })

    await page.goto('/inscription')
    // Prénom repris de l'essai, classe déjà connue : prénom → naissance → compte.
    await expect(page.getByLabel('Ton prénom')).toHaveValue('Léa')
    await page.getByRole('button', { name: 'Continuer', exact: true }).click()
    await remplirNaissance(page, '2010-03-15')
    await page.getByRole('button', { name: 'Continuer', exact: true }).click()

    const email = uniqueEmail('essai')
    await page.getByLabel('E-mail', { exact: true }).fill(email)
    await page.getByLabel('Mot de passe', { exact: true }).fill('motdepasse123')
    await page.getByRole('checkbox').check({ force: true })
    await page.getByRole('button', { name: 'Créer mon compte' }).click()
    // La fiche encore vide pendant l'inscription ne renvoie pas vers la fin d'inscription.
    await expect(page).toHaveURL(/\/(onboarding)?$/, { timeout: 15_000 })

    const uid = await uidDe(email)
    expect(uid).toBeTruthy()
    // Le lien vers l'essai part en premier : la fiche existe déjà quand le profil arrive.
    await expect.poll(async () => (await lireProfilEmulateur(uid))?.essaiId, { timeout: 15_000 }).toBeTruthy()
    await expect.poll(async () => (await lireProfilEmulateur(uid))?.prenom, { timeout: 15_000 }).toBe('Léa')
    const profil = await lireProfilEmulateur(uid)
    expect(profil.level?.classe).toBe('4ème')
    expect(profil.birthDate).toBeTruthy()
    expect(profil.createdAt).toBeTruthy()
    await expect(page).not.toHaveURL(/finish-setup/)
  })

  // Comptes vidés du 26 au 29/10 : prénom réparé depuis Auth, naissance perdue.
  test('profil sans date de naissance : à l’ouverture suivante, elle est demandée avant d’aller plus loin', async ({ page }) => {
    const { uid } = await compteRapide(page, { prenom: 'Léa', classe: '4ème', birthDate: null })
    await expect(page).toHaveURL(/\/finish-setup/)
    await expect(page.getByText(/Content de te revoir, Léa/).first()).toBeVisible()
    // Classe connue, CGU déjà acceptées : une seule question.
    await expect(page.getByRole('radio', { name: '4e', exact: true })).toHaveCount(0)
    await expect(page.getByRole('checkbox')).toHaveCount(0)

    // Tant qu'elle manque, les autres pages ramènent ici.
    await page.goto('/programme')
    await expect(page).toHaveURL(/\/finish-setup/)

    await remplirNaissance(page, '2010-03-15')
    await page.getByRole('button', { name: 'Continuer' }).click()
    await expect(page).toHaveURL(/\/$/, { timeout: 15_000 })
    await expect.poll(async () => (await lireProfilEmulateur(uid))?.birthDate, { timeout: 15_000 }).toBe('2010-03-15')
    expect((await lireProfilEmulateur(uid)).level?.classe).toBe('4ème')
  })

  test('moins de 15 ans (trace de consentement) : après la date, l’e-mail du parent comme à l’inscription', async ({ page }) => {
    await compteRapide(page, {
      prenom: 'Léa', classe: '5ème', birthDate: null,
      consentement: { status: 'pending', createdAt: Date.now() },
    })
    await expect(page).toHaveURL(/\/finish-setup/)
    await remplirNaissance(page, '2014-02-10')
    await page.getByRole('button', { name: 'Continuer' }).click()
    await expect(page).toHaveURL(/\/consent-pending/, { timeout: 15_000 })
    await expect(page.getByLabel('E-mail de ton parent')).toBeVisible()
  })
})
