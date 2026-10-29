// Essai devenu compte : du 26 au 29/10, la fiche users/{uid} était déjà créée par le lien vers
// l'essai (lierEssai) quand l'inscription écrivait le profil ; les règles refusaient alors cette
// mise à jour (plan: 'free' = champ de facturation) et prénom, classe et naissance étaient
// perdus, sans erreur visible. Rejoue le parcours avec les vraies règles (émulateur).
import { test, expect } from '@playwright/test'
import { entrerEnEssai, lireProfilEmulateur, mockApiRoutes, remplirNaissance, uniqueEmail } from './helpers'

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
    await expect(page).not.toHaveURL(/\/inscription/, { timeout: 15_000 })

    const uid = await uidDe(email)
    expect(uid).toBeTruthy()
    // Le lien vers l'essai part en premier : la fiche existe déjà quand le profil arrive.
    await expect.poll(async () => (await lireProfilEmulateur(uid))?.essaiId, { timeout: 15_000 }).toBeTruthy()
    await expect.poll(async () => (await lireProfilEmulateur(uid))?.prenom, { timeout: 15_000 }).toBe('Léa')
    const profil = await lireProfilEmulateur(uid)
    expect(profil.level?.classe).toBe('4ème')
    expect(profil.birthDate).toBeTruthy()
    expect(profil.createdAt).toBeTruthy()
  })
})
