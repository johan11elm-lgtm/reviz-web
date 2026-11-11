// Entrée de Réviz (11/11, façon app Knowunity) : plus d'essai sans compte. Réviz pose ses questions
// d'abord (prénom, classe, prochain contrôle, ce qui bloque, note visée), le compte vient à la fin
// « pour garder ton plan », et la séance d'accueil s'ouvre aussitôt, sans reposer les questions.
import { test, expect } from '@playwright/test'
import { mockApiRoutes, uniqueEmail, remplirNaissance, sansDebordement } from './helpers'

const CAPTURES = process.env.CAPTURES_DIR
const titre = page => page.getByRole('heading', { level: 1 })

async function capture(page, nom, largeur) {
  if (CAPTURES) await page.waitForTimeout(700)
  await page.screenshot({ path: CAPTURES ? `${CAPTURES}/entree-${nom}-${largeur}.png` : test.info().outputPath(`entree-${nom}.png`), animations: 'disabled' })
}

/** Les questions, de « Commencer gratuitement » à « C'est prêt ». */
async function repondre(page, { prenom, classe = '3e', largeur, controle = true }) {
  await expect(titre(page)).toContainText('moi c’est Réviz')
  await capture(page, '1-bonjour', largeur)
  await page.getByRole('button', { name: 'C’est parti' }).click()

  await expect(titre(page)).toContainText('Comment je t’appelle')
  await page.getByLabel('Ton prénom').fill(prenom)
  await expect(titre(page)).toContainText(`Enchanté, ${prenom}`)
  await capture(page, '2-prenom', largeur)
  await page.getByRole('button', { name: 'Continuer', exact: true }).click()

  if (classe) {
    await page.getByRole('radio', { name: classe, exact: true }).click()
    await expect(titre(page)).toContainText(/La 3e, l’année du brevet|c’est noté|nouveau collège/)
    await capture(page, '3-classe', largeur)
    await page.getByRole('button', { name: 'Continuer', exact: true }).click()
  }

  await expect(titre(page)).toContainText(/Ton prochain contrôle/)
  if (controle) {
    await page.getByRole('group', { name: 'Matière du contrôle' }).getByRole('button', { name: 'Maths' }).click()
    const feuille = page.getByRole('dialog', { name: 'Ajouter un contrôle' })
    const chapitre = feuille.getByRole('checkbox').first()
    await expect(chapitre).toBeVisible({ timeout: 10_000 })
    await chapitre.click()
    await feuille.locator('.ag-date-tuile').first().click()
    await feuille.getByRole('button', { name: 'Ajouter', exact: true }).click()
    await expect(titre(page)).toContainText(/Noté\s: contrôle de maths/)
    await capture(page, '4-controle', largeur)
    await page.getByRole('button', { name: 'Continuer', exact: true }).click()
  } else {
    await page.getByRole('button', { name: 'Pas de contrôle prévu' }).click()
  }

  await page.getByRole('radio', { name: 'Retenir mes leçons' }).click()
  await capture(page, '5-blocage', largeur)
  await page.getByRole('button', { name: 'Continuer', exact: true }).click()
  await page.getByRole('radio', { name: /Gagner 2 ou 3 points/ }).click()
  await page.getByRole('button', { name: 'Continuer', exact: true }).click()

  await expect(titre(page)).toContainText(`Je prépare ton plan, ${prenom}`)
  await capture(page, '6-chargement', largeur)
  await expect(titre(page)).toContainText(`C’est prêt, ${prenom}`, { timeout: 10_000 })
  await sansDebordement(page, 'entrée : c’est prêt')
  await capture(page, '7-pret', largeur)
}

/** L'inscription après l'entrée : la naissance d'abord (prénom et classe déjà connus), puis le compte. */
async function creerCompte(page, { naissance, prenom, largeur }) {
  await page.getByRole('button', { name: 'Créer mon compte' }).click()
  await expect(page).toHaveURL(/\/inscription/)
  await expect(titre(page)).toContainText(`On garde ton plan, ${prenom}`)
  // Pas de prénom ni de classe à redonner ; Google et Apple sont là, dès le premier écran.
  await expect(page.getByLabel('Ton prénom')).toHaveCount(0)
  await capture(page, '8-naissance', largeur)
  await remplirNaissance(page, naissance)
  await page.getByRole('button', { name: 'Continuer', exact: true }).click()
  await page.getByLabel('E-mail', { exact: true }).fill(uniqueEmail())
  await page.getByLabel('Mot de passe', { exact: true }).fill('motdepasse123')
  await page.getByRole('checkbox').check({ force: true })
  await page.getByRole('button', { name: 'Créer mon compte' }).click()
}

test.describe('Entrée sans compte → compte à la fin', () => {
  test('390 px : les questions, le plan, le compte, puis la séance d’accueil (16 ans)', async ({ page }) => {
    test.setTimeout(120_000)
    await page.setViewportSize({ width: 390, height: 844 })
    await mockApiRoutes(page)
    await page.goto('/welcome')
    await expect(page.getByRole('link', { name: /sans compte/i })).toHaveCount(0)
    await page.getByRole('link', { name: 'Commencer gratuitement' }).click()
    await expect(page).toHaveURL(/\/commencer$/)

    await repondre(page, { prenom: 'Léa', largeur: 390 })
    await creerCompte(page, { naissance: '2010-01-15', prenom: 'Léa', largeur: 390 })

    // Le compte créé : la découverte range le plan et ouvre la séance d'accueil, sans rien redemander.
    await expect(page).toHaveURL(/\/exercices\?premiere=1$/, { timeout: 20_000 })
    const etat = await page.evaluate(() => {
      const uid = Object.keys(localStorage).find(k => k.startsWith('reviz-onboarded-'))?.slice('reviz-onboarded-'.length)
      return {
        attente: localStorage.getItem('reviz-entree-attente'),
        reponses: JSON.parse(localStorage.getItem(`reviz-entree-${uid}`) || 'null'),
        agenda: JSON.parse(localStorage.getItem(`reviz-agenda-${uid}`) || 'null'),
        niveau: JSON.parse(localStorage.getItem(`reviz-level-${uid}`) || 'null'),
      }
    })
    expect(etat.attente).toBeNull()
    expect(etat.reponses).toEqual({ controle: 'note', blocage: 'retenir', objectif: 'progresser' })
    expect(etat.agenda.controles).toHaveLength(1)
    expect(etat.agenda.controles[0]).toMatchObject({ matiere: 'maths' })
    expect(etat.niveau).toMatchObject({ classe: '3ème' })
    await capture(page, '9-seance', 390)
  })

  test('moins de 15 ans : l’étape parent, puis la séance d’accueil', async ({ page }) => {
    test.setTimeout(120_000)
    await page.setViewportSize({ width: 390, height: 844 })
    await mockApiRoutes(page)
    await page.goto('/commencer')
    await repondre(page, { prenom: 'Tom', classe: '5e', largeur: 390, controle: false })
    await creerCompte(page, { naissance: '2013-03-10', prenom: 'Tom', largeur: 390 })
    await expect(page.getByLabel('E-mail de ton parent')).toBeVisible({ timeout: 15_000 })
    await page.getByRole('button', { name: /Plus tard/ }).click()
    await expect(page).toHaveURL(/\/exercices\?premiere=1$/, { timeout: 20_000 })
  })

  test('1280 px : l’entrée sur ordinateur', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 860 })
    await mockApiRoutes(page)
    await page.goto('/commencer')
    await repondre(page, { prenom: 'Inès', largeur: 1280, controle: false })
    await sansDebordement(page, 'entrée sur ordinateur')
  })

  test('les anciens liens /essai mènent à l’entrée', async ({ page }) => {
    await mockApiRoutes(page)
    await page.goto('/essai?via=landing')
    await expect(page).toHaveURL(/\/commencer\?via=landing$/)
    await expect(titre(page)).toContainText('moi c’est Réviz')
  })
})
